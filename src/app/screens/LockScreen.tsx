import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Field, Notice, Screen } from '../components/Basics.tsx';
import { PinDots, PinPad } from '../components/PinPad.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, type BiometricKind, checkBiometricSupport } from '../platform/biometrics.ts';
import { useT } from '../i18n/index.ts';
import { space } from '../theme/index.ts';

/**
 * 02 잠금 화면 — 생체인증 버튼, PIN 패드, 실패 횟수·대기 표시 (명세 3장)
 *
 * 한 화면에 담는다. 스크롤이 생기면 "몇 번 틀렸고 얼마나 기다려야 하는지"가
 * 위로 밀려나 보이지 않는다. 제목 줄의 자물쇠 표시와 "잠김"이 로고 노릇을 한다.
 */
/** 남은 시간을 문장으로. 분·초를 나누는 것은 언어와 무관한 판단이라 여기서 한다. */
function waitText(t: (k: 'lock.waitSeconds' | 'lock.waitMinutes', p?: Record<string, string | number>) => string, ms: number): string {
  const total = Math.ceil(ms / 1000);
  return total >= 60
    ? t('lock.waitMinutes', { minutes: Math.ceil(total / 60) })
    : t('lock.waitSeconds', { seconds: total });
}

export function LockScreen() {
  const { vault, run, reset, refresh, refreshLockState, loadSettings, waitMs, failures, settings } = useVaultStore();
  const t = useT();
  /** 기기가 지원하는 것에 맞는 말. "지문" / "얼굴" / "지문·얼굴" */
  const how = (kind: BiometricKind) => t(`biometric.${kind}`);
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'pin' | 'recovery'>('pin');
  const [code, setCode] = useState('');
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('both');
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  useEffect(() => {
    void refreshLockState();
    void loadSettings();
    void checkBiometricSupport().then((s) => {
      setBiometricKind(s.kind);
      setCanUseBiometric(s.available && settings.biometricUnlock);
    });
  }, [refreshLockState, loadSettings, settings.biometricUnlock]);

  // 대기 중에는 남은 시간을 1초마다 다시 계산해 보여 준다.
  useEffect(() => {
    if (waitMs <= 0) return;
    const timer = setInterval(() => void refreshLockState(), 1000);
    return () => clearInterval(timer);
  }, [waitMs, refreshLockState]);

  /**
   * 금고가 열린 뒤 처리.
   *
   * 화면부터 옮긴다. 금고가 열린 것은 이미 사실이고, 목록을 읽다가 실패했다고
   * 사용자를 잠금 화면에 가둬 두면 안 된다. 예전에는 이 뒤의 실패를 아무도 받지
   * 않아서, 금고는 열렸는데 화면이 그대로 멈추고 아무 문구도 뜨지 않았다.
   */
  const afterUnlock = async () => {
    reset({ name: 'list' });
    await run(() => refresh());
  };

  const tryPin = async () => {
    if (!vault) return;
    const done = await run(() => vault.unlockWithPin(pin));
    setPin('');
    await refreshLockState();
    if (done.ok) await afterUnlock();
  };

  const tryBiometric = async () => {
    if (!vault) return;
    const ok = await authenticate({
      reason: t('lock.biometricPrompt', { how: how(biometricKind) }),
      cancel: t('biometric.cancel'),
      fallback: t('biometric.fallback'),
    });
    if (!ok) return;
    const done = await run(() => vault.unlockWithBiometrics());
    await refreshLockState();
    if (done.ok) await afterUnlock();
  };

  const tryRecovery = async () => {
    if (!vault) return;
    const done = await run(() => vault.unlockWithRecoveryCode(code));
    setCode('');
    await refreshLockState();
    if (done.ok) await afterUnlock();
  };

  const waiting = waitMs > 0;

  if (mode === 'recovery') {
    return (
      <Screen title={t('lock.recoveryTitle')} onBack={() => setMode('pin')}>
        <Body dim>{t('lock.recoveryHelp')}</Body>
        <Field
          label={t('lock.recoveryLabel')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={t('lock.recoveryPlaceholder')}
          editable={!waiting}
        />
        {waiting ? <Notice>{waitText(t, waitMs)}</Notice> : null}
        <BigButton label={t('lock.open')} onPress={tryRecovery} disabled={waiting || code.trim().length === 0} />
      </Screen>
    );
  }

  return (
    <Screen title={t('lock.title')} mark>
      {waiting ? (
        <Notice>{t('lock.failuresWithWait', { count: failures, wait: waitText(t, waitMs) })}</Notice>
      ) : failures > 0 ? (
        <Notice>{t('lock.failures', { count: failures })}</Notice>
      ) : null}

      <PinDots length={pin.length} />
      <PinPad value={pin} onChange={setPin} disabled={waiting} />
      <View style={{ height: space.sm }} />
      <BigButton label={t('lock.open')} onPress={tryPin} disabled={waiting || pin.length < 4} />
      {canUseBiometric ? (
        <BigButton
          label={t('lock.openWithBiometric', { how: how(biometricKind) })}
          tone="plain"
          onPress={tryBiometric}
          disabled={waiting}
        />
      ) : null}
      <BigButton label={t('lock.forgotPin')} tone="plain" onPress={() => setMode('recovery')} />
    </Screen>
  );
}
