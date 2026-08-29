import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Field, Notice, Screen, Title } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { exportBackup, previewBackup, restoreBackup } from '../../core/backupService.ts';
import { backupIsStale, MIN_BACKUP_PASSWORD_LENGTH } from '../../core/backup.ts';
import {
  pickBackupFile,
  removeCachedBackup,
  shareBackup,
  writeBackupToCache,
} from '../platform/backupFile.ts';
import { scheduleBackupReminder } from '../platform/reminders.ts';
import { space } from '../theme/index.ts';

/**
 * 08 백업·복구 — 암호화 파일 내보내기 / 가져오기, 실패 조건 안내 (명세 6장)
 */
function formatDate(ms?: number): string {
  if (!ms) return '아직 한 번도 하지 않았습니다';
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function BackupScreen() {
  const { vault, back, showToast, run, refresh } = useVaultStore();
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [picked, setPicked] = useState<{ name: string; contents: string } | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!vault) return;
    void vault.readMeta().then((meta) => setLastBackupAt(meta.lastBackupAt));
  }, [vault]);

  const doExport = async () => {
    if (!vault) return;
    if (password !== passwordAgain) {
      showToast('두 번 적은 백업 비밀번호가 다릅니다.', 'bad');
      return;
    }
    const result = await run(() => exportBackup(vault, password, Date.now()));
    if (!result.ok) return;
    const { fileName, contents, recordCount } = result.value;
    const path = await writeBackupToCache(fileName, contents);
    try {
      await shareBackup(path);
    } finally {
      await removeCachedBackup(path);
    }
    setPassword('');
    setPasswordAgain('');
    const meta = await vault.readMeta();
    setLastBackupAt(meta.lastBackupAt);
    await scheduleBackupReminder(meta.lastBackupAt ?? Date.now());
    showToast(`${recordCount}개를 담은 백업 파일을 만들었습니다.`);
  };

  const doPick = async () => {
    const file = await pickBackupFile();
    if (!file) return;
    setPicked(file);
    setPreviewCount(null);
    showToast(`${file.name} 을(를) 골랐습니다.`);
  };

  const doPreview = async () => {
    if (!vault || !picked) return;
    const result = await run(() => previewBackup(vault, picked.contents, importPassword));
    if (result.ok) {
      setPreviewCount(result.value.entries.length);
      showToast(`${result.value.entries.length}개가 들어 있습니다.`);
    }
  };

  return (
    <Screen title="백업 · 되살리기" onBack={back}>
      <Notice tone="plain">{`마지막 백업: ${formatDate(lastBackupAt)}`}</Notice>
      {backupIsStale(lastBackupAt, Date.now()) ? (
        <Notice>마지막 백업 후 90일이 지났습니다. 새 백업 파일을 만들어 두세요.</Notice>
      ) : null}

      <View style={{ height: space.md }} />
      <Title>백업 파일 만들기</Title>
      <Notice>
        이 파일은 비밀번호 없이는 열 수 없습니다. 파일과 비밀번호를 같은 곳으로 보내지 마세요.
      </Notice>
      <Body dim>
        가족(배우자·자녀) 2~3명에게 파일만 나눠 두면 폰을 잃어버려도 되살릴 수 있습니다. 백업 비밀번호는
        전달하지 말고 본인만 종이에 적어 폰과 다른 곳에 두세요. 카카오톡 같은 메신저는 기간이 지나면
        내려받을 수 없으니, 받은 사람이 폰에 실제로 저장했는지 확인해 주세요.
      </Body>
      <Field
        label="백업 비밀번호"
        hint={`${MIN_BACKUP_PASSWORD_LENGTH}자 이상. 앱을 열 때 쓰는 숫자와 다르게 정해 주세요.`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="백업 비밀번호 한 번 더"
        value={passwordAgain}
        onChangeText={setPasswordAgain}
        secureTextEntry
        autoCapitalize="none"
      />
      <BigButton label="백업 파일 만들어 보내기" onPress={doExport} />

      <View style={{ height: space.xl }} />
      <Title>백업 파일에서 되살리기</Title>
      <Body dim>
        폰을 바꿨거나 앱을 지웠다 다시 깔았을 때 씁니다. 지금 금고에 든 내용은 파일 내용으로 바뀝니다.
      </Body>
      <BigButton label="파일 고르기" tone="plain" onPress={doPick} />
      {picked ? <Notice tone="plain">{`고른 파일: ${picked.name}`}</Notice> : null}
      <Field
        label="그 파일의 백업 비밀번호"
        value={importPassword}
        onChangeText={setImportPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <BigButton label="열어 보기 (몇 개인지 확인)" tone="plain" onPress={doPreview} />
      {previewCount !== null ? <Notice tone="plain">{`${previewCount}개가 들어 있습니다.`}</Notice> : null}
      <BigButton
        label="이 파일로 되살리기"
        onPress={() => {
          if (!picked) {
            showToast('먼저 파일을 골라 주세요.', 'bad');
            return;
          }
          setConfirmRestore(true);
        }}
      />

      <View style={{ height: space.lg }} />
      <Notice>
        숫자(PIN)·지문·복구 코드·백업 파일이 모두 없으면 금고를 열 수 없습니다.
      </Notice>

      <Confirm
        visible={confirmRestore}
        title="지금 금고 내용을 바꿀까요?"
        message="지금 들어 있는 내용은 사라지고 파일에 담긴 내용으로 바뀝니다."
        confirmLabel="되살리기"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={async () => {
          if (!vault || !picked) return;
          setConfirmRestore(false);
          const result = await run(() => restoreBackup(vault, picked.contents, importPassword));
          if (!result.ok) return;
          await refresh();
          setImportPassword('');
          setPicked(null);
          showToast(`${result.value.restored}개를 되살렸습니다.`);
        }}
      />
    </Screen>
  );
}
