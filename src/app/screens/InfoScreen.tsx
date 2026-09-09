import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { BigButton, Body, Notice, Screen, Title } from '../components/Basics.tsx';
import { useT } from '../i18n/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import { CONTACT_EMAIL, OFL_TEXT, THIRD_PARTY } from '../licenses.ts';
import { createStyles } from '../theme/useStyles.ts';
import { font, space } from '../theme/index.ts';

/**
 * 09 정보 — 판 번호 · 개인정보 처리방침 · 오픈 소스 라이선스 · 문의
 *
 * **처리방침을 앱 안에 담는다.** 웹 주소 하나만 걸어 두는 앱이 많은데, 인터넷 권한도
 * 요청하지 않는 앱이 자기 처리방침을 보려면 인터넷이 필요하다는 것은 앞뒤가 맞지
 * 않는다. 스토어에는 같은 내용을 웹으로도 올린다 (플레이가 주소를 요구한다).
 *
 * 세 화면을 한 파일에 둔 것은 서로 오가기만 할 뿐 상태를 나누지 않기 때문이다.
 * 길 이름(Route)을 셋으로 늘리면 뒤로 가기가 세 단계가 되어 오히려 성가시다.
 */
type View_ = 'home' | 'privacy' | 'licenses';

/** 처리방침을 마지막으로 손본 날. 내용을 고치면 **반드시** 같이 고친다. */
const PRIVACY_UPDATED = '2026-09-09';

export function InfoScreen() {
  const styles = useStyles();
  const t = useT();
  const back = useVaultStore((s) => s.back);
  const [view, setView] = useState<View_>('home');

  if (view === 'privacy') {
    return (
      <Screen title={t('privacy.title')} onBack={() => setView('home')}>
        <Notice tone="plain">{t('privacy.summary')}</Notice>
        <Body dim>{t('privacy.updated', { date: PRIVACY_UPDATED })}</Body>
        {([1, 2, 3, 4, 5, 6] as const).map((n) => (
          <View key={n} style={styles.section}>
            <Title>{t(`privacy.h${n}`)}</Title>
            <Body>{t(`privacy.b${n}`)}</Body>
          </View>
        ))}
      </Screen>
    );
  }

  if (view === 'licenses') {
    return (
      <Screen title={t('info.licenses')} onBack={() => setView('home')}>
        {THIRD_PARTY.map((item) => (
          <View key={item.name} style={styles.section}>
            <Title>{item.name}</Title>
            <Body dim>{t(item.useKey)}</Body>
            {/* 저작권 표시는 원문 그대로 둔다. 옮기면 표시가 아니게 된다. */}
            <Text style={styles.mono}>{item.copyright}</Text>
          </View>
        ))}
        <Body dim>{t('info.oflNote')}</Body>
        <Text style={styles.mono}>{OFL_TEXT}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('info.title')} onBack={back}>
      <Title>{t('common.appName')}</Title>
      <Body dim>{t('info.version', { version: Constants.expoConfig?.version ?? '—' })}</Body>

      <View style={{ height: space.md }} />
      <BigButton label={t('info.privacy')} tone="plain" onPress={() => setView('privacy')} />
      <BigButton label={t('info.licenses')} tone="plain" onPress={() => setView('licenses')} />

      {/*
        주소를 아직 안 정했으면 문의 줄 자체를 내보내지 않는다.
        눌러도 아무 일도 안 나는 단추는 아무것도 없는 것보다 나쁘다.
      */}
      {CONTACT_EMAIL ? (
        <>
          <View style={{ height: space.md }} />
          <Title>{t('info.contact')}</Title>
          <Body dim>{t('info.contactHow')}</Body>
          <BigButton
            label={CONTACT_EMAIL}
            tone="plain"
            onPress={() => {
              // 메일 앱을 여는 것뿐이라 인터넷 권한이 필요 없다 (명세 1장).
              void Linking.openURL(`mailto:${CONTACT_EMAIL}`);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((colors, fonts) =>
  StyleSheet.create({
    section: { gap: space.xs },
    /**
     * 허락서 원문. 줄바꿈이 뜻을 가지므로 흘려 쓰지 않고 그대로 보여 준다.
     * 글꼴 크기를 사용자 설정에 맡기는 것은 다른 곳과 같다.
     */
    mono: {
      fontFamily: fonts.family,
      fontSize: font.caption,
      lineHeight: font.caption * 1.5,
      color: colors.textDim,
    },
  }),
);
