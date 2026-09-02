import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Field, Notice, Screen, Title } from '../components/Basics.tsx';
import { PinDots, PinPad } from '../components/PinPad.tsx';
import { useT } from '../i18n/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import { type BiometricKind, checkBiometricSupport } from '../platform/biometrics.ts';
import { normalizeRecoveryCode } from '../../core/recoveryCode.ts';
import { RecoveryCodeView } from '../components/RecoveryCodeView.tsx';
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
  const t = useT();
  const how = (kind: BiometricKind) => t(`biometric.${kind}`);
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('both');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [typedCode, setTypedCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void checkBiometricSupport().then((s) => {
      setBiometricAvailable(s.available);
      setBiometricKind(s.kind);
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
      <Screen title={t(step === 'pin' ? 'setup.pinTitle' : 'setup.pinAgainTitle')}>
        <Body dim>
          {step === 'pin'
            ? t('setup.pinHelp')
            : t('setup.pinAgainHelp')}
        </Body>
        <PinDots length={value.length} />
        <PinPad value={value} onChange={setValue} />
        <View style={{ height: space.md }} />
        <BigButton
          label={t('setup.next')}
          disabled={value.length < MIN_PIN}
          onPress={() => {
            if (step === 'pin') {
              setStep('pin-again');
              return;
            }
            if (pin !== pinAgain) {
              showToast(t('setup.pinMismatch'), 'bad');
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
      <Screen title={t('setup.biometricTitle', { how: how(biometricKind) })}>
        <Body dim>
          {biometricAvailable
            ? t('setup.biometricWhy', { how: how(biometricKind) })
            : t('setup.biometricUnavailable', { how: how(biometricKind) })}
        </Body>
        <View style={{ height: space.md }} />
        {biometricAvailable ? (
          <BigButton
            label={t('setup.biometricYes', { how: how(biometricKind) })}
            busy={busy}
            onPress={() => {
              setUseBiometric(true);
              void createVault(true);
            }}
          />
        ) : null}
        <BigButton
          label={t('setup.pinOnly')}
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
      <Screen title={t('setup.codeTitle')}>
        <Notice>
          {t('setup.codeWarn')}
        </Notice>
        <View style={{ height: space.md }} />
        <RecoveryCodeView code={recoveryCode} />
        <Body dim>{t('setup.codeNext')}</Body>
        <View style={{ height: space.md }} />
        <BigButton label={t('setup.codeWrote')} onPress={() => setStep('code-check')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('setup.codeCheckTitle')} onBack={() => setStep('code-show')}>
      <Body dim>{t('setup.codeCheckHelp')}</Body>
      <Field
        label={t('lock.recoveryLabel')}
        value={typedCode}
        onChangeText={setTypedCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={t('lock.recoveryPlaceholder')}
      />
      <Notice tone="plain">
        {useBiometric ? t('setup.lastWarnWithBiometric', { how: how(biometricKind) }) : t('setup.lastWarn')}
      </Notice>
      <View style={{ height: space.md }} />
      <BigButton
        label={t('setup.finish')}
        onPress={async () => {
          if (normalizeRecoveryCode(typedCode) !== recoveryCode) {
            showToast(t('setup.codeMismatch'), 'bad');
            return;
          }
          await refresh();
          showToast(t('setup.done'));
          reset({ name: 'list' });
        }}
      />
    </Screen>
  );
}
