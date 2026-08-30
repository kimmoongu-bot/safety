/**
 * 언제 잠글지 정하는 규칙 (명세 5.5).
 *
 * 화면 코드에서 떼어 놓았다. 여기서 실수하면 사용자가 금고를 잃거나(너무 안 잠김)
 * 복구 코드를 잃는다(엉뚱한 때 잠김). 그래서 순수 함수로 두고 테스트를 붙였다.
 */
export type LockContext = {
  /** 금고가 열려 있는가. 잠겨 있으면 더 잠글 것이 없다. */
  unlocked: boolean;
  /** 지금 보고 있는 화면 이름. */
  routeName: string;
  /** 이 시각까지는 시스템 창(파일 고르기·지문 확인)이 떠 있는 것으로 본다. */
  systemDialogUntil: number;
  now: number;
};

/**
 * 지금은 잠그면 안 되는 상황인가.
 *
 * 1. 최초 설정 화면 — 사용자가 복구 코드를 종이에 옮겨 적는 동안에는 화면을
 *    만지지 않는다. 그때 잠기면 화면이 초기화되면서 복구 코드가 눈앞에서
 *    사라진다. 가만히 있어야 하는 화면에서 가만히 있었다고 잠그는 셈이다.
 *    이 동안 열려 있는 것은 방금 만든 빈 금고라 잃을 내용도 아직 없다.
 * 2. 사용자가 방금 연 시스템 창 — 파일 고르기 창이 앱을 밀어내는 동안 잠기면
 *    백업 되살리기를 끝낼 수 없다. 2분까지만 봐준다.
 */
export function holdsLock(ctx: LockContext): boolean {
  if (ctx.routeName === 'setup') return true;
  return ctx.now < ctx.systemDialogUntil;
}

/** 앱이 백그라운드로 갈 때 잠글 것인가. */
export function shouldLockOnBackground(ctx: LockContext): boolean {
  if (!ctx.unlocked) return false;
  return !holdsLock(ctx);
}

/** 자동 잠금 시간을 못 읽었을 때 쓸 값. 명세 5.5 의 기본값과 같다. */
export const FALLBACK_AUTO_LOCK_MS = 60_000;

/**
 * 손을 놓고 있어서 잠글 때가 되었는가.
 *
 * autoLockMs 가 숫자가 아니면(설정을 못 읽었거나 예전 형식이면) 비교가 언제나
 * 거짓이 되어 **영영 잠기지 않는다.** 잠금 장치가 조용히 꺼지는 셈이라, 그런
 * 값이 들어오면 기본값으로 되돌린다.
 */
export function shouldLockForIdle(
  ctx: LockContext & { lastActivityAt: number; autoLockMs: number },
): boolean {
  if (!ctx.unlocked) return false;
  if (holdsLock(ctx)) return false;
  const limit = Number.isFinite(ctx.autoLockMs) && ctx.autoLockMs >= 0
    ? ctx.autoLockMs
    : FALLBACK_AUTO_LOCK_MS;
  return ctx.now - ctx.lastActivityAt >= limit;
}

/**
 * 복사한 내용을 지울 때가 되었는가 (명세 5.5).
 *
 * 앱을 벗어났다고 지우지 않는다. 비밀번호를 복사하는 이유가 다른 앱에 붙여넣기
 * 위해서다. 정해진 시간이 지났을 때에만 지운다.
 */
export function shouldClearClipboard(input: { dueAt: number; now: number }): boolean {
  return input.now >= input.dueAt;
}
