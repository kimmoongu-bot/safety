import test from 'node:test';
import assert from 'node:assert/strict';
import { isVaultError } from '../src/core/errors.ts';
import { createSecretWrap, unwrapWithSecret } from '../src/core/keys.ts';
import { findWrap, type VaultMeta } from '../src/core/schema.ts';
import { utf8ToBytes } from '../src/core/bytes.ts';
import { NEW_PIN_MIN_LENGTH, assertNewPin } from '../src/core/vault.ts';
import { makeHarness, provider, SAMPLE } from './helpers.ts';

/**
 * PIN 길이 (명세 5.4 를 실제로 받쳐 주는 값).
 *
 * 4자리는 1만 가지다. 8회 실패부터 15분씩 기다리게 해도 전부 해 보는 데 넉 달이면
 * 되고, `1234`·`0000`·생일을 먼저 넣어 보는 사람에게는 그 계산조차 의미가 없다.
 * 6자리면 100만 가지라 같은 방식으로 28년이 걸린다.
 *
 * 폰을 잃어버렸을 때 남는 벽이 이것 하나뿐이라 여기서 아낄 데가 아니다.
 */

const OK_PIN = '481207';

test('새 PIN 은 6자리 이상이어야 한다', () => {
  assert.equal(NEW_PIN_MIN_LENGTH, 6);
  assert.doesNotThrow(() => assertNewPin('123456'));
  assert.doesNotThrow(() => assertNewPin('1234567890'));
});

test('짧은 PIN 은 왜 안 되는지까지 알려 준다', () => {
  for (const short of ['1', '123', '1234', '12345']) {
    assert.throws(
      () => assertNewPin(short),
      (e: unknown) =>
        isVaultError(e, 'INVALID_INPUT') &&
        (e as { detail?: string }).detail === 'PIN_TOO_SHORT' &&
        (e as { params?: { count?: number } }).params?.count === 6,
      `${short} 은 막아야 한다`,
    );
  }
});

test('숫자가 아닌 것은 PIN 이 될 수 없다', () => {
  for (const bad of ['abcdef', '12 34 56', '12-34-56', '１２３４５６']) {
    assert.throws(
      () => assertNewPin(bad),
      (e: unknown) => isVaultError(e, 'INVALID_INPUT'),
      `${bad} 은 막아야 한다`,
    );
  }
});

test('짧은 PIN 으로는 금고를 만들 수 없다', async () => {
  const h = makeHarness();
  await assert.rejects(
    () => h.vault.create({ pin: '1234' }),
    (e: unknown) => isVaultError(e, 'INVALID_INPUT'),
  );
  // 만들다 만 흔적이 남으면 안 된다. 다음에 다시 만들 수 있어야 한다.
  assert.equal(await h.vault.status(), 'empty');
  await h.vault.create({ pin: OK_PIN });
  assert.ok(h.vault.isUnlocked);
});

test('PIN 을 바꿀 때도 6자리 이상이어야 한다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: OK_PIN });

  await assert.rejects(
    () => h.vault.changePin(OK_PIN, '1234'),
    (e: unknown) => isVaultError(e, 'INVALID_INPUT'),
  );
  // 퇴짜를 맞았다고 예전 PIN 이 망가지면 안 된다.
  h.vault.lock();
  await h.vault.unlockWithPin(OK_PIN);
});

test('짧은 새 PIN 은 지금 PIN 을 확인하기 **전에** 막는다', async () => {
  // 다 쳐 놓고 마지막에 퇴짜를 맞으면 처음부터 다시 해야 한다.
  // 그리고 틀린 지금 PIN 이 실패 횟수로 세어지는 것도 막는다.
  const h = makeHarness();
  await h.vault.create({ pin: OK_PIN });

  await assert.rejects(
    () => h.vault.changePin('000000', '1234'),
    (e: unknown) =>
      isVaultError(e, 'INVALID_INPUT') && (e as { detail?: string }).detail === 'PIN_TOO_SHORT',
    'PIN 이 틀렸다가 아니라 새 PIN 이 짧다고 해야 한다',
  );
});

/**
 * **예전에 4자리로 만든 금고는 그대로 열려야 한다.**
 *
 * 이것이 이 파일에서 제일 중요한 검사다. 여는 쪽 최소 길이를 같이 올려 버리면,
 * 앱을 갱신한 순간 4자리로 만든 사람이 **자기 금고를 영영 못 연다.** 그건 보안이
 * 아니라 자료 유실이다. 그 사람은 설정에서 PIN 을 바꿀 때 6자리를 받는다.
 *
 * 새 규칙이 생긴 뒤로는 4자리 금고를 만들 방법이 없으므로, 금고를 만들 때와 똑같은
 * 방식으로 4자리 자물쇠를 직접 끼워 넣어 그 시절 금고를 되살린다.
 */
test('예전에 4자리로 만든 금고는 그대로 열린다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: OK_PIN });
  await h.vault.addRecord(SAMPLE);

  const meta = (await h.metaStore.readMeta()) as VaultMeta;
  const pinWrap = findWrap(meta, 'pin')!;
  const deviceKey = await h.keyStore.getOrCreateDeviceKey();

  // 지금 PIN 으로 열쇠를 꺼내서, 4자리 자물쇠로 다시 채운다.
  const dek = await unwrapWithSecret(provider, meta, pinWrap, utf8ToBytes(OK_PIN), deviceKey);
  const legacy = await createSecretWrap(
    provider,
    h.nonces,
    meta.vaultId,
    'pin',
    utf8ToBytes('1234'),
    pinWrap.kdf!,
    deviceKey,
    dek,
  );
  await h.metaStore.writeMeta({
    ...meta,
    wraps: [legacy, ...meta.wraps.filter((w) => w.slot !== 'pin')],
  });

  const reopened = h.restart();
  await reopened.unlockWithPin('1234');

  assert.ok(reopened.isUnlocked, '4자리로 만든 금고가 안 열리면 자료를 잃는 것이다');
  const records = await reopened.listOpenRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.service, SAMPLE.service);
});

test('4자리 금고를 쓰던 사람은 6자리로 바꿀 수 있다', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: OK_PIN });

  const meta = (await h.metaStore.readMeta()) as VaultMeta;
  const pinWrap = findWrap(meta, 'pin')!;
  const deviceKey = await h.keyStore.getOrCreateDeviceKey();
  const dek = await unwrapWithSecret(provider, meta, pinWrap, utf8ToBytes(OK_PIN), deviceKey);
  const legacy = await createSecretWrap(
    provider, h.nonces, meta.vaultId, 'pin', utf8ToBytes('1234'), pinWrap.kdf!, deviceKey, dek,
  );
  await h.metaStore.writeMeta({ ...meta, wraps: [legacy, ...meta.wraps.filter((w) => w.slot !== 'pin')] });

  const reopened = h.restart();
  await reopened.unlockWithPin('1234');
  await reopened.changePin('1234', '246810');

  reopened.lock();
  await reopened.unlockWithPin('246810');
  assert.ok(reopened.isUnlocked);
});
