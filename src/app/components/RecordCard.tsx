import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OpenRecord } from '../../core/schema.ts';
import { colors, font, radius, space, TOUCH, WEIGHT } from '../theme/index.ts';

/**
 * 카드 왼쪽의 네모 표시.
 *
 * 시안에는 네이버·구글 같은 회사 로고가 들어 있었지만 넣지 않는다. 두 가지 때문이다.
 *  1. 인터넷 권한이 없어서 받아올 방법이 없다 (명세 1장).
 *  2. 남의 회사 상표를 앱에 넣어 배포하는 것은 따로 확인이 필요하다.
 * 대신 서비스 이름의 첫 글자를 쓴다. 어느 나라 글자든 그대로 나오므로 국제화에도 맞는다.
 *
 * 색은 이름에서 정한다. 같은 서비스는 늘 같은 색이라 눈이 자리를 기억한다.
 * 무작위로 하면 앱을 열 때마다 색이 바뀌어 오히려 못 알아본다.
 */
const MARK_COLORS = [colors.secondary, colors.accent, colors.primary] as const;

export function markColor(service: string): string {
  let sum = 0;
  for (let i = 0; i < service.length; i += 1) sum = (sum + service.charCodeAt(i)) % 4096;
  return MARK_COLORS[sum % MARK_COLORS.length];
}

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
        <View
          style={[styles.mark, { backgroundColor: markColor(record.service) }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={styles.markText}>{(record.service || '?').trim().charAt(0) || '?'}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.service} numberOfLines={2}>
            {record.service || '이름 없음'}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            {record.username || '아이디 없음'}
          </Text>
          {record.category || stale ? (
            <View style={styles.badges}>
              {record.category ? <Text style={styles.badge}>{record.category}</Text> : null}
              {stale ? <Text style={[styles.badge, styles.badgeWarn]}>1년 넘게 안 바꿈</Text> : null}
            </View>
          ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH + 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    // 크림 바탕 위의 흰 카드. 바탕과 같은 색이면 카드 경계가 사라진다.
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75, backgroundColor: colors.bg },
  /** 글꼴을 키워도 네모가 같이 커지지 않게 크기를 고정한다. */
  mark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  markText: { fontFamily: font.familyBold, fontSize: font.big, fontWeight: WEIGHT, color: colors.primaryText },
  cardText: { flex: 1, gap: 2 },
  service: { fontFamily: font.familyBold, fontSize: font.big, fontWeight: WEIGHT, color: colors.text },
  username: { fontFamily: font.family, fontSize: font.bodySmall, color: colors.textDim },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  badge: {
    fontFamily: font.family,
    fontSize: font.caption,
    color: colors.text,
    // 흰 카드 위에 얹히므로 크림색이어야 보인다.
    backgroundColor: colors.bg,
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
  starText: { fontFamily: font.family, fontSize: font.title, color: colors.textDim },
  starOn: { color: colors.favorite },
});
