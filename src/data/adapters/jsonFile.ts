import { Directory, File, Paths } from 'expo-file-system';

/**
 * 앱 전용 폴더에 JSON 파일 하나를 안전하게 읽고 쓰는 방법.
 *
 * 금고 메타·실패 기록·화면 설정이 모두 이 방법을 쓴다. 파일마다 따로 적어 두면
 * 한 곳만 고치고 다른 곳을 빠뜨리게 된다. 특히 아래 '임시 파일에 먼저 쓰기'는
 * 빠뜨리면 앱이 쓰다 죽었을 때 파일이 반쯤 쓰인 채로 남는다.
 *
 * 이 폴더는 안드로이드 OS 자동 백업 대상에서 빼 둔다 — plugins/withJamgimSecurity.js
 * 가 data_extraction_rules 와 full_backup_content 를 넣는다 (명세 5.5).
 */
const DIR_NAME = 'jamgim';

function vaultDir(): Directory {
  return new Directory(Paths.document, DIR_NAME);
}

function ensureDir(): Directory {
  const dir = vaultDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function readJson<T>(name: string): Promise<T | null> {
  const file = new File(vaultDir(), name);
  if (!file.exists) return null;
  try {
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

export function writeJson(name: string, value: unknown): void {
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

export function removeFile(name: string): void {
  const file = new File(vaultDir(), name);
  if (file.exists) file.delete();
}
