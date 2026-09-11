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
/*
  androidx 의 `@RequiresApi` 를 쓰지 않는다. Expo 모듈에는 androidx.annotation 이
  딸려 오지 않는다. 안드로이드 8.0 아래에서는 시스템이 이 서비스를 아예 찾지
  않으므로 이 클래스가 불릴 일도 없다.
*/
class JamgimAutofillService : AutofillService() {

  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback,
  ) {
    /*
      **무슨 일이 있어도 답은 한다.**

      여기서 예외가 나면 콜백이 안 불리고, 안드로이드는 우리가 답할 때까지 기다리다
      만다. 사용자에게는 그냥 아무것도 안 뜨는 것으로 보인다 — 고장인지 원래 그런지
      알 길이 없다. 그래서 통째로 감싸고, 잘못되면 "내놓을 것 없음" 으로 답한다.

      로그를 남기지 않는다 (명세 5.5). 여기에는 다른 앱의 화면 내용이 들어온다.
    */
    try {
      callback.onSuccess(buildResponse(request))
    } catch (e: Throwable) {
      callback.onSuccess(null)
    }
  }

  private fun buildResponse(request: FillRequest): FillResponse? {
    val structure = request.fillContexts.lastOrNull()?.structure ?: return null
    val fields = LoginFields.from(structure)

    /*
      글자 칸을 못 찾았으면 화면에 있는 칸 전부로 물러선다.

      안드로이드가 "이건 글자 칸이다" 라고 말해 주지 않는 앱이 있다 — 직접 그린
      화면이나 오래된 앱이 그렇다. 그때 우리가 아무것도 안 내놓으면 사용자에게는
      자동 완성이 고장 난 것으로 보인다. 어느 칸에 채울지는 우리 화면에서 정한다.
    */
    val ids = if (fields.ids.isNotEmpty()) fields.ids else fields.anyIds
    if (ids.isEmpty()) return null // 채울 자리가 정말 하나도 없다

    // 어느 앱이 달라고 하는지. 채우기 화면에서 사용자에게 그대로 보여 준다.
    val asking = structure.activityComponent?.packageName ?: ""

    val intent = Intent()
      .setClassName(packageName, FILL_ACTIVITY)
      .putExtra(EXTRA_FIELDS, fields.json)
      /*
        **자바스크립트에 넘긴 칸 목록과 자리 번호가 같아야 한다.**
        화면에서 "두 번째 칸에 비밀번호" 라고 답하면 여기 두 번째가 그 칸이어야 한다.
        아래 `ids` 는 우리 줄을 어디에 띄울지 정하는 것이라 더 넓을 수 있다 —
        섞으면 엉뚱한 칸에 비밀번호를 넣는다.
      */
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

    return FillResponse.Builder()
      .setAuthentication(ids.toTypedArray(), pending.intentSender, row)
      .build()
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
