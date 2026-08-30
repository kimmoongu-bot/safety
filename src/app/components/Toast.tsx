import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';

/**
 * 복사·저장·삭제 결과를 반드시 알린다 (명세 3장 UI 원칙).
 * 화면 낭독기에도 전달되도록 accessibilityLiveRegion 을 쓴다.
 */
export function ToastHost() {
  const toast = useVaultStore((s) => s.toast);
  const hide = useVaultStore((s) => s.hideToast);

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
      style={[styles.toast, toast.tone === 'bad' ? styles.bad : styles.ok]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{toast.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.xl,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  ok: { backgroundColor: '#E8F5EF', borderColor: colors.ok },
  bad: { backgroundColor: '#FDEDED', borderColor: colors.danger },
  text: { fontSize: font.body, color: colors.text, fontWeight: '600', lineHeight: font.body * 1.4 },
});
