import React from 'react';
import { useT } from '../i18n/index.ts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CENTER_GLYPH, font, radius, space, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 큰 숫자 패드 (명세 3장: 터치 타깃 48dp 이상, 한 화면의 핵심 행동 1~2개).
 * 입력한 자릿수는 점으로만 보여 준다.
 */

/**
 * 잠금 번호는 **여섯 자리로 못박는다.**
 *
 * 핵심은 잠금 화면이다. 여섯 자리를 다 누르면 '열기' 를 따로 누르지 않고 저절로
 * 열리는데, 그러려면 몇 자리인지 미리 알아야 한다. 길이를 모르면 여섯 번째에서
 * 한 번 시도해 버리고, 번호가 일곱 자리인 사람은 그게 **틀린 시도로 세어져**
 * 영영 못 연다.
 *
 * 금고 속(core)은 여전히 여섯 자리 이상이면 다 받는다 (`NEW_PIN_MIN_LENGTH`).
 * 여기서 묶는 것은 **화면에서 만들고 누르는 길이**뿐이다.
 */
export const PIN_LENGTH = 6;
export const PIN_MAX_LENGTH = PIN_LENGTH;

/**
 * 지우기 칸을 가리키는 표시.
 *
 * 화면에 나오는 말이 아니라 **어느 칸인지 구분하는 이름**이다. 예전에는 '지움' 이라는
 * 한국어를 값으로 썼는데, 그러면 다른 언어로 바꿀 때 이 비교문까지 깨진다.
 */
const ERASE = 'erase';

/**
 * 숫자 한 칸의 높이. 최소 터치 크기(48dp)보다 넉넉하다.
 *
 * 너비는 정하지 않는다. 한 줄의 칸들이 남는 폭을 똑같이 나눠 가지므로, 화면이
 * 넓든 좁든 가로로 긴 직사각형이 되고 넘치지도 않는다.
 */
const KEY_HEIGHT = 60;

/**
 * 줄마다 어떤 칸이 들어가는지.
 *
 * 마지막 줄은 **둘뿐이다.** 둘이 남는 폭을 반씩 나눠 가져서, 위의 세 칸짜리 줄과
 * 전체 너비가 똑같이 맞는다.
 */
const ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0', ERASE],
];

export function PinDots({ length }: { length: number }) {
  const styles = useStyles();
  const t = useT();
  return (
    <View style={styles.dots} accessibilityLabel={t('pinpad.entered', { count: length })}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
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
  const styles = useStyles();
  const t = useT();
  const press = (key: string) => {
    if (disabled) return;
    if (key === ERASE) onChange(value.slice(0, -1));
    else if (value.length < PIN_MAX_LENGTH) onChange(value + key);
  };

  return (
    <View style={styles.pad}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === ERASE ? t('pinpad.eraseOne') : t('pinpad.digit', { digit: key })}
              disabled={disabled}
              onPress={() => press(key)}
              style={({ pressed }) => [styles.key, pressed && styles.pressed, disabled && styles.off]}
            >
              {({ pressed }) => (
                <Text
                  style={[key === ERASE ? styles.keyTextSmall : styles.keyText, pressed && styles.keyTextPressed]}
                >
                  {key === ERASE ? t('pinpad.erase') : key}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = createStyles((colors, fonts) =>
  StyleSheet.create({
    dots: { flexDirection: 'row', gap: space.md, justifyContent: 'center', marginVertical: space.sm },
    /**
     * 몇 자리를 눌렀는지 알려 주는 동그라미 여섯.
     *
     * 빈 것은 테두리만, 채운 것은 속까지 강조색이다. 멀리서 봐도 "몇 개 찼는지"가
     * 한눈에 들어와야 한다 — 이 화면에서 글자 없이 상태를 말하는 유일한 자리다.
     */
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.textDim },
    dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    /**
     * 숫자판은 **줄 단위로 쌓는다.**
     *
     * 예전에는 칸 너비를 고정하고 줄바꿈(flexWrap)에 맡겼는데, 넓은 화면에서 한 줄에
     * 넷이 들어가 1234 / 5678 / 9 0 지움 으로 흐트러졌다. 실기기에서 그렇게 나왔다.
     * 지금은 줄을 직접 나누므로 그 일이 구조상 일어날 수 없다.
     */
    pad: { gap: space.sm, alignSelf: 'stretch' },
    row: { flexDirection: 'row', gap: space.sm },
    /**
     * 가로로 긴 직사각형.
     *
     * 높이만 정하고 너비는 `flex: 1` 로 **남는 폭을 똑같이 나눠 갖게** 한다.
     * 고정 너비를 주면 좁은 폰에서 넘치고 넓은 폰에서는 가운데만 쓰게 된다.
     * 나눠 갖게 하면 어느 폰에서든 꽉 차고, 마지막 줄의 둘은 각각 위 세 칸짜리
     * 줄의 절반씩을 차지해 전체 너비가 저절로 맞는다.
     *
     * 60 은 손가락이 닿는 최소 크기(48dp)보다 넉넉하면서, 네 줄에 아래 버튼까지
     * 한 화면에 들어가는 높이다. 더 키우면 스크롤이 생겨 실패 안내가 밀려난다.
     *
     * 테두리를 두르지 않고 **바탕만 살짝 띄운다.** 열두 칸에 전부 줄을 두르면 화면이
     * 줄로 뒤덮여, 정작 봐야 할 동그라미 여섯이 묻힌다.
     *
     * 모서리는 살짝만 둥글린다. 완전히 각지면 모서리가 날카로워 보인다.
     */
    key: {
      flex: 1,
      height: KEY_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: colors.keyFill,
    },
    /**
     * 눌린 동안.
     *
     * 흐리게(opacity) 처리하지 않는다. 칸 바탕이 이미 흰색에 가까워서 흐려 봐야
     * 눌렸는지 알 수 없다. 대신 **강조색으로 꽉 채운다.** 손가락이 칸을 가려도
     * 둘레가 파래지는 것이 보인다.
     */
    pressed: { backgroundColor: colors.accent },
    off: { opacity: 0.5 },
    // 네모 한가운데. CENTER_GLYPH 가 없으면 글꼴에 따라 숫자가 아래로 처진다.
    keyText: {
      fontFamily: fonts.familyBold,
      fontSize: font.huge,
      fontWeight: WEIGHT,
      color: colors.text,
      ...CENTER_GLYPH,
    },
    keyTextSmall: {
      fontFamily: fonts.familyBold,
      fontSize: font.big,
      fontWeight: WEIGHT,
      color: colors.accent,
      ...CENTER_GLYPH,
    },
    /** 눌린 칸은 강조색으로 차므로 글자가 뒤집힌다. */
    keyTextPressed: { color: colors.accentText },
  }),
);
