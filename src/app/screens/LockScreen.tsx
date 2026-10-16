import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppMark, BigButton, Body, Field, Notice, Screen } from '../components/Basics.tsx';
import { PIN_LENGTH, PinDots, PinPad } from '../components/PinPad.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, type BiometricKind, checkBiometricSupport } from '../platform/biometrics.ts';
import { useT } from '../i18n/index.ts';
import { font, space, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 02 잠금 화면 — 생체인증, 잠금 번호, 실패 횟수·대기 표시 (명세 3장)
 *
 * 다른 화면과 달리 `Screen` 을 쓰지 않는다. `Screen` 은 제목 줄이 위에 붙고 내용이
 * 그 아래부터 차례로 쌓이는 틀인데, 이 화면은 **아래가 중요하다.** 숫자판은 엄지가
 * 닿는 곳에 있어야 하고, 로고는 위에, 동그라미는 가운데에 있어야 한다. 그래서
 * 위·가운데·아래 세 덩어리로 직접 짠다.
 *
 * 그래도 스크롤은 남긴다. 글꼴을 200% 로 키우면 세 덩어리가 한 화면에 안 들어가는데,
 * 그때 아래가 잘려 나가면 숫자판을 못 누른다 (명세 3장).
 */

/** 흔들림 한 번의 폭(dp)과 한 구간의 길이(ms). */
const SHAKE_DISTANCE = 12;
const SHAKE_STEP = 55;

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
   * 틀렸을 때 동그라미를 좌우로 흔든다.
   *
   * 글로도 알려 주지만(아래 `Notice`), 글은 눈이 위로 가야 보인다. 흔들림은 방금
   * 누른 자리에서 바로 보인다.
   *
   * **"동작 줄이기" 를 켠 기기에서는 흔들지 않는다.** 흔들림에 멀미를 느끼는 사람이
   * 있어서 안드로이드가 따로 설정을 둔 것이고, 글 안내는 그대로 남으므로 알 길이
   * 없어지지도 않는다.
   */
  const shake = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!cancelled) reduceMotion.current = on;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      reduceMotion.current = on;
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const runShake = useCallback(() => {
    if (reduceMotion.current) return;
    const step = (toValue: number) =>
      Animated.timing(shake, { toValue, duration: SHAKE_STEP, useNativeDriver: true });
    shake.setValue(0);
    Animated.sequence([step(1), step(-1), step(1), step(0)]).start();
  }, [shake]);

  /**
   * 금고가 열린 뒤 처리.
   *
   * 화면부터 옮긴다. 금고가 열린 것은 이미 사실이고, 목록을 읽다가 실패했다고
   * 사용자를 잠금 화면에 가둬 두면 안 된다. 예전에는 이 뒤의 실패를 아무도 받지
   * 않아서, 금고는 열렸는데 화면이 그대로 멈추고 아무 문구도 뜨지 않았다.
   */
  const afterUnlock = useCallback(async () => {
    reset({ name: 'list' });
    await run(() => refresh());
  }, [reset, run, refresh]);

  /**
   * 여섯 자리를 다 누르면 저절로 연다.
   *
   * 누르는 중에 두 번 들어오지 않게 빗장을 건다. `pin` 을 비우는 것만으로는
   * 모자란다 — 비우기 전에 이 효과가 한 번 더 돌 수 있다.
   */
  const unlockingRef = useRef(false);
  useEffect(() => {
    if (pin.length < PIN_LENGTH || waitMs > 0 || unlockingRef.current) return;
    unlockingRef.current = true;
    void (async () => {
      try {
        if (!vault) return;
        const done = await run(() => vault.unlockWithPin(pin));
        setPin('');
        await refreshLockState();
        if (done.ok) await afterUnlock();
        else runShake();
      } finally {
        unlockingRef.current = false;
      }
    })();
  }, [pin, waitMs, vault, run, refreshLockState, afterUnlock, runShake]);

  const tryBiometric = useCallback(async () => {
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
  }, [vault, biometricKind, t, run, refreshLockState, afterUnlock]);

  /**
   * 화면이 뜨면 지문·얼굴을 **한 번** 먼저 물어본다.
   *
   * 거의 매번 쓰는 길이라, 버튼을 찾아 누르게 하는 것은 한 손 더 쓰는 일이다.
   * 다만 **딱 한 번만** 묻는다. 취소했는데 또 뜨면 숫자판을 영영 못 누른다.
   * 다시 하고 싶으면 아래 버튼이 남아 있다.
   */
  const askedRef = useRef(false);
  useEffect(() => {
    if (!canUseBiometric || askedRef.current || waitMs > 0) return;
    askedRef.current = true;
    void tryBiometric();
  }, [canUseBiometric, waitMs, tryBiometric]);

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

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SHAKE_DISTANCE, SHAKE_DISTANCE],
  });

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
          <Animated.View style={{ transform: [{ translateX }] }}>
            <PinDots length={pin.length} />
          </Animated.View>
          {waiting ? (
            <Notice>{t('lock.failuresWithWait', { count: failures, wait: waitText(t, waitMs) })}</Notice>
          ) : failures > 0 ? (
            <Notice>{t('lock.failures', { count: failures })}</Notice>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <PinPad value={pin} onChange={setPin} disabled={waiting} />
          {canUseBiometric ? (
            <BigButton
              label={t('lock.openWithBiometric', { how: how(biometricKind) })}
              tone="text"
              onPress={() => void tryBiometric()}
              disabled={waiting}
            />
          ) : null}
          <BigButton
            label={t('lock.forgotPin')}
            sub={t('lock.forgotPinSub')}
            tone="text"
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
     * 가운데. 남는 높이를 전부 가져가고 그 한가운데에 동그라미를 놓는다.
     * 화면이 길든 짧든 동그라미는 늘 눈높이 근처에 온다.
     */
    middle: { flex: 1, justifyContent: 'center', gap: space.md, paddingVertical: space.md },
    /** 아래. 엄지가 닿는 곳. 숫자판이 화면 밑바닥에 붙는다. */
    bottom: { gap: space.sm },
  }),
);
