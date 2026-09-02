import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Field, Notice, Screen, Title } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { useLocale, useT } from '../i18n/index.ts';
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
function formatDate(ms: number | undefined, locale: string, t: (k: 'backup.never') => string): string {
  if (!ms) return t('backup.never');
  const d = new Date(ms);
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function BackupScreen() {
  const { vault, back, showToast, run, refresh, beginSystemDialog, endSystemDialog } = useVaultStore();
  const t = useT();
  const { locale } = useLocale();
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
      showToast(t('backup.mismatch'), 'bad');
      return;
    }
    const result = await run(() => exportBackup(vault, password, Date.now()));
    if (!result.ok) return;
    const { fileName, contents, recordCount } = result.value;
    const path = await writeBackupToCache(fileName, contents);
    beginSystemDialog(); // 보내기 창이 앱을 잠깐 덮는다.
    try {
      await shareBackup(path, t('system.shareBackup'));
    } finally {
      endSystemDialog();
      await removeCachedBackup(path); // 캐시에 백업본을 남기지 않는다.
    }
    setPassword('');
    setPasswordAgain('');
    const meta = await vault.readMeta();
    setLastBackupAt(meta.lastBackupAt);
    await scheduleBackupReminder(meta.lastBackupAt ?? Date.now(), {
      title: t('system.reminderTitle'),
      body: t('system.reminderBody'),
    });
    showToast(t('backup.made', { count: recordCount }));
  };

  const doPick = async () => {
    beginSystemDialog(); // 파일 고르기 창이 앱을 잠깐 덮는다.
    let file: Awaited<ReturnType<typeof pickBackupFile>>;
    try {
      file = await pickBackupFile();
    } finally {
      endSystemDialog();
    }
    if (!file) return;
    setPicked(file);
    setPreviewCount(null);
    showToast(t('backup.pickedToast', { name: file.name }));
  };

  const doPreview = async () => {
    if (!vault || !picked) return;
    const result = await run(() => previewBackup(vault, picked.contents, importPassword));
    if (result.ok) {
      setPreviewCount(result.value.entries.length);
      showToast(t('backup.previewCount', { count: result.value.entries.length }));
    }
  };

  return (
    <Screen title={t('backup.title')} onBack={back}>
      <Notice tone="plain">{t('backup.last', { when: formatDate(lastBackupAt, locale, t) })}</Notice>
      {backupIsStale(lastBackupAt, Date.now()) ? (
        <Notice>{t('backup.stale')}</Notice>
      ) : null}

      <View style={{ height: space.md }} />
      <Title>{t('backup.makeHeading')}</Title>
      <Notice>
        {t('backup.makeWarn')}
      </Notice>
      <Body dim>
        {t('backup.familyTip')}
      </Body>
      <Field
        label={t('backup.password')}
        hint={t('backup.passwordHint', { min: MIN_BACKUP_PASSWORD_LENGTH })}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label={t('backup.passwordAgain')}
        value={passwordAgain}
        onChangeText={setPasswordAgain}
        secureTextEntry
        autoCapitalize="none"
      />
      <BigButton label={t('backup.make')} onPress={doExport} />

      <View style={{ height: space.xl }} />
      <Title>{t('backup.restoreHeading')}</Title>
      <Body dim>
        {t('backup.restoreWhen')}
      </Body>
      <BigButton label={t('backup.pick')} tone="plain" onPress={doPick} />
      {picked ? <Notice tone="plain">{t('backup.picked', { name: picked.name })}</Notice> : null}
      <Field
        label={t('backup.filePassword')}
        value={importPassword}
        onChangeText={setImportPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <BigButton label={t('backup.preview')} tone="plain" onPress={doPreview} />
      {previewCount !== null ? <Notice tone="plain">{t('backup.previewCount', { count: previewCount })}</Notice> : null}
      {/* 되살리기는 지금 금고를 덮어쓴다. 되돌릴 수 없으므로 강조색으로 구분한다. */}
      <BigButton
        label={t('backup.restore')}
        tone="accent"
        onPress={() => {
          if (!picked) {
            showToast(t('backup.pickFirst'), 'bad');
            return;
          }
          setConfirmRestore(true);
        }}
      />

      <View style={{ height: space.lg }} />
      <Notice>
        {t('setup.lastWarn')}
      </Notice>

      <Confirm
        visible={confirmRestore}
        title={t('backup.confirmTitle')}
        message={t('backup.confirmMessage')}
        confirmLabel={t('backup.confirmLabel')}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={async () => {
          if (!vault || !picked) return;
          setConfirmRestore(false);
          const result = await run(() => restoreBackup(vault, picked.contents, importPassword));
          if (!result.ok) return;
          await refresh();
          setImportPassword('');
          setPicked(null);
          showToast(t('backup.restored', { count: result.value.restored }));
        }}
      />
    </Screen>
  );
}
