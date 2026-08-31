/**
 * 암호 연산 경계.
 *
 * 코어 로직은 이 인터페이스에만 의존한다. 실제 구현은
 *  - 기기: 네이티브 바인딩 (react-native-quick-crypto / argon2 / expo-crypto)
 *  - 테스트: node:crypto
 * 로 주입한다. JS 순수 구현 AES 는 쓰지 않는다 (명세 2장).
 */

export type KdfAlgorithm = 'argon2id' | 'scrypt' | 'pbkdf2-sha256';

export type Argon2idParams = {
  alg: 'argon2id';
  /** 메모리 비용 (KiB) */
  memoryKiB: number;
  /** 반복 횟수 (time cost) */
  iterations: number;
  parallelism: number;
  keyLength: number;
};

export type ScryptParams = {
  alg: 'scrypt';
  N: number;
  r: number;
  p: number;
  keyLength: number;
};

export type Pbkdf2Params = {
  alg: 'pbkdf2-sha256';
  iterations: number;
  keyLength: number;
};

export type KdfParams = Argon2idParams | ScryptParams | Pbkdf2Params;

export type AeadOutput = {
  ciphertext: Uint8Array;
  /** GCM 인증 태그 16바이트. 라이브러리가 합쳐 반환하면 구현체가 분리해 준다. */
  tag: Uint8Array;
};

export interface CryptoProvider {
  readonly name: string;
  /** 이 기기에서 쓸 수 있는 KDF 목록. 강한 순서대로 반환한다. */
  readonly kdfSupport: readonly KdfAlgorithm[];

  /** 암호학적으로 안전한 난수. */
  randomBytes(length: number): Uint8Array;

  /** AES-256-GCM 암호화. key 32바이트, nonce 12바이트. */
  aeadEncrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array,
  ): Promise<AeadOutput>;

  /** AES-256-GCM 복호화. 인증 태그가 맞지 않으면 반드시 예외를 던진다. */
  aeadDecrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array>;

  /** 비밀번호 → 키 유도. */
  deriveKey(password: Uint8Array, salt: Uint8Array, params: KdfParams): Promise<Uint8Array>;
}

export const AES_KEY_BYTES = 32;
export const AES_NONCE_BYTES = 12;
export const AES_TAG_BYTES = 16;
export const KDF_SALT_BYTES = 16;
