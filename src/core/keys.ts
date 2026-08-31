import type { CryptoProvider, KdfParams } from './crypto/types.ts';
import { AES_KEY_BYTES, KDF_SALT_BYTES } from './crypto/types.ts';
import type { SealedBlob } from './crypto/aead.ts';
import { context, open, seal } from './crypto/aead.ts';
import type { NonceSource } from './crypto/nonce.ts';
import { deriveKek } from './crypto/kdf.ts';
import { fromBase64, toBase64, utf8ToBytes, bytesToUtf8, wipe } from './bytes.ts';
import { VaultError } from './errors.ts';
import type { VaultMeta, WrapSlot, WrappedDek } from './schema.ts';

/**
 * 키 계층 (명세 5.1)
 *
 *   사용자 PIN ──KDF──▶ KEK(PIN)  ─┐
 *                                  ├─▶ wrap(DEK) ─▶ 기기 키로 한 겹 더 ─▶ 저장
 *   복구 코드  ──KDF──▶ KEK(RC)   ─┘
 *   생체 키(키 저장소) ────────────┘
 *
 * DEK 는 무작위 32바이트다. PIN 에서 직접 만들지 않는다.
 * 저장되는 것은 "감싼 결과"뿐이고, 기기 키는 OS 키 저장소에만 있다.
 */

export function generateDek(provider: CryptoProvider): Uint8Array {
  return provider.randomBytes(AES_KEY_BYTES);
}

function innerAad(vaultId: string, slot: WrapSlot): Uint8Array {
  return context('dek-wrap', 1, vaultId, slot);
}

function outerAad(vaultId: string, slot: WrapSlot): Uint8Array {
  return context('device-wrap', 1, vaultId, slot);
}

/** KEK 로 DEK 를 감싸고, 그 결과를 기기 키로 한 번 더 감싼다. */
async function doubleWrap(
  provider: CryptoProvider,
  nonces: NonceSource,
  vaultId: string,
  slot: WrapSlot,
  kek: Uint8Array,
  deviceKey: Uint8Array,
  dek: Uint8Array,
): Promise<SealedBlob> {
  const inner = await seal(provider, kek, nonces.next(), dek, innerAad(vaultId, slot));
  const innerBytes = utf8ToBytes(JSON.stringify(inner));
  return seal(provider, deviceKey, nonces.next(), innerBytes, outerAad(vaultId, slot));
}

async function doubleUnwrap(
  provider: CryptoProvider,
  vaultId: string,
  slot: WrapSlot,
  kek: Uint8Array,
  deviceKey: Uint8Array,
  blob: SealedBlob,
  failureCode: 'WRONG_PIN' | 'WRONG_RECOVERY_CODE' | 'DATA_DAMAGED',
): Promise<Uint8Array> {
  // 바깥 겹이 실패하면 기기 키가 맞지 않는 것이다 (PIN 오답이 아니다).
  const innerBytes = await open(provider, deviceKey, blob, outerAad(vaultId, slot), 'DATA_DAMAGED');
  let inner: SealedBlob;
  try {
    inner = JSON.parse(bytesToUtf8(innerBytes)) as SealedBlob;
  } catch {
    throw new VaultError('DATA_DAMAGED');
  } finally {
    wipe(innerBytes);
  }
  const dek = await open(provider, kek, inner, innerAad(vaultId, slot), failureCode);
  if (dek.length !== AES_KEY_BYTES) throw new VaultError('DATA_DAMAGED');
  return dek;
}

/** PIN / 복구 코드처럼 KDF 를 거치는 슬롯을 만든다. */
export async function createSecretWrap(
  provider: CryptoProvider,
  nonces: NonceSource,
  vaultId: string,
  slot: 'pin' | 'recovery',
  secret: Uint8Array,
  kdf: KdfParams,
  deviceKey: Uint8Array,
  dek: Uint8Array,
): Promise<WrappedDek> {
  const salt = provider.randomBytes(KDF_SALT_BYTES);
  const kek = await deriveKek(provider, secret, salt, kdf);
  try {
    const blob = await doubleWrap(provider, nonces, vaultId, slot, kek, deviceKey, dek);
    return { slot, kdf, salt: toBase64(salt), blob };
  } finally {
    wipe(kek);
  }
}

/** 생체 슬롯: 키 저장소의 생체 키를 KEK 로 그대로 쓴다 (KDF 불필요). */
export async function createBiometricWrap(
  provider: CryptoProvider,
  nonces: NonceSource,
  vaultId: string,
  biometricKey: Uint8Array,
  deviceKey: Uint8Array,
  dek: Uint8Array,
): Promise<WrappedDek> {
  const blob = await doubleWrap(provider, nonces, vaultId, 'biometric', biometricKey, deviceKey, dek);
  return { slot: 'biometric', blob };
}

/**
 * PIN(또는 복구 코드)으로 DEK 를 꺼낸다.
 *
 * 명세 5.2: PIN 해시를 저장해 비교하지 않는다. 인증 태그 검증이 통과하면
 * 맞는 PIN 이고, 실패하면 오답이다.
 */
export async function unwrapWithSecret(
  provider: CryptoProvider,
  meta: VaultMeta,
  wrap: WrappedDek,
  secret: Uint8Array,
  deviceKey: Uint8Array,
): Promise<Uint8Array> {
  if (!wrap.kdf || !wrap.salt) throw new VaultError('DATA_DAMAGED');
  const failureCode = wrap.slot === 'pin' ? 'WRONG_PIN' : 'WRONG_RECOVERY_CODE';
  const kek = await deriveKek(provider, secret, fromBase64(wrap.salt), wrap.kdf);
  try {
    return await doubleUnwrap(provider, meta.vaultId, wrap.slot, kek, deviceKey, wrap.blob, failureCode);
  } finally {
    wipe(kek);
  }
}

export async function unwrapWithBiometricKey(
  provider: CryptoProvider,
  meta: VaultMeta,
  wrap: WrappedDek,
  biometricKey: Uint8Array,
  deviceKey: Uint8Array,
): Promise<Uint8Array> {
  return doubleUnwrap(provider, meta.vaultId, 'biometric', biometricKey, deviceKey, wrap.blob, 'DATA_DAMAGED');
}
