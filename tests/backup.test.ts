import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_FILE_EXTENSION,
  backupFileName,
  backupIsStale,
  parseBackup,
  readBackupFile,
  serializeBackup,
} from '../src/core/backup.ts';
import { exportBackup, previewBackup, restoreBackup } from '../src/core/backupService.ts';
import { isVaultError } from '../src/core/errors.ts';
import { makeHarness, provider, SAMPLE, TEST_KDF } from './helpers.ts';

const PIN = '481207';
const BACKUP_PW = '우리집-금고-2026';

async function vaultWithData() {
  const h = makeHarness();
  await h.vault.create({ pin: PIN });
  await h.vault.addRecord({ ...SAMPLE });
  await h.vault.addRecord({ ...SAMPLE, service: '국민은행', username: 'kb', password: 'p@ss', category: '은행' });
  return h;
}

test('백업 파일 이름은 잠김_백업_삭제금지_YYYYMMDD.jamgim 이다 (명세 6.2)', () => {
  const name = backupFileName(new Date('2026-03-07T10:00:00').getTime());
  assert.equal(name, `잠김_백업_삭제금지_20260307${BACKUP_FILE_EXTENSION}`);
});

test('내보낸 파일에 평문이 남지 않는다', async () => {
  const h = await vaultWithData();
  const { contents, recordCount } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());
  assert.equal(recordCount, 2);
  for (const secret of [SAMPLE.service, SAMPLE.password, SAMPLE.username, '국민은행', 'p@ss', PIN, BACKUP_PW]) {
    assert.ok(!contents.includes(secret), `백업 파일에 "${secret}" 이(가) 그대로 남아 있다`);
  }
  const parsed = parseBackup(contents);
  assert.equal(parsed.format, 'jamgim-backup');
  assert.equal(parsed.recordCount, 2);
  assert.ok(parsed.kdf && parsed.salt && parsed.cipher.nonce);
});

test('기기를 초기화해도 백업 파일 + 백업 비밀번호로 되살아난다 (명세 8장 DoD)', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());

  // 앱 삭제 후 재설치 = 저장소도 키 저장소도 전부 새것.
  const fresh = makeHarness();
  await fresh.vault.create({ pin: '999999' });
  const { restored, skipped } = await restoreBackup(fresh.vault, contents, BACKUP_PW);
  assert.equal(restored, 2);
  assert.equal(skipped, 0);

  const list = await fresh.vault.listOpenRecords();
  assert.equal(list.length, 2);
  const card = list.find((r) => r.service === SAMPLE.service);
  assert.equal(card?.password, SAMPLE.password);
  assert.equal(card?.memo, SAMPLE.memo);

  // 되살린 뒤에도 새 기기의 PIN 으로 잠그고 열 수 있다.
  fresh.restart();
  await fresh.vault.unlockWithPin('999999');
  assert.equal((await fresh.vault.listOpenRecords()).length, 2);
});

test('백업 비밀번호가 틀리면 실패하되 앱이 죽지 않는다 (명세 8장 DoD)', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());
  const fresh = makeHarness();
  await fresh.vault.create({ pin: '999999' });

  for (const wrong of ['틀린비밀번호', BACKUP_PW.slice(0, -1), `${BACKUP_PW}7`, '']) {
    const e = await restoreBackup(fresh.vault, contents, wrong).then(
      () => null,
      (err: unknown) => err,
    );
    assert.ok(
      isVaultError(e, 'WRONG_BACKUP_PASSWORD') || isVaultError(e, 'INVALID_INPUT'),
      `"${wrong}" 에서 예상치 못한 오류: ${String(e)}`,
    );
  }
  // 실패해도 기존 금고는 그대로다.
  assert.equal((await fresh.vault.listOpenRecords()).length, 0);
  assert.ok(fresh.vault.isUnlocked);
});

test('앞뒤 공백은 눈감아 준다 — 옮겨 적을 때 흔한 실수', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, `  ${BACKUP_PW}  `, h.clock.now());
  const fresh = makeHarness();
  await fresh.vault.create({ pin: '999999' });
  const { restored } = await restoreBackup(fresh.vault, contents, ` ${BACKUP_PW} `);
  assert.equal(restored, 2);
});

test('백업 파일을 손대면 열리지 않는다', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());
  const file = parseBackup(contents);

  // (1) KDF 파라미터를 몰래 낮춘 경우 — 헤더가 AAD 로 묶여 있어 통과하지 못한다.
  const weakened = serializeBackup({ ...file, kdf: { ...TEST_KDF, N: 1 << 16 } as typeof TEST_KDF });
  await assert.rejects(
    () => readBackupFile(provider, weakened, BACKUP_PW),
    (e: unknown) => isVaultError(e, 'WRONG_BACKUP_PASSWORD'),
  );

  // (2) 건수를 고친 경우.
  const relabeled = serializeBackup({ ...file, recordCount: 99 });
  await assert.rejects(
    () => readBackupFile(provider, relabeled, BACKUP_PW),
    (e: unknown) => isVaultError(e, 'WRONG_BACKUP_PASSWORD'),
  );

  // (3) 암호문을 건드린 경우.
  const cipherBytes = file.cipher.ciphertext;
  const flipped = `${cipherBytes[0] === 'A' ? 'B' : 'A'}${cipherBytes.slice(1)}`;
  await assert.rejects(
    () => readBackupFile(provider, serializeBackup({ ...file, cipher: { ...file.cipher, ciphertext: flipped } }), BACKUP_PW),
    (e: unknown) => isVaultError(e, 'WRONG_BACKUP_PASSWORD'),
  );
});

test('잠김 백업 파일이 아니면 형식 오류로 알려 준다', async () => {
  for (const junk of ['', '{}', 'not json at all', JSON.stringify({ format: 'other', version: 1 })]) {
    await assert.rejects(
      () => readBackupFile(provider, junk, BACKUP_PW),
      (e: unknown) => isVaultError(e, 'UNSUPPORTED_FORMAT'),
    );
  }
});

test('더 새로운 버전의 백업 파일은 열지 않는다', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());
  const future = serializeBackup({ ...parseBackup(contents), version: 99 });
  await assert.rejects(
    () => readBackupFile(provider, future, BACKUP_PW),
    (e: unknown) => isVaultError(e, 'UNSUPPORTED_FORMAT'),
  );
});

test('백업 비밀번호는 8자 이상이어야 한다 (명세 6.2)', async () => {
  const h = await vaultWithData();
  await assert.rejects(
    () => exportBackup(h.vault, '짧다', h.clock.now()),
    (e: unknown) => isVaultError(e, 'INVALID_INPUT'),
  );
});

test('백업 비밀번호로 앱 PIN 을 그대로 쓰지 못한다 (명세 6.2)', async () => {
  const h = makeHarness();
  await h.vault.create({ pin: '12345678' });
  await assert.rejects(
    () => exportBackup(h.vault, '12345678', h.clock.now()),
    (e: unknown) => isVaultError(e, 'INVALID_INPUT'),
  );
  // 다른 값이면 통과한다.
  const ok = await exportBackup(h.vault, '87654321', h.clock.now());
  assert.ok(ok.contents.length > 0);
});

test('먼저 열어 보고(건수 확인) 나중에 되살릴 수 있다', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());
  const fresh = makeHarness();
  await fresh.vault.create({ pin: '999999' });

  const preview = await previewBackup(fresh.vault, contents, BACKUP_PW);
  assert.equal(preview.entries.length, 2);
  assert.equal(preview.header.recordCount, 2);
  assert.equal((await fresh.vault.listOpenRecords()).length, 0); // 아직 아무것도 바뀌지 않았다
});

test('합치기 모드는 이미 있는 항목을 건너뛴다', async () => {
  const h = await vaultWithData();
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());
  await h.vault.addRecord({ ...SAMPLE, service: '나중에 넣은 것' });

  const { restored, skipped } = await restoreBackup(h.vault, contents, BACKUP_PW, { mode: 'merge' });
  assert.equal(restored, 0);
  assert.equal(skipped, 2);
  assert.equal((await h.vault.listOpenRecords()).length, 3);
});

test('되살린 항목은 새 금고의 키로 다시 감싸진다', async () => {
  const h = await vaultWithData();
  const original = (await h.vault.listOpenRecords())[0];
  assert.ok(original);
  const originalRow = await h.recordStore.get(original.id);
  const { contents } = await exportBackup(h.vault, BACKUP_PW, h.clock.now());

  const fresh = makeHarness();
  await fresh.vault.create({ pin: '999999' });
  await restoreBackup(fresh.vault, contents, BACKUP_PW);
  const restoredRow = await fresh.recordStore.get(original.id);

  assert.ok(restoredRow);
  assert.notEqual(restoredRow.cipher.ciphertext, originalRow?.cipher.ciphertext);
  assert.notEqual(restoredRow.cipher.nonce, originalRow?.cipher.nonce);
});

test('내보내면 마지막 백업 시각이 기록되고 90일 알림 기준이 된다 (명세 6.3)', async () => {
  const h = await vaultWithData();
  assert.ok(backupIsStale(undefined, h.clock.now())); // 한 번도 안 했으면 권한다
  await exportBackup(h.vault, BACKUP_PW, h.clock.now());

  const meta = await h.vault.readMeta();
  assert.equal(meta.lastBackupAt, h.clock.now());
  assert.ok(!backupIsStale(meta.lastBackupAt, h.clock.now()));

  h.clock.advance(89 * 24 * 60 * 60 * 1000);
  assert.ok(!backupIsStale(meta.lastBackupAt, h.clock.now()));
  h.clock.advance(2 * 24 * 60 * 60 * 1000);
  assert.ok(backupIsStale(meta.lastBackupAt, h.clock.now()));
});

test('잠긴 금고는 내보낼 수 없다', async () => {
  const h = await vaultWithData();
  h.vault.lock();
  await assert.rejects(
    () => exportBackup(h.vault, BACKUP_PW, h.clock.now()),
    (e: unknown) => isVaultError(e, 'VAULT_LOCKED'),
  );
});
