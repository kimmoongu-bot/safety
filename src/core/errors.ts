/**
 * 금고 오류.
 *
 * **여기에 사람이 읽을 문장은 없다.** 코드만 들고 있고, 말은 화면 쪽 문장 목록이
 * 정한다 (`src/app/i18n/`). 코어에 한국어를 박아 두면 번역자가 손대야 할 파일이
 * 두 곳이 되고, 한 곳을 옮기면 다른 곳이 남는다 (`docs/국제화.md`).
 *
 * 코드는 두 층이다.
 *  - `code` — 무슨 종류의 실패인가. 화면이 갈래를 나눌 때 쓴다.
 *  - `detail` — 같은 종류 안에서 **다른 말이 필요한** 경우. 예를 들어 '금고가 잠겨
 *    있다' 는 지문이 준비되지 않은 경우와 지문 정보가 바뀐 경우가 있는데, 둘은
 *    사용자가 해야 할 일이 다르다.
 *
 * 코드 이름 자체는 화면에 나가지 않는다. 문장을 못 찾으면 열쇠 이름이 보이는데,
 * 그건 빈칸보다 낫다 — 눈에 띄어야 고친다.
 */
export type VaultErrorCode =
  | 'WRONG_PIN'
  | 'WRONG_RECOVERY_CODE'
  | 'WRONG_BACKUP_PASSWORD'
  | 'LOCKED_OUT'
  | 'VAULT_NOT_FOUND'
  | 'VAULT_ALREADY_EXISTS'
  | 'DATA_DAMAGED'
  | 'UNSUPPORTED_FORMAT'
  | 'CRYPTO_UNAVAILABLE'
  | 'VAULT_LOCKED'
  | 'INVALID_INPUT';

/**
 * 같은 종류 안에서 말이 달라야 하는 경우들.
 *
 * 여기 없는 실패는 `code` 의 기본 문장으로 나간다.
 */
export type VaultErrorDetail =
  /** 백업 비밀번호를 앱 PIN 과 같게 정하려 했다. */
  | 'BACKUP_PASSWORD_SAME_AS_PIN'
  /** 백업 비밀번호가 너무 짧다. `{count}` 자 이상이어야 한다. */
  | 'BACKUP_PASSWORD_TOO_SHORT'
  /** 연속 실패가 문턱을 넘어 금고를 지웠다 (명세 5.4). */
  | 'WIPED_AFTER_FAILURES'
  /** 이 기기에 지문·얼굴로 여는 것이 준비되어 있지 않다. */
  | 'BIOMETRIC_NOT_SET_UP'
  /** 지문·얼굴 정보가 새로 등록되어 예전 키가 무효가 됐다. */
  | 'BIOMETRIC_CHANGED'
  /** 찾는 항목이 없다. */
  | 'RECORD_NOT_FOUND'
  /** 복구 코드 사본이 없어 다시 보여 줄 수 없다. */
  | 'NO_RECOVERY_CODE_COPY';

/** 문장에 끼워 넣을 값. `{count}` 같은 자리에 들어간다. */
export type VaultErrorParams = Record<string, string | number>;

export class VaultError extends Error {
  readonly code: VaultErrorCode;
  readonly detail?: VaultErrorDetail;
  readonly params?: VaultErrorParams;

  constructor(code: VaultErrorCode, detail?: VaultErrorDetail, params?: VaultErrorParams) {
    super(code); // message 에는 코드만. 비밀값이 스택에 섞이지 않게 한다.
    this.name = 'VaultError';
    this.code = code;
    this.detail = detail;
    this.params = params;
  }
}

export function isVaultError(e: unknown, code?: VaultErrorCode): e is VaultError {
  return e instanceof VaultError && (code === undefined || e.code === code);
}
