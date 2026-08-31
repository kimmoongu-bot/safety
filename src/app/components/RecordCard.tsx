import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OpenRecord } from '../../core/schema.ts';
import { colors, font, radius, space, TOUCH } from '../theme/index.ts';

/** 1년 넘게 안 바꾼 비밀번호에 배지를 붙인다 (명세 7장). */
export const STALE_PASSWORD_MS = 365 * 24 * 60 * 60 * 1000;

export function isPasswordStale(record: OpenRecord, now: number): boolean {
  return record.pwChangedAt > 0 && now - record.pwChangedAt > STALE_PASSWORD_MS;
}

/** 큰 카드 리스트 — 한 번 눌러 상세로 간다 (명세 3장). */
export function RecordCard({
  record,
  onPress,
  onToggleFavorite,
  now,
}: {
  record: OpenRecord;
  onPress: () => void;
  onToggleFavorite?: () => void;
  now: number;
}) {
  const stale = isPasswordStale(record, now);
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${record.service}, 아이디 ${record.username || '없음'}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Text style={styles.service} numberOfLines={2}>
          {record.service || '이름 없음'}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          {record.username || '아이디 없음'}
        </Text>
        <View style={styles.badges}>
          {record.category ? <Text style={styles.badge}>{record.category}</Text> : null}
          {stale ? <Text style={[styles.badge, styles.badgeWarn]}>1년 넘게 안 바꿈</Text> : null}
        </View>
      </Pressable>
      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={record.favorite ? '자주 쓰는 것에서 빼기' : '자주 쓰는 것으로 두기'}
          accessibilityState={{ selected: record.favorite }}
          onPress={onToggleFavorite}
          style={({ pressed }) => [styles.star, pressed && styles.pressed]}
        >
          <Text style={[styles.starText, record.favorite && styles.starOn]}>{record.favorite ? '★' : '☆'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'stretch', gap: space.sm },
  card: {
    flex: 1,
    minHeight: TOUCH + 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    backgroundColor: colors.bg,
  },
  pressed: { opacity: 0.75, backgroundColor: colors.surface },
  service: { fontSize: font.big, fontWeight: '700', color: colors.text },
  username: { fontSize: font.bodySmall, color: colors.textDim },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  badge: {
    fontSize: font.bodySmall - 2,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  badgeWarn: { backgroundColor: colors.warnBg, color: colors.warnText },
  star: {
    minWidth: TOUCH,
    minHeight: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  starText: { fontSize: font.title, color: colors.textDim },
  starOn: { color: colors.favorite },
});
