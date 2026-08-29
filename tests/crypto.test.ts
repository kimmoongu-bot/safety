import test from 'node:test';
import assert from 'node:assert/strict';
import { context, open, seal } from '../src/core/crypto/aead.ts';
import { NonceSource } from '../src/core/crypto/nonce.ts';
import { AES_KEY_BYTES } from '../src/core/crypto/types.ts';
import { assertParamsAcceptable, calibrateKdf, strongestSupportedKdf } from '../src/core/crypto/kdf.ts';
import { fromBase64, timingSafeEqual, toBase64, utf8ToBytes, bytesToUtf8 } from '../src/core/bytes.ts';
import { isVaultError } from '../src/core/errors.ts';
import { NodeCryptoProvider } from '../src/core/providers/nodeCryptoProvider.ts';
import { provider } from './helpers.ts';

test('base64 는 왕복해도 값이 같다', () => {
  for (const len of [0, 1, 2, 3, 16, 31, 32, 100]) {
    const bytes = provider.randomBytes(len);
    assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
  }
});

test('한글도 바이트 왕복이 정확하다', () => {
  const text = '현대카드 비밀번호 — 잠김';
  assert.equal(bytesToUtf8(utf8ToBytes(text)), text);
});

test('timingSafeEqual 은 길이가 달라도 동작한다', () => {
  assert.ok(timingSafeEqual(utf8ToBytes('abc'), utf8ToBytes('abc')));
  assert.ok(!timingSafeEqual(utf8ToBytes('abc'), utf8ToBytes('abd')));
  assert.ok(!timingSafeEqual(utf8ToBytes('abc'), utf8ToBytes('abcd')));
});

test('AES-256-GCM 암·복호화가 왕복한다', async () => {
  const key = provider.randomBytes(AES_KEY_BYTES);
  const nonces = new NonceSource(provider);
  const aad = context('test', 1);
  const plain = utf8ToBytes('비밀번호: hunter2');
  const blob = await seal(provider, key, nonces.next(), plain, aad);
  assert.notEqual(blob.ciphertext, toBase64(plain));
  const out = await open(provider, key, blob, aad);
  assert.equal(bytesToUtf8(out), '비밀번호: hunter2');
});

test('암호문을 한 글자라도 건드리면 열리지 않는다', async () => {
  const key = provider.randomBytes(AES_KEY_BYTES);
  const nonces = new NonceSource(provider);
  const aad = context('test', 1);
  const blob = await seal(provider, key, nonces.next(), utf8ToBytes('원본'), aad);
  const tampered = fromBase64(blob.ciphertext);
  tampered[0] = (tampered[0] as number) ^ 0x01;
  await assert.rejects(
    () => open(provider, key, { ...blob, ciphertext: toBase64(tampered) }, aad),
    (e: unknown) => isVaultError(e, 'DATA_DAMAGED'),
  );
});

test('AAD(문맥)가 다르면 열리지 않는다 — 블롭 바꿔치기 방어', async () => {
  const key = provider.randomBytes(AES_KEY_BYTES);
  const nonces = new NonceSource(provider);
  const blob = await seal(provider, key, nonces.next(), utf8ToBytes('원본'), context('record', 1, 'id-A'));
  await assert.rejects(
    () => open(provider, key, blob, context('record', 1, 'id-B')),
    (e: unknown) => isVaultError(e, 'DATA_DAMAGED'),
  );
});

test('다른 키로는 열리지 않는다', async () => {
  const nonces = new NonceSource(provider);
  const aad = context('test', 1);
  const blob = await seal(provider, provider.randomBytes(32), nonces.next(), utf8ToBytes('x'), aad);
  await assert.rejects(
    () => open(provider, provider.randomBytes(32), blob, aad),
    (e: unknown) => isVaultError(e, 'DATA_DAMAGED'),
  );
});

test('nonce 는 두 번 생성되지 않는다 (명세 8장 DoD)', () => {
  const nonces = new NonceSource(provider);
  const seen = new Set<string>();
  const COUNT = 50_000;
  for (let i = 0; i < COUNT; i++) {
    const nonce = nonces.next();
    assert.equal(nonce.length, 12);
    seen.add(toBase64(nonce));
  }
  assert.equal(seen.size, COUNT);
  assert.equal(nonces.issuedCount, COUNT);
});

test('난수원이 같은 값만 내놓으면 nonce 생성이 실패한다', () => {
  const stuck = new NodeCryptoProvider();
  const fixed = new Uint8Array(12);
  stuck.randomBytes = () => Uint8Array.from(fixed);
  const nonces = new NonceSource(stuck);
  nonces.next();
  assert.throws(() => nonces.next(), /unique/);
});

test('약한 KDF 파라미터는 거부된다', () => {
  assert.throws(() => assertParamsAcceptable({ alg: 'pbkdf2-sha256', iterations: 100_000, keyLength: 32 }));
  assert.throws(() => assertParamsAcceptable({ alg: 'scrypt', N: 1024, r: 8, p: 1, keyLength: 32 }));
  assert.throws(() =>
    assertParamsAcceptable({ alg: 'argon2id', memoryKiB: 1024, iterations: 1, parallelism: 1, keyLength: 32 }),
  );
  // 명세 2장: PBKDF2 는 60만 회 이상.
  assertParamsAcceptable({ alg: 'pbkdf2-sha256', iterations: 600_000, keyLength: 32 });
});

test('KDF 는 쓸 수 있는 것 중 가장 강한 것을 고른다', () => {
  assert.equal(strongestSupportedKdf(new NodeCryptoProvider(['argon2id', 'scrypt'])), 'argon2id');
  assert.equal(strongestSupportedKdf(new NodeCryptoProvider(['scrypt', 'pbkdf2-sha256'])), 'scrypt');
  assert.equal(strongestSupportedKdf(new NodeCryptoProvider(['pbkdf2-sha256'])), 'pbkdf2-sha256');
});

test('보정은 최소 기준 아래로 내려가지 않는다', async () => {
  // 무엇을 재든 "10초나 걸렸다"고 답하는 시계 — 파라미터를 낮추려는 압력이 최대다.
  let t = 0;
  const slowClock = () => (t += 10_000);
  const { params } = await calibrateKdf(new NodeCryptoProvider(['scrypt']), slowClock);
  assertParamsAcceptable(params); // 최소 기준 통과 = 더 낮추지 않았다.
});
