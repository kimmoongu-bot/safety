import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { BigButton, Body, Field, Notice, Screen } from '../components/Basics.tsx';
import { PinDots, PinPad } from '../components/PinPad.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, checkBiometricSupport } from '../platform/biometrics.ts';
import { ro } from '../josa.ts';
import { colors, font, space } from '../theme/index.ts';

/**
 * 02 잠금 화면 — 로고, 생체인증 버튼, PIN 패드, 실패 횟수·대기 표시 (명세 3장)
 */
function waitText(ms: number): string {
  const total = Math.ceil(ms / 1000);
  if (total >= 60) {
    const minutes = Math.ceil(total / 60);
    return `${minutes}분 뒤에 다시 해 주세요`;
  }
  return `${total}초 뒤에 다시 해 주세요`;
}

export function LockScreen() {
  const { vault, run, reset, refresh, refreshLockState, loadSettings, waitMs, failures, settings } = useVaultStore();
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'pin' | 'recovery'>('pin');
  const [code, setCode] = useState('');
  const [biometricLabel, setBiometricLabel] = useState('지문·얼굴');
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  useEffect(() => {
    void refreshLockState();
    void loadSettings();
    void checkBiometricSupport().then((s) => {
      setBiometricLabel(s.label);
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
    if (!(await authenticate(`${ro(biometricLabel)} 금고를 엽니다`))) return;
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
      <Screen title="복구 코드로 열기" onBack={() => setMode('pin')}>
        <Body dim>최초 설정 때 적어 둔 복구 코드를 입력해 주세요.</Body>
        <Field
          label="복구 코드"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="예: WZC7-1W7M-KHRP-DNEN"
          editable={!waiting}
        />
        {waiting ? <Notice>{waitText(waitMs)}</Notice> : null}
        <BigButton label="금고 열기" onPress={tryRecovery} disabled={waiting || code.trim().length === 0} />
      </Screen>
    );
  }

  return (
    <Screen title="잠김">
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>잠김</Text>
        <Body dim>내 아이디와 비밀번호를 넣어 두는 곳</Body>
      </View>

      {waiting ? (
        <Notice>
          {`PIN(핀)을 ${failures}번 잘못 눌렀습니다. ${waitText(waitMs)}.`}
        </Notice>
      ) : failures > 0 ? (
        <Notice>{`PIN(핀)을 ${failures}번 잘못 눌렀습니다.`}</Notice>
      ) : null}

      <PinDots length={pin.length} />
      <PinPad value={pin} onChange={setPin} disabled={waiting} />
      <View style={{ height: space.sm }} />
      <BigButton label="금고 열기" onPress={tryPin} disabled={waiting || pin.length < 4} />
      {canUseBiometric ? (
        <BigButton label={`${ro(biometricLabel)} 열기`} tone="plain" onPress={tryBiometric} disabled={waiting} />
      ) : null}
      <BigButton label="PIN(핀)을 잊었어요 (복구 코드)" tone="plain" onPress={() => setMode('recovery')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: 'center', gap: space.xs, marginBottom: space.md },
  logo: { fontSize: font.huge, fontWeight: '800', color: colors.primary, letterSpacing: 4 },
});
