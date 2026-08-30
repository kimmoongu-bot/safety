import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { recoveryCodeGroups } from '../../core/recoveryCode.ts';
import { colors, font, radius, space } from '../theme/index.ts';

/**
 * 복구 코드 보여 주기.
 *
 * 한 줄로 늘어놓으면 화면 폭에 걸려 마지막 글자가 다음 줄로 넘어간다. 옮겨 적다가
 * 그 글자를 놓치기 쉽다. 묶음마다 한 줄씩, 번호를 붙여 크게 보여 준다.
 */
export function RecoveryCodeView({ code }: { code: string }) {
  const groups = recoveryCodeGroups(code);
  return (
    <View style={styles.box} accessibilityLabel={`복구 코드 ${groups.join(', ')}`}>
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

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.warnBg,
    borderWidth: 2,
    borderColor: '#E4C97A',
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  index: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.warnText,
    minWidth: 24,
    textAlign: 'center',
  },
  group: {
    flex: 1,
    fontSize: font.huge,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 4,
  },
});
