import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppMark, BigButton, Body, Field, Notice, Screen } from '../components/Basics.tsx';
import { PinDots, PinPad } from '../components/PinPad.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, type BiometricKind, checkBiometricSupport } from '../platform/biometrics.ts';
import { useT } from '../i18n/index.ts';
import { font, space, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 02 잠금 화면 — 생체인증 버튼, 숫자판, 실패 횟수·대기 표시 (명세 3장)
 *
 * 다른 화면과 달리 `Screen` 틀을 쓰지 않는다. `Screen` 은 제목 줄이 위에 붙고 내용이
 * 그 아래부터 **차례로 쌓이는** 틀이라, 내용이 짧으면 아래가 통째로 비고 숫자판이
 * 화면 위쪽에 몰린다. 실기기에서 아래 3분의 1이 빈 채로 남았다.
 *
 * 그래서 위·가운데·아래 세 덩어리로 직접 짠다. 로고는 위, 입력 표시는 가운데,
 * **숫자판과 버튼들은 아래** — 폰을 쥔 손의 엄지가 닿는 곳이다.
 *
 * 그래도 스크롤은 남긴다. 글꼴을 200% 로 키우면 세 덩어리가 한 화면에 안 들어가는데,
 * 그때 아래가 잘려 나가면 숫자판을 못 누른다 (명세 3장).
 */
/** 남은 시간을 문장으로. 분·초를 나누는 것은 언어와 무관한 판단이라 여기서 한다. */
function waitText(t: (k: 'lock.waitSeconds' | 'lock.waitMinutes', p?: Record<string, string | number>) => string, ms: number): string {
  const total = Math.ceil(ms / 1000);
  return total >= 60
    ? t('lock.waitMinutes', { minutes: Math.ceil(total / 60) })
    : t('lock.waitSeconds', { seconds: total });
}

export function LockScreen() {
  const styles = useStyles();
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.top}>
          <AppMark size={56} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t('lock.title')}</Text>
            <Text style={styles.tagline}>{t('lock.tagline')}</Text>
          </View>
        </View>

        <View style={styles.middle}>
          <PinDots length={pin.length} />
          {waiting ? (
            <Notice>{t('lock.failuresWithWait', { count: failures, wait: waitText(t, waitMs) })}</Notice>
          ) : failures > 0 ? (
            <Notice>{t('lock.failures', { count: failures })}</Notice>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <PinPad value={pin} onChange={setPin} disabled={waiting} />
          <View style={{ height: space.xs }} />
          <BigButton label={t('lock.open')} onPress={tryPin} disabled={waiting || pin.length < 4} />
          {canUseBiometric ? (
            <BigButton
              label={t('lock.openWithBiometric', { how: how(biometricKind) })}
              tone="plain"
              onPress={tryBiometric}
              disabled={waiting}
            />
          ) : null}
          <BigButton
            label={t('lock.forgotPin')}
            sub={t('lock.forgotPinSub')}
            tone="plain"
            onPress={() => setMode('recovery')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors, fonts) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    /**
     * 위·가운데·아래.
     *
     * `flexGrow: 1` 이라 내용이 짧으면 화면을 꽉 채우고(가운데가 늘어난다),
     * 길면 넘친 만큼 스크롤된다. 둘 중 하나만 고르지 않아도 된다.
     */
    body: { flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.lg, paddingBottom: space.md },
    top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    titleBlock: { flexShrink: 1 },
    title: { fontFamily: fonts.familyBold, fontSize: font.logo, fontWeight: WEIGHT, color: colors.text },
    tagline: { fontFamily: fonts.family, fontSize: font.bodySmall, fontWeight: WEIGHT, color: colors.textDim, marginTop: 2 },
    /**
     * 가운데. 남는 높이를 **전부** 가져가고 그 한가운데에 입력 표시를 놓는다.
     * 빈 공간이 아래에 몰리지 않고 여기로 모인다.
     */
    middle: { flex: 1, justifyContent: 'center', gap: space.md, paddingVertical: space.md },
    /** 아래. 엄지가 닿는 곳. 숫자판과 버튼들이 화면 밑바닥에 붙는다. */
    bottom: { gap: space.sm },
  }),
);
