import type { CryptoProvider } from './types.ts';
import { AES_KEY_BYTES, AES_NONCE_BYTES, AES_TAG_BYTES } from './types.ts';
import { VaultError } from '../errors.ts';
import { fromBase64, toBase64, utf8ToBytes } from '../bytes.ts';

/** 저장되는 암호문 블롭 (명세 4장 VaultRecord.cipher 와 같은 모양). */
export type SealedBlob = {
  nonce: string; // base64
  ciphertext: string; // base64
  tag: string; // base64
};

/**
 * AAD(추가 인증 데이터)에 쓰는 문맥 문자열.
 * 용도가 다른 암호문을 서로 바꿔치기하는 공격을 막는다.
 * 예: 레코드 A 의 블롭을 레코드 B 자리에 넣어도 태그 검증이 실패한다.
 */
export function context(...parts: (string | number)[]): Uint8Array {
  return utf8ToBytes(['jamgim', ...parts].join('|'));
}

export async function seal(
  provider: CryptoProvider,
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Promise<SealedBlob> {
  if (key.length !== AES_KEY_BYTES) throw new VaultError('CRYPTO_UNAVAILABLE');
  if (nonce.length !== AES_NONCE_BYTES) throw new VaultError('CRYPTO_UNAVAILABLE');
  const { ciphertext, tag } = await provider.aeadEncrypt(key, nonce, plaintext, aad);
  if (tag.length !== AES_TAG_BYTES) throw new VaultError('CRYPTO_UNAVAILABLE');
  return { nonce: toBase64(nonce), ciphertext: toBase64(ciphertext), tag: toBase64(tag) };
}

/**
 * 열기. 인증 태그가 맞지 않으면 지정한 코드로 VaultError 를 던진다.
 * 어떤 경우에도 원본 예외 메시지를 밖으로 내보내지 않는다.
 */
export async function open(
  provider: CryptoProvider,
  key: Uint8Array,
  blob: SealedBlob,
  aad: Uint8Array,
  failureCode: 'WRONG_PIN' | 'WRONG_RECOVERY_CODE' | 'WRONG_BACKUP_PASSWORD' | 'DATA_DAMAGED' = 'DATA_DAMAGED',
): Promise<Uint8Array> {
  let nonce: Uint8Array;
  let ciphertext: Uint8Array;
  let tag: Uint8Array;
  try {
    nonce = fromBase64(blob.nonce);
    ciphertext = fromBase64(blob.ciphertext);
    tag = fromBase64(blob.tag);
  } catch {
    throw new VaultError('DATA_DAMAGED');
  }
  if (nonce.length !== AES_NONCE_BYTES || tag.length !== AES_TAG_BYTES) {
    throw new VaultError('DATA_DAMAGED');
  }
  try {
    return await provider.aeadDecrypt(key, nonce, ciphertext, tag, aad);
  } catch {
    throw new VaultError(failureCode);
  }
}
