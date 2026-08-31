import type { CryptoProvider } from './crypto/types.ts';
import type { NonceSource } from './crypto/nonce.ts';
import { context, open, seal } from './crypto/aead.ts';
import { bytesToUtf8, utf8ToBytes, wipe } from './bytes.ts';
import { VaultError } from './errors.ts';
import { RECORD_SCHEMA_VERSION, type VaultPayload, type VaultRecord } from './schema.ts';

/**
 * 레코드 암·복호화.
 *
 * AAD 에 레코드 id 와 구조 버전을 넣는다. 그래서 어떤 레코드의 암호문을
 * 다른 레코드 자리에 옮겨 붙여도 열리지 않는다.
 */
function recordAad(id: string, schemaVersion: number): Uint8Array {
  return context('record', schemaVersion, id);
}

export function emptyPayload(now: number): VaultPayload {
  return { service: '', username: '', password: '', memo: '', category: '', pwChangedAt: now };
}

function normalizePayload(payload: VaultPayload): VaultPayload {
  const out: VaultPayload = {
    service: payload.service ?? '',
    username: payload.username ?? '',
    password: payload.password ?? '',
    memo: payload.memo ?? '',
    category: payload.category ?? '',
    pwChangedAt: payload.pwChangedAt ?? 0,
  };
  if (payload.prevPassword) out.prevPassword = payload.prevPassword;
  return out;
}

export async function encryptPayload(
  provider: CryptoProvider,
  nonces: NonceSource,
  dek: Uint8Array,
  base: Omit<VaultRecord, 'cipher'>,
  payload: VaultPayload,
): Promise<VaultRecord> {
  const plaintext = utf8ToBytes(JSON.stringify(normalizePayload(payload)));
  try {
    const cipher = await seal(
      provider,
      dek,
      nonces.next(),
      plaintext,
      recordAad(base.id, base.schemaVersion),
    );
    return { ...base, cipher };
  } finally {
    wipe(plaintext);
  }
}

export async function decryptRecord(
  provider: CryptoProvider,
  dek: Uint8Array,
  record: VaultRecord,
): Promise<VaultPayload> {
  if (record.schemaVersion > RECORD_SCHEMA_VERSION) {
    // 더 새로운 앱이 만든 레코드다. 잘못 읽어 덮어쓰지 않도록 멈춘다.
    throw new VaultError('UNSUPPORTED_FORMAT');
  }
  const bytes = await open(provider, dek, record.cipher, recordAad(record.id, record.schemaVersion));
  try {
    const parsed = JSON.parse(bytesToUtf8(bytes)) as VaultPayload;
    return normalizePayload(parsed);
  } catch (e) {
    if (e instanceof VaultError) throw e;
    throw new VaultError('DATA_DAMAGED');
  } finally {
    wipe(bytes);
  }
}
