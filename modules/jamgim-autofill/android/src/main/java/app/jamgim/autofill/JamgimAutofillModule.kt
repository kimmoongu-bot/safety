package app.jamgim.autofill

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.autofill.AutofillManager
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
   * 지금 화면이 채우기 화면인가.
   *
   * 이름으로 확인한다. 본 화면에서 실수로 `cancelFill` 을 부르면 앱이 닫혀 버린다.
   */
  private fun fillActivity(): Activity? {
    val activity = appContext.currentActivity ?: return null
    return if (activity.javaClass.name == JamgimAutofillService.FILL_ACTIVITY) activity else null
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
