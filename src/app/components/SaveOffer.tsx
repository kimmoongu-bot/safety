import { useState } from 'react';
import { View } from 'react-native';
import { BigButton, Field, Notice } from './Basics.tsx';
import { useT } from '../i18n/index.ts';
import { useVaultStore } from '../state/vaultStore.ts';
import { space } from '../theme/index.ts';

export type SaveDraft = { service: string; username: string; password: string };

/**
 * 담기 제안 (docs/자동완성.md 22장).
 *
 * 다른 앱에 아이디와 비밀번호를 넣고 나오면 안드로이드가 "잠김에 담을까요" 하고
 * 묻는다. 담겠다고 하면 이 화면이 뜬다.
 *
 * **고칠 수 있게 둔다.** 앱 이름을 우리가 지어내서 넣는데(`실손24`, `mob.hometax.go.kr`)
 * 그게 사용자에게 와닿는 이름이 아닐 수 있다. 나중에 목록에서 찾을 사람은 사용자다.
 *
 * **비밀번호도 보여 준다.** 다른 화면에서는 감추지만 여기서는 방금 자기가 친
 * 것이고, 잘못 집혔는지 눈으로 확인할 수 있어야 한다. 잘못 담기면 다음에 그
 * 값으로 로그인하려다 막힌다.
 */
export function SaveOffer({ draft, onDone }: { draft: SaveDraft; onDone: () => void }) {
  const t = useT();
  const vault = useVaultStore((s) => s.vault);
  const showToast = useVaultStore((s) => s.showToast);

  const [service, setService] = useState(draft.service);
  const [username, setUsername] = useState(draft.username);
  const [password, setPassword] = useState(draft.password);
  // 두 번 눌러 두 개 담기지 않게 한다. 손이 떨리면 두 번 눌린다.
  const [busy, setBusy] = useState(false);

  const keep = async () => {
    if (!vault || busy) return;
    if (!service.trim()) {
      showToast(t('edit.needService'), 'bad');
      return;
    }
    setBusy(true);
    try {
      await vault.addRecord({
        service: service.trim(),
        username,
        password,
        memo: '',
        category: '',
        // 방금 만든 비밀번호다. 오늘로 적어야 "바꾼 지 오래됨" 이 제대로 센다.
        pwChangedAt: Date.now(),
      });
      showToast(t('edit.saved'));
      onDone();
    } catch {
      showToast(t('common.failed'), 'bad');
      setBusy(false);
    }
  };

  return (
    <>
      <Notice tone="plain">{t('save.check')}</Notice>
      <Field
        label={t('edit.service')}
        hint={t('edit.serviceHint')}
        value={service}
        onChangeText={setService}
      />
      <Field label={t('edit.username')} value={username} onChangeText={setUsername} />
      <Field label={t('edit.password')} value={password} onChangeText={setPassword} />
      <View style={{ height: space.sm }} />
      <BigButton label={t('save.keep')} disabled={busy} onPress={() => void keep()} />
    </>
  );
}
