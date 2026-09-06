import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openOnce } from '../src/data/openOnce.ts';

/**
 * 실기기에서 이 오류가 세 번 났다.
 *   Call to function 'NativeDatabase.prepareAsync' has been rejected.
 *   → Caused by: java.lang.NullPointerException
 *
 * 원인은 **한 파일에 손잡이가 두 개 생기는 것**이다. 자세한 것은 `src/data/openOnce.ts`
 * 맨 위에 적었다. 여기서는 그 조건이 다시 생기지 않는 것을 지킨다.
 *
 * 진짜 저장소(`ExpoSqliteRecordStore`)는 `expo-sqlite` 를 불러오는데 노드에서는
 * 불러올 수 없다. 그래서 저장소가 쓰는 함수를 그대로 확인한다 — 베껴 적은 사본이 아니라
 * 앱에서 실제로 도는 그 함수다.
 */

/** 열고 닫는 것을 세는 가짜. 닫힌 것을 또 쓰면 실기기처럼 죽는다. */
function fake() {
  let opened = 0;
  let closed = 0;
  const open = async () => {
    opened += 1;
    const id = opened;
    let dead = false;
    return {
      id,
      kill: () => { dead = true; },
      run: async () => {
        if (dead) {
          throw new Error(
            "Call to function 'NativeDatabase.prepareAsync' has been rejected. " +
              '→ Caused by: java.lang.NullPointerException',
          );
        }
        return id;
      },
    };
  };
  const close = async (v: { id: number }) => {
    closed += 1;
    void v;
  };
  return { open, close, opened: () => opened, closed: () => closed };
}

// ── 한 번만 열기 ────────────────────────────────────────────────────────────

test('동시에 여러 번 써도 한 번만 연다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);

  const got = await Promise.all([h.use((v) => v.run()), h.use((v) => v.run()), h.use((v) => v.run())]);

  // 두 번 열리면 진짜 데이터베이스는 하나인데 손잡이가 둘이 된다. 그것이 그 오류다.
  assert.equal(f.opened(), 1, '동시에 써도 한 번만 열려야 한다');
  assert.deepEqual(got, [1, 1, 1], '셋 다 같은 것을 써야 한다');
});

test('한 번 연 뒤에는 다시 열지 않는다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);

  await h.use((v) => v.run());
  await h.use((v) => v.run());
  await h.use((v) => v.run());

  assert.equal(f.opened(), 1);
  assert.equal(f.closed(), 0, '쓰는 동안 닫으면 안 된다');
});

test('여는 데 실패해도 한 번 더 열어 본다', async () => {
  let attempts = 0;
  let closed = 0;
  const h = openOnce(
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('첫 시도는 실패');
      return { ok: true };
    },
    async () => { closed += 1; },
  );

  assert.deepEqual(await h.use(async (v) => v), { ok: true });
  assert.equal(attempts, 2);
  // 열리지도 않은 것을 닫으려 들면 안 된다. 닫기가 뭘 받는지도 모르는 채로 불린다.
  assert.equal(closed, 0);
});

test('두 번 다 못 열면 처음 오류를 던진다', async () => {
  let attempts = 0;
  const h = openOnce(
    async () => { attempts += 1; throw new Error(`${attempts}번째 열기 실패`); },
    async () => {},
  );

  await assert.rejects(() => h.use(async (v) => v), /1번째 열기 실패/);
  assert.equal(attempts, 2, '계속 열려고 하면 화면만 멈춘다');
});

test('실패한 약속을 들고 있지 않는다', async () => {
  // 들고 있으면 한 번 실패한 뒤로 영영 다시 시도할 수 없다. 앱이 못 쓰게 된다.
  let attempts = 0;
  const h = openOnce(
    async () => {
      attempts += 1;
      if (attempts <= 2) throw new Error('아직 안 됨');
      return { id: attempts };
    },
    async () => {},
  );

  await assert.rejects(() => h.use(async (v) => v));
  assert.deepEqual(await h.use(async (v) => v), { id: 3 }, '다음에 부르면 또 시도해야 한다');
});

test('동시에 열다가 실패하면 열기를 나눠 쓴다', async () => {
  let attempts = 0;
  const h = openOnce(
    async () => {
      attempts += 1;
      await new Promise((r) => setTimeout(r, 5));
      throw new Error('열 수 없음');
    },
    async () => {},
  );

  const results = await Promise.allSettled([
    h.use(async (v) => v), h.use(async (v) => v), h.use(async (v) => v),
  ]);

  for (const r of results) assert.equal(r.status, 'rejected');
  // 셋이 각자 두 번씩 열면 여섯 번이다. 같은 약속을 나눠 쓰므로 두 번이어야 한다.
  assert.equal(attempts, 2, '동시에 부른 것들이 열기를 나눠 써야 한다');
});

// ── 죽은 손잡이 살려 내기 ───────────────────────────────────────────────────

test('죽은 손잡이는 닫고 다시 열어 살아난다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);

  const first = await h.use(async (v) => { v.kill(); return v.id; });
  assert.equal(first, 1);

  const got = await h.use((v) => v.run());

  assert.equal(got, 2, '새로 연 것으로 해내야 한다');
  assert.equal(f.opened(), 2, '한 번 다시 열어야 한다');
});

test('다시 열기 전에 **반드시 닫는다**', async () => {
  // 이것이 이번 고침의 핵심이다.
  // 그냥 버리면, 버려진 손잡이가 쓰레기 수집될 때 새로 연 손잡이가 쓰는
  // 데이터베이스를 닫아 버린다. 지난번 고침이 바로 그 조건을 만들었다.
  const order: string[] = [];
  let opened = 0;
  const h = openOnce(
    async () => {
      opened += 1;
      order.push(`열기${opened}`);
      const id = opened;
      return { id };
    },
    async (v) => { order.push(`닫기${v.id}`); },
  );

  await h.use(async (v) => {
    if (v.id === 1) throw new Error('죽음');
    return v.id;
  });

  assert.deepEqual(order, ['열기1', '닫기1', '열기2'], '닫기가 다시 열기보다 앞이어야 한다');
});

test('다시 해도 안 되면 처음 오류를 그대로 던진다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);

  await assert.rejects(
    () => h.use(async (v) => { throw new Error(`${v.id}번째도 죽음`); }),
    /1번째도 죽음/,
    '처음 오류가 진짜 원인이다',
  );
  assert.equal(f.opened(), 2, '다시 여는 것은 한 번뿐이어야 한다 — 계속 하면 화면만 멈춘다');
});

// ── 뒤로 갈 때 먼저 놓기 ────────────────────────────────────────────────────

test('놓으면 닫고, 다음에 쓸 때 새로 연다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);
  await h.use((v) => v.run());

  await h.release();

  assert.equal(f.closed(), 1, '닫아야 한다');
  assert.equal(h.opened(), false, '놓은 뒤에는 들고 있는 것이 없어야 한다');
  assert.equal(await h.use((v) => v.run()), 2, '다음에 쓸 때 새로 열려야 한다');
});

test('연 적이 없으면 놓겠다고 열지 않는다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);

  await h.release();

  // 여기서 열면 앱이 뒤로 갈 때마다 쓰지도 않을 데이터베이스가 하나씩 열린다.
  assert.equal(f.opened(), 0, '열지 않아야 한다');
  assert.equal(f.closed(), 0);
});

test('두 번 놓아도 한 번만 닫는다', async () => {
  const f = fake();
  const h = openOnce(f.open, f.close);
  await h.use((v) => v.run());

  await h.release();
  await h.release();

  assert.equal(f.closed(), 1);
  assert.equal(f.opened(), 1, '놓은 것을 또 놓겠다고 새로 열면 안 된다');
});

test('닫다가 실패해도 놓은 것은 놓은 것이다', async () => {
  // 이미 죽어서 못 닫는 경우가 바로 우리가 고치려는 그 경우다.
  let opened = 0;
  const h = openOnce(
    async () => { opened += 1; return { id: opened }; },
    async () => { throw new Error("Call to function 'NativeDatabase.closeAsync' has been rejected."); },
  );
  await h.use(async (v) => v.id);

  await h.release();

  assert.equal(h.opened(), false, '닫기가 실패해도 들고 있으면 안 된다');
  assert.equal(await h.use(async (v) => v.id), 2, '다음에 쓸 때 새로 열려야 한다');
});

test('그냥 버리는 길은 아예 없다', async () => {
  // 손잡이를 닫지 않고 버릴 수 있으면 언젠가 누가 그렇게 쓴다. 그리고 그것이
  // 우리를 세 번 물었다. 그래서 내주는 것에 그런 길을 두지 않는다.
  const f = fake();
  const h = openOnce(f.open, f.close);

  assert.deepEqual(Object.keys(h).sort(), ['opened', 'release', 'use']);
});
