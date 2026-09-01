import React, { useEffect, useState } from 'react';
import { BigButton, Body, Choice, Field, FieldAction, Screen } from '../components/Basics.tsx';
import { useVaultStore } from '../state/vaultStore.ts';
import type { VaultPayload } from '../../core/schema.ts';

/**
 * 04 새 정보 추가 / 수정 — 서비스명 / 아이디 / 비밀번호 / 메모 / 카테고리
 */
const CATEGORIES = ['은행', '카드', '쇼핑', '관공서', '통신', '기타'];

export function EditScreen({ id }: { id?: string }) {
  const { records, back, addRecord, updateRecord, showToast, run } = useVaultStore();
  const existing = id ? records.find((r) => r.id === id) : undefined;

  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState('기타');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setService(existing.service);
    setUsername(existing.username);
    setPassword(existing.password);
    setMemo(existing.memo);
    setCategory(existing.category || '기타');
  }, [existing]);

  const save = async () => {
    if (!service.trim()) {
      showToast('어디에서 쓰는 것인지 이름을 적어 주세요.', 'bad');
      return;
    }
    const payload: VaultPayload = {
      service: service.trim(),
      username: username.trim(),
      password,
      memo,
      category,
      pwChangedAt: existing?.pwChangedAt ?? 0,
    };
    const done = await run(async () => {
      if (existing) await updateRecord(existing.id, payload);
      else await addRecord(payload);
    });
    if (done.ok) {
      showToast(existing ? '고쳤습니다.' : '넣었습니다.');
      back();
    }
  };

  return (
    <Screen
      title={existing ? '고치기' : '새로 넣기'}
      onBack={back}
      footer={<BigButton label="저장하기" onPress={save} />}
    >
      <Field
        label="어디에서 쓰나요?"
        hint="예: 국민은행, 현대카드, 쿠팡"
        value={service}
        onChangeText={setService}
        autoCorrect={false}
      />
      <Field
        label="아이디"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!showPassword}
        // 보기/숨김을 입력창 안으로 넣었다 (시안). 큰 버튼 하나가 줄어 화면이 그만큼 여유롭다.
        trailing={
          <FieldAction
            label={showPassword ? '숨김' : '보기'}
            onPress={() => setShowPassword((v) => !v)}
          />
        }
      />
      <Choice
        label="갈래"
        value={category}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        onChange={setCategory}
      />
      <Field label="메모" value={memo} onChangeText={setMemo} multiline numberOfLines={3} />
      {existing ? <Body dim>비밀번호를 바꾸면 바꾼 날짜가 함께 기록됩니다.</Body> : null}
    </Screen>
  );
}
