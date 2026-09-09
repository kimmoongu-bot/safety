/**
 * 화면 캡처 막기를 **설정대로 맞추는 규칙** (명세 5.5).
 *
 * 네이티브를 부르는 부분은 `platform/screenGuard.ts` 에 있고, 여기에는 판단만 있다.
 * 나눠 둔 이유는 이 규칙이 실기기 없이 확인돼야 하기 때문이다. 실제로 여기서
 * 사람 눈으로는 못 잡을 잘못이 하나 나왔다 — 아래 `applyScreenGuard` 참고.
 */

/**
 * 걸기를 시도한 결과.
 *
 * **말을 만들지 않는다.** 무엇이 잘못됐는지만 돌려주고, 화면에 뭐라고 쓸지는
 * 문장 목록이 정한다. `detail` 은 안드로이드가 뱉은 원문이라 번역 대상이 아니다 —
 * 기기에서만 나는 오류를 쫓을 때 유일한 단서다.
 */
export type GuardResult =
  | { ok: true }
  | { ok: false; why: 'unsupported' }
  | { ok: false; why: 'failed'; detail: string };

export type GuardFailure = Extract<GuardResult, { ok: false }>;

/**
 * 실패한 까닭을 문장 열쇠와 값으로 바꾼다.
 *
 * 화면 두 곳(앱이 뜰 때, 설정 스위치)에서 같은 문장을 써야 해서 여기 모아 둔다.
 */
export function guardFailureMessage(
  result: GuardFailure,
): { key: 'system.guardUnsupported' | 'settings.screenGuardFailed'; params?: { reason: string } } {
  return result.why === 'unsupported'
    ? { key: 'system.guardUnsupported' }
    : { key: 'settings.screenGuardFailed', params: { reason: result.detail } };
}

/** 바깥 세상. 테스트에서는 가짜를 넣는다. */
export type GuardIo = {
  enable(): Promise<GuardResult>;
  disable(): Promise<void>;
  wait(ms: number): Promise<void>;
  /** 화면이 사라졌거나 설정이 또 바뀌었으면 참. 그러면 하던 것을 멈춘다. */
  cancelled(): boolean;
};

/** 걸기가 실패했을 때 다시 해 보는 사이 간격. */
export const RETRY_MS = 400;

/** 몇 번까지 해 보나. 이보다 더 하면 앱이 뜨는 것만 늦어진다. */
export const ATTEMPTS = 3;

/**
 * 설정대로 맞춘다. 실패해서 알려야 할 것이 있으면 돌려주고, 없으면 `null`.
 *
 * **끄는 쪽도 반드시 우리가 한다.** 예전 코드는 설정이 "꺼짐" 이면 여기서 그냥
 * 돌아섰다. 그런데 앱을 켜는 순간에는 저장된 설정을 아직 못 읽어서 기본값(켬)으로
 * 한 번 걸어 둔다. 그러고 나서 "꺼짐" 을 읽으면 — 아무도 그것을 풀지 않았다.
 * 그래서 **설정 화면에는 "꺼짐" 이라고 적혀 있는데 화면은 안 찍히는** 상태가 됐다.
 * 사용자가 껐다 켰다 해야 풀렸다. 화면이 거짓말을 한 셈이다.
 *
 * 거는 쪽은 한 번에 안 될 수 있다. 앱이 막 뜨는 순간에는 안드로이드 화면(액티비티)이
 * 아직 붙기 전이라 실패한다. 그래서 잠깐 쉬었다가 세 번까지 해 본다.
 * 세 번 다 실패하면 조용히 넘어가지 않고 알린다 — 예전에는 실패를 삼켜서, 최근 앱
 * 목록에 비밀번호가 그대로 보이는데도 아무도 몰랐다.
 */
export async function applyScreenGuard(wanted: boolean, io: GuardIo): Promise<GuardFailure | null> {
  if (!wanted) {
    await io.disable();
    return null;
  }

  let last: GuardFailure | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (io.cancelled()) return null;
    if (attempt > 0) await io.wait(RETRY_MS);
    const result = await io.enable();
    if (result.ok) return null;
    last = result;
  }
  // 그만두라는 신호가 왔으면 알리지 않는다. 이미 다른 것이 정하고 있다.
  return io.cancelled() ? null : last;
}
