package app.jamgim.autofill

import android.app.Activity
import java.lang.ref.WeakReference

/**
 * 채우기 화면을 모듈에 알려 주는 자리.
 *
 * ## 왜 있나
 *
 * 자바스크립트가 "지금 채우기 요청이 뭐냐" 고 물으면, 모듈은 **채우기 액티비티의
 * 인텐트**를 읽어야 답할 수 있다. 문제는 그 액티비티를 어떻게 찾느냐다.
 *
 * 처음에는 `appContext.currentActivity` 를 보고 클래스 이름으로 가렸다.
 * **그런데 그 값은 `onResume` 이 되어야 채워진다.** 리액트 화면은 `onCreate` 에서
 * 뜨기 시작하고, 앱이 이미 떠 있어 따뜻할 때는 자바스크립트가 `onResume` 보다
 * **먼저** 물어본다. 그러면 `null` 이 나오고, 화면에는 "채울 것이 없습니다" 가
 * 뜬 채로 끝난다. 요청은 멀쩡히 와 있는데도 그렇다.
 *
 * 실기기에서 그랬다. 처음 몇 번은 되고 다시 해 보면 안 됐다 — 앱이 식었을 때는
 * 자바스크립트가 느려서 경주에서 졌고, 따뜻할 때는 이겼기 때문이다. 이런 것은
 * "가끔 안 된다" 로 보여서 원인을 찾기가 제일 나쁘다.
 *
 * ## 그래서
 *
 * 액티비티가 **`super.onCreate` 보다 먼저** 스스로 여기 이름을 올린다. 리액트가
 * 뜨기 전이라 경주가 아예 없다. `plugins/android/JamgimFillActivity.kt` 를 보라.
 *
 * 액티비티를 정적 자리에 들고 있으면 샐 수 있으므로 **약한 참조**로 들고,
 * 끝날 때 지운다. 그래도 혹시 남으면 `current()` 가 죽은 것을 걸러 준다.
 */
object FillHandoff {
  private var ref: WeakReference<Activity>? = null

  /** 채우기 화면이 뜬다. */
  fun set(activity: Activity) {
    ref = WeakReference(activity)
  }

  /**
   * 채우기 화면이 끝난다.
   *
   * **자기 것일 때만 지운다.** 새 요청이 와서 다음 화면이 이미 이름을 올린 뒤에
   * 이전 화면이 끝날 수 있다. 그때 무턱대고 지우면 멀쩡한 새 요청이 사라진다.
   */
  fun clear(activity: Activity) {
    if (ref?.get() === activity) ref = null
  }

  /** 지금 살아 있는 채우기 화면. 없으면 `null`. */
  fun current(): Activity? {
    val activity = ref?.get() ?: return null
    return if (activity.isFinishing || activity.isDestroyed) null else activity
  }
}
