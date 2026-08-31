import test from 'node:test';
import assert from 'node:assert/strict';
import { isVaultError } from '../src/core/errors.ts';
import { decryptRecord } from '../src/core/records.ts';
import { makeHarness, provider, SAMPLE } from './helpers.ts';

const PIN = '481207';

async function unlocked() {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  return h;
}

test('항목을 넣고 다시 꺼내면 내용이 같다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  const fetched = await h.vault.getOpenRecord(added.id);
  assert.equal(fetched.service, SAMPLE.service);
  assert.equal(fetched.username, SAMPLE.username);
  assert.equal(fetched.password, SAMPLE.password);
  assert.equal(fetched.memo, SAMPLE.memo);
  assert.equal(fetched.category, SAMPLE.category);
  assert.equal(fetched.schemaVersion, 1);
});

test('저장 파일에는 평문이 0건이다 (명세 8장 DoD)', async () => {
  const h = await unlocked();
  await h.vault.addRecord({ ...SAMPLE });
  await h.vault.addRecord({ ...SAMPLE, service: '국민은행', username: 'kb-user', password: 'p@ssw0rd!' });

  const raw = `${h.recordStore.rawBytes()}\n${h.metaStore.rawBytes()}`;
  for (const secret of [
    SAMPLE.service,
    SAMPLE.username,
    SAMPLE.password,
    SAMPLE.memo,
    SAMPLE.category,
    '국민은행',
    'kb-user',
    'p@ssw0rd!',
    PIN,
  ]) {
    assert.ok(!raw.includes(secret), `저장 파일에 "${secret}" 이(가) 그대로 남아 있다`);
  }
  // 평문으로 남는 것은 메타뿐이다.
  const stored = await h.recordStore.list();
  assert.deepEqual(Object.keys(stored[0] ?? {}).sort(), [
    'cipher',
    'createdAt',
    'favorite',
    'id',
    'schemaVersion',
    'updatedAt',
  ]);
});

test('내용을 고치면 updatedAt 이 바뀐다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  h.clock.advance(60_000);
  const updated = await h.vault.updateRecord(added.id, { memo: '메모 고침' });
  assert.equal(updated.memo, '메모 고침');
  assert.ok(updated.updatedAt > added.updatedAt);
  assert.equal(updated.createdAt, added.createdAt);
});

test('비밀번호를 바꾸면 변경일이 갱신되고 직전 비밀번호 1개가 남는다 (명세 7장)', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  h.clock.advance(400 * 24 * 60 * 60 * 1000);

  const first = await h.vault.updateRecord(added.id, { password: '새비밀번호1' });
  assert.equal(first.password, '새비밀번호1');
  assert.equal(first.prevPassword, SAMPLE.password);
  assert.equal(first.pwChangedAt, h.clock.now());

  const second = await h.vault.updateRecord(added.id, { password: '새비밀번호2' });
  assert.equal(second.prevPassword, '새비밀번호1'); // 항상 1개만 남는다
});

test('비밀번호가 그대로면 변경일은 건드리지 않는다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  h.clock.advance(10_000);
  const updated = await h.vault.updateRecord(added.id, { password: SAMPLE.password, memo: '메모만' });
  assert.equal(updated.pwChangedAt, added.pwChangedAt);
  assert.equal(updated.prevPassword, undefined);
});

test('설정을 끄면 직전 비밀번호를 남기지 않고, 남아 있던 것도 지운다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  const withPrev = await h.vault.updateRecord(added.id, { password: 'a-new-one' });
  assert.ok(withPrev.prevPassword);

  await h.vault.updateSettings({ keepPreviousPassword: false });
  const cleaned = await h.vault.updateRecord(added.id, { password: 'another-one' });
  assert.equal(cleaned.prevPassword, undefined);
  assert.equal((await h.vault.getOpenRecord(added.id)).prevPassword, undefined);
});

test('즐겨찾기가 목록 맨 위에 온다', async () => {
  const h = await unlocked();
  await h.vault.addRecord({ ...SAMPLE, service: '나' });
  const b = await h.vault.addRecord({ ...SAMPLE, service: '하' });
  await h.vault.addRecord({ ...SAMPLE, service: '가' });
  await h.vault.updateRecord(b.id, { favorite: true });

  const list = await h.vault.listOpenRecords();
  assert.deepEqual(
    list.map((r) => r.service),
    ['하', '가', '나'],
  );
});

test('항목을 지우면 목록에서 사라진다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  await h.vault.removeRecord(added.id);
  assert.equal((await h.vault.listOpenRecords()).length, 0);
  await assert.rejects(
    () => h.vault.getOpenRecord(added.id),
    (e: unknown) => isVaultError(e, 'VAULT_NOT_FOUND'),
  );
});

test('다른 항목의 암호문을 옮겨 붙이면 열리지 않는다', async () => {
  const h = await unlocked();
  const a = await h.vault.addRecord({ ...SAMPLE, service: 'A' });
  const b = await h.vault.addRecord({ ...SAMPLE, service: 'B' });
  const rowA = await h.recordStore.get(a.id);
  const rowB = await h.recordStore.get(b.id);
  assert.ok(rowA && rowB);
  await h.recordStore.put({ ...rowA, cipher: rowB.cipher });
  await assert.rejects(
    () => h.vault.getOpenRecord(a.id),
    (e: unknown) => isVaultError(e, 'DATA_DAMAGED'),
  );
});

test('더 새로운 구조 버전의 항목은 건드리지 않고 멈춘다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  const row = await h.recordStore.get(added.id);
  assert.ok(row);
  await h.recordStore.put({ ...row, schemaVersion: 99 });
  await assert.rejects(
    () => h.vault.getOpenRecord(added.id),
    (e: unknown) => isVaultError(e, 'UNSUPPORTED_FORMAT'),
  );
});

test('잠긴 상태에서는 항목을 넣을 수 없다', async () => {
  const h = await unlocked();
  h.vault.lock();
  await assert.rejects(
    () => h.vault.addRecord({ ...SAMPLE }),
    (e: unknown) => isVaultError(e, 'VAULT_LOCKED'),
  );
});

test('같은 내용을 두 번 넣어도 암호문은 서로 다르다', async () => {
  const h = await unlocked();
  const a = await h.vault.addRecord({ ...SAMPLE });
  const b = await h.vault.addRecord({ ...SAMPLE });
  const rowA = await h.recordStore.get(a.id);
  const rowB = await h.recordStore.get(b.id);
  assert.notEqual(rowA?.cipher.ciphertext, rowB?.cipher.ciphertext);
  assert.notEqual(rowA?.cipher.nonce, rowB?.cipher.nonce);
});

test('DEK 가 없으면 암호문을 열 수 없다', async () => {
  const h = await unlocked();
  const added = await h.vault.addRecord({ ...SAMPLE });
  const row = await h.recordStore.get(added.id);
  assert.ok(row);
  await assert.rejects(
    () => decryptRecord(provider, provider.randomBytes(32), row),
    (e: unknown) => isVaultError(e, 'DATA_DAMAGED'),
  );
});

test('백 건 규모도 열어서 검색할 수 있다 (명세 4장 검색 처리)', async () => {
  const h = await unlocked();
  for (let i = 0; i < 200; i++) {
    await h.vault.addRecord({ ...SAMPLE, service: `서비스-${i}`, username: `user${i}` });
  }
  const all = await h.vault.listOpenRecords();
  assert.equal(all.length, 200);
  const hits = all.filter((r) => r.service.includes('서비스-1') || r.username.includes('user1'));
  assert.ok(hits.length > 0);
});

test('항목 하나가 손상돼도 나머지는 열린다 (금고 전체가 막히면 안 된다)', async () => {
  const h = await unlocked();
  await h.vault.addRecord({ ...SAMPLE, service: '멀쩡한 것' });
  const broken = await h.vault.addRecord({ ...SAMPLE, service: '망가질 것' });

  // 저장된 암호문을 한 글자 망가뜨린다.
  const row = await h.recordStore.get(broken.id);
  assert.ok(row);
  const ct = row.cipher.ciphertext;
  await h.recordStore.put({
    ...row,
    cipher: { ...row.cipher, ciphertext: `${ct[0] === 'A' ? 'B' : 'A'}${ct.slice(1)}` },
  });

  const list = await h.vault.listOpenRecords();
  assert.equal(list.length, 1);
  assert.equal(list[0]?.service, '멀쩡한 것');
  assert.equal(h.vault.unreadableRecordCount, 1);
});

test('다 멀쩡하면 못 연 항목 수는 0 이다', async () => {
  const h = await unlocked();
  await h.vault.addRecord({ ...SAMPLE });
  await h.vault.listOpenRecords();
  assert.equal(h.vault.unreadableRecordCount, 0);
});
