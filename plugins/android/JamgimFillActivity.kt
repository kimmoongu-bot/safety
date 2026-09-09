package app.jamgim.vault

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/**
 * 채우기 화면 (docs/자동완성.md 3단계).
 *
 * **왜 화면이 따로 있나.** 자동 완성은 "이 값을 채워라" 를 액티비티 **결과**로
 * 받아 간다. 그런데 Expo 의 MainActivity 는 `singleTask` 라, 결과를 기다리며 띄우면
 * 곧바로 '취소' 로 돌아온다. 결과를 돌려주려면 `standard` 인 액티비티가 따로 있어야
 * 한다.
 *
 * 마침 따로 두는 편이 옳기도 하다. 이 화면에는 **어느 앱이 비밀번호를 달라고
 * 하는지** 를 크게 보여 줘야 하는데, 평소 잠금 화면에는 그 자리가 없다.
 * 가짜 앱을 걸러 내는 것은 결국 사람 눈이다.
 *
 * **왜 여기(앱 모듈)에 있나.** 자동 완성 서비스는 `modules/jamgim-autofill/` 에 있는데
 * 이 액티비티만 앱 쪽에 있다. 리액트 네이티브가 앱 모듈에만 딸려 있기 때문이다.
 * 모듈 쪽으로 옮기면 리액트를 그쪽에도 끌어와야 하고, 그러면 액티비티 수명 신호가
 * Expo 모듈들에 제대로 전달되지 않는다 — 지문 확인이 바로 그것을 쓴다.
 * 서비스는 이 클래스를 이름으로만 부른다.
 *
 * 화면 내용은 자바스크립트가 그린다. 리액트 쪽 이름은 `JamgimFill` 이고
 * `index.js` 에 등록되어 있다.
 */
class JamgimFillActivity : ReactActivity() {
  override fun getMainComponentName(): String = "JamgimFill"

  override fun onCreate(savedInstanceState: Bundle?) {
    /*
      리액트 네이티브가 되살린 화면 상태를 쓰지 않게 null 을 넘긴다.
      MainActivity 도 같은 이유로 이렇게 한다 — 되살린 상태와 새 요청이 섞이면
      **예전 요청의 칸 번호로 채우려 드는** 일이 생긴다.
    */
    super.onCreate(null)
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    ReactActivityDelegateWrapper(
      this,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        DefaultNewArchitectureEntryPoint.fabricEnabled,
      ) {},
    )
}
