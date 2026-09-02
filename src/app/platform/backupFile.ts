import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * 백업 파일 주고받기 (명세 6.2 / 6.3)
 *
 * 앱은 파일만 만든다. 어디로 보낼지는 사용자가 정한다. 서버는 없다.
 */
export async function writeBackupToCache(fileName: string, contents: string): Promise<string> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  return file.uri;
}

/** 보내기 창 제목은 부르는 쪽이 넘긴다. 이 모듈은 말을 갖지 않는다. */
export async function shareBackup(path: string, shareTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/octet-stream',
      dialogTitle: shareTitle,
      UTI: 'public.data',
    });
  }
}

/** 공유가 끝나면 임시 파일을 지운다. 캐시에 백업본이 쌓이지 않게 한다. */
export async function removeCachedBackup(path: string): Promise<void> {
  const file = new File(path);
  if (file.exists) file.delete();
}

export async function pickBackupFile(): Promise<{ name: string; contents: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const contents = await new File(asset.uri).text();
  return { name: asset.name, contents };
}
