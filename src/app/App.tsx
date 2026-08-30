import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { setCryptoProvider } from '../core/crypto/registry.ts';
import { Vault } from '../core/vault.ts';
import { AUTO_LOCK_MS } from '../core/settings.ts';
import { createDeviceCryptoProvider } from './platform/deviceCryptoProvider.ts';
import { ExpoMetaStore } from '../data/adapters/expoMetaStore.ts';
import { ExpoSecureKeyStore } from '../data/adapters/expoSecureKeyStore.ts';
import { ExpoSqliteRecordStore } from '../data/adapters/expoSqliteRecordStore.ts';
import { clearIfDue as clearClipboardIfDue } from './platform/clipboard.ts';
import { enableScreenGuard } from './platform/screenGuard.ts';
import { PrivacyShield } from './components/PrivacyShield.tsx';
import { ToastHost } from './components/Toast.tsx';
import { useVaultStore } from './state/vaultStore.ts';
import { FALLBACK_AUTO_LOCK_MS, shouldLockForIdle, shouldLockOnBackground } from './lockPolicy.ts';
import { BackupScreen } from './screens/BackupScreen.tsx';
import { DetailScreen } from './screens/DetailScreen.tsx';
import { EditScreen } from './screens/EditScreen.tsx';
import { LockScreen } from './screens/LockScreen.tsx';
import { SearchResultsScreen } from './screens/SearchResultsScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { SetupScreen } from './screens/SetupScreen.tsx';
import { VaultListScreen } from './screens/VaultListScreen.tsx';
import { colors } from './theme/index.ts';

/** 화면 하나만 고른다. 화면 수가 8개뿐이라 별도 네비게이션 라이브러리를 두지 않는다. */
function Router() {
  const route = useVaultStore((s) => s.stack[s.stack.length - 1]);
  switch (route?.name) {
    case 'setup':
      return <SetupScreen />;
    case 'lock':
      return <LockScreen />;
    case 'list':
      return <VaultListScreen />;
    case 'search':
      return <SearchResultsScreen query={route.query} />;
    case 'add':
      return <EditScreen />;
    case 'edit':
      return <EditScreen id={route.id} />;
    case 'detail':
      return <DetailScreen id={route.id} />;
    case 'settings':
      return <SettingsScreen />;
    case 'backup':
      return <BackupScreen />;
    default:
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
  }
}

export default function App() {
  const { attach, reset, lock, refreshLockState, loadSettings } = useVaultStore();
  const [ready, setReady] = useState(false);
  const lastActivityAt = useVaultStore((s) => s.lastActivityAt);
  const settings = useVaultStore((s) => s.settings);
  const activityRef = useRef(lastActivityAt);
  activityRef.current = lastActivityAt;

  // 시작: 암호 모듈과 저장소를 붙이고, 금고가 있는지 확인한다.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const provider = createDeviceCryptoProvider();
      setCryptoProvider(provider);
      const keyStore = new ExpoSecureKeyStore(provider);
      const vault = new Vault({
        provider,
        keyStore,
        metaStore: new ExpoMetaStore(),
        recordStore: new ExpoSqliteRecordStore(),
      });
      const status = await vault.status();
      if (cancelled) return;
      attach(vault);
      await Promise.all([refreshLockState(), loadSettings()]);
      reset({ name: status === 'empty' ? 'setup' : 'lock' });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [attach, reset, refreshLockState, loadSettings]);

  // 화면 찍기 막기 (명세 5.5). 기본값은 켬이다.
  useEffect(() => {
    if (settings.blockScreenCapture) void enableScreenGuard();
  }, [settings.blockScreenCapture]);

  /**
   * 백그라운드로 가는 즉시 잠근다 (명세 5.5).
   * 메모리의 DEK 와 열려 있던 내용이 함께 사라지고, 클립보드도 비운다.
   *
   * 'inactive' 에서는 잠그지 않는다. iOS 에서 지문·얼굴 확인 창이나 알림 센터가
   * 잠깐 덮을 때도 'inactive' 가 오는데, 그때 잠가 버리면 생체인증으로 여는 것
   * 자체가 불가능해진다. 그 순간 화면은 PrivacyShield 가 덮는다.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        // 다른 앱에 다녀오는 동안 타이머가 멈춘다. 돌아왔을 때 시간이 지났으면 지운다.
        void clearClipboardIfDue();
        return;
      }
      if (next !== 'background') return;
      const state = useVaultStore.getState();
      const route = state.stack[state.stack.length - 1];
      const shouldLock = shouldLockOnBackground({
        unlocked: !!state.vault?.isUnlocked,
        routeName: route?.name ?? '',
        systemDialogUntil: state.systemDialogUntil,
        now: Date.now(),
      });
      if (!shouldLock) return;
      lock();
      // 클립보드는 여기서 비우지 않는다. 다른 앱에 붙여넣으려고 복사한 것인데
      // 앱을 벗어나는 순간 비우면 붙여넣기가 아예 안 된다 (명세 5.5 는 60초다).
    });
    return () => sub.remove();
  }, [lock]);

  /** 손을 놓고 있으면 설정한 시간 뒤에 잠근다 (기본 1분). */
  useEffect(() => {
    const limit = AUTO_LOCK_MS[settings.autoLock] ?? FALLBACK_AUTO_LOCK_MS;
    const timer = setInterval(() => {
      const state = useVaultStore.getState();
      const route = state.stack[state.stack.length - 1];
      const due = shouldLockForIdle({
        unlocked: !!state.vault?.isUnlocked,
        routeName: route?.name ?? '',
        systemDialogUntil: state.systemDialogUntil,
        now: Date.now(),
        lastActivityAt: activityRef.current,
        autoLockMs: limit,
      });
      if (due) state.lock();
      void clearClipboardIfDue();
      // 1초마다 본다. 5초마다 보면 "1분"이 실제로는 60~65초가 되고,
      // "즉시"는 최대 5초 뒤가 된다. 화면에 적힌 대로 동작해야 한다.
      // 앱이 뒤로 가면 잠기므로 이 타이머가 배터리를 계속 먹지는 않는다.
    }, 1_000);
    return () => clearInterval(timer);
  }, [settings.autoLock]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} onTouchStart={() => useVaultStore.getState().touch()}>
        <StatusBar style="dark" />
        {ready ? <Router /> : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <ToastHost />
        <PrivacyShield />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
