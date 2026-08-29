import test from 'node:test';
import assert from 'node:assert/strict';
import { isVaultError } from '../src/core/errors.ts';
import { delayForFailures, remainingWaitMs, WIPE_FAILURE_THRESHOLD } from '../src/core/lockout.ts';
import { makeHarness } from './helpers.ts';

const PIN = '481207';
const WRONG = '000000';

async function failOnce(h: ReturnType<typeof makeHarness>, pin = WRONG): Promise<unknown> {
  try {
    await h.vault.unlockWithPin(pin);
    return null;
  } catch (e) {
    return e;
  }
}

test('대기 시간표가 명세 5.4 와 같다', () => {
  assert.equal(delayForFailures(1), 0);
  assert.equal(delayForFailures(4), 0);
  assert.equal(delayForFailures(5), 30_000);
  assert.equal(delayForFailures(6), 60_000);
  assert.equal(delayForFailures(7), 5 * 60_000);
  assert.equal(delayForFailures(8), 15 * 60_000);
  assert.equal(delayForFailures(9), 15 * 60_000);
  assert.equal(delayForFailures(20), 15 * 60_000);
});

test('4회까지는 기다리지 않고, 5회째부터 30초 기다린다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();

  for (let i = 1; i <= 4; i++) {
    assert.ok(isVaultError(await failOnce(h), 'WRONG_PIN'), `${i}회째는 바로 다시 시도할 수 있어야 한다`);
  }
  assert.equal((await h.vault.lockoutView()).waitMs, 0);

  assert.ok(isVaultError(await failOnce(h), 'WRONG_PIN')); // 5회째
  assert.equal((await h.vault.lockoutView()).waitMs, 30_000);
  // 대기 중에는 맞는 PIN 이어도 시도 자체가 막힌다.
  assert.ok(isVaultError(await failOnce(h, PIN), 'LOCKED_OUT'));

  h.clock.advance(30_000);
  await h.vault.unlockWithPin(PIN);
  assert.ok(h.vault.isUnlocked);
  assert.equal((await h.vault.lockoutView()).failures, 0); // 성공하면 초기화된다.
});

test('실패가 쌓이면 대기가 길어진다 (6회 1분 → 7회 5분 → 8회 15분)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();

  const waits: number[] = [];
  for (let i = 1; i <= 8; i++) {
    await failOnce(h);
    const view = await h.vault.lockoutView();
    waits.push(view.waitMs);
    h.clock.advance(view.waitMs);
  }
  assert.deepEqual(waits, [0, 0, 0, 0, 30_000, 60_000, 300_000, 900_000]);
});

test('실패 횟수는 앱을 다시 켜도 남아 있다 (명세 8장 DoD)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  for (let i = 0; i < 5; i++) await failOnce(h);

  h.restart(); // 앱 종료 후 재실행
  const view = await h.vault.lockoutView();
  assert.equal(view.failures, 5);
  assert.equal(view.waitMs, 30_000);
  assert.ok(isVaultError(await failOnce(h, PIN), 'LOCKED_OUT'));
});

test('금고는 두고 실패 기록만 지우면 대기가 초기화되지 않는다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  for (let i = 0; i < 5; i++) await failOnce(h);

  // 공격자가 실패 기록 파일만 지운 상황.
  await h.metaStore.deleteGuardOnly();
  assert.ok(isVaultError(await failOnce(h, PIN), 'LOCKED_OUT'));
  const view = await h.vault.lockoutView();
  assert.equal(view.failures, WIPE_FAILURE_THRESHOLD - 1);
  assert.equal(view.waitMs, 15 * 60_000);
});

test('시계를 뒤로 돌려도 대기를 건너뛸 수 없다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  for (let i = 0; i < 5; i++) await failOnce(h);

  h.clock.advance(-60 * 60_000); // 한 시간 전으로 돌린다
  const { lockout } = await h.vault.readGuardState();
  assert.equal(remainingWaitMs(lockout, h.clock.now()), 30_000);
  assert.ok(isVaultError(await failOnce(h, PIN), 'LOCKED_OUT'));
});

test('설정이 켜져 있으면 10회째에 금고를 지운다 (명세 5.4)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await h.vault.updateSettings({ wipeAfterTenFailures: true });
  await h.vault.addRecord({ service: 's', username: 'u', password: 'p', memo: '', category: '', pwChangedAt: 0 });
  h.vault.lock();

  for (let i = 1; i <= 9; i++) {
    const e = await failOnce(h);
    assert.ok(isVaultError(e, 'WRONG_PIN') || isVaultError(e, 'LOCKED_OUT'));
    h.clock.advance(delayForFailures(i));
  }
  assert.equal((await h.vault.lockoutView()).attemptsBeforeWipe, 1);

  const last = await failOnce(h);
  assert.ok(isVaultError(last, 'VAULT_NOT_FOUND'));
  assert.equal(await h.vault.status(), 'empty');
  assert.equal(h.recordStore.rawBytes(), '');
});

test('설정이 꺼져 있으면 10회를 넘겨도 지우지 않는다 (기본값)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  assert.equal((await h.vault.readSettings()).wipeAfterTenFailures, false);
  h.vault.lock();

  for (let i = 1; i <= 12; i++) {
    await failOnce(h);
    h.clock.advance(delayForFailures(i));
  }
  assert.equal(await h.vault.status(), 'locked');
  assert.equal((await h.vault.lockoutView()).attemptsBeforeWipe, null);
  await h.vault.unlockWithPin(PIN);
  assert.ok(h.vault.isUnlocked);
});

test('형식이 틀린 PIN 입력도 실패 1회로 센다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  for (let i = 0; i < 5; i++) assert.ok(isVaultError(await failOnce(h, 'ab'), 'WRONG_PIN'));
  assert.equal((await h.vault.lockoutView()).waitMs, 30_000);
});

test('복구 코드 실패도 같은 대기표를 쓴다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  h.vault.lock();
  for (let i = 0; i < 5; i++) {
    try {
      await h.vault.unlockWithRecoveryCode('ABCDEF-GHJKMN-PQRSTV-WXYZ01');
    } catch {
      /* 예상된 실패 */
    }
  }
  assert.equal((await h.vault.lockoutView()).waitMs, 30_000);
});
