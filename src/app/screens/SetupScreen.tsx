import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Field, Notice, Screen, Title } from '../components/Basics.tsx';
import { PinDots, PinPad } from '../components/PinPad.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { checkBiometricSupport } from '../platform/biometrics.ts';
import { formatRecoveryCode, normalizeRecoveryCode } from '../../core/recoveryCode.ts';
import { space } from '../theme/index.ts';

/**
 * 01 최초 설정 — PIN 생성 → 생체인증 사용 여부 → 금고 생성 → 복구 코드 생성·확인
 *
 * 복구 코드를 사용자가 직접 다시 입력해 확인하기 전에는 다음 단계로 넘어가지
 * 않는다 (명세 6.1).
 */
type Step = 'pin' | 'pin-again' | 'biometric' | 'code-show' | 'code-check';

const MIN_PIN = 4;

export function SetupScreen() {
  const { vault, run, reset, showToast, refresh } = useVaultStore();
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('지문·얼굴');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [typedCode, setTypedCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void checkBiometricSupport().then((s) => {
      setBiometricAvailable(s.available);
      setBiometricLabel(s.label);
    });
  }, []);

  const createVault = async (withBiometric: boolean) => {
    if (!vault) return;
    setBusy(true);
    const result = await run(() => vault.create({ pin, enableBiometric: withBiometric }));
    setBusy(false);
    if (!result.ok) {
      setStep('pin');
      setPin('');
      setPinAgain('');
      return;
    }
    setRecoveryCode(result.value.recoveryCode);
    setStep('code-show');
  };

  if (step === 'pin' || step === 'pin-again') {
    const value = step === 'pin' ? pin : pinAgain;
    const setValue = step === 'pin' ? setPin : setPinAgain;
    return (
      <Screen title={step === 'pin' ? 'PIN(핀) 만들기' : '한 번 더 눌러 주세요'}>
        <Body dim>
          {step === 'pin'
            ? '금고를 열 때 쓸 숫자를 정합니다. 4자리 이상이면 됩니다.'
            : '방금 정한 숫자를 한 번 더 눌러 주세요.'}
        </Body>
        <PinDots length={value.length} />
        <PinPad value={value} onChange={setValue} />
        <View style={{ height: space.md }} />
        <BigButton
          label="다음"
          disabled={value.length < MIN_PIN}
          onPress={() => {
            if (step === 'pin') {
              setStep('pin-again');
              return;
            }
            if (pin !== pinAgain) {
              showToast('두 번 누른 숫자가 다릅니다. 처음부터 다시 정해 주세요.', 'bad');
              setPin('');
              setPinAgain('');
              setStep('pin');
              return;
            }
            setStep('biometric');
          }}
        />
      </Screen>
    );
  }

  if (step === 'biometric') {
    return (
      <Screen title={`${biometricLabel}으로도 열까요?`}>
        <Body dim>
          {biometricAvailable
            ? `${biometricLabel}을 쓰면 매번 숫자를 누르지 않아도 됩니다. 나중에 설정에서 바꿀 수 있습니다.`
            : `이 기기에는 ${biometricLabel} 확인이 준비되어 있지 않습니다. 숫자로만 열 수 있습니다.`}
        </Body>
        <View style={{ height: space.md }} />
        {biometricAvailable ? (
          <BigButton
            label={`${biometricLabel}으로도 열기`}
            busy={busy}
            onPress={() => {
              setUseBiometric(true);
              void createVault(true);
            }}
          />
        ) : null}
        <BigButton
          label="숫자로만 열기"
          tone="plain"
          busy={busy}
          onPress={() => {
            setUseBiometric(false);
            void createVault(false);
          }}
        />
      </Screen>
    );
  }

  if (step === 'code-show') {
    return (
      <Screen title="복구 코드를 적어 두세요">
        <Notice>
          PIN(핀)을 잊었을 때 금고를 열 수 있는 유일한 방법입니다. 종이에 적어 폰과 다른 곳에 두세요.
          화면을 캡처하지 마세요.
        </Notice>
        <View style={{ height: space.md }} />
        <Title>{formatRecoveryCode(recoveryCode)}</Title>
        <Body dim>다음 화면에서 이 코드를 직접 입력해 확인합니다.</Body>
        <View style={{ height: space.md }} />
        <BigButton label="적었습니다. 다음" onPress={() => setStep('code-check')} />
      </Screen>
    );
  }

  return (
    <Screen title="적어 둔 복구 코드를 입력해 주세요" onBack={() => setStep('code-show')}>
      <Body dim>대문자·소문자, 띄어쓰기는 신경 쓰지 않아도 됩니다.</Body>
      <Field
        label="복구 코드"
        value={typedCode}
        onChangeText={setTypedCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="예: ABCDEF-GHJKMN-PQRSTV-WXYZ01"
      />
      <Notice tone="plain">
        {useBiometric ? '지문·얼굴로도 열 수 있게 해 두었습니다. ' : ''}
        PIN(핀)·복구 코드·백업 파일이 모두 없으면 금고를 열 수 없습니다.
      </Notice>
      <View style={{ height: space.md }} />
      <BigButton
        label="확인하고 시작하기"
        onPress={async () => {
          if (normalizeRecoveryCode(typedCode) !== recoveryCode) {
            showToast('복구 코드가 다릅니다. 적어 둔 것을 다시 보세요.', 'bad');
            return;
          }
          await refresh();
          showToast('금고를 만들었습니다.');
          reset({ name: 'list' });
        }}
      />
    </Screen>
  );
}
