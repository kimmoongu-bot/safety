package app.jamgim.autofill

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveRequest
import android.widget.RemoteViews
import androidx.annotation.RequiresApi

/**
 * 잠김 자동 완성 서비스 (docs/자동완성.md).
 *
 * **이 클래스는 암호를 하나도 모른다.** 데이터베이스도 열쇠도 만지지 않는다.
 * 그런 코드가 여기 생기면 잘못 든 길이다 — 열쇠 계층 구현이 두 벌이 되고,
 * 잠금 화면을 거치지 않는 두 번째 문이 생긴다 (명세 5.4, 5.5).
 *
 * 하는 일은 둘뿐이다.
 *  1. 로그인 칸을 긁어 모은다 (`LoginFields`)
 *  2. **"잠김" 한 줄만 내놓고**, 누르면 우리 앱 화면이 뜨게 한다
 *
 * 값은 여기서 안 채운다. 사용자가 우리 화면에서 잠금을 풀고 직접 고른 뒤에야
 * 채워진다. 안드로이드는 이것을 '인증(authentication)' 이라고 부른다.
 */
@RequiresApi(Build.VERSION_CODES.O)
class JamgimAutofillService : AutofillService() {

  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback,
  ) {
    val structure = request.fillContexts.lastOrNull()?.structure
    if (structure == null) {
      callback.onSuccess(null)
      return
    }

    val fields = LoginFields.from(structure)
    if (fields.ids.isEmpty()) {
      // 글자 칸이 하나도 없다. 로그인 화면이 아니다.
      callback.onSuccess(null)
      return
    }

    // 어느 앱이 달라고 하는지. 채우기 화면에서 사용자에게 그대로 보여 준다.
    val asking = structure.activityComponent?.packageName ?: ""

    val intent = Intent()
      .setClassName(packageName, FILL_ACTIVITY)
      .putExtra(EXTRA_FIELDS, fields.json)
      .putParcelableArrayListExtra(EXTRA_IDS, ArrayList(fields.ids))
      .putExtra(EXTRA_ASKING_PACKAGE, asking)
      .putExtra(EXTRA_WEB_DOMAIN, fields.webDomain)

    /*
      FLAG_CANCEL_CURRENT: 앞선 요청의 것이 남아 있으면 버린다. 남겨 두면 예전
      화면의 칸 번호로 채우려 들 수 있다.
      FLAG_MUTABLE: 안드로이드가 결과를 담아 돌려주려면 손댈 수 있어야 한다.
    */
    var flags = PendingIntent.FLAG_CANCEL_CURRENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags = flags or PendingIntent.FLAG_MUTABLE
    val pending = PendingIntent.getActivity(this, 1, intent, flags)

    val row = RemoteViews(packageName, R.layout.jamgim_autofill_row).apply {
      // 앱 이름을 그대로 쓴다. 여기 문자열을 따로 두면 4개 언어로 또 관리해야 한다.
      setTextViewText(R.id.jamgim_autofill_row_text, applicationInfo.loadLabel(packageManager))
    }

    val response = FillResponse.Builder()
      .setAuthentication(fields.ids.toTypedArray(), pending.intentSender, row)
      .build()
    callback.onSuccess(response)
  }

  /**
   * 다른 앱에서 새 비밀번호를 만들었을 때 "잠김에 담을까요" 하고 묻는 길.
   * 5단계에서 다룬다. 지금은 담겠다고 한 적이 없으므로 여기로 오지 않는다.
   */
  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    callback.onSuccess()
  }

  companion object {
    /**
     * 채우기 화면. **앱 쪽에 있다.**
     *
     * 이 모듈에서 직접 가리키지 않고 이름으로만 부른다. 리액트 화면을 띄우는
     * 액티비티는 리액트가 딸린 곳에 있어야 하는데, 그건 앱 모듈이다. 여기 두면
     * 리액트를 이 모듈에도 끌어와야 하고, 그러면 액티비티 수명 신호가 지문 확인
     * 같은 것에 제대로 전달되지 않는다.
     */
    const val FILL_ACTIVITY = "app.jamgim.vault.JamgimFillActivity"

    const val EXTRA_FIELDS = "jamgim.fields"
    const val EXTRA_IDS = "jamgim.ids"
    const val EXTRA_ASKING_PACKAGE = "jamgim.asking"
    const val EXTRA_WEB_DOMAIN = "jamgim.webDomain"
  }
}
