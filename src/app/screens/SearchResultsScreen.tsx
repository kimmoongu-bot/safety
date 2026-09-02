import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BigButton, Body, Screen } from '../components/Basics.tsx';
import { RecordCard } from '../components/RecordCard.tsx';
import { useT } from '../i18n/index.ts';
import { filterRecords, useVaultStore } from '../state/vaultStore.ts';
import { font, radius, space, TOUCH, useColors } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 06 검색 결과 — 큰 카드 리스트, 1탭 상세 이동, 결과 없음 시 추가 유도 (명세 3장)
 */
export function SearchResultsScreen({ query }: { query: string }) {
  const styles = useStyles();
  const t = useT();
  const colors = useColors();
  const { records, go, back } = useVaultStore();
  const [text, setText] = useState(query);
  const now = Date.now();
  const hits = useMemo(() => filterRecords(records, text), [records, text]);

  return (
    <Screen title={t('search.title')} onBack={back}>
      <TextInput
        style={styles.search}
        value={text}
        onChangeText={setText}
        placeholder={t('list.searchPlaceholder')}
        placeholderTextColor={colors.textDim}
        accessibilityLabel={t('list.searchLabel')}
        autoFocus
      />
      <Body dim>{t('search.found', { count: hits.length })}</Body>
      <View style={{ height: space.sm }} />
      {hits.map((record) => (
        <RecordCard key={record.id} record={record} now={now} onPress={() => go({ name: 'detail', id: record.id })} />
      ))}
      {hits.length === 0 ? (
        <View style={styles.empty}>
          <Body dim>{t('list.noMatch', { query: text })}</Body>
          <BigButton label={t('list.add')} onPress={() => go({ name: 'add' })} />
        </View>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    search: {
      minHeight: TOUCH + 12,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      fontFamily: font.family,
      fontSize: font.big,
      color: colors.text,
    },
    empty: { paddingVertical: space.lg, gap: space.md },
  }),
);
