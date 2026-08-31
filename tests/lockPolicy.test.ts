import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FALLBACK_AUTO_LOCK_MS,
  holdsLock,
  shouldClearClipboard,
  shouldLockForIdle,
  shouldLockOnBackground,
} from '../src/app/lockPolicy.ts';

const NOW = 1_700_000_000_000;
const base = { unlocked: true, routeName: 'list', systemDialogUntil: 0, now: NOW };

test('평소에는 손을 놓으면 잠근다 (기본 1분)', () => {
  assert.ok(
    shouldLockForIdle({ ...base, lastActivityAt: NOW - 60_000, autoLockMs: 60_000 }),
  );
  assert.ok(
    !shouldLockForIdle({ ...base, lastActivityAt: NOW - 59_000, autoLockMs: 60_000 }),
  );
});

test('백그라운드로 가면 즉시 잠근다 (명세 5.5)', () => {
  assert.ok(shouldLockOnBackground(base));
});

test('최초 설정 화면에서는 잠그지 않는다 — 복구 코드를 적는 중이다', () => {
  const setup = { ...base, routeName: 'setup' };
  assert.ok(holdsLock(setup));
  // 10분을 가만히 있어도 잠기지 않는다. 종이에 옮겨 적는 시간이다.
  assert.ok(!shouldLockForIdle({ ...setup, lastActivityAt: NOW - 600_000, autoLockMs: 60_000 }));
  assert.ok(!shouldLockOnBackground(setup));
});

test('설정이 끝나 금고 화면으로 가면 다시 잠근다', () => {
  const after = { ...base, routeName: 'list' };
  assert.ok(!holdsLock(after));
  assert.ok(shouldLockForIdle({ ...after, lastActivityAt: NOW - 60_000, autoLockMs: 60_000 }));
});

test('파일 고르기·지문 확인 창이 떠 있는 동안은 봐준다 (2분 한도)', () => {
  const dialog = { ...base, systemDialogUntil: NOW + 60_000 };
  assert.ok(!shouldLockOnBackground(dialog));
  assert.ok(!shouldLockForIdle({ ...dialog, lastActivityAt: NOW - 300_000, autoLockMs: 60_000 }));

  // 한도가 지나면 평소대로 잠근다.
  const expired = { ...base, systemDialogUntil: NOW - 1 };
  assert.ok(shouldLockOnBackground(expired));
});

test('자동 잠금 "즉시" 설정이면 손을 놓는 순간 잠근다', () => {
  assert.ok(shouldLockForIdle({ ...base, lastActivityAt: NOW, autoLockMs: 0 }));
});

test('이미 잠겨 있으면 더 할 일이 없다', () => {
  const locked = { ...base, unlocked: false };
  assert.ok(!shouldLockOnBackground(locked));
  assert.ok(!shouldLockForIdle({ ...locked, lastActivityAt: NOW - 600_000, autoLockMs: 60_000 }));
});

test('복사한 내용은 앱을 벗어났다고 지우지 않는다 — 정해진 시간이 되어야 지운다', () => {
  // 붙여넣으려고 복사한 것이다. 카카오톡으로 넘어가는 순간 지우면 붙여넣기가 안 된다.
  const dueAt = NOW + 60_000;
  assert.ok(!shouldClearClipboard({ dueAt, now: NOW }));
  assert.ok(!shouldClearClipboard({ dueAt, now: NOW + 59_999 }));
  assert.ok(shouldClearClipboard({ dueAt, now: NOW + 60_000 }));
  assert.ok(shouldClearClipboard({ dueAt, now: NOW + 120_000 })); // 늦게 돌아와도 지운다
});

test('자동 잠금 시간을 못 읽어도 잠금이 꺼지지 않는다', () => {
  // 숫자가 아니면 비교가 언제나 거짓이 되어 영영 안 잠긴다. 그러면 안 된다.
  for (const broken of [undefined, null, NaN, 'abc']) {
    assert.ok(
      shouldLockForIdle({
        ...base,
        lastActivityAt: NOW - FALLBACK_AUTO_LOCK_MS,
        autoLockMs: broken as unknown as number,
      }),
      `${String(broken)} 일 때 기본값(1분)으로 잠겨야 한다`,
    );
  }
});
