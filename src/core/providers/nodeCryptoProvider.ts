import {
  createCipheriv,
  createDecipheriv,
  pbkdf2 as pbkdf2Cb,
  randomBytes as nodeRandomBytes,
  scrypt as scryptCb,
} from 'node:crypto';
import type { AeadOutput, CryptoProvider, KdfAlgorithm, KdfParams } from '../crypto/types.ts';
import { AES_TAG_BYTES } from '../crypto/types.ts';

/**
 * 테스트/개발용 CryptoProvider — node:crypto 기반.
 *
 * 기기에서는 쓰지 않는다. 단위 테스트가 네이티브 모듈 없이 코어 로직 전체를
 * 검증할 수 있게 하는 것이 목적이다 (명세 8장 "UI 없이 단위 테스트만으로").
 * node:crypto 에는 Argon2id 가 없으므로 scrypt 로 내려간다.
 */
export class NodeCryptoProvider implements CryptoProvider {
  readonly name = 'node:crypto';
  readonly kdfSupport: readonly KdfAlgorithm[];

  constructor(kdfSupport: readonly KdfAlgorithm[] = ['scrypt', 'pbkdf2-sha256']) {
    this.kdfSupport = kdfSupport;
  }

  randomBytes(length: number): Uint8Array {
    return new Uint8Array(nodeRandomBytes(length));
  }

  async aeadEncrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array,
  ): Promise<AeadOutput> {
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: AES_TAG_BYTES });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { ciphertext: new Uint8Array(ciphertext), tag: new Uint8Array(cipher.getAuthTag()) };
  }

  async aeadDecrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array> {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: AES_TAG_BYTES });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    // 태그가 맞지 않으면 final() 이 던진다.
    const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return new Uint8Array(out);
  }

  deriveKey(password: Uint8Array, salt: Uint8Array, params: KdfParams): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      if (params.alg === 'scrypt') {
        const maxmem = 256 * params.N * params.r * 2;
        scryptCb(password, salt, params.keyLength, { N: params.N, r: params.r, p: params.p, maxmem }, (err, dk) =>
          err ? reject(err) : resolve(new Uint8Array(dk)),
        );
        return;
      }
      if (params.alg === 'pbkdf2-sha256') {
        pbkdf2Cb(password, salt, params.iterations, params.keyLength, 'sha256', (err, dk) =>
          err ? reject(err) : resolve(new Uint8Array(dk)),
        );
        return;
      }
      reject(new Error(`unsupported kdf for node provider: ${params.alg}`));
    });
  }
}
