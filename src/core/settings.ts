/** 설정 화면(07)에서 바꾸는 값들. 비밀은 아니지만 기기 키로 암호화해 함께 보관한다. */
export type AutoLockChoice = 'immediate' | '1m' | '5m';

export type AppSettings = {
  /** 자동 잠금. 기본 1분 (명세 5.5). */
  autoLock: AutoLockChoice;
  /** 생체인증으로 열기 사용 여부. */
  biometricUnlock: boolean;
  /** 복사한 내용을 몇 초 뒤에 지울지. 기본 60초. */
  clipboardClearSeconds: number;
  /** 화면 캡처 차단. 기본 켜짐. */
  blockScreenCapture: boolean;
  /** 직전 비밀번호 1개 보관 (명세 7장). */
  keepPreviousPassword: boolean;
  /** 10회 연속 실패 시 금고 소거. 기본 꺼짐 (명세 5.4). */
  wipeAfterTenFailures: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoLock: '1m',
  biometricUnlock: false,
  clipboardClearSeconds: 60,
  blockScreenCapture: true,
  keepPreviousPassword: true,
  wipeAfterTenFailures: false,
};

export const AUTO_LOCK_MS: Record<AutoLockChoice, number> = {
  immediate: 0,
  '1m': 60_000,
  '5m': 5 * 60_000,
};

export const CLIPBOARD_CHOICES = [30, 60, 120] as const;

export function mergeSettings(stored: Partial<AppSettings> | undefined): AppSettings {
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}
