import * as LocalAuthentication from 'expo-local-authentication';

/**
 * 생체인증 (명세 2장). 성공 여부만 알면 된다.
 *
 * **말을 만들지 않는다.** 기기가 무엇을 지원하는지만 돌려주고, 화면에 뭐라고 쓸지는
 * 문장 목록이 정한다. 여기서 "지문·얼굴" 같은 한국어를 만들면 다른 언어로 못 넘어간다.
 */
export type BiometricKind = 'finger' | 'face' | 'both';

export type BiometricSupport = {
  available: boolean;
  kind: BiometricKind;
};

export async function checkBiometricSupport(): Promise<BiometricSupport> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return { available: false, kind: 'both' };
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return { available: true, kind: hasFace && hasFinger ? 'both' : hasFace ? 'face' : 'finger' };
  } catch {
    return { available: false, kind: 'both' };
  }
}

/** 화면에 보여 줄 말은 부르는 쪽이 넘긴다. 이 모듈은 말을 갖지 않는다. */
export type AuthPrompts = { reason: string; cancel: string; fallback: string };

export async function authenticate(prompts: AuthPrompts): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompts.reason,
      cancelLabel: prompts.cancel,
      disableDeviceFallback: false,
      fallbackLabel: prompts.fallback,
    });
    return result.success;
  } catch {
    return false;
  }
}
