import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, frame, radius, space, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';
import { useVaultStore } from '../state/vaultStore.ts';

/**
 * 복사·저장·삭제 결과를 반드시 알린다 (명세 3장 UI 원칙).
 * 화면 낭독기에도 전달되도록 accessibilityLiveRegion 을 쓴다.
 */
export function ToastHost() {
  const styles = useStyles();
  const toast = useVaultStore((s) => s.toast);
  const hide = useVaultStore((s) => s.hideToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    // 오류는 읽을 시간이 필요하다. 잘 됐다는 알림보다 오래 둔다.
    const timer = setTimeout(hide, toast.tone === 'bad' ? 9000 : 3200);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        // 시계·배터리가 있는 상태 표시줄을 비켜 가고, 앱 상자 안쪽에 앉힌다.
        // 기기가 상태 표시줄 높이를 안 알려 주면 24 를 쓴다.
        { top: (insets.top || 24) + frame.inset + space.sm },
        toast.tone === 'bad' ? styles.bad : styles.ok,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{toast.text}</Text>
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    toast: {
      // 위쪽에 띄운다. 아래쪽은 버튼과 폰 내비게이션 바에 가려 잘린다.
      // top 은 위에서 기기별 상태 표시줄 높이를 더해 넣는다.
      position: 'absolute',
      left: frame.inset + space.md,
      right: frame.inset + space.md,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 2,
    },
    // 크림 바탕에 얹히는 색이다. 흰 바탕 시절 색을 그대로 두면 혼자 튄다.
    ok: { backgroundColor: colors.toastOkBg, borderColor: colors.ok },
    bad: { backgroundColor: colors.toastBadBg, borderColor: colors.danger },
    text: { fontFamily: font.familyBold, fontSize: font.body, color: colors.text, fontWeight: WEIGHT, lineHeight: font.body * 1.4 },
  }),
);
