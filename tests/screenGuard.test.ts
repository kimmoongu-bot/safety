import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTEMPTS,
  type GuardIo,
  type GuardResult,
  applyScreenGuard,
  guardFailureMessage,
} from '../src/app/screenGuardPolicy.ts';
import { oneAtATime } from '../src/app/platform/oneAtATime.ts';

/**
 * 화면 캡처 막기 (명세 5.5).
 *
 * 실기기에서 이런 일이 있었다. 설정에서 "꺼짐" 으로 바꾸면 캡처가 됐는데, 하루 지나
 * 앱을 다시 켜니 **설정 화면은 여전히 "꺼짐" 인데 캡처가 안 됐다.** 껐다 켜야 풀렸다.
 * 화면이 거짓말을 하고 있었다.
 */

function io(over: Partial<GuardIo> = {}): GuardIo & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    enable: async () => { log.push('켜기'); return { ok: true } as GuardResult; },
    disable: async () => { log.push('끄기'); },
    wait: async (ms) => { log.push(`쉬기${ms}`); },
    cancelled: () => false,
    ...over,
  };
}

test('설정이 켬이면 건다', async () => {
  const bag = io();
  assert.equal(await applyScreenGuard(true, bag), null);
  assert.deepEqual(bag.log, ['켜기']);
});

test('설정이 꺼짐이면 **끈다** — 가만히 있지 않는다', async () => {
  // 이것이 그 버그다. 예전에는 꺼짐이면 아무것도 하지 않고 돌아섰다.
  // 그런데 앱이 켜질 때 설정을 읽기 전에 기본값(켬)으로 이미 한 번 걸어 둔다.
  // 아무도 그것을 풀지 않으니, 화면에는 꺼짐인데 캡처는 계속 막힌 채였다.
  const bag = io();
  assert.equal(await applyScreenGuard(false, bag), null);
  assert.deepEqual(bag.log, ['끄기'], '끄기를 불러야 한다');
});

test('앱을 켜서 기본값으로 걸었다가 저장된 꺼짐을 읽으면, 결국 꺼진 채로 끝난다', async () => {
  // 실기기에서 하루 지나 벌어진 그 순서를 그대로 돌린다.
  const bag = io();
  await applyScreenGuard(true, bag);   // ① 설정을 읽기 전, 기본값은 켬
  await applyScreenGuard(false, bag);  // ② 저장된 값은 꺼짐

  assert.deepEqual(bag.log, ['켜기', '끄기']);
  assert.equal(bag.log[bag.log.length - 1], '끄기', '마지막이 끄기여야 한다');
});

test('걸기가 실패하면 쉬었다가 세 번까지 해 본다', async () => {
  // 앱이 막 뜨는 순간에는 안드로이드 화면이 아직 붙기 전이라 실패한다.
  let tries = 0;
  const bag = io({
    enable: async () => {
      tries += 1;
      return tries < 3 ? { ok: false, why: 'failed', detail: 'no window' } : { ok: true };
    },
  });

  assert.equal(await applyScreenGuard(true, bag), null, '결국 됐으면 알릴 것이 없다');
  assert.equal(tries, 3);
});

test('세 번 다 실패하면 조용히 넘어가지 않고 알린다', async () => {
  // 예전에는 실패를 삼켰다. 그 바람에 최근 앱 목록에 비밀번호가 그대로 보이는데도
  // 아무도 몰랐다.
  let tries = 0;
  const bag = io({
    enable: async () => { tries += 1; return { ok: false, why: 'failed', detail: `${tries}번째 실패` }; },
  });

  const failure = await applyScreenGuard(true, bag);

  assert.equal(tries, ATTEMPTS);
  assert.deepEqual(failure, { ok: false, why: 'failed', detail: '3번째 실패' });
  assert.deepEqual(guardFailureMessage(failure!), {
    key: 'settings.screenGuardFailed',
    params: { reason: '3번째 실패' },
  });
});

test('안 되는 기기라고 하면 그 문장으로 알린다', async () => {
  const bag = io({ enable: async () => ({ ok: false, why: 'unsupported' }) });
  const failure = await applyScreenGuard(true, bag);
  assert.deepEqual(guardFailureMessage(failure!), { key: 'system.guardUnsupported' });
});

test('그만두라는 신호가 오면 더 해 보지도, 알리지도 않는다', async () => {
  // 설정이 또 바뀌었거나 화면이 사라진 것이다. 이미 다른 것이 정하고 있다.
  let tries = 0;
  const bag = io({
    enable: async () => { tries += 1; return { ok: false, why: 'failed', detail: '실패' }; },
    cancelled: () => tries >= 1,
  });

  assert.equal(await applyScreenGuard(true, bag), null, '지나간 일로 사용자를 놀래지 않는다');
  assert.equal(tries, 1);
});

// ── 켜기와 끄기가 서로를 앞지르지 않게 ──────────────────────────────────────

test('시킨 순서대로 끝난다', async () => {
  const queue = oneAtATime();
  const log: string[] = [];
  const job = (name: string, ms: number) => queue(async () => {
    await new Promise((r) => setTimeout(r, ms));
    log.push(name);
  });

  // 켜기가 느리고 끄기가 빠른 경우. 줄을 세우지 않으면 끄기가 먼저 끝나 버리고,
  // 뒤늦게 도착한 켜기가 이긴다 — 설정은 꺼짐인데 캡처는 막힌 그 상태다.
  await Promise.all([job('켜기', 30), job('끄기', 1)]);

  assert.deepEqual(log, ['켜기', '끄기'], '마지막에 시킨 것이 마지막에 끝나야 한다');
});

test('앞의 것이 실패해도 줄은 계속 간다', async () => {
  const queue = oneAtATime();
  const log: string[] = [];

  const failed = queue(async () => { throw new Error('첫 번째 실패'); });
  const after = queue(async () => { log.push('두 번째'); });

  await assert.rejects(() => failed, /첫 번째 실패/);
  await after;
  assert.deepEqual(log, ['두 번째']);
});

test('줄을 선 것도 제 결과를 그대로 받는다', async () => {
  const queue = oneAtATime();
  const [a, b] = await Promise.all([queue(async () => 1), queue(async () => 2)]);
  assert.equal(a, 1);
  assert.equal(b, 2);
});
