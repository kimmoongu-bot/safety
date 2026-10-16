import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { BigButton, Body, Choice, Field, Notice, Screen, Title, Toggle } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { AVAILABLE, useT } from '../i18n/index.ts';
import { usePrefsStore } from '../state/prefsStore.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import { authenticate, checkBiometricSupport } from '../platform/biometrics.ts';
import { disableScreenGuard, enableScreenGuard } from '../platform/screenGuard.ts';
import { guardFailureMessage } from '../screenGuardPolicy.ts';
import { RecoveryCodeView } from '../components/RecoveryCodeView.tsx';
import { CLIPBOARD_CHOICES } from '../../core/settings.ts';
import { NEW_PIN_MIN_LENGTH } from '../../core/vault.ts';
import { SYSTEM_LOCALE, THEME_CHOICES, type ThemeChoice } from '../../core/prefs.ts';
import { space } from '../theme/index.ts';
import {
  isAutofillEnabled,
  isAutofillSupported,
  openAutofillSettings,
} from '../../../modules/jamgim-autofill/index.ts';

/**
 * 07 설정 — 화면 밝기, 자동 잠금 시간, 생체인증, 클립보드 삭제 시간, 캡처 차단,
 * 백업, 금고 초기화
 *
 * 화면 밝기와 언어만 저장 자리가 다르다. 이 둘은 잠금 화면에서도 필요해서 금고
 * 밖에 둔다 (core/prefs.ts). 나머지는 금고를 열어야 의미가 있다.
 */
/**
 * 언어 이름은 그 언어로 적는다. 한국어를 못 읽는 사람이 한국어 화면에서
 * 자기 언어를 찾아야 하기 때문이다. Intl 이 막히면 태그를 그대로 보여 준다.
 */
function languageName(tag: string): string {
  try {
    return new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * 자동 완성이 지금 켜져 있나.
 *
 * **폰 설정에서 바뀐다.** 우리가 바꾸는 값이 아니라 남의 화면에서 바뀌는 값이라,
 * 우리 저장소에 담아 두면 곧 거짓말이 된다. 화면이 다시 앞으로 나올 때마다
 * 그때그때 물어본다.
 *
 * 켤 수 없는 기기(안드로이드 8.0 아래, 아이폰)에서는 `supported` 가 거짓이다.
 * 그때는 이 자리를 아예 안 그린다 — 눌러도 아무 일 없는 단추를 두면, 사용자는
 * 자기가 잘못한 줄 안다.
 */
function useAutofillState(): { supported: boolean; enabled: boolean } {
  const [supported] = useState(() => isAutofillSupported());
  const [enabled, setEnabled] = useState(() => isAutofillSupported() && isAutofillEnabled());

  useEffect(() => {
    if (!supported) return;
    const check = () => setEnabled(isAutofillEnabled());
    /*
      폰 설정에 다녀오면 우리 앱이 다시 앞으로 나온다. 그때 다시 묻는다.

      금고는 그 사이에 잠긴다 (명세 5.5 — 화면을 벗어나면 잠근다). 그것을 여기서
      풀어 주지 않는다. 설정 한 번 다녀오자고 잠금을 늦추면, 그 구멍은 설정만
      쓰는 것이 아니게 된다.
    */
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, [supported]);

  return { supported, enabled };
}

export function SettingsScreen() {
  const { vault, settings, saveSettings, go, back, showToast, run, reset, beginSystemDialog, endSystemDialog } =
    useVaultStore();
  const t = useT();
  const [revealed, setRevealed] = useState('');
  const [changing, setChanging] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const autofill = useAutofillState();
  const prefs = usePrefsStore((s) => s.prefs);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const setLocale = usePrefsStore((s) => s.setLocale);

  const themeLabel: Record<ThemeChoice, string> = {
    system: t('settings.themeSystem'),
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
  };

  /**
   * 저장에 실패하면 알린다. 화면은 누른 대로 두고 되돌리지 않는다 — 눌렀는데
   * 되돌아가면 사용자는 자기가 잘못 눌렀다고 생각한다.
   */
  const savePref = async (run: () => Promise<boolean>) => {
    if (!(await run())) showToast(t('settings.saveFailed'), 'bad');
  };

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
        label={t('settings.theme')}
        value={prefs.theme}
        options={THEME_CHOICES.map((value) => ({ value, label: themeLabel[value] }))}
        onChange={(v) => void savePref(() => setTheme(v))}
      />
      <Body dim>{t('settings.themeWhy')}</Body>

      {/*
        언어는 고를 것이 둘 이상일 때만 보여 준다. 지금은 한국어뿐이라 안 나온다.
        고를 것이 하나뿐인 선택지는 화면만 길게 만든다 (명세 3장).
      */}
      {AVAILABLE.length > 1 && (
        <Choice
          label={t('settings.language')}
          value={prefs.locale}
          options={[
            { value: SYSTEM_LOCALE, label: t('settings.languageSystem') },
            ...AVAILABLE.map((tag) => ({ value: tag as string, label: languageName(tag) })),
          ]}
          onChange={(v) => void savePref(() => setLocale(v))}
        />
      )}

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
            hint={t('settings.pinNextHint', { count: NEW_PIN_MIN_LENGTH })}
            value={nextPin}
            onChangeText={setNextPin}
            keyboardType="number-pad"
            secureTextEntry
          />
          <BigButton
            label={t('settings.pinChange')}
            // 너무 짧으면 아예 못 누른다. 눌러 보고 퇴짜를 맞는 것보다 낫다.
            disabled={nextPin.trim().length < NEW_PIN_MIN_LENGTH}
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

      {/*
        켤 수 있는 기기에서만 그린다. 안드로이드 8.0 아래와 아이폰에는 이 얼개가
        아예 없다.
      */}
      {autofill.supported ? (
        <>
          <View style={{ height: space.md }} />
          <Title>{t('settings.autofillHeading')}</Title>
          <Body>{t('settings.autofillWhy')}</Body>
          <Body dim>{autofill.enabled ? t('settings.autofillOn') : t('settings.autofillOff')}</Body>
          {/*
            켜는 것은 우리가 못 한다. 안드로이드가 사용자에게 직접 고르게 한다.
            비밀번호를 남의 앱에 건네는 일이니 그게 맞다. 우리는 그 화면을 열어
            주기만 하고, 무엇을 해야 하는지 미리 알려 준다 — 낯선 화면에 떨어뜨려
            놓고 알아서 찾으시라고 하면 안 된다.
          */}
          <Notice tone="plain">{t('settings.autofillHow')}</Notice>
          <BigButton
            label={autofill.enabled ? t('settings.autofillChange') : t('settings.autofillTurnOn')}
            tone="plain"
            onPress={() => {
              if (!openAutofillSettings()) showToast(t('settings.autofillNoScreen'), 'bad');
            }}
          />
          {/*
            안 되는 앱이 있다는 것을 미리 적는다 (docs/자동완성.md 20장).
            은행·관공서 앱은 자기 자판으로만 비밀번호를 받아서, 우리가 넣어도
            그 앱이 보지 않는다. 겪고 나서 "내 앱이 고장 났나" 하시는 것보다
            먼저 아는 편이 낫다.
          */}
          <Body dim>{t('settings.autofillNotWorking')}</Body>
        </>
      ) : null}

      <View style={{ height: space.md }} />
      <Title>{t('settings.backupHeading')}</Title>
      <BigButton label={t('settings.backupGo')} tone="plain" onPress={() => go({ name: 'backup' })} />

      <View style={{ height: space.md }} />
      <Title>{t('info.title')}</Title>
      <BigButton label={t('settings.infoGo')} tone="plain" onPress={() => go({ name: 'info' })} />

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
            // 초기화는 기기 키를 지운다. 화면 설정을 새 키로 다시 써 두지 않으면
            // 다음에 켤 때 밝기와 언어가 폰 설정으로 돌아가 있다.
            await usePrefsStore.getState().resave();
            showToast(t('settings.wiped'));
            reset({ name: 'setup' });
          }
        }}
      />
    </Screen>
  );
}
