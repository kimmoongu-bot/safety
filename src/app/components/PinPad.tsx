import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space, TOUCH } from '../theme/index.ts';

/**
 * 큰 숫자 패드 (명세 3장: 터치 타깃 48dp 이상, 한 화면의 핵심 행동 1~2개).
 * 입력한 자릿수는 점으로만 보여 준다.
 */
export const PIN_MAX_LENGTH = 12;

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
  // 높이는 손가락이 닿는 최소 크기(48dp)보다 넉넉하되, 숫자판 네 줄에 버튼 세 개까지
  // 한 화면에 들어가야 한다. 스크롤이 생기면 실패 안내나 아래 버튼이 밀려난다.
  key: { width: '30%', minWidth: TOUCH * 1.6, minHeight: TOUCH + 10, alignItems: 'center', justifyContent: 'center' },
  keyBox: { borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  pressed: { opacity: 0.7, backgroundColor: colors.surface },
  off: { opacity: 0.5 },
  keyText: { fontSize: font.huge, fontWeight: '700', color: colors.text },
  keyTextSmall: { fontSize: font.body, fontWeight: '700', color: colors.primary },
});
