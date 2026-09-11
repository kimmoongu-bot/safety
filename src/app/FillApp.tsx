import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BigButton, Body, Notice, Screen, Title } from './components/Basics.tsx';
import { RecordCard } from './components/RecordCard.tsx';
import { LockScreen } from './screens/LockScreen.tsx';
import { ToastHost } from './components/Toast.tsx';
import { pickFields } from '../core/autofill.ts';
import { rankForRequest } from '../core/autofillMatch.ts';
import { FIELD_WORDS } from './i18n/autofillWords.ts';
import { useT } from './i18n/index.ts';
import { boot } from './boot.ts';
import { setStoreTranslator, useVaultStore } from './state/vaultStore.ts';
import { enableScreenGuard } from './platform/screenGuard.ts';
import { space, useColors } from './theme/index.ts';
import { createStyles } from './theme/useStyles.ts';
import {
  cancelFill,
  getFillRequest,
  respondWithFill,
  type FillRequest,
} from '../../modules/jamgim-autofill/index.ts';

/**
 * 채우기 화면 (docs/자동완성.md 3-2 · 4단계).
 *
 * 다른 앱의 로그인 칸에서 "잠김" 을 눌렀을 때 뜨는 화면이다. 우리 본 화면과는
 * **다른 액티비티**에서 돈다 (`plugins/android/JamgimFillActivity.kt`).
 * 리액트 뿌리가 둘이지만 자바스크립트는 한 벌이라 금고도 설정도 같은 것을 쓴다.
 *
 * 하는 일은 넷이다.
 *   1. 어느 앱이 달라고 하는지 크게 보여 준다
 *   2. 금고가 잠겨 있으면 잠금 화면을 띄운다 — **평소 그 잠금 화면 그대로다**
 *   3. 목록에서 고르게 한다. 자동으로 채우지 않는다
 *   4. 고른 값을 안드로이드에 넘기고 닫는다
 *
 * **금고를 여는 길은 하나뿐이다.** 여기에 따로 여는 코드가 없다. 평소와 똑같이
 * `LockScreen` 이 열고, 실패 대기도 화면 캡처 막기도 그대로 걸린다 (명세 5.4, 5.5).
 * 자동 완성이 두 번째 문이 되면 안 된다.
 */
type Stage =
  | { name: 'loading' }
  | { name: 'no-vault' }
  | { name: 'locked' }
  | { name: 'pick' }
  | { name: 'no-field' };

export default function FillApp() {
  const styles = useStyles();
  const colors = useColors();
  const t = useT();

  // 요청은 화면이 뜰 때 한 번만 읽는다. 도중에 바뀌지 않는다.
  const [request] = useState<FillRequest | null>(() => getFillRequest());
  const [stage, setStage] = useState<Stage>({ name: 'loading' });

  const records = useVaultStore((s) => s.records);
  const showToast = useVaultStore((s) => s.showToast);

  // 저장소는 화면 밖이라 훅을 쓸 수 없다. 번역기를 넘겨 준다.
  useEffect(() => {
    setStoreTranslator(t);
  }, [t]);

  /*
    화면 찍기를 막는다 (명세 5.5).

    여기는 본 화면과 **다른 액티비티**라, 그쪽에 건 표시가 여기에는 안 걸린다.
    비밀번호 목록이 뜨는 화면이니 여기가 더 급하다. 설정이 꺼져 있어도 거는 것은,
    이 화면이 잠깐 뜨는 남의 앱 위이기 때문이다 — 끌 자리가 아니다.
  */
  useEffect(() => {
    void enableScreenGuard();
  }, []);

  // 시작: 금고를 세우고 어느 화면을 보여 줄지 정한다.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { vault: v } = await boot();
      if (cancelled) return;
      const status = await v.status();
      if (cancelled) return;
      useVaultStore.getState().attach(v);
      await Promise.all([
        useVaultStore.getState().refreshLockState(),
        useVaultStore.getState().loadSettings(),
      ]);
      if (cancelled) return;
      if (status === 'empty') {
        setStage({ name: 'no-vault' });
        return;
      }
      setStage(v.isUnlocked ? { name: 'pick' } : { name: 'locked' });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /*
    뒤로 가면 잠근다 (명세 5.5).

    본 화면의 잠금 규칙은 그쪽 화면이 떠 있을 때만 돈다. 여기서 금고를 열어 놓고
    화면을 벗어나면 아무도 안 잠근다. 그래서 여기도 자기 것을 둔다.
  */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') useVaultStore.getState().lock();
    });
    return () => sub.remove();
  }, []);

  /*
    잠금이 풀리면 고르는 화면으로 넘어간다.

    `vault.isUnlocked` 를 보지 않는다. 그것은 객체 안의 값이라 바뀌어도 화면이
    다시 그려지지 않는다. 잠금 화면은 금고를 연 뒤 길을 'list' 로 옮기는데,
    그건 저장소가 바뀌는 일이라 확실히 전해진다.
  */
  const route = useVaultStore((s) => s.stack[s.stack.length - 1]);
  useEffect(() => {
    if (stage.name === 'locked' && route?.name === 'list') setStage({ name: 'pick' });
  }, [stage.name, route?.name]);

  // 금고를 열었으면 항목을 읽어 온다.
  useEffect(() => {
    if (stage.name !== 'pick') return;
    void useVaultStore.getState().refresh();
  }, [stage.name]);

  const fill = useCallback(
    (id: string) => {
      const record = records.find((r) => r.id === id);
      if (!record || !request) return;
      const picked = pickFields(request.fields, FIELD_WORDS);
      if (picked.username === null && picked.password === null) {
        setStage({ name: 'no-field' });
        return;
      }
      const ok = respondWithFill({
        usernameIndex: picked.username,
        passwordIndex: picked.password,
        username: record.username,
        password: record.password,
      });
      // 조용히 닫히면 왜 안 채워졌는지 알 길이 없다.
      if (!ok) showToast(t('fill.failed'), 'bad');
    },
    [records, request, showToast, t],
  );

  const asking = request?.askingLabel ?? request?.askingPackage ?? '';
  // 못 맞히면 금고에 담긴 차례 그대로다. 섞어 놓으면 더 헷갈린다.
  const ordered = request
    ? rankForRequest(records, { packageName: request.askingPackage, webDomain: request.webDomain })
    : records;

  /*
    잠겨 있으면 **평소 잠금 화면을 그대로** 띄운다. 여기에 따로 여는 코드를 두지
    않는다 — 실패 대기도 지문도 복구 코드도 그쪽에 이미 다 있다 (명세 5.4).
    자동 완성이 금고를 여는 두 번째 문이 되면 안 된다.

    그 화면이 제 액자를 그리므로 우리 액자로 감싸지 않는다.
  */
  if (stage.name === 'locked') {
    return (
      <SafeAreaProvider>
        <View style={styles.outer}>
          <SafeAreaView style={styles.safe}>
            <StatusBar style={colors.statusBar} />
            <LockScreen />
          </SafeAreaView>
          <ToastHost />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.outer}>
        <SafeAreaView style={styles.safe}>
          <StatusBar style={colors.statusBar} />
          <Screen title={t('fill.title')}>
            {request ? (
              <>
                <Title>{asking ? t('fill.asking', { app: asking }) : t('fill.askingUnknown')}</Title>
                {/*
                  브라우저 안에서는 꾸러미 이름이 브라우저다. 그래서 주소도 같이
                  보여 준다. 이것 없이 꾸러미만 보면 아무 사이트나 같아 보인다.
                */}
                {request.webDomain ? <Body dim>{t('fill.site', { domain: request.webDomain })}</Body> : null}
                <Notice>{t('fill.check')}</Notice>
                <View style={styles.gap} />
                <Content stage={stage} records={ordered} onPick={fill} />
              </>
            ) : (
              <Body>{t('fill.noRequest')}</Body>
            )}
            <View style={styles.gap} />
            <BigButton label={t('fill.close')} tone="plain" onPress={cancelFill} />
          </Screen>
        </SafeAreaView>
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}

function Content({
  stage,
  records,
  onPick,
}: {
  stage: Stage;
  records: ReturnType<typeof useVaultStore.getState>['records'];
  onPick: (id: string) => void;
}) {
  const t = useT();
  /*
    "비밀번호 바꾼 지 오래됨" 표시를 계산할 기준 시각. 이 화면은 잠깐 떠 있다
    사라지므로 한 번 잡아 두면 된다 — 본 목록 화면처럼 흐르게 할 이유가 없다.
  */
  const [now] = useState(() => Date.now());

  switch (stage.name) {
    case 'loading':
      return null;
    case 'no-vault':
      return <Notice>{t('fill.noVault')}</Notice>;
    case 'no-field':
      return <Notice>{t('fill.noField')}</Notice>;
    case 'locked':
      // 위에서 통째로 잠금 화면을 띄운다. 여기로 오지 않는다.
      return null;
    case 'pick':
      if (records.length === 0) return <Notice>{t('fill.empty')}</Notice>;
      return (
        <>
          <Title>{t('fill.pick')}</Title>
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              now={now}
              onPress={() => onPick(record.id)}
            />
          ))}
        </>
      );
  }
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    outer: { flex: 1, backgroundColor: colors.bg },
    safe: { flex: 1 },
    gap: { height: space.md },
  }),
);
