import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { recoveryCodeGroups } from '../../core/recoveryCode.ts';
import { font, radius, space, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';
import { useT } from '../i18n/index.ts';

/**
 * 복구 코드 보여 주기.
 *
 * 한 줄로 늘어놓으면 화면 폭에 걸려 마지막 글자가 다음 줄로 넘어간다. 옮겨 적다가
 * 그 글자를 놓치기 쉽다. 묶음마다 한 줄씩, 번호를 붙여 크게 보여 준다.
 */
export function RecoveryCodeView({ code }: { code: string }) {
  const styles = useStyles();
  const t = useT();
  const groups = recoveryCodeGroups(code);
  return (
    <View style={styles.box} accessibilityLabel={t('common.recoveryCodeLabel', { code: groups.join(', ') })}>
      {groups.map((group, index) => (
        <View key={group + index} style={styles.row}>
          <Text style={styles.index}>{index + 1}</Text>
          <Text style={styles.group} selectable>
            {group}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    box: {
      backgroundColor: colors.warnBg,
      borderWidth: 2,
      borderColor: colors.warnBorder,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    index: {
      fontFamily: font.familyBold,
      fontSize: font.body,
      fontWeight: WEIGHT,
      color: colors.warnText,
      minWidth: 24,
      textAlign: 'center',
    },
    group: {
      flex: 1,
      fontFamily: font.familyBold,
      fontSize: font.huge,
      fontWeight: WEIGHT,
      color: colors.text,
      letterSpacing: 4,
    },
  }),
);
