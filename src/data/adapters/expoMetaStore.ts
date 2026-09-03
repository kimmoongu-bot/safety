import type { SealedBlob } from '../../core/crypto/aead.ts';
import type { MetaStore } from '../../core/ports.ts';
import type { VaultMeta } from '../../core/schema.ts';
import { readJson, removeFile, writeJson } from './jsonFile.ts';

/**
 * 금고 메타와 실패 기록을 파일로 보관한다.
 *
 * 두 파일 모두 내용은 암호문이거나(실패 기록) 감싼 결과뿐이다(메타).
 * 파일을 읽고 쓰는 방법은 jsonFile.ts 에 있다.
 */
const META_NAME = 'vault.meta.json';
const GUARD_NAME = 'vault.guard.json';

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
