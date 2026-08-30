import {
  argon2,
  argon2Sync,
  Buffer,
  createCipheriv,
  createDecipheriv,
  pbkdf2,
  randomBytes,
  scrypt,
} from 'react-native-quick-crypto';
import type { AeadOutput, CryptoProvider, KdfAlgorithm, KdfParams } from '../../core/crypto/types.ts';
import { AES_KEY_BYTES, AES_TAG_BYTES } from '../../core/crypto/types.ts';

/**
 * 기기용 CryptoProvider — react-native-quick-crypto(OpenSSL 바인딩) 하나만 쓴다.
 *
 * AES-256-GCM, Argon2id, scrypt, PBKDF2 가 모두 이 안에 있다. 예전에는 Argon2 만
 * 따로 다른 라이브러리를 썼는데, 네이티브 모듈이 하나 늘면 빌드도 공격 표면도
 * 그만큼 는다. 하나로 합쳤다.
 *
 * JS 로 짠 암호 구현은 쓰지 않는다 (명세 2장).
 */

/**
 * Argon2 가 이 빌드에 실제로 들어 있는지 아주 작은 값으로 한 번 확인한다.
 * 없으면 scrypt → PBKDF2 로 내려간다 (명세 2장). 몇 마이크로초면 끝난다.
 */
function argon2Works(): boolean {
  try {
    const out = argon2Sync('argon2id', {
      message: new Uint8Array(8),
      nonce: new Uint8Array(16),
      parallelism: 1,
      tagLength: AES_KEY_BYTES,
      memory: 32,
      passes: 1,
    });
    return out.length === AES_KEY_BYTES;
  } catch {
    return false;
  }
}

function scryptWorks(): boolean {
  return typeof scrypt === 'function';
}

/** 이 바인딩은 Buffer 를 받는다. Uint8Array 를 그대로 넘기면 타입이 맞지 않는다. */
function buf(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes);
}

/**
 * 이 바인딩의 콜백은 키를 안 줄 수도 있는 형태로 되어 있다.
 * 조용히 빈 키로 넘어가면 안 되므로, 없으면 실패로 처리한다.
 */
function settleKey(
  resolve: (key: Uint8Array) => void,
  reject: (reason: Error) => void,
): (err: Error | null, key?: Uint8Array) => void {
  return (err, key) => {
    if (err) reject(err);
    else if (!key) reject(new Error('key derivation returned nothing'));
    else resolve(new Uint8Array(key));
  };
}

function joined(first: Uint8Array, second: Uint8Array): Uint8Array {
  const out = new Uint8Array(first.length + second.length);
  out.set(first, 0);
  out.set(second, first.length);
  return out;
}

export function createDeviceCryptoProvider(): CryptoProvider {
  const kdfSupport: KdfAlgorithm[] = [];
  if (argon2Works()) kdfSupport.push('argon2id');
  if (scryptWorks()) kdfSupport.push('scrypt');
  kdfSupport.push('pbkdf2-sha256'); // 최후 수단은 항상 있다.

  return {
    name: 'react-native-quick-crypto',
    kdfSupport,

    randomBytes(length: number): Uint8Array {
      return new Uint8Array(randomBytes(length));
    },

    async aeadEncrypt(key, nonce, plaintext, aad): Promise<AeadOutput> {
      const cipher = createCipheriv('aes-256-gcm', buf(key), buf(nonce), { authTagLength: AES_TAG_BYTES });
      cipher.setAAD(buf(aad));
      const ciphertext = joined(
        new Uint8Array(cipher.update(buf(plaintext)) ?? []),
        new Uint8Array(cipher.final() ?? []),
      );
      return { ciphertext, tag: new Uint8Array(cipher.getAuthTag()) };
    },

    async aeadDecrypt(key, nonce, ciphertext, tag, aad): Promise<Uint8Array> {
      const decipher = createDecipheriv('aes-256-gcm', buf(key), buf(nonce), {
        authTagLength: AES_TAG_BYTES,
      });
      decipher.setAAD(buf(aad));
      decipher.setAuthTag(buf(tag));
      const head = new Uint8Array(decipher.update(buf(ciphertext)) ?? []);
      // 인증 태그가 맞지 않으면 final() 이 던진다. 코어가 그것을 오답으로 읽는다.
      return joined(head, new Uint8Array(decipher.final() ?? []));
    },

    deriveKey(password: Uint8Array, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
      if (params.alg === 'argon2id') {
        return new Promise((resolve, reject) =>
          argon2(
            'argon2id',
            {
              message: buf(password),
              nonce: buf(salt), // Argon2 에서 nonce 가 곧 salt 다.
              parallelism: params.parallelism,
              tagLength: params.keyLength,
              memory: params.memoryKiB,
              passes: params.iterations,
            },
            (err, key) => (err ? reject(err) : resolve(new Uint8Array(key))),
          ),
        );
      }
      if (params.alg === 'scrypt') {
        return new Promise((resolve, reject) =>
          scrypt(
            buf(password),
            buf(salt),
            params.keyLength,
            { N: params.N, r: params.r, p: params.p, maxmem: 256 * params.N * params.r * 2 },
            settleKey(resolve, reject),
          ),
        );
      }
      return new Promise((resolve, reject) =>
        pbkdf2(
          buf(password),
          buf(salt),
          params.iterations,
          params.keyLength,
          'sha256',
          settleKey(resolve, reject),
        ),
      );
    },
  };
}
