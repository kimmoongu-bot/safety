import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BigButton, Body, Notice, Screen, Title } from './components/Basics.tsx';
import { useT } from './i18n/index.ts';
import { cancelFill, getFillRequest, type FillRequest } from '../../modules/jamgim-autofill/index.ts';
import { useColors } from './theme/index.ts';
import { createStyles } from './theme/useStyles.ts';

/**
 * 채우기 화면 (docs/자동완성.md 3단계).
 *
 * 다른 앱의 로그인 칸에서 "잠김" 을 눌렀을 때 뜨는 화면이다. 우리 본 화면과는
 * **다른 액티비티**에서 돈다 (`plugins/android/JamgimFillActivity.kt` 참고).
 * 리액트 뿌리가 둘이 되지만 자바스크립트는 한 벌이라, 금고도 설정도 같은 것을 쓴다.
 *
 * **지금은 3단계 앞머리다.** 어느 앱이 달라고 하는지 보여 주고 닫는 것까지 한다.
 * 잠금을 풀고 목록에서 고르는 것은 다음이다. 이 단계에서 확인할 것은 하나다 —
 * **다른 앱에서 잠김을 눌렀을 때 이 화면이 뜨는가.** 액티비티를 따로 두는 방식이
 * Expo 앱에서 실제로 되는지가 이 일 전체에서 제일 불확실한 자리다.
 *
 * 이 화면은 **어느 앱이 달라고 하는지 크게 보여 준다.** 가짜 앱이 남의 비밀번호를
 * 달라고 하는 것을 막는 것은 결국 사람 눈이다. 그래서 본 잠금 화면을 쓰지 않고
 * 따로 만들었다 — 거기엔 이걸 보여 줄 자리가 없다.
 */
export default function FillApp() {
  const styles = useStyles();
  const colors = useColors();
  const t = useT();
  // 요청은 화면이 뜰 때 한 번만 읽는다. 도중에 바뀌지 않는다.
  const [request] = useState<FillRequest | null>(() => getFillRequest());

  const asking = request?.askingLabel ?? request?.askingPackage ?? '';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style={colors.statusBar} />
        <Screen title={t('fill.title')}>
          {request ? (
            <>
              <Title>{asking ? t('fill.asking', { app: asking }) : t('fill.askingUnknown')}</Title>
              {/*
                브라우저 안에서는 꾸러미 이름이 브라우저다. 그래서 주소도 같이 보여 준다.
                이것 없이 꾸러미만 보면 아무 사이트나 같아 보인다.
              */}
              {request.webDomain ? <Body dim>{t('fill.site', { domain: request.webDomain })}</Body> : null}
              <Notice>{t('fill.check')}</Notice>
              <Body dim>{t('fill.notYet')}</Body>
            </>
          ) : (
            <Body>{t('fill.noRequest')}</Body>
          )}
          <View style={styles.gap} />
          <BigButton label={t('fill.close')} tone="plain" onPress={cancelFill} />
        </Screen>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    gap: { height: 16 },
  }),
);
