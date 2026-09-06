import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openOnce, releaseHandle, withReopen } from '../src/data/openOnce.ts';

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

test('열린 뒤 죽은 손잡이는 버리고 다시 열어 살아난다', async () => {
  const d = dyingDatabase();
  const get = openOnce(d.open);

  const got = await withReopen(get, (db) => db.run());

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
    () => withReopen(get, (db) => db.run()),
    /1번째도 죽음/,
    '처음 오류가 진짜 원인이다',
  );
  assert.equal(opened, 2, '다시 여는 것은 한 번뿐이어야 한다 — 계속 하면 화면만 멈춘다');
});

// ── 뒤로 갈 때 먼저 놓기 ────────────────────────────────────────────────────
//
// 다시 열기는 죽은 손잡이를 살려 내지만, 살려 내기 전에 화면 하나가 이미 비어 보인다.
// 그래서 앱이 뒤로 가는 순간 우리가 먼저 놓는다.

function closable() {
  let opened = 0;
  let closed = 0;
  const open = async () => {
    opened += 1;
    return { id: opened, close: async () => { closed += 1; } };
  };
  return { open, opened: () => opened, closed: () => closed };
}

test('놓으면 닫고, 다음에 쓸 때 새로 연다', async () => {
  const c = closable();
  const get = openOnce(c.open);
  const first = await get();

  await releaseHandle(get, (v) => v.close());

  assert.equal(c.closed(), 1, '닫아야 한다');
  assert.equal(get.opened(), false, '놓은 뒤에는 들고 있는 것이 없어야 한다');

  const second = await get();
  assert.equal(c.opened(), 2, '다음에 쓸 때 새로 열려야 한다');
  assert.notEqual(first.id, second.id);
});

test('연 적이 없으면 놓겠다고 열지 않는다', async () => {
  const c = closable();
  const get = openOnce(c.open);

  await releaseHandle(get, (v) => v.close());

  // 여기서 열어 버리면 앱이 뒤로 갈 때마다 쓰지도 않을 데이터베이스가 하나씩 열린다.
  assert.equal(c.opened(), 0, '열지 않아야 한다');
  assert.equal(c.closed(), 0);
});

test('두 번 놓아도 한 번만 닫는다', async () => {
  const c = closable();
  const get = openOnce(c.open);
  await get();

  await releaseHandle(get, (v) => v.close());
  await releaseHandle(get, (v) => v.close());

  assert.equal(c.closed(), 1);
  assert.equal(c.opened(), 1, '놓은 것을 또 놓겠다고 새로 열면 안 된다');
});

test('닫다가 실패해도 놓은 것은 놓은 것이다', async () => {
  // 이미 죽어서 못 닫는 경우가 바로 우리가 고치려는 그 경우다.
  let opened = 0;
  const get = openOnce(async () => {
    opened += 1;
    return { id: opened };
  });
  await get();

  await releaseHandle(get, async () => {
    throw new Error("Call to function 'NativeDatabase.closeAsync' has been rejected.");
  });

  assert.equal(get.opened(), false, '닫기가 실패해도 들고 있으면 안 된다');
  await get();
  assert.equal(opened, 2, '다음에 쓸 때 새로 열려야 한다');
});

test('놓은 뒤에도 질의는 그냥 된다', async () => {
  // 뒤로 갔다 돌아온 뒤 목록을 여는 것이 이 모양이다.
  const c = closable();
  const get = openOnce(c.open);
  await withReopen(get, async (v) => v.id);

  await releaseHandle(get, (v) => v.close());
  const got = await withReopen(get, async (v) => v.id);

  assert.equal(got, 2, '새로 연 것으로 해야 한다');
  assert.equal(c.opened(), 2, '다시 열기까지 갈 필요 없이 한 번만 열려야 한다');
});
