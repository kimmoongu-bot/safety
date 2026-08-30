import test from 'node:test';
import assert from 'node:assert/strict';
import { holdsLock, shouldLockForIdle, shouldLockOnBackground } from '../src/app/lockPolicy.ts';

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
