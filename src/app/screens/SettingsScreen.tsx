import React, { useState } from 'react';
import { View } from 'react-native';
import { BigButton, Body, Choice, Field, Notice, Screen, Title, Toggle } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, checkBiometricSupport } from '../platform/biometrics.ts';
import { disableScreenGuard, enableScreenGuard } from '../platform/screenGuard.ts';
import { formatRecoveryCode } from '../../core/recoveryCode.ts';
import { CLIPBOARD_CHOICES } from '../../core/settings.ts';
import { space } from '../theme/index.ts';

/**
 * 07 설정 — 자동 잠금 시간, 생체인증, 클립보드 삭제 시간, 캡처 차단, 백업, 금고 초기화
 */
export function SettingsScreen() {
  const { vault, settings, saveSettings, go, back, showToast, run, reset } = useVaultStore();
  const [revealed, setRevealed] = useState('');
  const [changing, setChanging] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);

  const revealRecoveryCode = async () => {
    if (!vault) return;
    if (!(await authenticate('복구 코드를 보려면 확인이 필요합니다'))) {
      showToast('확인하지 못했습니다.', 'bad');
      return;
    }
    const code = await run(() => vault.revealRecoveryCode());
    if (code.ok) setRevealed(code.value);
  };

  return (
    <Screen title="설정" onBack={back}>
      <Choice
        label="얼마 뒤에 저절로 잠글까요?"
        value={settings.autoLock}
        options={[
          { value: 'immediate', label: '바로' },
          { value: '1m', label: '1분' },
          { value: '5m', label: '5분' },
        ]}
        onChange={(v) => void saveSettings({ autoLock: v })}
      />

      <Toggle
        label="지문·얼굴로 열기"
        description="켜면 숫자를 누르지 않아도 열 수 있습니다."
        value={settings.biometricUnlock}
        onChange={async (next) => {
          if (!vault) return;
          if (next) {
            const support = await checkBiometricSupport();
            if (!support.available) {
              showToast('이 기기에는 지문·얼굴 확인이 준비되어 있지 않습니다.', 'bad');
              return;
            }
          }
          const done = await run(() => vault.setBiometricUnlock(next));
          if (done.ok) {
            await saveSettings({ biometricUnlock: next });
            showToast(next ? '지문·얼굴로 열 수 있습니다.' : '지문·얼굴 열기를 껐습니다.');
          }
        }}
      />

      <Choice
        label="복사한 내용을 언제 지울까요?"
        value={settings.clipboardClearSeconds}
        options={CLIPBOARD_CHOICES.map((s) => ({ value: s, label: `${s}초 뒤` }))}
        onChange={(v) => void saveSettings({ clipboardClearSeconds: v })}
      />

      <Toggle
        label="화면 찍기 막기"
        description="캡처와 최근 앱 목록 미리보기를 막습니다."
        value={settings.blockScreenCapture}
        onChange={async (next) => {
          await saveSettings({ blockScreenCapture: next });
          if (next) await enableScreenGuard();
          else await disableScreenGuard();
          showToast(next ? '화면 찍기를 막습니다.' : '화면 찍기 막기를 껐습니다.');
        }}
      />

      <Toggle
        label="바꾸기 전 비밀번호 1개 남기기"
        description="새 비밀번호가 안 될 때 되돌리는 용도입니다."
        value={settings.keepPreviousPassword}
        onChange={(next) => void saveSettings({ keepPreviousPassword: next })}
      />

      <Toggle
        label="10번 틀리면 금고 지우기"
        description="켜면 숫자를 10번 잘못 누를 때 금고를 통째로 지웁니다. 백업 파일이 없으면 되살릴 수 없습니다."
        value={settings.wipeAfterTenFailures}
        onChange={(next) => void saveSettings({ wipeAfterTenFailures: next })}
      />

      <View style={{ height: space.md }} />
      <Title>복구 코드</Title>
      {revealed ? (
        <>
          <Notice>{formatRecoveryCode(revealed)}</Notice>
          <BigButton label="다시 숨기기" tone="plain" onPress={() => setRevealed('')} />
        </>
      ) : (
        <BigButton label="복구 코드 다시 보기" tone="plain" onPress={revealRecoveryCode} />
      )}

      <View style={{ height: space.md }} />
      <Title>비밀번호(PIN) 바꾸기</Title>
      {changing ? (
        <>
          <Field
            label="지금 쓰는 숫자"
            value={currentPin}
            onChangeText={setCurrentPin}
            keyboardType="number-pad"
            secureTextEntry
          />
          <Field
            label="새로 쓸 숫자"
            value={nextPin}
            onChangeText={setNextPin}
            keyboardType="number-pad"
            secureTextEntry
          />
          <BigButton
            label="바꾸기"
            onPress={async () => {
              if (!vault) return;
              const done = await run(() => vault.changePin(currentPin, nextPin));
              setCurrentPin('');
              setNextPin('');
              if (done.ok) {
                setChanging(false);
                showToast('숫자를 바꿨습니다.');
              }
            }}
          />
          <BigButton label="그만두기" tone="plain" onPress={() => setChanging(false)} />
        </>
      ) : (
        <BigButton label="숫자 바꾸기" tone="plain" onPress={() => setChanging(true)} />
      )}

      <View style={{ height: space.md }} />
      <Title>백업</Title>
      <BigButton label="백업 파일 만들기 / 가져오기" tone="plain" onPress={() => go({ name: 'backup' })} />

      <View style={{ height: space.lg }} />
      <Title>금고 초기화</Title>
      <Notice>
        숫자(PIN)·지문·복구 코드·백업 파일이 모두 없으면 금고를 열 수 없습니다. 그럴 때는 금고를 지우고
        새로 시작할 수 있지만, 넣어 둔 내용은 되살아나지 않습니다.
      </Notice>
      <BigButton label="금고 지우고 새로 시작" tone="danger" onPress={() => setWipeStep(1)} />
      <Body dim>지우기 전에 두 번 물어봅니다.</Body>

      <Confirm
        visible={wipeStep === 1}
        title="정말 지울까요? (1/2)"
        message="넣어 둔 아이디와 비밀번호가 모두 사라집니다. 되돌릴 수 없습니다."
        confirmLabel="계속"
        tone="danger"
        onCancel={() => setWipeStep(0)}
        onConfirm={() => setWipeStep(2)}
      />
      <Confirm
        visible={wipeStep === 2}
        title="마지막 확인입니다 (2/2)"
        message="백업 파일이 없다면 지금 지운 내용은 어떤 방법으로도 되살릴 수 없습니다."
        confirmLabel="지우겠습니다"
        tone="danger"
        onCancel={() => setWipeStep(0)}
        onConfirm={async () => {
          if (!vault) return;
          setWipeStep(0);
          const done = await run(() => vault.destroy());
          if (done.ok) {
            showToast('금고를 지웠습니다.');
            reset({ name: 'setup' });
          }
        }}
      />
    </Screen>
  );
}
