import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { font, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';
import { useT } from '../i18n/index.ts';
import { needsPrivacyShield } from '../platform/screenGuard.ts';

/**
 * 앱 전환 화면 가리기 (명세 5.5)
 *
 * 안드로이드는 FLAG_SECURE 가 최근 앱 목록 미리보기까지 가려 준다.
 * iOS 에는 그런 장치가 없어서, 앱이 활성 상태를 벗어나는 순간 화면 전체를
 * 로고 화면으로 덮는다.
 */
export function PrivacyShield() {
  const styles = useStyles();
  const t = useT();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setHidden(next !== 'active');
    });
    return () => sub.remove();
  }, []);

  if (!needsPrivacyShield || !hidden) return null;
  return (
    <View style={styles.shield} pointerEvents="none">
      <Text style={styles.logo}>{t('common.appName')}</Text>
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    shield: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    },
    logo: { fontFamily: font.familyBold, fontSize: font.huge, fontWeight: WEIGHT, color: colors.primary, letterSpacing: 4 },
  }),
);
