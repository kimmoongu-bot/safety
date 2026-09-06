import type { CryptoProvider, KdfParams } from './crypto/types.ts';
import { NonceSource } from './crypto/nonce.ts';
import { context, open, seal } from './crypto/aead.ts';
import { assertParamsAcceptable, calibrateKdf } from './crypto/kdf.ts';
import { bytesToUtf8, utf8ToBytes, wipe } from './bytes.ts';
import { VaultError } from './errors.ts';
import {
  createBiometricWrap,
  createSecretWrap,
  generateDek,
  unwrapWithBiometricKey,
  unwrapWithSecret,
} from './keys.ts';
import { GuardStore, WIPE_FAILURE_THRESHOLD, remainingWaitMs, type GuardState } from './lockout.ts';
import type { Clock, MetaStore, RecordStore, SecureKeyStore } from './ports.ts';
import { systemClock } from './ports.ts';
import { decryptRecord, encryptPayload } from './records.ts';
import { generateRecoveryCode, recoveryCodeToSecret } from './recoveryCode.ts';
import {
  RECORD_SCHEMA_VERSION,
  VAULT_FORMAT_VERSION,
  findWrap,
  toOpenRecord,
  type OpenRecord,
  type VaultMeta,
  type VaultPayload,
  type VaultRecord,
} from './schema.ts';
import type { AppSettings } from './settings.ts';
import { uuidV4 } from './uuid.ts';

export type VaultStatus = 'empty' | 'locked' | 'unlocked';

export type VaultDeps = {
  provider: CryptoProvider;
  keyStore: SecureKeyStore;
  metaStore: MetaStore;
  recordStore: RecordStore;
  clock?: Clock;
  nonces?: NonceSource;
  /**
   * 이미 보정해 둔 KDF 파라미터가 있으면 그대로 쓴다.
   * (금고 초기화 후 다시 만들 때 보정을 반복하지 않기 위한 것.)
   * 어떤 값이든 최소 기준 검사(assertParamsAcceptable)를 통과해야 한다.
   */
  presetKdf?: KdfParams;
};

export type CreateVaultInput = {
  pin: string;
  /** 생체인증으로도 열 수 있게 할지. 키 저장소에 생체 키를 만든다. */
  enableBiometric?: boolean;
};

export type CreateVaultResult = {
  /** 사용자가 종이에 옮겨 적어야 하는 값. 이 순간 말고는 다시 만들 수 없다. */
  recoveryCode: string;
  kdfMeasuredMs: number;
};

export type LockoutView = {
  failures: number;
  waitMs: number;
  /** 남은 실패 허용 횟수 (소거 설정이 켜져 있을 때만 의미가 있다). */
  attemptsBeforeWipe: number | null;
};

const MIN_PIN_LENGTH = 4;

function pinToSecret(pin: string): Uint8Array {
  const trimmed = pin.trim();
  if (trimmed.length < MIN_PIN_LENGTH || !/^\d+$/.test(trimmed)) throw new VaultError('INVALID_INPUT');
  return utf8ToBytes(trimmed);
}

/**
 * 금고 한 개를 다루는 진입점. 화면은 이 클래스만 사용한다.
 * 열린 동안에만 메모리에 DEK 를 들고 있고, lock() 이 불리면 즉시 지운다.
 */
export class Vault {
  private readonly provider: CryptoProvider;
  private readonly keyStore: SecureKeyStore;
  private readonly metaStore: MetaStore;
  private readonly recordStore: RecordStore;
  private readonly clock: Clock;
  readonly nonces: NonceSource;
  private readonly guard: GuardStore;
  private readonly presetKdf: KdfParams | undefined;
  private dek: Uint8Array | null = null;
  private meta: VaultMeta | null = null;
  private unreadable = 0;

  constructor(deps: VaultDeps) {
    this.provider = deps.provider;
    this.keyStore = deps.keyStore;
    this.metaStore = deps.metaStore;
    this.recordStore = deps.recordStore;
    this.clock = deps.clock ?? systemClock;
    this.nonces = deps.nonces ?? new NonceSource(deps.provider);
    this.presetKdf = deps.presetKdf;
    this.guard = new GuardStore(this.provider, this.nonces, this.metaStore, this.clock);
  }

  // ── 상태 ────────────────────────────────────────────────────────────────
  get isUnlocked(): boolean {
    return this.dek !== null;
  }

  async status(): Promise<VaultStatus> {
    if (this.dek) return 'unlocked';
    return (await this.metaStore.readMeta()) ? 'locked' : 'empty';
  }

  async readMeta(): Promise<VaultMeta> {
    const meta = this.meta ?? (await this.metaStore.readMeta());
    if (!meta) throw new VaultError('VAULT_NOT_FOUND');
    if (meta.formatVersion > VAULT_FORMAT_VERSION) throw new VaultError('UNSUPPORTED_FORMAT');
    this.meta = meta;
    return meta;
  }

  async readGuardState(): Promise<GuardState> {
    const deviceKey = await this.requireDeviceKey();
    return this.guard.read(deviceKey);
  }

  async lockoutView(): Promise<LockoutView> {
    const { lockout, settings } = await this.readGuardState();
    return {
      failures: lockout.failures,
      waitMs: remainingWaitMs(lockout, this.clock.now()),
      attemptsBeforeWipe: settings.wipeAfterTenFailures
        ? Math.max(0, WIPE_FAILURE_THRESHOLD - lockout.failures)
        : null,
    };
  }

  async readSettings(): Promise<AppSettings> {
    return (await this.readGuardState()).settings;
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const deviceKey = await this.requireDeviceKey();
    const next = await this.guard.updateSettings(deviceKey, patch);
    return next.settings;
  }

  private async requireDeviceKey(): Promise<Uint8Array> {
    return this.keyStore.getOrCreateDeviceKey();
  }

  private requireDek(): Uint8Array {
    if (!this.dek) throw new VaultError('VAULT_LOCKED');
    return this.dek;
  }

  // ── 만들기 ──────────────────────────────────────────────────────────────
  async create(input: CreateVaultInput): Promise<CreateVaultResult> {
    if (await this.metaStore.readMeta()) throw new VaultError('VAULT_ALREADY_EXISTS');
    const pinSecret = pinToSecret(input.pin);
    const deviceKey = await this.requireDeviceKey();
    let params: KdfParams;
    let measuredMs = 0;
    if (this.presetKdf) {
      assertParamsAcceptable(this.presetKdf);
      params = this.presetKdf;
    } else {
      const calibrated = await calibrateKdf(this.provider, () => this.clock.now());
      params = calibrated.params;
      measuredMs = calibrated.measuredMs;
    }

    const vaultId = uuidV4(this.provider);
    const dek = generateDek(this.provider);
    const recoveryCode = generateRecoveryCode(this.provider);
    const rcSecret = recoveryCodeToSecret(recoveryCode);

    try {
      const wraps = [
        await createSecretWrap(this.provider, this.nonces, vaultId, 'pin', pinSecret, params, deviceKey, dek),
        await createSecretWrap(this.provider, this.nonces, vaultId, 'recovery', rcSecret, params, deviceKey, dek),
      ];
      if (input.enableBiometric) {
        const biometricKey = await this.keyStore.createBiometricKey();
        try {
          wraps.push(await createBiometricWrap(this.provider, this.nonces, vaultId, biometricKey, deviceKey, dek));
        } finally {
          wipe(biometricKey);
        }
      }

      const recoveryCodeCopy = await seal(
        this.provider,
        dek,
        this.nonces.next(),
        utf8ToBytes(recoveryCode),
        context('recovery-code', 1, vaultId),
      );

      const meta: VaultMeta = {
        formatVersion: VAULT_FORMAT_VERSION,
        vaultId,
        createdAt: this.clock.now(),
        kdfMeasuredMs: measuredMs,
        wraps,
        recoveryCodeCopy,
      };
      await this.metaStore.writeMeta(meta);
      await this.guard.write(deviceKey, {
        lockout: { failures: 0, lockedUntil: 0, penaltyMs: 0, updatedAt: this.clock.now() },
        settings: { ...(await this.guard.read(deviceKey)).settings, biometricUnlock: !!input.enableBiometric },
        integrity: 'ok',
      });
      this.meta = meta;
      this.dek = dek; // 만든 직후에는 열린 상태로 이어 간다.
      return { recoveryCode, kdfMeasuredMs: measuredMs };
    } catch (e) {
      wipe(dek);
      throw e;
    } finally {
      wipe(pinSecret, rcSecret);
    }
  }

  // ── 열기 ────────────────────────────────────────────────────────────────
  /**
   * 열기를 시도하기 전에 대기 상태를 확인한다 (명세 5.4).
   * 실패 기록 파일을 지워서 대기를 건너뛰려는 시도도 여기서 막는다.
   */
  private async guardBeforeAttempt(deviceKey: Uint8Array): Promise<void> {
    const state = await this.guard.read(deviceKey);
    if (state.integrity === 'missing') {
      // 금고는 있는데 기록만 사라졌다 = 누군가 지웠다.
      const penalized = await this.guard.penalizeTampering(deviceKey);
      if (remainingWaitMs(penalized.lockout, this.clock.now()) > 0) throw new VaultError('LOCKED_OUT');
      return;
    }
    if (state.integrity === 'unreadable') return; // 어차피 다음 단계에서 열리지 않는다.
    if (remainingWaitMs(state.lockout, this.clock.now()) > 0) throw new VaultError('LOCKED_OUT');
  }

  private async onFailure(deviceKey: Uint8Array, error: VaultError): Promise<never> {
    const next = await this.guard.recordFailure(deviceKey);
    if (next.settings.wipeAfterTenFailures && next.lockout.failures >= WIPE_FAILURE_THRESHOLD) {
      await this.destroy();
      throw new VaultError('VAULT_NOT_FOUND', 'WIPED_AFTER_FAILURES');
    }
    throw error;
  }

  async unlockWithPin(pin: string): Promise<void> {
    const meta = await this.readMeta();
    const wrap = findWrap(meta, 'pin');
    if (!wrap) throw new VaultError('DATA_DAMAGED');
    const deviceKey = await this.requireDeviceKey();
    await this.guardBeforeAttempt(deviceKey);

    let secret: Uint8Array;
    try {
      secret = pinToSecret(pin);
    } catch {
      // 형식이 틀린 입력도 시도 1회로 센다. 형식 검사로 대기를 우회할 수 없게 한다.
      return this.onFailure(deviceKey, new VaultError('WRONG_PIN'));
    }
    try {
      const dek = await unwrapWithSecret(this.provider, meta, wrap, secret, deviceKey);
      this.dek = dek;
      await this.guard.recordSuccess(deviceKey);
    } catch (e) {
      if (e instanceof VaultError && e.code === 'WRONG_PIN') return this.onFailure(deviceKey, e);
      throw e;
    } finally {
      wipe(secret);
    }
  }

  async unlockWithRecoveryCode(code: string): Promise<void> {
    const meta = await this.readMeta();
    const wrap = findWrap(meta, 'recovery');
    if (!wrap) throw new VaultError('DATA_DAMAGED');
    const deviceKey = await this.requireDeviceKey();
    await this.guardBeforeAttempt(deviceKey);

    let secret: Uint8Array;
    try {
      secret = recoveryCodeToSecret(code);
    } catch {
      return this.onFailure(deviceKey, new VaultError('WRONG_RECOVERY_CODE'));
    }
    try {
      const dek = await unwrapWithSecret(this.provider, meta, wrap, secret, deviceKey);
      this.dek = dek;
      await this.guard.recordSuccess(deviceKey);
    } catch (e) {
      if (e instanceof VaultError && e.code === 'WRONG_RECOVERY_CODE') return this.onFailure(deviceKey, e);
      throw e;
    } finally {
      wipe(secret);
    }
  }

  /**
   * 생체인증으로 열기.
   * 생체인증 자체(성공/실패)는 플랫폼 계층이 먼저 처리하고, 통과했을 때에만
   * 이 함수를 부른다. 키 저장소가 생체 키를 내주는 것이 두 번째 관문이다.
   */
  async unlockWithBiometrics(): Promise<void> {
    const meta = await this.readMeta();
    const wrap = findWrap(meta, 'biometric');
    if (!wrap) throw new VaultError('VAULT_LOCKED', 'BIOMETRIC_NOT_SET_UP');
    const deviceKey = await this.requireDeviceKey();
    await this.guardBeforeAttempt(deviceKey);
    const biometricKey = await this.keyStore.getBiometricKey();
    if (!biometricKey) {
      // 생체정보가 새로 등록되어 키가 무효화된 경우다. PIN 으로는 여전히 열린다.
      throw new VaultError('VAULT_LOCKED', 'BIOMETRIC_CHANGED');
    }
    try {
      this.dek = await unwrapWithBiometricKey(this.provider, meta, wrap, biometricKey, deviceKey);
      await this.guard.recordSuccess(deviceKey);
    } finally {
      wipe(biometricKey);
    }
  }

  /** 앱이 백그라운드로 갈 때, 자동 잠금 시간이 지났을 때 호출한다 (명세 5.5). */
  lock(): void {
    wipe(this.dek);
    this.dek = null;
  }

  // ── 항목 다루기 ─────────────────────────────────────────────────────────
  /** 마지막으로 목록을 읽을 때 열지 못한 항목 수. 0 이 아니면 화면에서 알린다. */
  get unreadableRecordCount(): number {
    return this.unreadable;
  }

  /**
   * 전체를 열어 메모리에 올린다 (명세 4장 "검색 처리").
   * 수십~수백 건 규모를 전제로 한다.
   *
   * 항목 하나가 열리지 않는다고 예외를 던지지 않는다. 그러면 손상된 항목 하나가
   * 금고 전체를 못 쓰게 만든다. 열리는 것은 다 돌려주고, 못 연 개수를 남긴다.
   */
  async listOpenRecords(): Promise<OpenRecord[]> {
    const dek = this.requireDek();
    const records = await this.recordStore.list();
    const out: OpenRecord[] = [];
    let unreadable = 0;
    for (const record of records) {
      try {
        out.push(toOpenRecord(record, await decryptRecord(this.provider, dek, record)));
      } catch {
        unreadable += 1;
      }
    }
    this.unreadable = unreadable;
    return out.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.service.localeCompare(b.service, 'ko'));
  }

  async getOpenRecord(id: string): Promise<OpenRecord> {
    const dek = this.requireDek();
    const record = await this.recordStore.get(id);
    if (!record) throw new VaultError('VAULT_NOT_FOUND', 'RECORD_NOT_FOUND');
    return toOpenRecord(record, await decryptRecord(this.provider, dek, record));
  }

  async addRecord(payload: VaultPayload): Promise<OpenRecord> {
    const dek = this.requireDek();
    const now = this.clock.now();
    const base = {
      id: uuidV4(this.provider),
      createdAt: now,
      updatedAt: now,
      favorite: false,
      schemaVersion: RECORD_SCHEMA_VERSION,
    };
    const record = await encryptPayload(this.provider, this.nonces, dek, base, {
      ...payload,
      pwChangedAt: payload.pwChangedAt || now,
    });
    await this.recordStore.put(record);
    return this.getOpenRecord(record.id);
  }

  /**
   * 수정. 비밀번호가 바뀌면 pwChangedAt 을 갱신하고, 설정이 켜져 있으면
   * 직전 비밀번호 1개를 암호문 안에 함께 남긴다 (명세 7장).
   */
  async updateRecord(
    id: string,
    patch: Partial<VaultPayload> & { favorite?: boolean },
    options?: { keepPreviousPassword?: boolean },
  ): Promise<OpenRecord> {
    const dek = this.requireDek();
    const existing = await this.recordStore.get(id);
    if (!existing) throw new VaultError('VAULT_NOT_FOUND', 'RECORD_NOT_FOUND');
    const current = await decryptRecord(this.provider, dek, existing);
    const now = this.clock.now();

    const keepPrev = options?.keepPreviousPassword ?? (await this.readSettings()).keepPreviousPassword;
    const passwordChanged = patch.password !== undefined && patch.password !== current.password;

    const next: VaultPayload = {
      ...current,
      ...patch,
      pwChangedAt: passwordChanged ? now : current.pwChangedAt,
    };
    if (passwordChanged) {
      if (keepPrev) next.prevPassword = current.password;
      else delete next.prevPassword;
    }
    if (!keepPrev) delete next.prevPassword;

    const record = await encryptPayload(
      this.provider,
      this.nonces,
      dek,
      {
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
        favorite: patch.favorite ?? existing.favorite,
        schemaVersion: RECORD_SCHEMA_VERSION,
      },
      next,
    );
    await this.recordStore.put(record);
    return toOpenRecord(record, next);
  }

  async removeRecord(id: string): Promise<void> {
    this.requireDek();
    await this.recordStore.remove(id);
  }

  // ── 열쇠 관리 ───────────────────────────────────────────────────────────
  /** 복구 코드 재확인 (명세 6.1). 금고가 열려 있어야 한다. */
  async revealRecoveryCode(): Promise<string> {
    const dek = this.requireDek();
    const meta = await this.readMeta();
    if (!meta.recoveryCodeCopy) {
      throw new VaultError('DATA_DAMAGED', 'NO_RECOVERY_CODE_COPY');
    }
    const bytes = await open(this.provider, dek, meta.recoveryCodeCopy, context('recovery-code', 1, meta.vaultId));
    try {
      return bytesToUtf8(bytes);
    } finally {
      wipe(bytes);
    }
  }

  /** PIN 바꾸기. DEK 는 그대로 두고 감싼 것만 다시 만든다. */
  async changePin(currentPin: string, nextPin: string): Promise<void> {
    const meta = await this.readMeta();
    const wrap = findWrap(meta, 'pin');
    if (!wrap || !wrap.kdf) throw new VaultError('DATA_DAMAGED');
    const deviceKey = await this.requireDeviceKey();
    const currentSecret = pinToSecret(currentPin);
    let dek: Uint8Array;
    try {
      dek = await unwrapWithSecret(this.provider, meta, wrap, currentSecret, deviceKey);
    } finally {
      wipe(currentSecret);
    }
    const nextSecret = pinToSecret(nextPin);
    try {
      const nextWrap = await createSecretWrap(
        this.provider,
        this.nonces,
        meta.vaultId,
        'pin',
        nextSecret,
        wrap.kdf,
        deviceKey,
        dek,
      );
      const nextMeta: VaultMeta = { ...meta, wraps: [nextWrap, ...meta.wraps.filter((w) => w.slot !== 'pin')] };
      await this.metaStore.writeMeta(nextMeta);
      this.meta = nextMeta;
    } finally {
      wipe(nextSecret, this.dek === dek ? undefined : dek);
    }
  }

  /** 생체인증으로 열기 켜기/끄기 (금고가 열려 있어야 한다). */
  async setBiometricUnlock(enabled: boolean): Promise<void> {
    const dek = this.requireDek();
    const meta = await this.readMeta();
    const deviceKey = await this.requireDeviceKey();
    if (enabled) {
      const biometricKey = await this.keyStore.createBiometricKey();
      try {
        const wrap = await createBiometricWrap(this.provider, this.nonces, meta.vaultId, biometricKey, deviceKey, dek);
        const nextMeta: VaultMeta = { ...meta, wraps: [...meta.wraps.filter((w) => w.slot !== 'biometric'), wrap] };
        await this.metaStore.writeMeta(nextMeta);
        this.meta = nextMeta;
      } finally {
        wipe(biometricKey);
      }
    } else {
      await this.keyStore.deleteBiometricKey();
      const nextMeta: VaultMeta = { ...meta, wraps: meta.wraps.filter((w) => w.slot !== 'biometric') };
      await this.metaStore.writeMeta(nextMeta);
      this.meta = nextMeta;
    }
    await this.updateSettings({ biometricUnlock: enabled });
  }

  async markBackedUp(at?: number): Promise<VaultMeta> {
    const meta = await this.readMeta();
    const nextMeta: VaultMeta = { ...meta, lastBackupAt: at ?? this.clock.now() };
    await this.metaStore.writeMeta(nextMeta);
    this.meta = nextMeta;
    return nextMeta;
  }

  /** 금고 초기화 — 저장된 것을 모두 지운다 (명세 6.4). 되돌릴 수 없다. */
  async destroy(): Promise<void> {
    this.lock();
    this.meta = null;
    await this.recordStore.clear();
    await this.metaStore.clear();
    await this.keyStore.clear();
  }

  /** 백업 합치기에서 레코드 하나를 그대로 넣는다. */
  async internalPut(record: VaultRecord): Promise<void> {
    this.requireDek();
    await this.recordStore.put(record);
  }

  /** 백업에서 되살릴 때 쓴다. 기존 내용은 모두 지운 뒤 새로 넣는다. */
  async replaceAllRecords(records: VaultRecord[]): Promise<void> {
    this.requireDek();
    await this.recordStore.clear();
    await this.recordStore.putMany(records);
  }

  /**
   * 백업 비밀번호가 앱 PIN 과 같은지 확인할 때만 쓴다.
   * 기기 키 자체는 비밀이 아니라 "이 기기에서만 열린다"는 조건이다.
   */
  async deviceKeyForCheck(): Promise<Uint8Array> {
    return this.requireDeviceKey();
  }

  /** 백업 파일 만들기/읽기에서 쓰는 내부 접근자. */
  internals(): { provider: CryptoProvider; nonces: NonceSource; dek: Uint8Array } {
    return { provider: this.provider, nonces: this.nonces, dek: this.requireDek() };
  }
}
