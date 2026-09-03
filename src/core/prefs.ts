import { context, open, seal } from './crypto/aead.ts';
import type { CryptoProvider } from './crypto/types.ts';
import type { NonceSource } from './crypto/nonce.ts';
import { bytesToUtf8, utf8ToBytes, wipe } from './bytes.ts';
import type { PrefsStore, SecureKeyStore } from './ports.ts';

/**
 * 화면 설정 — 밝기와 언어.
 *
 * 07 설정 화면의 `AppSettings` 와는 저장 자리가 다르다. 그쪽은 금고를 연 뒤에만
 * 필요하지만, 밝기와 언어는 **잠금 화면에서 이미 필요하다.** 잠금 화면은 금고를
 * 열기 전에 그려지므로, 금고를 열어야 읽히는 자리에 두면 쓸 수 없다.
 *
 * 그래서 파일을 따로 둔다. 실패 기록 파일(vault.guard.json)에 얹지 않은 이유는
 * 두 가지다.
 *  - 그 파일은 명세 5.4 의 대기 시간 카운터다. 밝기를 한 번 바꿀 때마다 그 파일을
 *    다시 쓰게 되고, 여기서 실수하면 대기 시간이 지워진다. 화면 설정 때문에
 *    잠금 방어를 건드릴 이유가 없다.
 *  - 그 파일은 "없어졌다"는 것 자체가 조작 신호다(GuardStore.penalizeTampering).
 *    지울 일이 생기는 값과 섞으면 그 판단이 흐려진다.
 *
 * **비밀이 아니어도 평문으로 두지 않는다.** 명세 5장은 파일 시스템에 평문 JSON 을
 * 두지 말라고 한다. 화면 설정은 비밀이 아니지만, "이건 비밀이 아니니 예외"를 한 번
 * 허용하면 그 판단을 매번 다시 해야 한다. 실패 기록과 똑같이 기기 키로 감싼다.
 * 값이 작아 비용은 파일 하나 여는 정도다.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** 언어를 고르지 않았다는 표시. 폰 설정을 따라간다. */
export const SYSTEM_LOCALE = 'system';

export type DisplayPrefs = {
  /** 'system' 이면 폰의 밝기 설정을 따라간다. */
  theme: ThemeChoice;
  /** 'system' 이거나 우리가 가진 언어 태그. */
  locale: string;
};

export const DEFAULT_PREFS: DisplayPrefs = { theme: 'system', locale: SYSTEM_LOCALE };

function isTheme(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && THEME_CHOICES.includes(value as ThemeChoice);
}

/**
 * 저장된 값을 지금 쓸 수 있는 값으로 다듬는다.
 *
 * 모르는 값은 버리고 기본값으로 돌린다. 앱을 되돌려 깔거나(예전 판에는 없던 값),
 * 언어를 하나 빼면 저장된 값이 지금 못 쓰는 값일 수 있다. 그때 화면이 비거나
 * 멈추는 대신 폰 설정을 따라가면 된다.
 */
export function mergePrefs(stored: unknown, available: readonly string[]): DisplayPrefs {
  const raw = (stored ?? {}) as Partial<DisplayPrefs>;
  const locale =
    typeof raw.locale === 'string' && (raw.locale === SYSTEM_LOCALE || available.includes(raw.locale))
      ? raw.locale
      : DEFAULT_PREFS.locale;
  return { theme: isTheme(raw.theme) ? raw.theme : DEFAULT_PREFS.theme, locale };
}

/**
 * 감쌀 때 함께 묶는 표시.
 *
 * 실패 기록은 context('guard', 1) 로 묶여 있다. 표시가 다르면 두 파일을 바꿔치기해도
 * 열리지 않는다 — 실패 기록 파일을 화면 설정 자리에 갖다 놓아 대기 시간을 지우는
 * 식의 장난을 막는다.
 */
const PREFS_AAD = context('prefs', 1);

/** 화면 설정을 기기 키로 감싸 보관한다. */
export class DisplayPrefsStore {
  private readonly provider: CryptoProvider;
  private readonly nonces: NonceSource;
  private readonly store: PrefsStore;
  private readonly keyStore: SecureKeyStore;
  private readonly available: readonly string[];

  constructor(deps: {
    provider: CryptoProvider;
    nonces: NonceSource;
    store: PrefsStore;
    keyStore: SecureKeyStore;
    /** 고를 수 있는 언어 목록. 여기 없는 언어가 저장돼 있으면 폰 설정으로 돌린다. */
    available: readonly string[];
  }) {
    this.provider = deps.provider;
    this.nonces = deps.nonces;
    this.store = deps.store;
    this.keyStore = deps.keyStore;
    this.available = deps.available;
  }

  /**
   * 읽는다. 어떤 이유로든 못 읽으면 기본값을 준다.
   *
   * 여기서 던지면 앱이 아예 안 뜬다. 화면 설정 하나 때문에 금고에 못 들어가는
   * 것은 말이 안 된다. 못 읽는 경우는 파일이 아직 없거나(첫 실행), 기기 키가
   * 바뀌었거나(금고 초기화 뒤), 파일이 깨진 경우다. 셋 다 기본값이면 된다.
   */
  async read(): Promise<DisplayPrefs> {
    const blob = await this.store.read();
    if (!blob) return { ...DEFAULT_PREFS };
    const key = await this.keyStore.getDeviceKey();
    if (!key) return { ...DEFAULT_PREFS };
    let bytes: Uint8Array;
    try {
      bytes = await open(this.provider, key, blob, PREFS_AAD);
    } catch {
      return { ...DEFAULT_PREFS };
    } finally {
      wipe(key);
    }
    try {
      return mergePrefs(JSON.parse(bytesToUtf8(bytes)), this.available);
    } catch {
      return { ...DEFAULT_PREFS };
    } finally {
      wipe(bytes);
    }
  }

  /**
   * 쓴다. 기기 키가 아직 없으면 만든다.
   *
   * 첫 실행에서 금고를 만들기 전에도 언어는 고를 수 있어야 한다 — 못 읽는 말로 된
   * 화면에서 금고를 만들라고 할 수는 없다. 기기 키는 어차피 금고를 만들 때 생기는
   * 것이라 조금 먼저 만든다고 달라지는 것은 없다.
   */
  async write(next: DisplayPrefs): Promise<DisplayPrefs> {
    const value = mergePrefs(next, this.available);
    const key = await this.keyStore.getOrCreateDeviceKey();
    const bytes = utf8ToBytes(JSON.stringify(value));
    try {
      const blob = await seal(this.provider, key, this.nonces.next(), bytes, PREFS_AAD);
      await this.store.write(blob);
    } finally {
      wipe(bytes);
      wipe(key);
    }
    return value;
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }
}
