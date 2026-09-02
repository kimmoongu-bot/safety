import React, { useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Choice, Field, Notice, Screen, Title, Toggle } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { useT } from '../i18n/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, checkBiometricSupport } from '../platform/biometrics.ts';
import { disableScreenGuard, enableScreenGuard, guardFailureMessage } from '../platform/screenGuard.ts';
import { RecoveryCodeView } from '../components/RecoveryCodeView.tsx';
import { CLIPBOARD_CHOICES } from '../../core/settings.ts';
import { space } from '../theme/index.ts';

/**
 * 07 설정 — 자동 잠금 시간, 생체인증, 클립보드 삭제 시간, 캡처 차단, 백업, 금고 초기화
 */
export function SettingsScreen() {
  const { vault, settings, saveSettings, go, back, showToast, run, reset, beginSystemDialog, endSystemDialog } =
    useVaultStore();
  const t = useT();
  const [revealed, setRevealed] = useState('');
  const [changing, setChanging] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);

  const revealRecoveryCode = async () => {
    if (!vault) return;
    // 지문·얼굴 확인 창이 앱을 잠깐 덮어도 금고가 잠기지 않게 한다.
    beginSystemDialog();
    let passed = false;
    try {
      passed = await authenticate({
        reason: t('settings.recoveryReason'),
        cancel: t('biometric.cancel'),
        fallback: t('biometric.fallback'),
      });
    } finally {
      endSystemDialog();
    }
    if (!passed) {
      showToast(t('settings.checkFailed'), 'bad');
      return;
    }
    const code = await run(() => vault.revealRecoveryCode());
    if (code.ok) setRevealed(code.value);
  };

  return (
    <Screen title={t('settings.title')} onBack={back}>
      <Choice
        label={t('settings.autoLock')}
        value={settings.autoLock}
        options={[
          { value: 'immediate', label: t('settings.autoLockNow') },
          { value: '1m', label: t('settings.autoLock1m') },
          { value: '5m', label: t('settings.autoLock5m') },
        ]}
        onChange={(v) => void saveSettings({ autoLock: v })}
      />

      <Toggle
        label={t('settings.biometric')}
        description={t('settings.biometricWhy')}
        value={settings.biometricUnlock}
        onChange={async (next) => {
          if (!vault) return;
          if (next) {
            const support = await checkBiometricSupport();
            if (!support.available) {
              showToast(t('settings.biometricNone'), 'bad');
              return;
            }
          }
          // 키 저장소에 생체 키를 만들 때도 시스템 확인 창이 뜬다.
          beginSystemDialog();
          const done = await run(() => vault.setBiometricUnlock(next));
          endSystemDialog();
          if (done.ok) {
            await saveSettings({ biometricUnlock: next });
            showToast(t(next ? 'settings.biometricOn' : 'settings.biometricOff'));
          }
        }}
      />

      <Choice
        label={t('settings.clipboard')}
        value={settings.clipboardClearSeconds}
        options={CLIPBOARD_CHOICES.map((s) => ({ value: s, label: t('settings.clipboardAfter', { seconds: s }) }))}
        onChange={(v) => void saveSettings({ clipboardClearSeconds: v })}
      />

      <Toggle
        label={t('settings.screenGuard')}
        description={t('settings.screenGuardWhy')}
        value={settings.blockScreenCapture}
        onChange={async (next) => {
          await saveSettings({ blockScreenCapture: next });
          if (!next) {
            await disableScreenGuard();
            showToast(t('settings.screenGuardOff'));
            return;
          }
          const result = await enableScreenGuard();
          if (result.ok) showToast(t('settings.screenGuardOn'));
          else {
            const why = guardFailureMessage(result);
            showToast(t(why.key, why.params), 'bad');
          }
        }}
      />

      <Toggle
        label={t('settings.keepPrev')}
        description={t('settings.keepPrevWhy')}
        value={settings.keepPreviousPassword}
        onChange={(next) => void saveSettings({ keepPreviousPassword: next })}
      />

      <Toggle
        label={t('settings.wipe')}
        description={t('settings.wipeWhy')}
        value={settings.wipeAfterTenFailures}
        onChange={(next) => void saveSettings({ wipeAfterTenFailures: next })}
      />

      <View style={{ height: space.md }} />
      <Title>{t('settings.recoveryHeading')}</Title>
      {revealed ? (
        <>
          <RecoveryCodeView code={revealed} />
          <BigButton label={t('settings.recoveryHide')} tone="plain" onPress={() => setRevealed('')} />
        </>
      ) : (
        <BigButton label={t('settings.recoveryShow')} tone="plain" onPress={revealRecoveryCode} />
      )}

      <View style={{ height: space.md }} />
      <Title>{t('settings.pinHeading')}</Title>
      {changing ? (
        <>
          <Field
            label={t('settings.pinCurrent')}
            value={currentPin}
            onChangeText={setCurrentPin}
            keyboardType="number-pad"
            secureTextEntry
          />
          <Field
            label={t('settings.pinNext')}
            value={nextPin}
            onChangeText={setNextPin}
            keyboardType="number-pad"
            secureTextEntry
          />
          <BigButton
            label={t('settings.pinChange')}
            onPress={async () => {
              if (!vault) return;
              const done = await run(() => vault.changePin(currentPin, nextPin));
              setCurrentPin('');
              setNextPin('');
              if (done.ok) {
                setChanging(false);
                showToast(t('settings.pinChanged'));
              }
            }}
          />
          <BigButton label={t('settings.cancel')} tone="plain" onPress={() => setChanging(false)} />
        </>
      ) : (
        <BigButton label={t('settings.pinHeading')} tone="plain" onPress={() => setChanging(true)} />
      )}

      <View style={{ height: space.md }} />
      <Title>{t('settings.backupHeading')}</Title>
      <BigButton label={t('settings.backupGo')} tone="plain" onPress={() => go({ name: 'backup' })} />

      <View style={{ height: space.lg }} />
      <Title>{t('settings.wipeHeading')}</Title>
      <Notice>
        {t('settings.wipeExplain')}
      </Notice>
      <BigButton label={t('settings.wipeStart')} tone="danger" onPress={() => setWipeStep(1)} />
      <Body dim>{t('settings.wipeAsksTwice')}</Body>

      <Confirm
        visible={wipeStep === 1}
        title={t('settings.wipe1Title')}
        message={t('settings.wipe1Message')}
        confirmLabel={t('settings.wipe1Confirm')}
        tone="danger"
        onCancel={() => setWipeStep(0)}
        onConfirm={() => setWipeStep(2)}
      />
      <Confirm
        visible={wipeStep === 2}
        title={t('settings.wipe2Title')}
        message={t('settings.wipe2Message')}
        confirmLabel={t('settings.wipe2Confirm')}
        tone="danger"
        onCancel={() => setWipeStep(0)}
        onConfirm={async () => {
          if (!vault) return;
          setWipeStep(0);
          const done = await run(() => vault.destroy());
          if (done.ok) {
            showToast(t('settings.wiped'));
            reset({ name: 'setup' });
          }
        }}
      />
    </Screen>
  );
}
