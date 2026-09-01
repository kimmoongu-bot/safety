import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openOnce } from '../src/data/openOnce.ts';

/**
 * 실기기에서 이런 오류가 났다.
 *   Call to function 'NativeDatabase.prepareAsync' has been rejected.
 *   → Caused by: java.lang.NullPointerException
 *
 * 원인은 데이터베이스를 두 번 연 것이었다. 예전 코드는 다 열린 값만 보고 판단해서,
 * 두 곳에서 동시에 부르면 둘 다 "아직 안 열렸네" 하고 각자 열었다.
 */

function slowOpener(ms = 5) {
  let calls = 0;
  const open = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, ms));
    return { id: calls };
  };
  return { open, calls: () => calls };
}

test('동시에 여러 번 불러도 한 번만 연다', async () => {
  const o = slowOpener();
  const get = openOnce(o.open);

  const got = await Promise.all([get(), get(), get(), get()]);

  assert.equal(o.calls(), 1, '동시에 불러도 한 번만 열려야 한다');
  for (const g of got) assert.equal(g.id, 1, '모두 같은 것을 받아야 한다');
});

test('한 번 연 뒤에는 다시 열지 않는다', async () => {
  const o = slowOpener();
  const get = openOnce(o.open);

  await get();
  await get();
  await get();

  assert.equal(o.calls(), 1);
});

test('여는 데 실패하면 다음에 다시 시도할 수 있다', async () => {
  let attempts = 0;
  const get = openOnce(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('첫 시도는 실패');
    return { ok: true };
  });

  // 실패한 약속을 들고 있으면 여기서도 같은 오류가 난다. 그러면 앱이 영영 못 쓰게 된다.
  await assert.rejects(() => get(), /첫 시도는 실패/);
  assert.deepEqual(await get(), { ok: true });
  assert.equal(attempts, 2);
});

test('동시에 불렀는데 실패하면 모두 같은 오류를 받는다', async () => {
  let attempts = 0;
  const get = openOnce(async () => {
    attempts += 1;
    await new Promise((r) => setTimeout(r, 5));
    throw new Error('열 수 없음');
  });

  const results = await Promise.allSettled([get(), get(), get()]);

  assert.equal(attempts, 1, '실패할 때도 한 번만 시도해야 한다');
  for (const r of results) assert.equal(r.status, 'rejected');
});
