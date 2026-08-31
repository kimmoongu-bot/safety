import test from 'node:test';
import assert from 'node:assert/strict';
import { isVaultError } from '../src/core/errors.ts';
import { findWrap } from '../src/core/schema.ts';
import { toBase64 } from '../src/core/bytes.ts';
import { makeHarness, SAMPLE } from './helpers.ts';

const PIN = '481207';

test('금고 만들기 → PIN 으로 열기', async () => {
  const h = makeHarness();
  assert.equal(await h.vault.status(), 'empty');
  const { recoveryCode } = await h.vault.create({ pin: PIN });
  assert.equal(recoveryCode.length, 16);
  assert.ok(h.vault.isUnlocked); // 만든 직후에는 열린 상태로 이어진다.

  h.vault.lock();
  assert.equal(await h.vault.status(), 'locked');
  await h.vault.unlockWithPin(PIN);
  assert.ok(h.vault.isUnlocked);
});

test('금고는 하나만 만들 수 있다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await assert.rejects(
    () => h.vault.create({ pin: '999999' }),
    (e: unknown) => isVaultError(e, 'VAULT_ALREADY_EXISTS'),
  );
});

test('PIN 이 틀리면 WRONG_PIN — 해시 비교가 아니라 인증 태그로 판정한다 (명세 5.2)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  await assert.rejects(
    () => h.vault.unlockWithPin('481208'),
    (e: unknown) => isVaultError(e, 'WRONG_PIN'),
  );
  assert.ok(!h.vault.isUnlocked);
});

test('저장된 메타 어디에도 PIN 해시가 없다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  const raw = h.metaStore.rawBytes();
  assert.ok(!raw.includes(PIN));
  const meta = await h.vault.readMeta();
  const pinWrap = findWrap(meta, 'pin');
  assert.ok(pinWrap);
  // 슬롯에 있는 것은 salt, KDF 파라미터, 감싼 결과뿐이다.
  assert.deepEqual(Object.keys(pinWrap).sort(), ['blob', 'kdf', 'salt', 'slot']);
});

test('PIN 을 잊어도 복구 코드로 열린다 (명세 8장 DoD)', async () => {
  const h = makeHarness();
  const { recoveryCode } = await h.vault.create({ pin: PIN });
  await h.vault.addRecord({ ...SAMPLE });
  h.restart(); // 앱을 껐다 켠다. PIN 은 잊었다.

  await h.vault.unlockWithRecoveryCode(recoveryCode);
  const items = await h.vault.listOpenRecords();
  assert.equal(items.length, 1);
  assert.equal(items[0]?.password, SAMPLE.password);
});

test('복구 코드는 띄어쓰기·소문자로 적어도 열린다', async () => {
  const h = makeHarness();
  const { recoveryCode } = await h.vault.create({ pin: PIN });
  h.vault.lock();
  const messy = `${recoveryCode.slice(0, 6)} ${recoveryCode.slice(6, 12)} ${recoveryCode.slice(12, 18)} ${recoveryCode.slice(18)}`.toLowerCase();
  await h.vault.unlockWithRecoveryCode(messy);
  assert.ok(h.vault.isUnlocked);
});

test('틀린 복구 코드는 거절한다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  await assert.rejects(
    () => h.vault.unlockWithRecoveryCode('ABCDEF-GHJKMN-PQRSTV-WXYZ01'),
    (e: unknown) => isVaultError(e, 'WRONG_RECOVERY_CODE'),
  );
});

test('복구 코드는 설정에서 다시 볼 수 있다 (명세 6.1)', async () => {
  const h = makeHarness();
  const { recoveryCode } = await h.vault.create({ pin: PIN });
  assert.equal(await h.vault.revealRecoveryCode(), recoveryCode);
  h.vault.lock();
  await assert.rejects(
    () => h.vault.revealRecoveryCode(),
    (e: unknown) => isVaultError(e, 'VAULT_LOCKED'),
  );
});

test('생체인증으로 열기 — 켜면 열리고, 끄면 막힌다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN, enableBiometric: true });
  h.vault.lock();
  await h.vault.unlockWithBiometrics();
  assert.ok(h.vault.isUnlocked);

  await h.vault.setBiometricUnlock(false);
  h.vault.lock();
  await assert.rejects(
    () => h.vault.unlockWithBiometrics(),
    (e: unknown) => isVaultError(e, 'VAULT_LOCKED'),
  );
  await h.vault.unlockWithPin(PIN); // PIN 은 그대로 된다.
});

test('생체정보가 새로 등록되면 그 길만 막히고 PIN 은 살아 있다 (명세 5.3)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN, enableBiometric: true });
  await h.vault.addRecord({ ...SAMPLE });
  h.restart();

  h.keyStore.simulateBiometricEnrollmentChange();
  await assert.rejects(
    () => h.vault.unlockWithBiometrics(),
    (e: unknown) => isVaultError(e, 'VAULT_LOCKED'),
  );
  await h.vault.unlockWithPin(PIN);
  assert.equal((await h.vault.listOpenRecords()).length, 1);
});

test('기기 키가 없으면 파일만 있어도 열리지 않는다 (명세 5.3)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await h.vault.addRecord({ ...SAMPLE });
  h.restart();
  // 파일은 그대로 두고 OS 키 저장소만 비운다 = 다른 기기로 파일을 옮긴 상황.
  await h.keyStore.clear();
  await assert.rejects(
    () => h.vault.unlockWithPin(PIN),
    (e: unknown) => isVaultError(e, 'DATA_DAMAGED'),
  );
  // 맞는 PIN 이어도, 복구 코드여도 마찬가지다.
  await assert.rejects(
    () => h.vault.unlockWithRecoveryCode('ABCDEF-GHJKMN-PQRSTV-WXYZ01'),
    (e: unknown) => isVaultError(e, 'WRONG_RECOVERY_CODE') || isVaultError(e, 'DATA_DAMAGED'),
  );
});

test('PIN 바꾸기 — 새 PIN 으로 열리고 옛 PIN 으로는 안 열린다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await h.vault.addRecord({ ...SAMPLE });
  await h.vault.changePin(PIN, '135790');
  h.restart();

  await assert.rejects(
    () => h.vault.unlockWithPin(PIN),
    (e: unknown) => isVaultError(e, 'WRONG_PIN'),
  );
  await h.vault.unlockWithPin('135790');
  assert.equal((await h.vault.listOpenRecords())[0]?.service, SAMPLE.service);
});

test('PIN 을 바꿔도 복구 코드는 그대로 쓸 수 있다', async () => {
  const h = makeHarness();
  const { recoveryCode } = await h.vault.create({ pin: PIN });
  await h.vault.changePin(PIN, '135790');
  h.restart();
  await h.vault.unlockWithRecoveryCode(recoveryCode);
  assert.ok(h.vault.isUnlocked);
});

test('짧거나 숫자가 아닌 PIN 은 금고를 만들 때 거절한다', async () => {
  const h = makeHarness();
  for (const bad of ['12', 'abcd', '   ']) {
    await assert.rejects(
      () => h.vault.create({ pin: bad }),
      (e: unknown) => isVaultError(e, 'INVALID_INPUT'),
    );
  }
});

test('lock() 은 금고 내용 접근을 막는다 (명세 5.5)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await h.vault.addRecord({ ...SAMPLE });
  h.vault.lock();
  await assert.rejects(
    () => h.vault.listOpenRecords(),
    (e: unknown) => isVaultError(e, 'VAULT_LOCKED'),
  );
});

test('금고 초기화는 저장된 것을 모두 지운다 (명세 6.4)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await h.vault.addRecord({ ...SAMPLE });
  await h.vault.destroy();

  assert.equal(await h.vault.status(), 'empty');
  assert.equal(h.recordStore.rawBytes(), '');
  assert.equal(await h.keyStore.getDeviceKey(), null);
  // 지운 뒤에는 새 금고를 만들 수 있다.
  await h.vault.create({ pin: '222222' });
  assert.equal((await h.vault.listOpenRecords()).length, 0);
});

test('금고마다 DEK 가 다르다 — 두 금고의 암호문이 겹치지 않는다', async () => {
  const a = makeHarness();
  const b = makeHarness();
  await a.vault.create({ pin: PIN });
  await b.vault.create({ pin: PIN });
  const recA = await a.vault.addRecord({ ...SAMPLE });
  const recB = await b.vault.addRecord({ ...SAMPLE });
  const rawA = (await a.recordStore.get(recA.id))?.cipher.ciphertext;
  const rawB = (await b.recordStore.get(recB.id))?.cipher.ciphertext;
  assert.notEqual(rawA, rawB);
  assert.notEqual((await a.vault.readMeta()).vaultId, (await b.vault.readMeta()).vaultId);
});

test('레코드 nonce 는 서로 다르다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  const nonces = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const rec = await h.vault.addRecord({ ...SAMPLE, service: `서비스${i}` });
    const stored = await h.recordStore.get(rec.id);
    nonces.add(stored?.cipher.nonce ?? '');
  }
  const meta = await h.vault.readMeta();
  for (const wrap of meta.wraps) nonces.add(wrap.blob.nonce);
  assert.equal(nonces.size, 50 + meta.wraps.length);
  assert.ok(!nonces.has(toBase64(new Uint8Array(12))));
});
