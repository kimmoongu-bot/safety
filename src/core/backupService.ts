import { VaultError } from './errors.ts';
import { encryptPayload } from './records.ts';
import { RECORD_SCHEMA_VERSION, type VaultRecord } from './schema.ts';
import type { Vault } from './vault.ts';
import {
  backupFileName,
  backupPasswordEqualsPin,
  buildBackupFile,
  readBackupFile,
  serializeBackup,
  toBackupEntry,
  type BackupEntry,
  type BackupHeader,
} from './backup.ts';

/** 내보내기: 금고가 열려 있어야 한다. */
export async function exportBackup(
  vault: Vault,
  backupPassword: string,
  now: number,
): Promise<{ fileName: string; contents: string; recordCount: number }> {
  const { provider, nonces } = vault.internals();
  if (await backupPasswordEqualsPin(vault, backupPassword)) {
    throw new VaultError('INVALID_INPUT', '백업 비밀번호는 앱 PIN과 다르게 정해 주세요.');
  }
  const entries = (await vault.listOpenRecords()).map(toBackupEntry);
  const file = await buildBackupFile(provider, nonces, entries, backupPassword, now);
  await vault.markBackedUp(now);
  return { fileName: backupFileName(now), contents: serializeBackup(file), recordCount: entries.length };
}

/** 파일 훑어보기 — 비밀번호를 확인하고 몇 건인지만 알려 준다. */
export async function previewBackup(
  vault: Vault,
  contents: string,
  backupPassword: string,
): Promise<{ header: BackupHeader; entries: BackupEntry[] }> {
  const { provider } = vault.internals();
  return readBackupFile(provider, contents, backupPassword);
}

/**
 * 가져오기: 열려 있는 금고의 내용을 파일 내용으로 바꾼다.
 * 새 기기에서는 먼저 PIN 으로 금고를 만든 뒤 이 함수를 부른다.
 */
export async function restoreBackup(
  vault: Vault,
  contents: string,
  backupPassword: string,
  options?: { mode?: 'replace' | 'merge' },
): Promise<{ restored: number; skipped: number }> {
  const { provider, nonces, dek } = vault.internals();
  const { entries } = await readBackupFile(provider, contents, backupPassword);
  const mode = options?.mode ?? 'replace';

  const existing = mode === 'merge' ? await vault.listOpenRecords() : [];
  const existingIds = new Set(existing.map((r) => r.id));

  const records: VaultRecord[] = [];
  let skipped = 0;
  for (const entry of entries) {
    if (mode === 'merge' && existingIds.has(entry.id)) {
      skipped += 1;
      continue;
    }
    if (entry.schemaVersion > RECORD_SCHEMA_VERSION) {
      skipped += 1; // 더 새로운 앱이 만든 항목이다. 건드리지 않는다.
      continue;
    }
    records.push(
      await encryptPayload(
        provider,
        nonces,
        dek,
        {
          id: entry.id,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          favorite: !!entry.favorite,
          schemaVersion: RECORD_SCHEMA_VERSION,
        },
        entry.payload,
      ),
    );
  }

  if (mode === 'replace') await vault.replaceAllRecords(records);
  else for (const record of records) await vault.internalPut(record);

  return { restored: records.length, skipped };
}
