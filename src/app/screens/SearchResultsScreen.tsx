import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BigButton, Body, Screen } from '../components/Basics.tsx';
import { RecordCard } from '../components/RecordCard.tsx';
import { filterRecords, useVaultStore } from '../state/vaultStore.ts';
import { colors, font, radius, space, TOUCH } from '../theme/index.ts';

/**
 * 06 검색 결과 — 큰 카드 리스트, 1탭 상세 이동, 결과 없음 시 추가 유도 (명세 3장)
 */
export function SearchResultsScreen({ query }: { query: string }) {
  const { records, go, back } = useVaultStore();
  const [text, setText] = useState(query);
  const now = Date.now();
  const hits = useMemo(() => filterRecords(records, text), [records, text]);

  return (
    <Screen title="찾은 것" onBack={back}>
      <TextInput
        style={styles.search}
        value={text}
        onChangeText={setText}
        placeholder="무엇을 찾으세요?"
        placeholderTextColor={colors.textDim}
        accessibilityLabel="검색창"
        autoFocus
      />
      <Body dim>{`${hits.length}개 찾았습니다.`}</Body>
      <View style={{ height: space.sm }} />
      {hits.map((record) => (
        <RecordCard key={record.id} record={record} now={now} onPress={() => go({ name: 'detail', id: record.id })} />
      ))}
      {hits.length === 0 ? (
        <View style={styles.empty}>
          <Body dim>{`“${text}”에 맞는 것이 없습니다.`}</Body>
          <BigButton label="＋ 새로 넣기" onPress={() => go({ name: 'add' })} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
