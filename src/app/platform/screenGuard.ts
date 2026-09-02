import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * 화면 보호 (명세 5.5)
 *
 * 안드로이드: `preventScreenCaptureAsync` 가 창에 FLAG_SECURE 를 건다. 이 표시
 * 하나가 화면 찍기와 최근 앱 목록 미리보기를 함께 막는다.
 * iOS: FLAG_SECURE 가 없어서 앱 전환용 가림막을 따로 켜야 한다.
 *
 * 왜 이렇게 번거롭게 짰나:
 *
 * 1) 라이브러리는 이름표(key)를 JS 쪽 집합에 먼저 넣고 그 다음에 네이티브를
 *    부른다. 네이티브가 실패해도 이름표는 남는다. 그래서 한 번 실패하면 같은
 *    이름표로는 두 번 다시 시도되지 않는다 — 조용히, 영원히. 앱이 막 뜨는
 *    순간에는 화면(액티비티)이 아직 없어서 실패할 수 있는데, 하필 그 때가
 *    우리가 처음 거는 시점이다. 그래서 매번 이름표를 떼고 다시 붙인다.
 * 2) 예전에는 실패를 통째로 삼켰다. 그 바람에 최근 앱 목록에 비밀번호가
 *    그대로 보이는데도 아무도 몰랐다. 이제 결과를 돌려주고 화면에 알린다.
 *
 * 이름표를 뗐다 붙이는 잠깐 동안 표시가 풀리지만, 그 순간 앱은 앞에 떠 있다.
 * 최근 앱 목록에 넣을 그림은 앱이 뒤로 갈 때 찍히므로 새어 나갈 틈이 없다.
 */
const GUARD_KEY = 'jamgim';

/**
 * 실패한 까닭.
 *
 * **말을 만들지 않는다.** 무엇이 잘못됐는지만 돌려주고, 화면에 뭐라고 쓸지는
 * 문장 목록이 정한다. `detail` 은 안드로이드가 뱉은 원문이라 번역 대상이 아니다 —
 * 기기에서만 나는 오류를 쫓을 때 유일한 단서다.
 */
export type GuardResult =
  | { ok: true }
  | { ok: false; why: 'unsupported' }
  | { ok: false; why: 'failed'; detail: string };

function describe(e: unknown): string {
  const detail = e instanceof Error ? e.message : String(e ?? '');
  return detail.replace(/\s+/g, ' ').trim().slice(0, 90);
}

/**
 * 실패한 까닭을 문장 열쇠와 값으로 바꾼다.
 *
 * 화면 두 곳(앱이 뜰 때, 설정 스위치)에서 같은 문장을 써야 해서 여기 모아 둔다.
 */
export function guardFailureMessage(
  result: Extract<GuardResult, { ok: false }>,
): { key: 'system.guardUnsupported' | 'settings.screenGuardFailed'; params?: { reason: string } } {
  return result.why === 'unsupported'
    ? { key: 'system.guardUnsupported' }
    : { key: 'settings.screenGuardFailed', params: { reason: result.detail } };
}

export async function enableScreenGuard(): Promise<GuardResult> {
  try {
    if (!(await ScreenCapture.isAvailableAsync())) {
      return { ok: false, why: 'unsupported' };
    }
    // 남아 있을지 모를 이름표부터 뗀다. 위 1) 참고.
    try {
      await ScreenCapture.allowScreenCaptureAsync(GUARD_KEY);
    } catch {
      // 뗄 것이 없었을 뿐이다.
    }
    await ScreenCapture.preventScreenCaptureAsync(GUARD_KEY);
    if (Platform.OS === 'ios') {
      // 아이폰은 앱 전환 화면 가림막이 따로다.
      await ScreenCapture.enableAppSwitcherProtectionAsync();
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, why: 'failed', detail: describe(e) };
  }
}

export async function disableScreenGuard(): Promise<void> {
  try {
    await ScreenCapture.allowScreenCaptureAsync(GUARD_KEY);
    if (Platform.OS === 'ios') await ScreenCapture.disableAppSwitcherProtectionAsync();
  } catch {
    // 끄는 데 실패해도 더 안전한 쪽(켜진 채)으로 남을 뿐이다.
  }
}

/** 아이폰은 앱이 잠깐 비활성일 때 덮을 가림 뷰가 하나 더 필요하다. */
export const needsPrivacyShield = Platform.OS === 'ios';
