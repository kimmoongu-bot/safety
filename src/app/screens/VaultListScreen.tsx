import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BigButton, Body, Notice, Screen } from '../components/Basics.tsx';
import { RecordCard } from '../components/RecordCard.tsx';
import { filterRecords, useVaultStore } from '../state/vaultStore.ts';
import { font, radius, space, TOUCH, WEIGHT, useColors } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 03 내 금고 — 상단 대형 검색창, 계정 리스트, 즐겨찾기, + 추가 (명세 3장)
 */
export function VaultListScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { records, go, updateRecord, showToast, unreadableCount } = useVaultStore();
  const [query, setQuery] = useState('');
  const now = Date.now();
  const shown = useMemo(() => filterRecords(records, query), [records, query]);

  return (
    <Screen
      title="내 금고"
      footer={
        <>
          <BigButton label="＋ 새로 넣기" onPress={() => go({ name: 'add' })} />
          <BigButton label="설정" tone="plain" onPress={() => go({ name: 'settings' })} />
        </>
      }
    >
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="무엇을 찾으세요?"
        placeholderTextColor={colors.textDim}
        accessibilityLabel="검색창"
        returnKeyType="search"
        onSubmitEditing={() => {
          if (query.trim()) go({ name: 'search', query: query.trim() });
        }}
      />

      {unreadableCount > 0 ? (
        <Notice>{`${unreadableCount}개 항목을 열지 못했습니다. 백업 파일이 있으면 되살려 보세요.`}</Notice>
      ) : null}

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Body dim>아직 넣어 둔 것이 없습니다.</Body>
          <Body dim>아래 “＋ 새로 넣기”를 눌러 시작하세요.</Body>
        </View>
      ) : null}

      {shown.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          now={now}
          onPress={() => go({ name: 'detail', id: record.id })}
          onToggleFavorite={async () => {
            await updateRecord(record.id, { favorite: !record.favorite });
            showToast(record.favorite ? '자주 쓰는 것에서 뺐습니다.' : '자주 쓰는 것으로 두었습니다.');
          }}
        />
      ))}

      {records.length > 0 && shown.length === 0 ? (
        <View style={styles.empty}>
          <Body dim>{`“${query}”에 맞는 것이 없습니다.`}</Body>
          <Pressable
            accessibilityRole="button"
            onPress={() => go({ name: 'add' })}
            style={({ pressed }) => [styles.addHint, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addHintText}>이 이름으로 새로 넣기</Text>
          </Pressable>
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
      marginBottom: space.sm,
    },
    empty: { paddingVertical: space.xl, gap: space.sm, alignItems: 'center' },
    addHint: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.md },
    addHintText: { fontFamily: font.familyBold, fontSize: font.body, color: colors.primary, fontWeight: WEIGHT },
  }),
);
