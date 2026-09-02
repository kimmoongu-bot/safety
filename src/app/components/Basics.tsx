import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { font, radius, space, TOUCH, useColors, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';
import { useT } from '../i18n/index.ts';

/** 아이콘과 같은 자물쇠. 앱 아이콘과 화면이 한 벌로 보이게 한다. */
const LOCK_MARK = require('../../../assets/lock-mark.png');

/**
 * 화면 기본 조각들.
 * 글꼴 크기는 사용자의 시스템 설정을 따른다(allowFontScaling 기본값 유지).
 * 높이를 고정하지 않고 minHeight 만 주어 200% 확대에서도 글자가 잘리지 않게 한다.
 */

export function Title({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, dim, style }: { children: React.ReactNode; dim?: boolean; style?: ViewStyle }) {
  const styles = useStyles();
  return <Text style={[styles.body, dim && styles.bodyDim, style as never]}>{children}</Text>;
}

export function Notice({ children, tone = 'warn' }: { children: React.ReactNode; tone?: 'warn' | 'plain' }) {
  const styles = useStyles();
  return (
    <View style={[styles.notice, tone === 'plain' && styles.noticePlain]}>
      <Text style={[styles.noticeText, tone === 'plain' && styles.noticeTextPlain]}>{children}</Text>
    </View>
  );
}

/**
 * 버튼 (디자인 시안의 4종)
 *
 * - primary  기본. 먹색 바탕에 흰 글자. 한 화면에 하나만 둔다.
 * - plain    보조. 흰 바탕에 테두리.
 * - accent   강조. 갈색 바탕에 흰 글자. 되돌릴 수 없는 일 앞에서 쓴다.
 * - danger   위험. 흰 바탕에 빨간 테두리와 빨간 글자.
 * - text     글자만. 가장 약한 것. 테두리도 바탕도 없다.
 */
type ButtonTone = 'primary' | 'plain' | 'accent' | 'danger' | 'text';

export function BigButton({
  label,
  onPress,
  tone = 'primary',
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  busy?: boolean;
}) {
  const styles = useStyles();
  const box = {
    primary: styles.btnPrimary,
    plain: styles.btnPlain,
    accent: styles.btnAccent,
    danger: styles.btnDanger,
    text: styles.btnText_,
  }[tone];
  const textStyle = {
    primary: styles.btnLabelOnFill,
    plain: styles.btnLabelPlain,
    accent: styles.btnLabelOnFill,
    danger: styles.btnLabelDanger,
    text: styles.btnLabelText,
  }[tone];
  const colors = useColors();
  const spinner = tone === 'primary' || tone === 'accent' ? colors.primaryText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, box, pressed && styles.btnPressed, disabled && styles.btnDisabled]}
    >
      {busy ? <ActivityIndicator color={spinner} /> : null}
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

/**
 * 입력창.
 *
 * `trailing` 은 입력창 오른쪽 안쪽에 들어가는 작은 조작이다 (비밀번호 보기/숨김 등).
 * 시안은 여기에 눈 모양 그림을 뒀지만 글자로 쓴다 — 중장년층 대상이고, 명세 3장이
 * 뜻이 분명한 말을 쓰라고 한다. 그림은 배워야 알지만 "보기"는 읽으면 안다.
 */
export function Field({
  label,
  hint,
  trailing,
  ...props
}: TextInputProps & { label: string; hint?: string; trailing?: React.ReactNode }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <View style={[styles.inputBox, props.multiline && styles.inputBoxMultiline]}>
        <TextInput
          {...props}
          style={[styles.input, props.multiline && styles.inputMultiline]}
          placeholderTextColor={colors.textDim}
          accessibilityLabel={label}
        />
        {trailing}
      </View>
    </View>
  );
}

/** 입력창 안에 넣는 작은 글자 단추. 터치 크기는 48dp 를 지킨다. */
export function FieldAction({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fieldAction, pressed && styles.btnPressed]}
    >
      <Text style={styles.fieldActionText}>{label}</Text>
    </Pressable>
  );
}

export function Screen({
  title,
  subtitle,
  onBack,
  children,
  footer,
  mark,
}: {
  title: string;
  /**
   * 제목 **아래** 한 줄. 옆에 나란히 두지 않는다 — 글꼴을 200% 로 키우면
   * 제목이 밀려 잘린다. 아래 줄이면 두 배로 키워도 안 깨진다.
   */
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 제목 앞에 자물쇠 표시를 넣는다. 잠금 화면처럼 앱 얼굴이 되는 화면에서만 쓴다. */
  mark?: boolean;
}) {
  const styles = useStyles();
  const t = useT();
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.backLabel')} onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.titleRow}>
          {mark ? (
            // 그림은 장식이다. 화면 낭독기에는 옆의 제목만 읽히면 된다.
            <Image source={LOCK_MARK} style={styles.mark} accessibilityElementsHidden importantForAccessibility="no" />
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={[styles.headerTitle, mark && styles.headerTitleLogo]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.row}>{children}</View>;
}

export function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const t = useT();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggle, pressed && styles.btnPressed, disabled && styles.btnDisabled]}
    >
      <View style={styles.toggleText}>
        <Text style={styles.body}>{label}</Text>
        {description ? <Text style={styles.fieldHint}>{description}</Text> : null}
      </View>
      <View style={[styles.knobTrack, value && styles.knobTrackOn]}>
        <Text style={[styles.knobLabel, value && styles.knobLabelOn]}>{t(value ? 'common.on' : 'common.off')}</Text>
      </View>
    </Pressable>
  );
}

export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && styles.btnPressed]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: space.md,
      paddingTop: space.lg,
      paddingBottom: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    /**
     * 자물쇠 표시. 앱 얼굴이므로 크게 둔다.
     *
     * 크기를 픽셀로 고정한다. 글꼴 설정을 따라 커지지 않으므로, 200% 확대에서도
     * 이 그림은 그대로다. 로고를 키우고 싶을 때 글자 대신 여기를 키우는 이유다.
     * flexShrink: 0 이라 글자가 길어져도 그림이 먼저 찌그러지지 않는다.
     *
     * **64 를 넘기지 않는다.** 그림 파일이 192×192 이고, 가장 촘촘한 화면은 1dp 를
     * 3픽셀로 그린다. 64 를 넘으면 192픽셀로 모자라 흐려진다. 더 키우려면 파일부터
     * 다시 만들어야 한다 (`tools/logo/`).
     */
    mark: { width: 56, height: 56, flexShrink: 0 },
    /** 제목과 그 아래 한 줄. 자물쇠 표시 옆에 통째로 놓인다. */
    titleBlock: { flexShrink: 1 },
    headerTitle: { fontFamily: font.familyBold, fontSize: font.title, fontWeight: WEIGHT, color: colors.text },
    /** 앱 얼굴이 되는 화면에서만 크게. 다른 화면 제목까지 커지면 화면마다 크기가 달라 보인다. */
    headerTitleLogo: { fontFamily: font.familyBold, fontSize: font.logo },
    /** 제목 아래 한 줄. 흐린 글자색도 대비 6.5:1 이라 명세 3장을 넘는다. */
    headerSubtitle: { fontFamily: font.family, fontSize: font.bodySmall, fontWeight: WEIGHT, color: colors.textDim, marginTop: 2 },
    back: { minHeight: TOUCH, justifyContent: 'center' },
    backText: { fontFamily: font.familyBold, fontSize: font.body, color: colors.accent, fontWeight: WEIGHT },
    scroll: { flex: 1 },
    scrollContent: { padding: space.md, paddingBottom: space.xl, gap: space.sm },
    footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, gap: space.sm },
    title: { fontFamily: font.familyBold, fontSize: font.title, fontWeight: WEIGHT, color: colors.text, marginBottom: space.sm },
    body: { fontFamily: font.family, fontSize: font.body, color: colors.text, lineHeight: font.body * 1.5 },
    bodyDim: { color: colors.textDim },
    notice: {
      backgroundColor: colors.warnBg,
      borderRadius: radius.md,
      padding: space.md,
      borderWidth: 1,
      borderColor: colors.warnBorder,
    },
    noticePlain: { backgroundColor: colors.surface, borderColor: colors.border },
    noticeText: { fontFamily: font.family, fontSize: font.bodySmall, color: colors.warnText, lineHeight: font.bodySmall * 1.5 },
    noticeTextPlain: { color: colors.text },
    btn: {
      minHeight: TOUCH + 8,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: space.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnPlain: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
    btnAccent: { backgroundColor: colors.accent },
    btnDanger: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.danger },
    /** 글자만 있는 버튼. 테두리도 바탕도 없다. */
    btnText_: { backgroundColor: 'transparent' },
    btnPressed: { opacity: 0.75 },
    btnDisabled: { opacity: 0.5 },
    btnLabelOnFill: { fontFamily: font.familyBold, fontSize: font.big, fontWeight: WEIGHT, color: colors.primaryText, textAlign: 'center' },
    btnLabelPlain: { fontFamily: font.familyBold, fontSize: font.big, fontWeight: WEIGHT, color: colors.text, textAlign: 'center' },
    btnLabelDanger: { fontFamily: font.familyBold, fontSize: font.big, fontWeight: WEIGHT, color: colors.danger, textAlign: 'center' },
    btnLabelText: { fontFamily: font.familyBold, fontSize: font.big, fontWeight: WEIGHT, color: colors.accent, textAlign: 'center' },
    field: { gap: space.xs, marginBottom: space.sm },
    fieldLabel: { fontFamily: font.familyBold, fontSize: font.label, fontWeight: WEIGHT, color: colors.text },
    fieldHint: { fontFamily: font.family, fontSize: font.bodySmall, color: colors.textDim, lineHeight: font.bodySmall * 1.4 },
    /**
     * 테두리는 글자칸이 아니라 바깥 상자가 갖는다. 그래야 오른쪽에 "보기" 같은
     * 조작을 넣어도 테두리 안에 들어간다.
     */
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TOUCH + 4,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: radius.md,
      // 크림 바탕 위의 흰 입력창. 같은 색이면 입력하는 자리가 어디인지 안 보인다.
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    inputBoxMultiline: { alignItems: 'stretch' },
    input: {
      flex: 1,
      minHeight: TOUCH,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      fontFamily: font.family,
      fontSize: font.body,
      color: colors.text,
    },
    inputMultiline: { minHeight: TOUCH * 2, textAlignVertical: 'top' },
    /** 입력창 안 오른쪽 글자 단추. 손가락이 닿는 크기(48dp)를 지킨다. */
    fieldAction: {
      minWidth: TOUCH + 8,
      minHeight: TOUCH,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },
    fieldActionText: { fontFamily: font.familyBold, fontSize: font.bodySmall, fontWeight: WEIGHT, color: colors.accent },
    row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
    toggle: {
      minHeight: TOUCH + 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toggleText: { flex: 1, gap: 2 },
    knobTrack: {
      minWidth: 76,
      minHeight: TOUCH - 8,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.sm,
      backgroundColor: colors.surface,
    },
    knobTrackOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    knobLabel: { fontFamily: font.familyBold, fontSize: font.bodySmall, fontWeight: WEIGHT, color: colors.text },
    knobLabelOn: { color: colors.primaryText },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    choice: {
      minHeight: TOUCH,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    choiceText: { fontFamily: font.familyBold, fontSize: font.body, fontWeight: WEIGHT, color: colors.text },
    choiceTextOn: { color: colors.primaryText },
  }),
);

export { useStyles as useBasicStyles };
