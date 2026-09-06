import type { SealedBlob } from '../../core/crypto/aead.ts';
import type { PrefsStore } from '../../core/ports.ts';
import { readJson, removeFile, writeJson } from './jsonFile.ts';

/**
 * 화면 설정(밝기·언어) 파일.
 *
 * 금고 메타·실패 기록과 같은 폴더에 두되 파일은 따로 둔다. 이유는 core/prefs.ts 에
 * 적어 두었다 — 요약하면, 밝기를 바꿀 때마다 잠금 대기 시간 카운터 파일을 다시
 * 쓰는 일이 없어야 한다.
 *
 * 안에 들어가는 것은 기기 키로 감싼 결과뿐이다.
 */
const PREFS_NAME = 'display.prefs.json';

export class ExpoPrefsStore implements PrefsStore {
  async read(): Promise<SealedBlob | null> {
    return readJson<SealedBlob>(PREFS_NAME);
  }

  async write(blob: SealedBlob): Promise<void> {
    writeJson(PREFS_NAME, blob);
  }

  async clear(): Promise<void> {
    removeFile(PREFS_NAME);
  }
}
