import test from 'node:test';
import assert from 'node:assert/strict';
import { NonceSource } from '../src/core/crypto/nonce.ts';
import { context, seal } from '../src/core/crypto/aead.ts';
import { utf8ToBytes } from '../src/core/bytes.ts';
import {
  DEFAULT_PREFS,
  DisplayPrefsStore,
  SYSTEM_LOCALE,
  THEME_CHOICES,
  mergePrefs,
  type DisplayPrefs,
} from '../src/core/prefs.ts';
import { MemoryKeyStore, MemoryPrefsStore } from '../src/data/adapters/memory.ts';
import { provider } from './helpers.ts';

const AVAILABLE = ['ko', 'en'];

function makeStore(): { store: DisplayPrefsStore; file: MemoryPrefsStore; keyStore: MemoryKeyStore } {
  const file = new MemoryPrefsStore();
  const keyStore = new MemoryKeyStore(provider);
  const store = new DisplayPrefsStore({
    provider,
    nonces: new NonceSource(provider),
    store: file,
    keyStore,
    available: AVAILABLE,
  });
  return { store, file, keyStore };
}

// ── 값 다듬기 ────────────────────────────────────────────────────────────────

test('처음에는 폰 설정을 따라간다', () => {
  assert.equal(DEFAULT_PREFS.theme, 'system');
  assert.equal(DEFAULT_PREFS.locale, SYSTEM_LOCALE);
});

test('아는 값은 그대로 둔다', () => {
  for (const theme of THEME_CHOICES) {
    assert.equal(mergePrefs({ theme, locale: 'ko' }, AVAILABLE).theme, theme);
  }
  assert.equal(mergePrefs({ theme: 'dark', locale: 'en' }, AVAILABLE).locale, 'en');
});

test('모르는 값은 폰 설정으로 돌린다', () => {
  // 앱을 되돌려 깔았거나 파일을 손댔을 때. 화면이 비면 안 된다.
  assert.equal(mergePrefs({ theme: 'sepia' }, AVAILABLE).theme, 'system');
  assert.equal(mergePrefs({ theme: 3 }, AVAILABLE).theme, 'system');
  assert.equal(mergePrefs(null, AVAILABLE).theme, 'system');
  assert.equal(mergePrefs('밝게', AVAILABLE).theme, 'system');
});

test('이제 없는 언어가 저장돼 있으면 폰 설정으로 돌린다', () => {
  // 일본어를 넣었다가 뺐다면 저장된 'ja' 는 화면에 열쇠 이름만 잔뜩 보이게 한다.
  assert.equal(mergePrefs({ theme: 'dark', locale: 'ja' }, AVAILABLE).locale, SYSTEM_LOCALE);
  // 밝기는 그대로 살린다. 하나가 못 쓰는 값이라고 나머지까지 버릴 이유가 없다.
  assert.equal(mergePrefs({ theme: 'dark', locale: 'ja' }, AVAILABLE).theme, 'dark');
});

// ── 저장하고 읽기 ────────────────────────────────────────────────────────────

test('저장한 값이 그대로 다시 읽힌다', async () => {
  const { store } = makeStore();
  await store.write({ theme: 'dark', locale: 'en' });
  assert.deepEqual(await store.read(), { theme: 'dark', locale: 'en' });
});

test('파일이 없으면 기본값을 준다', async () => {
  const { store } = makeStore();
  assert.deepEqual(await store.read(), DEFAULT_PREFS);
});

test('기기 키가 아직 없어도 저장할 수 있다', async () => {
  // 첫 실행에서 금고를 만들기 전에 언어를 고르는 경우.
  const { store, keyStore } = makeStore();
  assert.equal(await keyStore.getDeviceKey(), null);
  await store.write({ theme: 'light', locale: 'ko' });
  assert.notEqual(await keyStore.getDeviceKey(), null);
  assert.deepEqual(await store.read(), { theme: 'light', locale: 'ko' });
});

test('기기 키가 사라지면 기본값으로 돌아간다 — 던지지 않는다', async () => {
  // 금고를 초기화하면 기기 키가 지워진다. 그때 앱이 안 뜨면 안 된다.
  const { store, keyStore } = makeStore();
  await store.write({ theme: 'dark', locale: 'en' });
  await keyStore.clear();
  assert.deepEqual(await store.read(), DEFAULT_PREFS);
});

test('파일이 깨져 있어도 기본값으로 뜬다', async () => {
  const { store, file } = makeStore();
  await store.write({ theme: 'dark', locale: 'en' });
  file.corrupt();
  assert.deepEqual(await store.read(), DEFAULT_PREFS);
});

test('저장할 때도 모르는 값은 걸러진다', async () => {
  const { store } = makeStore();
  const written = await store.write({ theme: 'dark', locale: 'ja' } as DisplayPrefs);
  assert.equal(written.locale, SYSTEM_LOCALE);
  assert.deepEqual(await store.read(), { theme: 'dark', locale: SYSTEM_LOCALE });
});

// ── 보안 ─────────────────────────────────────────────────────────────────────

test('디스크에 평문으로 남지 않는다', async () => {
  const { store, file } = makeStore();
  await store.write({ theme: 'dark', locale: 'en' });
  const raw = file.rawBytes();
  assert.equal(raw.includes('dark'), false);
  assert.equal(raw.includes('theme'), false);
  assert.equal(raw.includes('locale'), false);
});

test('실패 기록 파일을 화면 설정 자리에 갖다 놓아도 열리지 않는다', async () => {
  // 대기 시간을 지우려고 파일을 바꿔치기하는 경우. 묶어 둔 표시가 달라 실패한다.
  const { store, file, keyStore } = makeStore();
  await store.write({ theme: 'dark', locale: 'en' });
  const deviceKey = await keyStore.getOrCreateDeviceKey();
  const guardShaped = await seal(
    provider,
    deviceKey,
    new NonceSource(provider).next(),
    utf8ToBytes(JSON.stringify({ theme: 'light', locale: 'ko' })),
    context('guard', 1),
  );
  await file.write(guardShaped);
  assert.deepEqual(await store.read(), DEFAULT_PREFS);
});

test('지우면 기본값으로 돌아간다', async () => {
  const { store } = makeStore();
  await store.write({ theme: 'dark', locale: 'en' });
  await store.clear();
  assert.deepEqual(await store.read(), DEFAULT_PREFS);
});
