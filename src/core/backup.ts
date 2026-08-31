import type { CryptoProvider, KdfParams } from './crypto/types.ts';
import { KDF_SALT_BYTES } from './crypto/types.ts';
import type { SealedBlob } from './crypto/aead.ts';
import { open, seal } from './crypto/aead.ts';
import { defaultParams, deriveKek } from './crypto/kdf.ts';
import type { NonceSource } from './crypto/nonce.ts';
import { bytesToUtf8, fromBase64, toBase64, utf8ToBytes, wipe } from './bytes.ts';
import { VaultError } from './errors.ts';
import { unwrapWithSecret } from './keys.ts';
import { RECORD_SCHEMA_VERSION, findWrap, type OpenRecord, type VaultPayload } from './schema.ts';
import type { Vault } from './vault.ts';

/**
 * 암호화 백업 파일 (.jamgim) — 명세 6.2
 *
 * 헤더(포맷 버전, KDF 파라미터, salt, nonce)는 평문이고 내용은 암호문 한 덩어리다.
 * 헤더 전체를 AAD 로 묶어서, 파라미터를 몰래 낮춰 놓는 조작이 통하지 않게 한다.
 *
 * 백업 비밀번호는 앱 PIN 과 따로 받는다. 가족이 앱 PIN 을 알고 있을 가능성이
 * 높기 때문이다.
 */
export const BACKUP_FORMAT = 'jamgim-backup';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_FILE_EXTENSION = '.jamgim';
export const MIN_BACKUP_PASSWORD_LENGTH = 8;
/** 마지막 백업 후 이 기간이 지나면 갱신을 권한다 (명세 6.3). */
export const BACKUP_REMINDER_DAYS = 90;

export type BackupHeader = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: number;
  recordCount: number;
  recordSchemaVersion: number;
  kdf: KdfParams;
  salt: string; // base64
};

export type BackupFile = BackupHeader & { cipher: SealedBlob };

export type BackupEntry = {
  id: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  schemaVersion: number;
  payload: VaultPayload;
};

type BackupBody = { entries: BackupEntry[] };

/** 헤더를 키 순서까지 고정해 직렬화한다. AAD 는 양쪽에서 똑같이 만들어져야 한다. */
function headerAad(header: BackupHeader): Uint8Array {
  return utf8ToBytes(
    JSON.stringify([
      header.format,
      header.version,
      header.createdAt,
      header.recordCount,
      header.recordSchemaVersion,
      header.kdf,
      header.salt,
    ]),
  );
}

export function assertBackupPassword(password: string): void {
  if (password.trim().length < MIN_BACKUP_PASSWORD_LENGTH) {
    throw new VaultError('INVALID_INPUT', `백업 비밀번호는 ${MIN_BACKUP_PASSWORD_LENGTH}자 이상으로 정해 주세요.`);
  }
}

function two(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 잠김_백업_삭제금지_YYYYMMDD.jamgim */
export function backupFileName(at: number): string {
  const d = new Date(at);
  return `잠김_백업_삭제금지_${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}${BACKUP_FILE_EXTENSION}`;
}

export function backupIsStale(lastBackupAt: number | undefined, now: number): boolean {
  if (!lastBackupAt) return true;
  return now - lastBackupAt > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * 백업 비밀번호가 앱 PIN 과 같은지 확인한다.
 * 같다면 백업 파일이 사실상 PIN 하나로 열리는 셈이라 막는다 (명세 6.2).
 */
export async function backupPasswordEqualsPin(vault: Vault, password: string): Promise<boolean> {
  const candidate = password.trim();
  if (!/^\d{4,}$/.test(candidate)) return false; // PIN 은 숫자다. 아니면 같을 수 없다.
  const meta = await vault.readMeta();
  const wrap = findWrap(meta, 'pin');
  if (!wrap) return false;
  const { provider } = vault.internals();
  const deviceKey = await vault.deviceKeyForCheck();
  const secret = utf8ToBytes(candidate);
  try {
    const dek = await unwrapWithSecret(provider, meta, wrap, secret, deviceKey);
    wipe(dek);
    return true;
  } catch {
    return false;
  } finally {
    wipe(secret);
  }
}

export async function buildBackupFile(
  provider: CryptoProvider,
  nonces: NonceSource,
  entries: BackupEntry[],
  password: string,
  now: number,
  kdf?: KdfParams,
): Promise<BackupFile> {
  assertBackupPassword(password);
  const params = kdf ?? defaultParams(provider);
  const salt = provider.randomBytes(KDF_SALT_BYTES);
  const header: BackupHeader = {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    createdAt: now,
    recordCount: entries.length,
    recordSchemaVersion: RECORD_SCHEMA_VERSION,
    kdf: params,
    salt: toBase64(salt),
  };
  const secret = utf8ToBytes(password.trim());
  const key = await deriveKek(provider, secret, salt, params);
  const body = utf8ToBytes(JSON.stringify({ entries } satisfies BackupBody));
  try {
    const cipher = await seal(provider, key, nonces.next(), body, headerAad(header));
    return { ...header, cipher };
  } finally {
    wipe(secret, key, body);
  }
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file);
}

export function parseBackup(contents: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new VaultError('UNSUPPORTED_FORMAT');
  }
  const file = parsed as Partial<BackupFile>;
  if (file?.format !== BACKUP_FORMAT || typeof file.version !== 'number') {
    throw new VaultError('UNSUPPORTED_FORMAT');
  }
  if (file.version > BACKUP_FORMAT_VERSION) throw new VaultError('UNSUPPORTED_FORMAT');
  if (!file.kdf || !file.salt || !file.cipher) throw new VaultError('UNSUPPORTED_FORMAT');
  return file as BackupFile;
}

/**
 * 백업 파일 열기. 비밀번호가 틀리면 WRONG_BACKUP_PASSWORD 를 던진다.
 * 어떤 입력에도 앱이 죽지 않아야 한다 (명세 8장 DoD).
 */
export async function readBackupFile(
  provider: CryptoProvider,
  contents: string,
  password: string,
): Promise<{ header: BackupHeader; entries: BackupEntry[] }> {
  const file = parseBackup(contents);
  const { cipher, ...header } = file;
  let salt: Uint8Array;
  try {
    salt = fromBase64(header.salt);
  } catch {
    throw new VaultError('UNSUPPORTED_FORMAT');
  }
  const secret = utf8ToBytes(password.trim());
  let key: Uint8Array;
  try {
    key = await deriveKek(provider, secret, salt, header.kdf);
  } catch (e) {
    wipe(secret);
    if (e instanceof VaultError) throw e;
    throw new VaultError('UNSUPPORTED_FORMAT');
  }
  let plain: Uint8Array;
  try {
    plain = await open(provider, key, cipher, headerAad(header), 'WRONG_BACKUP_PASSWORD');
  } finally {
    wipe(secret, key);
  }
  try {
    const body = JSON.parse(bytesToUtf8(plain)) as BackupBody;
    if (!Array.isArray(body?.entries)) throw new Error('shape');
    return { header, entries: body.entries };
  } catch {
    throw new VaultError('DATA_DAMAGED');
  } finally {
    wipe(plain);
  }
}

export function toBackupEntry(record: OpenRecord): BackupEntry {
  const { id, createdAt, updatedAt, favorite, schemaVersion, ...payload } = record;
  return { id, createdAt, updatedAt, favorite, schemaVersion, payload };
}
