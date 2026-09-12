package app.jamgim.vault

import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

import app.jamgim.autofill.FillHandoff
import app.jamgim.autofill.SaveHandoff

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
 * 서비스는 이 클래스를 이름으로만 부른다.
 *
 * **모양은 Expo 가 만든 `MainActivity.kt` 를 그대로 따른다 — 딱 두 군데만 빼고.**
 * 리액트를 띄우는 데 필요한 것은 판마다 달라지므로, 우리가 지어내지 않고 그쪽에
 * 맞춘다. Expo 를 올린 뒤 이 화면이 안 뜨면
 * `android/app/src/main/java/.../MainActivity.kt` 를 새로 뽑아서 여기와 견줘 본다.
 *
 * ## `R` 과 `BuildConfig` 는 여기서 쓸 수 없다
 *
 * 그 둘은 **꾸러미 이름**(`namespace`) 아래에 생긴다. 그런데 개발용 빌드는 꾸러미
 * 이름에 `.dev` 를 붙인다(app.config.js). 그러면 생기는 것은
 * `app.jamgim.vault.dev.R` 인데 이 파일은 `app.jamgim.vault` 에 있으니 못 찾는다.
 * 클라우드(배포용 이름)에서는 되고 **내 피시(개발용 이름)에서만 빌드가 깨졌다.**
 * 15분짜리 빌드 하나를 그렇게 버렸다.
 *
 * MainActivity 는 프리빌드가 꾸러미 이름에 맞춰 새로 뽑아 주니 괜찮지만, 이 파일은
 * 우리가 고정된 이름으로 넣어 준다. 그래서 둘 다 안 쓰도록 고쳤다.
 *   - 화면 테마(`R.style.AppTheme`) → 매니페스트의 `android:theme` 로 옮겼다
 *     (`plugins/withJamgimAutofill.js`). 거기서는 aapt 가 이름으로 찾아 주므로
 *     꾸러미 이름과 상관없다. 코드보다 **더 일찍** 정해지기도 한다.
 *   - `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` → Expo 가 SDK 55부터 이 값을
 *     안 쓴다(`ReactActivityDelegateWrapper.kt` 의 주석). 값을 안 받는 생성자가
 *     따로 있어서 그쪽을 쓴다.
 *
 * `tools/kotlin-check.sh` 가 이 파일을 그 둘 없이 컴파일해 본다. 다시 쓰면 거기서
 * 걸린다.
 *
 * 화면 내용은 자바스크립트가 그린다. 리액트 쪽 이름은 `JamgimFill` 이고
 * `index.js` 에 등록되어 있다.
 */
class JamgimFillActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    /*
      **리액트보다 먼저** 이름을 올린다.

      `super.onCreate` 가 리액트 화면을 띄우기 시작한다. 자바스크립트는 뜨자마자
      "지금 요청이 뭐냐" 고 묻는데, 그때 우리를 못 찾으면 "채울 것이 없습니다" 가
      뜬 채로 끝난다. 여기서 먼저 올려 두면 그 경주가 아예 없다.
      자세한 것은 `FillHandoff` 에 적었다.
    */
    FillHandoff.set(this)
    /*
      리액트 네이티브가 되살린 화면 상태를 쓰지 않게 null 을 넘긴다. MainActivity 도
      같은 이유로 이렇게 한다 — 되살린 상태와 새 요청이 섞이면 **예전 요청의 칸
      번호로 채우려 드는** 일이 생긴다.
    */
    super.onCreate(null)
  }

  override fun onDestroy() {
    FillHandoff.clear(this)
    /*
      담기 화면이 들고 있던 글자를 지운다. 사용자가 '담지 않기' 를 누르지 않고
      그냥 앱을 밀어서 닫는 길도 있다 — 그때도 남으면 안 된다 (명세 5.5).
    */
    SaveHandoff.clear()
    super.onDestroy()
  }

  override fun getMainComponentName(): String = "JamgimFill"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled
      ) {}
    )
  }

  /*
    MainActivity 에 있는 `invokeDefaultOnBackPressed` 는 **일부러 가져오지 않았다.**
    그것은 뒤로 가기에서 화면을 닫지 않고 뒤로 보낸다. 여기서 그러면 자동 완성이
    답을 영영 기다린다. 여기서는 닫혀야 하고, 닫히면 '취소' 가 돌아간다.
  */
}
