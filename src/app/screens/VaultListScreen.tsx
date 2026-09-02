import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BigButton, Body, Notice, Screen } from '../components/Basics.tsx';
import { RecordCard } from '../components/RecordCard.tsx';
import { useT } from '../i18n/index.ts';
import { filterRecords, useVaultStore } from '../state/vaultStore.ts';
import { font, radius, space, TOUCH, WEIGHT, useColors } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 03 내 금고 — 상단 대형 검색창, 계정 리스트, 즐겨찾기, + 추가 (명세 3장)
 */
export function VaultListScreen() {
  const styles = useStyles();
  const t = useT();
  const colors = useColors();
  const { records, go, updateRecord, showToast, unreadableCount } = useVaultStore();
  const [query, setQuery] = useState('');
  const now = Date.now();
  const shown = useMemo(() => filterRecords(records, query), [records, query]);

  return (
    <Screen
      title={t('list.title')}
      footer={
        <>
          <BigButton label={t('list.add')} onPress={() => go({ name: 'add' })} />
          <BigButton label={t('list.settings')} tone="plain" onPress={() => go({ name: 'settings' })} />
        </>
      }
    >
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={t('list.searchPlaceholder')}
        placeholderTextColor={colors.textDim}
        accessibilityLabel={t('list.searchLabel')}
        returnKeyType="search"
        onSubmitEditing={() => {
          if (query.trim()) go({ name: 'search', query: query.trim() });
        }}
      />

      {unreadableCount > 0 ? (
        <Notice>{t('list.unreadable', { count: unreadableCount })}</Notice>
      ) : null}

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Body dim>{t('list.empty')}</Body>
          <Body dim>{t('list.emptyHint')}</Body>
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
            showToast(t(record.favorite ? 'list.favoriteOff' : 'list.favoriteOn'));
          }}
        />
      ))}

      {records.length > 0 && shown.length === 0 ? (
        <View style={styles.empty}>
          <Body dim>{t('list.noMatch', { query })}</Body>
          <Pressable
            accessibilityRole="button"
            onPress={() => go({ name: 'add' })}
            style={({ pressed }) => [styles.addHint, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addHintText}>{t('list.addThisName')}</Text>
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
