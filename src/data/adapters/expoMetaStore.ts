import * as FileSystem from 'expo-file-system';
import type { SealedBlob } from '../../core/crypto/aead.ts';
import type { MetaStore } from '../../core/ports.ts';
import type { VaultMeta } from '../../core/schema.ts';

/**
 * 금고 메타와 실패 기록을 파일로 보관한다.
 *
 * 두 파일 모두 내용은 암호문이거나(실패 기록) 감싼 결과뿐이다(메타).
 * 이 디렉터리는 안드로이드 OS 자동 백업 대상에서 빼 둔다 — plugins/withJamgimSecurity.js
 * 가 data_extraction_rules 와 full_backup_content 를 넣는다 (명세 5.5).
 */
const DIR = `${FileSystem.documentDirectory ?? ''}jamgim/`;
const META_PATH = `${DIR}vault.meta.json`;
const GUARD_PATH = `${DIR}vault.guard.json`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

async function readJson<T>(path: string): Promise<T | null> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  try {
    return JSON.parse(await FileSystem.readAsStringAsync(path)) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureDir();
  // 쓰다가 앱이 죽어도 이전 파일이 남도록 임시 파일에 먼저 쓴다.
  const tmp = `${path}.tmp`;
  await FileSystem.writeAsStringAsync(tmp, JSON.stringify(value));
  const existing = await FileSystem.getInfoAsync(path);
  if (existing.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  await FileSystem.moveAsync({ from: tmp, to: path });
}

export class ExpoMetaStore implements MetaStore {
  async readMeta(): Promise<VaultMeta | null> {
    return readJson<VaultMeta>(META_PATH);
  }

  async writeMeta(meta: VaultMeta): Promise<void> {
    await writeJson(META_PATH, meta);
  }

  async readGuard(): Promise<SealedBlob | null> {
    return readJson<SealedBlob>(GUARD_PATH);
  }

  async writeGuard(blob: SealedBlob): Promise<void> {
    await writeJson(GUARD_PATH, blob);
  }

  async clear(): Promise<void> {
    await FileSystem.deleteAsync(META_PATH, { idempotent: true });
    await FileSystem.deleteAsync(GUARD_PATH, { idempotent: true });
  }
}
