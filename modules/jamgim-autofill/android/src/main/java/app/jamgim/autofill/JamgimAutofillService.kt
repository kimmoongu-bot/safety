package app.jamgim.autofill

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.Dataset
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveInfo
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

    /*
      **우리 앱에는 우리가 뜨지 않는다.**

      잠김의 잠금 화면도 비밀번호 칸이라 그냥 두면 거기에도 "잠김" 이 뜬다.
      실기기에서 그랬고, 보시는 분이 바로 이상하다고 하셨다. 맞는 말이다 —
      금고를 여는 자리에 금고가 열쇠를 내밀겠다고 하는 꼴이다.

      쓸모도 없다. 우리 PIN 은 금고 안에 든 것이 아니라 금고를 여는 열쇠다.
      우리가 내놓을 수 있는 것이 애초에 없다.
    */
    if (structure.activityComponent?.packageName == packageName) return null

    val fields = LoginFields.from(structure)

    /*
      로그인 화면처럼 보이지 않으면 손을 들지 않는다.

      이게 없을 때 **카카오톡 대화창에도 "잠김" 이 떴다.** 글자를 넣는 칸이면
      어디든 떴다 — 검색창, 메모장, 주소 칸. 비밀번호 앱이 아무 데나 따라다니는
      것은 거슬리고, 보기에도 나쁘다.

      대신 잃는 것이 있다. 표시를 안 붙인 로그인 화면에서는 이제 안 뜬다.
      `LoginFields.isLoginSignal` 에 무엇을 보는지, 무엇을 못 잡는지 적었다.
    */
    if (!fields.looksLikeLogin) return null

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

    /*
      **잠금은 이 줄 하나에 건다. 응답 전체에 걸지 않는다.**

      처음에는 `FillResponse.setAuthentication(...)` 으로 응답 전체에 걸었다.
      줄은 똑같이 떴고 우리 화면도 똑같이 떴다. 그런데 값을 돌려주면 안드로이드가
      그것을 **버렸다.** 기록에 이렇게 남았다.

          W AutofillSession: invalid index (65535) for authentication id ...

      65535(0xFFFF)는 "줄 번호 없음" 이라는 표시다. 응답 전체에 잠금을 걸면
      돌아온 답이 어느 줄의 것인지가 없고, 안드로이드는 **줄 하나짜리 답(Dataset)
      을 받을 자리가 없어서** 그냥 버린다. 응답 전체에 건 잠금에는 응답(FillResponse)
      으로 답해야 하는데, 그러면 고르는 화면이 한 번 더 뜬다 — 이미 우리 화면에서
      골랐는데 또 고르라는 꼴이다.

      그래서 잠금을 **줄에** 건다. 줄에 걸면 돌아온 답이 그 줄의 것임이 분명해서
      안드로이드가 곧바로 채운다. 비밀번호 앱들이 쓰는 길이 이쪽이다.

      값 자리에는 `null` 을 넣어 둔다. **여기에 진짜 값을 넣으면 안 된다** —
      이 줄은 잠금을 풀기 전에 만들어지고, 잠금 화면을 거치지 않은 사람에게도
      보인다. 채울 칸이 어디인지만 알려 주고, 값은 우리 화면이 답할 때 넘긴다.
    */
    val dataset = Dataset.Builder(row)
      .setAuthentication(pending.intentSender)
      .also { builder -> ids.forEach { builder.setValue(it, null) } }
      .build()

    val response = FillResponse.Builder().addDataset(dataset)

    /*
      **담을지 물어봐 달라고 미리 부탁해 둔다** (docs/자동완성.md 22장).

      담기는 우리가 시작할 수 없다. 안드로이드가 "이 칸이 바뀌었고 화면을
      떠난다" 를 보고 **자기가** 물어본다. 그러려면 채우기를 내놓는 지금
      어느 칸을 지켜볼지 알려 줘야 한다.

      지켜볼 칸은 비밀번호 칸이다. 아이디 칸을 지목하면 아이디만 고치고 나가도
      담을지 묻게 된다.

      안드로이드 9.0(API 28)부터만 건다. 그 아래에서는 담은 값을 우리 화면으로
      넘길 길(`SaveCallback.onSuccess(IntentSender)`)이 없다. 물어만 보고 아무
      일도 안 일어나는 것이 제일 나쁘다.
    */
    val passwordId = fields.passwordId
    if (passwordId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val others = fields.ids.filter { it != passwordId }
      val save = SaveInfo.Builder(
        SaveInfo.SAVE_DATA_TYPE_USERNAME or SaveInfo.SAVE_DATA_TYPE_PASSWORD,
        arrayOf(passwordId),
      )
      if (others.isNotEmpty()) save.setOptionalIds(others.toTypedArray())
      response.setSaveInfo(save.build())
    }

    return response.build()
  }

  /**
   * 다른 앱에서 아이디·비밀번호를 넣고 나갔다. 담을지 물어본다
   * (docs/자동완성.md 22장).
   *
   * **여기서도 금고는 안 연다.** 값을 우리 화면에 넘기고, 잠금을 푼 사용자가
   * 직접 담는다. 채우기와 같은 규칙이다 (명세 5.4).
   *
   * 값은 인텐트에 싣지 않는다. 서비스와 앱이 같은 프로세스라 `SaveHandoff` 에
   * 놓고 화면이 집어 간다.
   */
  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    /*
      여기서 예외가 나면 안드로이드는 "담기 실패" 를 사용자에게 보여 준다.
      우리 잘못을 남의 화면에 띄우지 않는다. 조용히 없던 일로 한다.
    */
    try {
      val structure = request.fillContexts.lastOrNull()?.structure
      if (structure == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
        callback.onSuccess()
        return
      }

      val fields = LoginFields.from(structure, withValues = true)
      if (fields.ids.isEmpty()) {
        callback.onSuccess()
        return
      }

      SaveHandoff.set(fields.values)

      val intent = Intent()
        .setClassName(packageName, FILL_ACTIVITY)
        .putExtra(EXTRA_MODE, MODE_SAVE)
        .putExtra(EXTRA_FIELDS, fields.json)
        .putExtra(EXTRA_ASKING_PACKAGE, structure.activityComponent?.packageName ?: "")
        .putExtra(EXTRA_WEB_DOMAIN, fields.webDomain)

      var flags = PendingIntent.FLAG_CANCEL_CURRENT
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags = flags or PendingIntent.FLAG_MUTABLE
      val pending = PendingIntent.getActivity(this, 2, intent, flags)

      // 안드로이드가 이 화면을 곧바로 띄운다.
      callback.onSuccess(pending.intentSender)
    } catch (e: Throwable) {
      SaveHandoff.clear()
      callback.onSuccess()
    }
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

    /**
     * 이 화면이 채우러 뜬 것인지 담으러 뜬 것인지.
     *
     * 없으면 채우기다 — 채우기가 먼저 있었고, 그 인텐트에는 이 표시가 없다.
     */
    const val EXTRA_MODE = "jamgim.mode"
    const val MODE_SAVE = "save"
    const val EXTRA_IDS = "jamgim.ids"
    const val EXTRA_ASKING_PACKAGE = "jamgim.asking"
    const val EXTRA_WEB_DOMAIN = "jamgim.webDomain"
  }
}
