import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * 백업 파일 주고받기 (명세 6.2 / 6.3)
 *
 * 앱은 파일만 만든다. 어디로 보낼지는 사용자가 정한다. 서버는 없다.
 */
export async function writeBackupToCache(fileName: string, contents: string): Promise<string> {
  const path = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
  await FileSystem.writeAsStringAsync(path, contents);
  return path;
}

export async function shareBackup(path: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/octet-stream',
      dialogTitle: '백업 파일 보내기',
      UTI: 'public.data',
    });
  }
}

/** 공유가 끝나면 임시 파일을 지운다. 캐시에 백업본이 쌓이지 않게 한다. */
export async function removeCachedBackup(path: string): Promise<void> {
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function pickBackupFile(): Promise<{ name: string; contents: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const contents = await FileSystem.readAsStringAsync(asset.uri);
  return { name: asset.name, contents };
}
