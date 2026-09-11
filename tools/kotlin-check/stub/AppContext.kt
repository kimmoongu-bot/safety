/*
  Expo 모듈 API 대역 (docs/자동완성.md 10장).

  **왜 있나.** `JamgimAutofillModule.kt` 는 expo-modules-core 에 기대는데 그것이
  Maven 에 없어서 개발 기기에서 컴파일해 볼 수 없었다. 그 사이에 이 파일이 두 번
  빌드를 태웠고, 두 번째는 `packageName` 을 그냥 쓴 것이었다 — 서비스에서는 되지만
  모듈에는 그런 것이 없다. 대역이 있었으면 몇 초 만에 잡혔다.

  **있는 것만 적는다.** 대역이 진짜보다 너그러우면 오류를 놓치고, 그것이 대역의
  유일한 위험이다. 여기 서명은 전부
  `node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/` 에서
  그대로 옮겼다. 없는 편의 기능을 지어내지 않는다 — 특히 `Module` 에는
  `appContext` 말고 아무것도 넣지 않는다.

  **통과해도 진짜 빌드가 된다는 뜻은 아니다.** 여기 안 적은 것을 쓰면 "없는 것을
  쓴다" 고 잘못 걸리고, 진짜에만 있는 규칙은 여기서 안 걸린다. Expo 를 올릴 때는
  위 경로의 원본과 견줘 보고 고친다.
*/
package expo.modules.kotlin

import android.app.Activity
import android.content.Context

class AppContext {
  val reactContext: Context? get() = null
  val currentActivity: Activity? get() = null
}
