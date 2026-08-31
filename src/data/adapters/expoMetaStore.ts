import { Directory, File, Paths } from 'expo-file-system';
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
const DIR_NAME = 'jamgim';
const META_NAME = 'vault.meta.json';
const GUARD_NAME = 'vault.guard.json';

function vaultDir(): Directory {
  return new Directory(Paths.document, DIR_NAME);
}

function ensureDir(): Directory {
  const dir = vaultDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function readJson<T>(name: string): Promise<T | null> {
  const file = new File(vaultDir(), name);
  if (!file.exists) return null;
  try {
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

function writeJson(name: string, value: unknown): void {
  const dir = ensureDir();
  // 쓰다가 앱이 죽어도 이전 파일이 남도록 임시 파일에 먼저 쓴다.
  const tmp = new File(dir, `${name}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.write(JSON.stringify(value));

  const target = new File(dir, name);
  if (target.exists) target.delete();
  tmp.move(target);
}

function removeFile(name: string): void {
  const file = new File(vaultDir(), name);
  if (file.exists) file.delete();
}

export class ExpoMetaStore implements MetaStore {
  async readMeta(): Promise<VaultMeta | null> {
    return readJson<VaultMeta>(META_NAME);
  }

  async writeMeta(meta: VaultMeta): Promise<void> {
    writeJson(META_NAME, meta);
  }

  async readGuard(): Promise<SealedBlob | null> {
    return readJson<SealedBlob>(GUARD_NAME);
  }

  async writeGuard(blob: SealedBlob): Promise<void> {
    writeJson(GUARD_NAME, blob);
  }

  async clear(): Promise<void> {
    removeFile(META_NAME);
    removeFile(GUARD_NAME);
  }
}
