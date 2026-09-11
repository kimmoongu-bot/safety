package app.jamgim.autofill

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.service.autofill.Dataset
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

/**
 * 자동 완성에 대해 앱 화면이 물어보고 답하는 길.
 *
 * 여기에도 금고 이야기는 없다. 요청 내용을 화면에 건네주고, 화면이 고른 답을
 * 안드로이드에 돌려주는 것뿐이다.
 *
 * **우리가 자동 완성을 몰래 켤 수 없다.** 안드로이드는 사용자가 직접 고르게 한다.
 * 우리는 그 설정 화면을 열어 주기만 한다. 그게 맞다 — 비밀번호를 다른 앱에
 * 건네는 일이다.
 *
 * **주고받는 것은 전부 글(JSON)이다.** 지도(Map)나 기록(Record)으로 주고받으면
 * 네이티브 경계에서 모양이 맞는지가 빌드 때까지 드러나지 않는다. 글 하나면
 * 틀릴 구석이 없고, 어차피 자바스크립트에서 한 번 풀어야 한다.
 */
class JamgimAutofillModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun manager(): AutofillManager? {
    // 안드로이드 8.0 아래에는 이 얼개 자체가 없다. 7.0 기기에서는 없는 기능이 된다.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    return context.getSystemService(AutofillManager::class.java)
  }

  override fun definition() = ModuleDefinition {
    Name("JamgimAutofill")

    /** 이 기기가 자동 완성을 할 줄 아는가. 안드로이드 8.0 미만이면 거짓이다. */
    Function("isSupported") {
      manager()?.isAutofillSupported == true
    }

    /** 지금 **잠김이** 자동 완성 앱으로 뽑혀 있는가. 남의 앱이 뽑혀 있으면 거짓이다. */
    Function("isEnabled") {
      manager()?.hasEnabledAutofillServices() == true
    }

    /**
     * 자동 완성 앱을 고르는 설정 화면을 연다. 열렸으면 참.
     *
     * 기기에 따라 이 화면이 아예 없을 수 있다 (제조사가 뺀 경우).
     * 그때 앱이 죽으면 안 된다.
     */
    Function("openSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE)
        .setData(Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
        true
      } catch (e: Throwable) {
        false
      }
    }

    /**
     * 지금 채우기 요청이 있으면 그 내용을 글로 준다. 없으면 `null`.
     *
     * 채우기 화면이 떴을 때만 값이 있다. 평소 화면에서 부르면 `null` 이다.
     */
    Function("getRequest") {
      val intent = fillActivity()?.intent ?: return@Function null
      val fields = intent.getStringExtra(JamgimAutofillService.EXTRA_FIELDS)
        ?: return@Function null
      val asking = intent.getStringExtra(JamgimAutofillService.EXTRA_ASKING_PACKAGE) ?: ""
      JSONObject().apply {
        put("fields", fields)
        put("askingPackage", asking)
        put("webDomain", intent.getStringExtra(JamgimAutofillService.EXTRA_WEB_DOMAIN) ?: JSONObject.NULL)
        // 사람이 읽을 앱 이름. 꾸러미 이름만 보여 주면 아무도 못 알아본다.
        put("askingLabel", appLabel(asking) ?: JSONObject.NULL)
      }.toString()
    }

    /**
     * 고른 값을 안드로이드에 돌려준다 (docs/자동완성.md 4단계).
     *
     * 받는 것은 글(JSON) 하나다.
     *   { "usernameIndex": 0, "passwordIndex": 1, "username": "...", "password": "..." }
     * 자리 번호는 `getRequest` 로 넘긴 칸 목록의 자리다. `-1` 이면 그 칸은 안 채운다.
     *
     * **여기서 처음으로 진짜 비밀번호가 이 파일을 지나간다.** 로그를 남기지 않는다
     * (명세 5.5). 값은 안드로이드에 넘기는 즉시 우리 손을 떠난다.
     */
    Function("respond") { payload: String ->
      val activity = fillActivity() ?: return@Function false
      val ids: List<AutofillId> = readIds(activity.intent) ?: return@Function false

      val json = JSONObject(payload)
      val builder = Dataset.Builder()
      var filled = 0

      /*
        값을 하나 넣을 때마다 그 칸에 보여 줄 그림도 같이 줘야 한다. 실제로는
        사용자에게 보이지 않는다 — 우리는 이미 고르는 화면을 지나왔고, 안드로이드는
        곧바로 채운다. 그래도 없으면 안 받아 준다.
      */
      fun put(indexKey: String, valueKey: String) {
        val index = json.optInt(indexKey, -1)
        if (index < 0 || index >= ids.size) return
        val text = json.optString(valueKey, "")
        if (text.isEmpty()) return
        val blank = RemoteViews(context.packageName, R.layout.jamgim_autofill_row)
        builder.setValue(ids[index], AutofillValue.forText(text), blank)
        filled += 1
      }

      put("usernameIndex", "username")
      put("passwordIndex", "password")
      if (filled == 0) return@Function false

      val reply = Intent().putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, builder.build())
      // 화면을 닫는 일은 반드시 주 실행 줄에서. 여기는 자바스크립트 줄이다.
      activity.runOnUiThread {
        activity.setResult(Activity.RESULT_OK, reply)
        activity.finish()
      }
      true
    }

    /** 채우지 않고 닫는다. 사용자가 "닫기" 나 뒤로 가기를 눌렀을 때. */
    Function("cancelFill") {
      val activity = fillActivity() ?: return@Function false
      // 화면을 닫는 일은 반드시 주 실행 줄에서. 여기는 자바스크립트 줄이다.
      activity.runOnUiThread {
        activity.setResult(Activity.RESULT_CANCELED)
        activity.finish()
      }
      true
    }
  }

  /**
   * 지금 떠 있는 채우기 화면.
   *
   * **`appContext.currentActivity` 를 안 쓴다.** 그 값은 `onResume` 이 되어야
   * 채워지는데, 자바스크립트가 그보다 먼저 물어볼 수 있다. 그러면 요청이 멀쩡히
   * 와 있는데도 "채울 것이 없습니다" 가 뜬다. 실기기에서 그랬다.
   * 자세한 것은 `FillHandoff` 에 적었다.
   *
   * 이름도 한 번 더 본다. 여기 오르는 것은 채우기 화면뿐이지만, 본 화면에서
   * 실수로 `cancelFill` 이 불리면 앱이 닫혀 버린다. 값싼 확인이다.
   */
  private fun fillActivity(): Activity? {
    val activity = FillHandoff.current() ?: return null
    return if (activity.javaClass.name == JamgimAutofillService.FILL_ACTIVITY) activity else null
  }

  /**
   * 서비스가 넘겨 준 칸 목록을 꺼낸다.
   *
   * 안드로이드 13 에서 꺼내는 방법이 바뀌었다. 옛 방법은 그 아래에서만 쓴다.
   */
  @Suppress("DEPRECATION")
  private fun readIds(intent: Intent): List<AutofillId>? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableArrayListExtra(JamgimAutofillService.EXTRA_IDS, AutofillId::class.java)
    } else {
      // 갈래를 적어 준다. 옛 방법은 무엇을 꺼내는지 스스로 모른다.
      intent.getParcelableArrayListExtra<AutofillId>(JamgimAutofillService.EXTRA_IDS)
    }

  /** 꾸러미 이름을 사람이 읽을 앱 이름으로. 못 찾으면 `null` — 지어내지 않는다. */
  private fun appLabel(packageName: String?): String? {
    if (packageName.isNullOrEmpty()) return null
    return try {
      val pm = context.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: Throwable) {
      null
    }
  }
}
