import type { AeadOutput, CryptoProvider, KdfAlgorithm, KdfParams } from '../../core/crypto/types.ts';
import { AES_TAG_BYTES } from '../../core/crypto/types.ts';

/**
 * 기기용 CryptoProvider.
 *
 * AES-GCM 과 PBKDF2 는 react-native-quick-crypto(OpenSSL 바인딩)를,
 * Argon2id 는 react-native-argon2(네이티브 구현)를 쓴다.
 * JS 로 짠 AES 구현은 쓰지 않는다 (명세 2장).
 *
 * ⚠ 착수 전 확인 사항 (명세 2장): 아래 두 라이브러리는 버전에 따라 API 가
 * 달라진다. 실제 빌드 전에 설치된 버전의 함수 시그니처를 확인하고,
 * 없으면 kdfSupport 에서 빼서 다음 후보(scrypt → PBKDF2)로 내려가게 한다.
 */

type QuickCrypto = {
  randomBytes(size: number): Uint8Array;
  createCipheriv(alg: string, key: Uint8Array, iv: Uint8Array, options?: unknown): any;
  createDecipheriv(alg: string, key: Uint8Array, iv: Uint8Array, options?: unknown): any;
  pbkdf2(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: string,
    cb: (err: Error | null, key: Uint8Array) => void,
  ): void;
  scrypt?: (
    password: Uint8Array,
    salt: Uint8Array,
    keylen: number,
    options: { N: number; r: number; p: number; maxmem?: number },
    cb: (err: Error | null, key: Uint8Array) => void,
  ) => void;
};

type Argon2Fn = (
  password: string,
  salt: string,
  config: { iterations: number; memory: number; parallelism: number; hashLength: number; mode: string },
) => Promise<{ rawHash: string }>;

function loadQuickCrypto(): QuickCrypto {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-quick-crypto');
  return (mod.default ?? mod) as QuickCrypto;
}

function loadArgon2(): Argon2Fn | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-argon2');
    return (mod.default ?? mod) as Argon2Fn;
  } catch {
    return null;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function createDeviceCryptoProvider(): CryptoProvider {
  const qc = loadQuickCrypto();
  const argon2 = loadArgon2();

  const support: KdfAlgorithm[] = [];
  if (argon2) support.push('argon2id');
  if (typeof qc.scrypt === 'function') support.push('scrypt');
  support.push('pbkdf2-sha256'); // 최후 수단은 항상 있다.

  return {
    name: 'react-native',
    kdfSupport: support,

    randomBytes(length: number): Uint8Array {
      return new Uint8Array(qc.randomBytes(length));
    },

    async aeadEncrypt(key, nonce, plaintext, aad): Promise<AeadOutput> {
      const cipher = qc.createCipheriv('aes-256-gcm', key, nonce, { authTagLength: AES_TAG_BYTES });
      cipher.setAAD(aad);
      const first = cipher.update(plaintext);
      const rest = cipher.final();
      const ciphertext = new Uint8Array(first.length + rest.length);
      ciphertext.set(new Uint8Array(first), 0);
      ciphertext.set(new Uint8Array(rest), first.length);
      return { ciphertext, tag: new Uint8Array(cipher.getAuthTag()) };
    },

    async aeadDecrypt(key, nonce, ciphertext, tag, aad): Promise<Uint8Array> {
      const decipher = qc.createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: AES_TAG_BYTES });
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      const first = decipher.update(ciphertext);
      const rest = decipher.final(); // 태그가 맞지 않으면 여기서 던진다.
      const out = new Uint8Array(first.length + rest.length);
      out.set(new Uint8Array(first), 0);
      out.set(new Uint8Array(rest), first.length);
      return out;
    },

    deriveKey(password: Uint8Array, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
      if (params.alg === 'argon2id') {
        if (!argon2) return Promise.reject(new Error('argon2 unavailable'));
        // 이 바인딩은 문자열을 받는다. 16진 문자열로 넘겨 바이트를 그대로 전달한다.
        return argon2(bytesToHex(password), bytesToHex(salt), {
          iterations: params.iterations,
          memory: params.memoryKiB,
          parallelism: params.parallelism,
          hashLength: params.keyLength,
          mode: 'argon2id',
        }).then((r) => hexToBytes(r.rawHash));
      }
      if (params.alg === 'scrypt') {
        const scrypt = qc.scrypt;
        if (!scrypt) return Promise.reject(new Error('scrypt unavailable'));
        return new Promise((resolve, reject) =>
          scrypt(
            password,
            salt,
            params.keyLength,
            { N: params.N, r: params.r, p: params.p, maxmem: 256 * params.N * params.r * 2 },
            (err, key) => (err ? reject(err) : resolve(new Uint8Array(key))),
          ),
        );
      }
      return new Promise((resolve, reject) =>
        qc.pbkdf2(password, salt, params.iterations, params.keyLength, 'sha256', (err, key) =>
          err ? reject(err) : resolve(new Uint8Array(key)),
        ),
      );
    },
  };
}
