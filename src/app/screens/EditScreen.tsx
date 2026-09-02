import React, { useEffect, useState } from 'react';
import { BigButton, Body, Choice, Field, FieldAction, Screen } from '../components/Basics.tsx';
import { CATEGORY_CODES, DEFAULT_CATEGORY } from '../i18n/categories.ts';
import { useT } from '../i18n/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import type { VaultPayload } from '../../core/schema.ts';

/**
 * 04 새 정보 추가 / 수정 — 서비스명 / 아이디 / 비밀번호 / 메모 / 카테고리
 */


export function EditScreen({ id }: { id?: string }) {
  const { records, back, addRecord, updateRecord, showToast, run } = useVaultStore();
  const existing = id ? records.find((r) => r.id === id) : undefined;

  const t = useT();
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setService(existing.service);
    setUsername(existing.username);
    setPassword(existing.password);
    setMemo(existing.memo);
    setCategory(existing.category || DEFAULT_CATEGORY);
  }, [existing]);

  const save = async () => {
    if (!service.trim()) {
      showToast(t('edit.needService'), 'bad');
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
      showToast(t(existing ? 'edit.updated' : 'edit.saved'));
      back();
    }
  };

  return (
    <Screen
      title={t(existing ? 'edit.titleEdit' : 'edit.titleNew')}
      onBack={back}
      footer={<BigButton label={t('edit.save')} onPress={save} />}
    >
      <Field
        label={t('edit.service')}
        hint={t('edit.serviceHint')}
        value={service}
        onChangeText={setService}
        autoCorrect={false}
      />
      <Field
        label={t('edit.username')}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label={t('edit.password')}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!showPassword}
        // 보기/숨김을 입력창 안으로 넣었다 (시안). 큰 버튼 하나가 줄어 화면이 그만큼 여유롭다.
        trailing={
          <FieldAction
            label={t(showPassword ? 'edit.hide' : 'edit.show')}
            onPress={() => setShowPassword((v) => !v)}
          />
        }
      />
      <Choice
        label={t('edit.category')}
        value={category}
        options={CATEGORY_CODES.map((c) => ({ value: c as string, label: t(`category.${c}`) }))}
        onChange={setCategory}
      />
      <Field label={t('edit.memo')} value={memo} onChangeText={setMemo} multiline numberOfLines={3} />
      {existing ? <Body dim>{t('edit.pwDateNote')}</Body> : null}
    </Screen>
  );
}
