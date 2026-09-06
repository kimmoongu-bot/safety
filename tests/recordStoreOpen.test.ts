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

// ── 열린 뒤에 죽는 경우 ──────────────────────────────────────────────────────
//
// 위의 고침은 '여는 데 실패했을 때' 만 손잡이를 버렸다. 열기는 성공했는데 그 뒤에
// 죽으면 — 안드로이드가 앱을 뒤로 보내면서 정리하는 경우가 있다 — 죽은 것을 계속
// 붙들고 있어서 앱을 껐다 켜기 전까지 영영 안 된다.

test('버리면 다음에 다시 연다', async () => {
  const o = slowOpener();
  const get = openOnce(o.open);

  const first = await get();
  await get();
  assert.equal(o.calls(), 1, '버리기 전에는 한 번만 열려야 한다');

  get.reset();
  const second = await get();

  assert.equal(o.calls(), 2, '버린 뒤에는 다시 열려야 한다');
  assert.notEqual(first.id, second.id, '새로 연 것이어야 한다');
});

test('버려도 동시에 부르면 한 번만 다시 연다', async () => {
  const o = slowOpener();
  const get = openOnce(o.open);
  await get();

  get.reset();
  const got = await Promise.all([get(), get(), get()]);

  assert.equal(o.calls(), 2, '다시 여는 것도 한 번뿐이어야 한다');
  assert.equal(new Set(got.map((g) => g.id)).size, 1, '셋 다 같은 것을 받아야 한다');
});

/**
 * 실기기에서 난 그대로를 흉내 낸다. 열기는 되는데, 한 번 연 손잡이가 죽어서
 * 질의가 죽는다. 다시 열면 살아난다.
 */
function dyingDatabase() {
  let opened = 0;
  const open = async () => {
    opened += 1;
    const generation = opened;
    return {
      generation,
      // 첫 번째로 연 것은 죽어 있다. 두 번째부터는 멀쩡하다.
      run: async () => {
        if (generation === 1) {
          throw new Error(
            "Call to function 'NativeDatabase.prepareAsync' has been rejected. " +
              '→ Caused by: java.lang.NullPointerException',
          );
        }
        return '됐다';
      },
    };
  };
  return { open, opened: () => opened };
}

/** 저장소가 하는 것과 같은 모양. 실패하면 한 번만 다시 열어 본다. */
async function queryWithRetry<T, R>(
  get: ReturnType<typeof openOnce<T>>,
  work: (db: T) => Promise<R>,
): Promise<R> {
  try {
    return await work(await get());
  } catch (first) {
    get.reset();
    try {
      return await work(await get());
    } catch {
      throw first;
    }
  }
}

test('열린 뒤 죽은 손잡이는 버리고 다시 열어 살아난다', async () => {
  const d = dyingDatabase();
  const get = openOnce(d.open);

  const got = await queryWithRetry(get, (db) => db.run());

  assert.equal(got, '됐다');
  assert.equal(d.opened(), 2, '한 번 다시 열어야 한다');
});

test('다시 열어도 안 되면 처음 오류를 그대로 던진다', async () => {
  // 계속 죽는 경우. 진짜 고장을 감추면 안 된다.
  let opened = 0;
  const get = openOnce(async () => {
    opened += 1;
    return { run: async () => { throw new Error(`${opened}번째도 죽음`); } };
  });

  await assert.rejects(
    () => queryWithRetry(get, (db) => db.run()),
    /1번째도 죽음/,
    '처음 오류가 진짜 원인이다',
  );
  assert.equal(opened, 2, '다시 여는 것은 한 번뿐이어야 한다 — 계속 하면 화면만 멈춘다');
});
