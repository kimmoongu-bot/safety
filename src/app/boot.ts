import { setCryptoProvider } from '../core/crypto/registry.ts';
import { NonceSource } from '../core/crypto/nonce.ts';
import { DisplayPrefsStore } from '../core/prefs.ts';
import { Vault } from '../core/vault.ts';
import { ExpoMetaStore } from '../data/adapters/expoMetaStore.ts';
import { ExpoPrefsStore } from '../data/adapters/expoPrefsStore.ts';
import { ExpoSecureKeyStore } from '../data/adapters/expoSecureKeyStore.ts';
import { ExpoSqliteRecordStore } from '../data/adapters/expoSqliteRecordStore.ts';
import { createDeviceCryptoProvider } from './platform/deviceCryptoProvider.ts';
import { AVAILABLE } from './i18n/index.ts';
import { usePrefsStore } from './state/prefsStore.ts';

/**
 * 앱을 시작한다 — 암호 모듈을 붙이고, 화면 설정을 읽고, 금고를 세운다.
 *
 * **화면이 둘이라 여기 있다.** 본 화면(`App.tsx`)과 채우기 화면(`FillApp.tsx`)이
 * 각자 뜰 수 있다. 다른 앱의 로그인 칸에서 잠김을 누르면 본 화면은 한 번도 안 뜬
 * 채로 채우기 화면만 뜬다. 그때도 금고는 열려야 한다.
 *
 * **두 번 해도 한 번만 한다.** 두 화면이 같은 자바스크립트 안에서 도니까 금고도
 * 하나여야 한다. 둘이 되면 각자 데이터베이스를 열고, 한쪽이 잠가도 다른 쪽은
 * 열린 채로 남는다 — 명세 5.5 를 지킬 수 없게 된다.
 */
export type Boot = {
  vault: Vault;
  /** 뒤로 갈 때 데이터베이스 손잡이를 놓으려고 들고 있는다. */
  records: ExpoSqliteRecordStore;
};

let started: Promise<Boot> | null = null;

export function boot(): Promise<Boot> {
  if (!started) {
    started = start().catch((e: unknown) => {
      // 실패한 약속은 들고 있지 않는다. 들고 있으면 한 번 실패한 뒤로 영영 못 연다.
      started = null;
      throw e;
    });
  }
  return started;
}

async function start(): Promise<Boot> {
  const provider = createDeviceCryptoProvider();
  setCryptoProvider(provider);
  const keyStore = new ExpoSecureKeyStore(provider);
  // 금고와 화면 설정이 같은 기기 키를 쓰므로 nonce 생성기도 하나만 둔다.
  const nonces = new NonceSource(provider);

  /*
    화면 설정(밝기·언어)을 제일 먼저 읽는다. 금고보다 먼저다.
    금고를 여는 것과 상관없이 화면을 그리는 데 쓰는 값이고, 이것을 모르는 채로
    한 번 그리면 색이 번쩍인다.
  */
  await usePrefsStore.getState().load(
    new DisplayPrefsStore({
      provider,
      nonces,
      store: new ExpoPrefsStore(),
      keyStore,
      available: AVAILABLE,
    }),
  );

  const records = new ExpoSqliteRecordStore();
  const vault = new Vault({
    provider,
    keyStore,
    nonces,
    metaStore: new ExpoMetaStore(),
    recordStore: records,
  });
  return { vault, records };
}
