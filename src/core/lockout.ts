import type { CryptoProvider } from './crypto/types.ts';
import type { NonceSource } from './crypto/nonce.ts';
import { context, open, seal } from './crypto/aead.ts';
import { bytesToUtf8, utf8ToBytes, wipe } from './bytes.ts';
import type { Clock, MetaStore } from './ports.ts';
import { type AppSettings, mergeSettings } from './settings.ts';

/**
 * 무차별 대입 방어 (명세 5.4).
 *
 * | 연속 실패 | 대기 |
 * | 1~4회    | 없음 |
 * | 5회      | 30초 |
 * | 6회      | 1분  |
 * | 7회      | 5분  |
 * | 8회 이상 | 15분 |
 *
 * 카운터는 앱을 다시 켜도 유지되어야 하므로 파일에 저장한다. 그냥 두면 파일만
 * 지워서 초기화할 수 있으니, OS 키 저장소의 기기 키로 암호화해 둔다.
 * 금고를 열기 전에도 읽어야 하므로 DEK 로는 감쌀 수 없다.
 */
export function delayForFailures(failures: number): number {
  if (failures <= 4) return 0;
  if (failures === 5) return 30_000;
  if (failures === 6) return 60_000;
  if (failures === 7) return 5 * 60_000;
  return 15 * 60_000;
}

export const WIPE_FAILURE_THRESHOLD = 10;

export type LockoutState = {
  failures: number;
  /** 이 시각까지 기다려야 한다 (epoch ms). */
  lockedUntil: number;
  /** lockedUntil 계산에 쓴 대기 시간. 시계를 되돌렸을 때 다시 계산하려고 남긴다. */
  penaltyMs: number;
  updatedAt: number;
};

/**
 * 보관 파일 상태.
 *  ok         — 정상적으로 읽었다.
 *  missing    — 파일이 없다. 금고가 있는데 없다면 누가 지운 것이다(카운터 초기화 시도).
 *  unreadable — 기기 키로 열리지 않는다. 기기 키가 바뀌었거나 파일이 손상된 것이다.
 */
export type GuardIntegrity = 'ok' | 'missing' | 'unreadable';

export type GuardState = {
  lockout: LockoutState;
  settings: AppSettings;
  integrity: GuardIntegrity;
};

export const INITIAL_LOCKOUT: LockoutState = { failures: 0, lockedUntil: 0, penaltyMs: 0, updatedAt: 0 };

const GUARD_AAD = context('guard', 1);

export function remainingWaitMs(state: LockoutState, now: number): number {
  if (state.penaltyMs <= 0) return 0;
  // 시계를 뒤로 돌리면 updatedAt 이 미래가 된다. 이때는 벌칙을 통째로 다시 건다.
  if (now < state.updatedAt) return state.penaltyMs;
  return Math.max(0, state.lockedUntil - now);
}

/** 실패 카운터와 설정을 기기 키로 암호화해 보관한다. */
export class GuardStore {
  private readonly provider: CryptoProvider;
  private readonly nonces: NonceSource;
  private readonly store: MetaStore;
  private readonly clock: Clock;

  constructor(provider: CryptoProvider, nonces: NonceSource, store: MetaStore, clock: Clock) {
    this.provider = provider;
    this.nonces = nonces;
    this.store = store;
    this.clock = clock;
  }

  async read(deviceKey: Uint8Array): Promise<GuardState> {
    const blob = await this.store.readGuard();
    if (!blob) {
      return { lockout: { ...INITIAL_LOCKOUT }, settings: mergeSettings(undefined), integrity: 'missing' };
    }
    let bytes: Uint8Array;
    try {
      bytes = await open(this.provider, deviceKey, blob, GUARD_AAD);
    } catch {
      // 기기 키가 맞지 않는다. 이 상태에서는 금고 자체도 열리지 않으므로
      // 여기서 대기를 걸어 봐야 사용자만 헷갈린다. 상태만 알려 준다.
      return { lockout: { ...INITIAL_LOCKOUT }, settings: mergeSettings(undefined), integrity: 'unreadable' };
    }
    try {
      const parsed = JSON.parse(bytesToUtf8(bytes)) as Partial<GuardState>;
      return {
        lockout: { ...INITIAL_LOCKOUT, ...(parsed.lockout ?? {}) },
        settings: mergeSettings(parsed.settings),
        integrity: 'ok',
      };
    } catch {
      return { lockout: { ...INITIAL_LOCKOUT }, settings: mergeSettings(undefined), integrity: 'unreadable' };
    } finally {
      wipe(bytes);
    }
  }

  /**
   * 실패 기록 파일이 사라졌는데 금고는 그대로인 경우 = 대기 시간을 지우려는 시도다.
   * 소거 문턱 바로 아래로 올려 두고 가장 긴 대기를 건다.
   */
  async penalizeTampering(deviceKey: Uint8Array): Promise<GuardState> {
    const state = await this.read(deviceKey);
    const failures = WIPE_FAILURE_THRESHOLD - 1;
    const penaltyMs = delayForFailures(failures);
    const now = this.clock.now();
    const next: GuardState = {
      ...state,
      integrity: 'ok',
      lockout: { failures, penaltyMs, lockedUntil: now + penaltyMs, updatedAt: now },
    };
    await this.write(deviceKey, next);
    return next;
  }

  async write(deviceKey: Uint8Array, state: GuardState): Promise<void> {
    const bytes = utf8ToBytes(JSON.stringify({ lockout: state.lockout, settings: state.settings }));
    try {
      const blob = await seal(this.provider, deviceKey, this.nonces.next(), bytes, GUARD_AAD);
      await this.store.writeGuard(blob);
    } finally {
      wipe(bytes);
    }
  }

  async recordFailure(deviceKey: Uint8Array): Promise<GuardState> {
    const state = await this.read(deviceKey);
    const now = this.clock.now();
    const failures = state.lockout.failures + 1;
    const penaltyMs = delayForFailures(failures);
    const next: GuardState = {
      ...state,
      lockout: { failures, penaltyMs, lockedUntil: now + penaltyMs, updatedAt: now },
    };
    await this.write(deviceKey, next);
    return next;
  }

  async recordSuccess(deviceKey: Uint8Array): Promise<GuardState> {
    const state = await this.read(deviceKey);
    const next: GuardState = { ...state, lockout: { ...INITIAL_LOCKOUT, updatedAt: this.clock.now() } };
    await this.write(deviceKey, next);
    return next;
  }

  async updateSettings(deviceKey: Uint8Array, patch: Partial<AppSettings>): Promise<GuardState> {
    const state = await this.read(deviceKey);
    const next: GuardState = { ...state, settings: { ...state.settings, ...patch } };
    await this.write(deviceKey, next);
    return next;
  }
}
