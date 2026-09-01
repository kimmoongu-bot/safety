import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '../theme/index.ts';

/**
 * 큰 숫자 패드 (명세 3장: 터치 타깃 48dp 이상, 한 화면의 핵심 행동 1~2개).
 * 입력한 자릿수는 점으로만 보여 준다.
 */
export const PIN_MAX_LENGTH = 12;

/** 숫자 하나의 지름. 최소 터치 크기(48dp)보다 넉넉하다. */
const KEY = 66;

export function PinDots({ length }: { length: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`${length}자리 입력함`}>
      {Array.from({ length: Math.max(6, length) }).map((_, i) => (
        <View key={i} style={[styles.dot, i < length && styles.dotOn]} />
      ))}
    </View>
  );
}

export function PinPad({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const press = (key: string) => {
    if (disabled) return;
    if (key === '지움') onChange(value.slice(0, -1));
    else if (value.length < PIN_MAX_LENGTH) onChange(value + key);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '지움'];
  return (
    <View style={styles.pad}>
      {keys.map((key, index) =>
        key === '' ? (
          <View key={`gap-${index}`} style={styles.key} />
        ) : (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === '지움' ? '한 글자 지우기' : `숫자 ${key}`}
            disabled={disabled}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.key, styles.keyBox, pressed && styles.pressed, disabled && styles.off]}
          >
            <Text style={key === '지움' ? styles.keyTextSmall : styles.keyText}>{key}</Text>
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', marginVertical: space.sm },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  /**
   * 동그란 숫자판.
   *
   * 지름을 고정한다. 폭을 비율(%)로 주면 동그라미를 만들 수 없다 — 높이를 폭에
   * 맞춰야 하는데 비율은 실행할 때 정해지기 때문이다.
   *
   * 66 은 손가락이 닿는 최소 크기(48dp)보다 넉넉하면서, 네 줄에 아래 버튼 세 개까지
   * 한 화면에 들어가는 크기다. 더 키우면 스크롤이 생겨 실패 안내가 밀려난다.
   */
  key: { width: KEY, height: KEY, alignItems: 'center', justifyContent: 'center' },
  keyBox: { borderRadius: KEY / 2, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: 0.7, backgroundColor: colors.surface },
  off: { opacity: 0.5 },
  keyText: { fontSize: font.huge, fontWeight: '700', color: colors.text },
  keyTextSmall: { fontSize: font.body, fontWeight: '700', color: colors.accent },
});
