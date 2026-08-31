/**
 * 금고 오류 — 화면에 그대로 보여줄 수 있는 쉬운 한국어 메시지를 함께 갖는다.
 * 전문 용어("복호화" 등)를 쓰지 않는다 (명세 3장 UI 원칙).
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

const MESSAGES: Record<VaultErrorCode, string> = {
  WRONG_PIN: 'PIN(핀)이 맞지 않습니다.',
  WRONG_RECOVERY_CODE: '복구 코드가 맞지 않습니다.',
  WRONG_BACKUP_PASSWORD: '백업 비밀번호가 맞지 않습니다.',
  LOCKED_OUT: '여러 번 틀렸습니다. 잠시 뒤에 다시 해 주세요.',
  VAULT_NOT_FOUND: '금고가 아직 없습니다.',
  VAULT_ALREADY_EXISTS: '이미 금고가 있습니다.',
  DATA_DAMAGED: '저장된 내용이 손상되었습니다.',
  UNSUPPORTED_FORMAT: '이 파일은 잠김 백업 파일이 아니거나 버전이 다릅니다.',
  CRYPTO_UNAVAILABLE: '이 기기에서는 금고를 안전하게 쓸 수 없습니다.',
  VAULT_LOCKED: '금고가 잠겨 있습니다.',
  INVALID_INPUT: '입력한 내용을 확인해 주세요.',
};

export class VaultError extends Error {
  readonly code: VaultErrorCode;
  /** 사용자에게 보여줄 문장. 내부 원인은 절대 포함하지 않는다. */
  readonly userMessage: string;

  constructor(code: VaultErrorCode, userMessage?: string) {
    super(code); // message 에는 코드만. 비밀값이 스택에 섞이지 않게 한다.
    this.name = 'VaultError';
    this.code = code;
    this.userMessage = userMessage ?? MESSAGES[code];
  }
}

export function isVaultError(e: unknown, code?: VaultErrorCode): e is VaultError {
  return e instanceof VaultError && (code === undefined || e.code === code);
}
