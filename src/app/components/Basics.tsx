import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, space, TOUCH } from '../theme/index.ts';

/**
 * 화면 기본 조각들.
 * 글꼴 크기는 사용자의 시스템 설정을 따른다(allowFontScaling 기본값 유지).
 * 높이를 고정하지 않고 minHeight 만 주어 200% 확대에서도 글자가 잘리지 않게 한다.
 */

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, dim, style }: { children: React.ReactNode; dim?: boolean; style?: ViewStyle }) {
  return <Text style={[styles.body, dim && styles.bodyDim, style as never]}>{children}</Text>;
}

export function Notice({ children, tone = 'warn' }: { children: React.ReactNode; tone?: 'warn' | 'plain' }) {
  return (
    <View style={[styles.notice, tone === 'plain' && styles.noticePlain]}>
      <Text style={[styles.noticeText, tone === 'plain' && styles.noticeTextPlain]}>{children}</Text>
    </View>
  );
}

export function BigButton({
  label,
  onPress,
  tone = 'primary',
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'plain' | 'danger';
  disabled?: boolean;
  busy?: boolean;
}) {
  const toneStyle =
    tone === 'primary' ? styles.btnPrimary : tone === 'danger' ? styles.btnDanger : styles.btnPlain;
  const textStyle =
    tone === 'plain' ? styles.btnTextPlain : tone === 'danger' ? styles.btnTextDanger : styles.btnText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, toneStyle, pressed && styles.btnPressed, disabled && styles.btnDisabled]}
    >
      {busy ? <ActivityIndicator color={tone === 'primary' ? colors.primaryText : colors.primary} /> : null}
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline]}
        placeholderTextColor={colors.textDim}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function Screen({
  title,
  onBack,
  children,
  footer,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹ 뒤로</Text>
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
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
        <Text style={[styles.knobLabel, value && styles.knobLabelOn]}>{value ? '켜짐' : '꺼짐'}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  back: { minHeight: TOUCH, justifyContent: 'center' },
  backText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: space.md, paddingBottom: space.xl, gap: space.sm },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, gap: space.sm },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, marginBottom: space.sm },
  body: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.5 },
  bodyDim: { color: colors.textDim },
  notice: {
    backgroundColor: colors.warnBg,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: '#E4C97A',
  },
  noticePlain: { backgroundColor: colors.surface, borderColor: colors.border },
  noticeText: { fontSize: font.bodySmall, color: colors.warnText, lineHeight: font.bodySmall * 1.5 },
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
  btnPlain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.danger },
  btnPressed: { opacity: 0.75 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: font.big, fontWeight: '700', color: colors.primaryText, textAlign: 'center' },
  btnTextPlain: { fontSize: font.big, fontWeight: '700', color: colors.text, textAlign: 'center' },
  btnTextDanger: { fontSize: font.big, fontWeight: '700', color: colors.danger, textAlign: 'center' },
  field: { gap: space.xs, marginBottom: space.sm },
  fieldLabel: { fontSize: font.label, fontWeight: '700', color: colors.text },
  fieldHint: { fontSize: font.bodySmall, color: colors.textDim, lineHeight: font.bodySmall * 1.4 },
  input: {
    minHeight: TOUCH + 4,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inputMultiline: { minHeight: TOUCH * 2, textAlignVertical: 'top' },
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
    backgroundColor: colors.bg,
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
  knobLabel: { fontSize: font.bodySmall, fontWeight: '700', color: colors.text },
  knobLabelOn: { color: colors.primaryText },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: {
    minHeight: TOUCH,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { fontSize: font.body, fontWeight: '600', color: colors.text },
  choiceTextOn: { color: colors.primaryText },
});

export { styles as basicStyles };
