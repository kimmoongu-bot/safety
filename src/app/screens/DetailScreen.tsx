import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton, Body, Notice, Screen } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { isPasswordStale } from '../components/RecordCard.tsx';
import { useLocale, useT } from '../i18n/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import { copySensitive } from '../platform/clipboard.ts';
import { font, radius, space, WEIGHT } from '../theme/index.ts';
import { createStyles } from '../theme/useStyles.ts';

/**
 * 05 계정 상세 — 아이디·비밀번호(숨김)·메모, 복사/보기/수정/삭제, 마지막 변경일
 *
 * 비밀번호는 기본 숨김이고, 보여 준 뒤 15초가 지나면 자동으로 다시 숨긴다 (명세 5.5).
 */
const AUTO_HIDE_SECONDS = 15;

function formatDate(ms: number, locale: string, t: (k: 'detail.noDate') => string): string {
  if (!ms) return t('detail.noDate');
  const d = new Date(ms);
  // 날짜 모양은 나라마다 다르다. Intl 이 그 나라 방식으로 써 준다.
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function DetailScreen({ id }: { id: string }) {
  const styles = useStyles();
  const t = useT();
  const { locale } = useLocale();
  const { records, back, go, removeRecord, showToast, settings } = useVaultStore();
  const record = records.find((r) => r.id === id);
  const [visible, setVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPrev, setShowPrev] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!record) {
    return (
      <Screen title={t('detail.title')} onBack={back}>
        <Body dim>{t('detail.notFound')}</Body>
      </Screen>
    );
  }

  const copy = async (label: string, value: string) => {
    if (!value) {
      showToast(t('detail.emptyField', { what: label }), 'bad');
      return;
    }
    await copySensitive(value, settings.clipboardClearSeconds);
    showToast(t('detail.copied', { what: label, seconds: settings.clipboardClearSeconds }));
  };

  return (
    <Screen
      title={record.service || t('card.noName')}
      onBack={back}
      footer={
        <>
          <BigButton label={t('detail.edit')} onPress={() => go({ name: 'edit', id: record.id })} />
          <BigButton label={t('detail.delete')} tone="danger" onPress={() => setConfirmDelete(true)} />
        </>
      }
    >
      <View style={styles.block}>
        <Text style={styles.label}>{t('detail.username')}</Text>
        <Text style={styles.value} selectable={false}>
          {record.username || t('detail.none')}
        </Text>
        <BigButton label={t('detail.copyUsername')} tone="plain" onPress={() => copy(t('detail.username'), record.username)} />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{t('detail.password')}</Text>
        <Text style={styles.value}>{visible ? record.password : t('detail.hidden')}</Text>
        <BigButton
          label={t(visible ? 'detail.conceal' : 'detail.reveal')}
          tone="plain"
          onPress={() => setVisible((v) => !v)}
        />
        <BigButton label={t('detail.copyPassword')} tone="plain" onPress={() => copy(t('detail.password'), record.password)} />
        {visible ? <Body dim>{t('detail.autoHide', { seconds: AUTO_HIDE_SECONDS })}</Body> : null}
      </View>

      {record.memo ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t('detail.memo')}</Text>
          <Text style={styles.value}>{record.memo}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>{t('detail.pwChangedAt')}</Text>
        <Text style={styles.value}>{formatDate(record.pwChangedAt, locale, t)}</Text>
        {isPasswordStale(record, Date.now()) ? (
          <Notice>{t('detail.staleNotice')}</Notice>
        ) : null}
      </View>

      {record.prevPassword ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t('detail.prevPassword')}</Text>
          <Text style={styles.value}>{showPrev ? record.prevPassword : t('detail.hidden')}</Text>
          <BigButton
            label={t(showPrev ? 'detail.conceal' : 'detail.reveal')}
            tone="plain"
            onPress={() => setShowPrev((v) => !v)}
          />
          <Body dim>{t('detail.prevWhy')}</Body>
        </View>
      ) : null}

      <Confirm
        visible={confirmDelete}
        title={t('detail.deleteTitle')}
        message={t('detail.deleteMessage', { service: record.service })}
        confirmLabel={t('detail.delete')}
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await removeRecord(record.id);
          showToast(t('detail.deleted'));
          back();
        }}
      />
    </Screen>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    block: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.sm,
      marginBottom: space.sm,
    },
    label: { fontFamily: font.familyBold, fontSize: font.label, fontWeight: WEIGHT, color: colors.textDim },
    value: { fontFamily: font.family, fontSize: font.big, color: colors.text, lineHeight: font.big * 1.4 },
  }),
);
