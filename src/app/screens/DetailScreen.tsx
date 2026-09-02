import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton, Body, Notice, Screen } from '../components/Basics.tsx';
import { Confirm } from '../components/Confirm.tsx';
import { isPasswordStale } from '../components/RecordCard.tsx';
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

function formatDate(ms: number): string {
  if (!ms) return '기록 없음';
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function DetailScreen({ id }: { id: string }) {
  const styles = useStyles();
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
      <Screen title="항목" onBack={back}>
        <Body dim>항목을 찾지 못했습니다.</Body>
      </Screen>
    );
  }

  const copy = async (label: string, value: string) => {
    if (!value) {
      showToast(`${label}이(가) 비어 있습니다.`, 'bad');
      return;
    }
    await copySensitive(value, settings.clipboardClearSeconds);
    showToast(`${label}을(를) 복사했습니다. ${settings.clipboardClearSeconds}초 뒤에 지웁니다.`);
  };

  return (
    <Screen
      title={record.service || '이름 없음'}
      onBack={back}
      footer={
        <>
          <BigButton label="고치기" onPress={() => go({ name: 'edit', id: record.id })} />
          <BigButton label="지우기" tone="danger" onPress={() => setConfirmDelete(true)} />
        </>
      }
    >
      <View style={styles.block}>
        <Text style={styles.label}>아이디</Text>
        <Text style={styles.value} selectable={false}>
          {record.username || '없음'}
        </Text>
        <BigButton label="아이디 복사" tone="plain" onPress={() => copy('아이디', record.username)} />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>비밀번호</Text>
        <Text style={styles.value}>{visible ? record.password : '●●●●●●●●'}</Text>
        <BigButton
          label={visible ? '숨기기' : '보기'}
          tone="plain"
          onPress={() => setVisible((v) => !v)}
        />
        <BigButton label="비밀번호 복사" tone="plain" onPress={() => copy('비밀번호', record.password)} />
        {visible ? <Body dim>{`${AUTO_HIDE_SECONDS}초 뒤에 저절로 숨깁니다.`}</Body> : null}
      </View>

      {record.memo ? (
        <View style={styles.block}>
          <Text style={styles.label}>메모</Text>
          <Text style={styles.value}>{record.memo}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>비밀번호 바꾼 날</Text>
        <Text style={styles.value}>{formatDate(record.pwChangedAt)}</Text>
        {isPasswordStale(record, Date.now()) ? (
          <Notice>1년 넘게 바꾸지 않았습니다. 한 번 바꿔 두면 좋습니다.</Notice>
        ) : null}
      </View>

      {record.prevPassword ? (
        <View style={styles.block}>
          <Text style={styles.label}>바꾸기 전 비밀번호</Text>
          <Text style={styles.value}>{showPrev ? record.prevPassword : '●●●●●●●●'}</Text>
          <BigButton
            label={showPrev ? '숨기기' : '보기'}
            tone="plain"
            onPress={() => setShowPrev((v) => !v)}
          />
          <Body dim>새 비밀번호가 안 될 때 되돌리라고 하나만 남겨 둡니다.</Body>
        </View>
      ) : null}

      <Confirm
        visible={confirmDelete}
        title="이 항목을 지울까요?"
        message={`“${record.service}”을(를) 지우면 되돌릴 수 없습니다.`}
        confirmLabel="지우기"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await removeRecord(record.id);
          showToast('지웠습니다.');
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
