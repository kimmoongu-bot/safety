import * as SecureStore from 'expo-secure-store';
import type { CryptoProvider } from '../../core/crypto/types.ts';
import { AES_KEY_BYTES } from '../../core/crypto/types.ts';
import { fromBase64, toBase64 } from '../../core/bytes.ts';
import type { SecureKeyStore } from '../../core/ports.ts';

/**
 * OS 키 저장소 구현 (Android Keystore / iOS Keychain) — 명세 5.3
 *
 * 여기에 DEK 원본은 절대 들어가지 않는다. 들어가는 것은
 *  - 기기 키: 저장된 래핑 결과를 한 겹 더 감싸는 키
 *  - 생체 키: 생체인증을 통과해야만 읽을 수 있는 키
 * 두 개뿐이다.
 *
 * 두 키를 나눈 이유: 생체 키는 생체정보가 새로 등록되면 무효화되도록 켜 둔다.
 * 기기 키까지 같이 무효화되면 PIN 도 복구 코드도 못 쓰게 되므로 분리한다.
 */
const DEVICE_KEY = 'jamgim.device.key.v1';
const BIOMETRIC_KEY = 'jamgim.biometric.key.v1';

const DEVICE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

// 생체인증을 통과해야만 값을 내준다. 생체정보가 재등록되면 이 항목은 무효가 된다.
const BIOMETRIC_BASE: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: true,
};

/** 확인 창에 뜨는 문구. 여는 때와 만드는 때가 다르다. */
function biometricOptions(prompt: string): SecureStore.SecureStoreOptions {
  return { ...BIOMETRIC_BASE, authenticationPrompt: prompt };
}

const OPEN_PROMPT = biometricOptions('금고를 열려면 지문이나 얼굴로 확인해 주세요');
const CREATE_PROMPT = biometricOptions('지문이나 얼굴로 열 수 있게 준비합니다. 한 번 확인해 주세요');

export class ExpoSecureKeyStore implements SecureKeyStore {
  private readonly provider: CryptoProvider;

  constructor(provider: CryptoProvider) {
    this.provider = provider;
  }

  async getOrCreateDeviceKey(): Promise<Uint8Array> {
    const existing = await this.getDeviceKey();
    if (existing) return existing;
    const key = this.provider.randomBytes(AES_KEY_BYTES);
    await SecureStore.setItemAsync(DEVICE_KEY, toBase64(key), DEVICE_OPTIONS);
    return key;
  }

  async getDeviceKey(): Promise<Uint8Array | null> {
    const stored = await SecureStore.getItemAsync(DEVICE_KEY, DEVICE_OPTIONS);
    return stored ? fromBase64(stored) : null;
  }

  async createBiometricKey(): Promise<Uint8Array> {
    const key = this.provider.randomBytes(AES_KEY_BYTES);
    await SecureStore.setItemAsync(BIOMETRIC_KEY, toBase64(key), CREATE_PROMPT);
    return key;
  }

  async getBiometricKey(): Promise<Uint8Array | null> {
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_KEY, OPEN_PROMPT);
      return stored ? fromBase64(stored) : null;
    } catch {
      // 인증 취소 또는 생체정보 재등록으로 무효화된 경우. PIN 경로는 그대로 살아 있다.
      return null;
    }
  }

  async deleteBiometricKey(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY, OPEN_PROMPT);
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(DEVICE_KEY, DEVICE_OPTIONS);
    await this.deleteBiometricKey();
  }
}
