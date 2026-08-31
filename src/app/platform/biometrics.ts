import * as LocalAuthentication from 'expo-local-authentication';

/** 생체인증 (명세 2장). 성공 여부만 알면 된다. */
export type BiometricSupport = {
  available: boolean;
  /** 화면에 보여 줄 이름: "지문", "얼굴", "지문·얼굴" */
  label: string;
};

export async function checkBiometricSupport(): Promise<BiometricSupport> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return { available: false, label: '지문·얼굴' };
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const label = hasFace && hasFinger ? '지문·얼굴' : hasFace ? '얼굴' : '지문';
    return { available: true, label };
  } catch {
    return { available: false, label: '지문·얼굴' };
  }
}

export async function authenticate(reason = '금고를 열려면 확인이 필요합니다'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: '취소',
      disableDeviceFallback: false,
      fallbackLabel: 'PIN으로 열기',
    });
    return result.success;
  } catch {
    return false;
  }
}
