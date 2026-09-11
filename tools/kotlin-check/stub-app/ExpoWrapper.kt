package expo.modules

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

/**
 * `ReactActivityDelegateWrapper` 대역 (`tools/kotlin-check.sh`).
 *
 * 진짜는 `node_modules/expo/android/src/main/java/expo/modules/` 에 **소스로만**
 * 있다. 그것을 그대로 컴파일하려면 expo 안쪽을 거의 다 끌어와야 해서 대역을 쓴다.
 *
 * **대역은 거짓말을 할 수 있다.** 여기 있는 생성자가 진짜에는 없어도 검사는
 * 통과한다. 그래서 `tests/hygiene.test.ts` 가 진짜 파일을 읽어서 우리가 쓰는
 * 생성자가 정말 있는지 따로 확인한다. 둘이 짝이다 — 한쪽만 두면 안 된다.
 *
 * 모양은 진짜를 그대로 옮겼다(Expo SDK 57).
 */
class ReactActivityDelegateWrapper(
  activity: ReactActivity,
  isNewArchitectureEnabled: Boolean,
  delegate: ReactActivityDelegate,
) : ReactActivityDelegate(activity, null) {
  constructor(activity: ReactActivity, delegate: ReactActivityDelegate) :
    this(activity, false, delegate)
}
