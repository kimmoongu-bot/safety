import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { BigButton } from './Basics.tsx';
import { colors, font, radius, space } from '../theme/index.ts';

/**
 * 되돌릴 수 없는 일에 쓰는 확인창.
 * 금고 초기화처럼 위험한 것은 2단계로 확인받는다 (명세 6.4).
 */
export function Confirm({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'primary',
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'primary' | 'danger';
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <BigButton label={confirmLabel} tone={tone} onPress={onConfirm} />
          <BigButton label="그만두기" tone="plain" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
  message: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.5, marginBottom: space.sm },
});
