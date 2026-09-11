package app.jamgim.autofill

import android.app.assist.AssistStructure
import android.text.InputType
import android.view.View
import android.view.autofill.AutofillId
import org.json.JSONArray
import org.json.JSONObject

/**
 * 화면에서 글자를 넣을 수 있는 칸들을 긁어 온다 (docs/자동완성.md 2단계).
 *
 * **여기서는 판단하지 않는다.** 어느 칸이 아이디이고 어느 칸이 비밀번호인지는
 * 자바스크립트가 정한다 (`src/core/autofill.ts`). 그쪽은 순수 함수라 노드에서
 * 검사할 수 있고, 여기는 실기기에서만 확인된다. 확인할 수 있는 쪽에 판단을 둔다.
 *
 * 그래서 이 파일은 **단서를 모으기만** 한다.
 */
/*
  androidx 의 `@RequiresApi` 를 쓰지 않는다. Expo 모듈에는 androidx.annotation 이
  딸려 오지 않아서 컴파일이 안 된다 (`expo-module-gradle-plugin` 이 넣어 주는 것은
  expo-modules-core 와 코틀린 표준 라이브러리뿐이다). 표시를 붙이는 대신, 이것을
  부르기 전에 안드로이드 판을 확인하는 것은 `JamgimAutofillModule` 이 한다.
*/
class LoginFields private constructor(
  /** 자바스크립트에 넘길 단서. 자리 번호가 아래 `ids` 의 자리와 같다. */
  val json: String,
  /** 안드로이드에 값을 돌려줄 때 쓸 칸 번호. 자바스크립트에는 넘기지 않는다. */
  val ids: List<AutofillId>,
  /**
   * 화면에 있는 **모든** 칸 번호.
   *
   * 위 `ids` 는 안드로이드가 "글자 칸" 이라고 말해 준 것만 담는다. 그런데 그렇게
   * 말해 주지 않는 앱이 있다 — 직접 그린 화면이나 오래된 앱이 그렇다. 그럴 때
   * 우리가 아무것도 안 내놓으면 사용자에게는 자동 완성이 고장 난 것으로 보인다.
   * 그래서 하나도 못 찾았을 때 이것으로 물러선다.
   */
  val anyIds: List<AutofillId>,
  /** 웹이면 주소. 브라우저 안에서는 꾸러미 이름이 브라우저라 이것이 있어야 한다. */
  val webDomain: String?,
  /**
   * 이 화면이 **로그인 화면처럼 보이나.**
   *
   * 아니면 아무것도 내놓지 않는다. 처음에는 칸이 하나라도 있으면 무조건 손을
   * 들었는데, 그랬더니 **카카오톡 대화창에도 "잠김" 이 떴다.** 검색창, 메모장,
   * 주소 입력 칸 — 글자를 넣는 곳이면 어디든 떴다. 거슬리기도 하지만, 비밀번호
   * 앱이 아무 데나 따라다니는 것은 보기에도 나쁘다.
   *
   * 판단은 **앱이 스스로 밝힌 것만** 본다. 아래 `isLoginSignal` 에 무엇을 보는지
   * 적었다.
   */
  val looksLikeLogin: Boolean,
) {
  companion object {
    /*
      로그인 화면이라는 표시.

      **말(낱말)은 여기서 안 본다.** "비밀번호" 같은 낱말로 찾고 싶어지지만, 낱말
      목록은 `src/app/i18n/autofillWords.ts` 한 곳에만 둔다는 규칙이 있다. 여기에
      또 두면 일본어·러시아어를 더할 때 손댈 곳이 두 군데가 되고, 한쪽만 고치는
      날이 온다. 그리고 이쪽은 실기기가 아니면 확인할 방법도 없다.

      그래서 구조만 본다. 안드로이드가 정해 둔 이름들이라 말과 상관없다.
    */
    private val LOGIN_HINTS = setOf(
      // 비밀번호 칸. 로그인 화면이라는 가장 확실한 표시다.
      "password", "newPassword",
      /*
        아이디 칸. 비밀번호를 나중에 묻는 화면(아이디 먼저, 다음 눌러야 비밀번호)
        이 있어서 이것도 받는다. 앱이 이 표시를 붙이는 곳은 거의 로그인·가입
        화면뿐이다.
      */
      "username", "newUsername", "emailAddress",
      /*
        `phone` 은 **일부러 뺐다.** 주문·배송 화면에 전화번호 칸이 흔하다.
        그것까지 받으면 다시 아무 데서나 뜨게 된다.
      */
    )

    fun from(structure: AssistStructure): LoginFields {
      val fields = JSONArray()
      val ids = mutableListOf<AutofillId>()
      val anyIds = mutableListOf<AutofillId>()
      var domain: String? = null
      var login = false

      /*
        `visible` 은 **위에서 내려온다.** 안 보이는 상자 안에 든 칸은 저 혼자
        "보인다" 고 말한다 — 상자가 숨은 것을 모르기 때문이다. 그래서 부모가
        안 보이면 자식도 안 보이는 것으로 친다.
      */
      fun visit(node: AssistStructure.ViewNode, visible: Boolean) {
        val here = visible && node.visibility == View.VISIBLE

        // 첫 번째로 나온 주소만 쓴다. 풀어 쓴다 — 짧게 쓰면 무엇이 어디에 담기는지 흐려진다.
        val found = node.webDomain
        if (domain == null && found != null && found.isNotEmpty()) {
          domain = found
        }

        if (isLoginSignal(node)) login = true

        val id = node.autofillId
        if (id != null) {
          anyIds.add(id)
          if (node.autofillType == View.AUTOFILL_TYPE_TEXT) {
            fields.put(describe(node, ids.size, here))
            ids.add(id)
          }
        }
        for (i in 0 until node.childCount) visit(node.getChildAt(i), here)
      }

      for (i in 0 until structure.windowNodeCount) visit(structure.getWindowNodeAt(i).rootViewNode, true)
      return LoginFields(fields.toString(), ids, anyIds, domain, login)
    }

    /**
     * 이 칸이 "여기는 로그인 화면이다" 라고 말해 주나.
     *
     * 셋 중 하나면 된다.
     *  1. 앱이 붙인 용도 표시 (`android:autofillHints`) 가 위 목록에 있다
     *  2. 웹이면 `<input type="password">`
     *  3. 안드로이드가 비밀번호 칸으로 표시했다 (`inputType`)
     *
     * **못 잡는 것.** 셋 다 없는 로그인 화면은 못 알아본다 — 화면을 직접 그린
     * 앱이 그렇다. 그런 앱에서는 자동 완성 줄이 안 뜬다. 아쉽지만, 아무 데나
     * 뜨는 것보다는 낫다. 앱을 기억해 두는 6단계가 오면 그쪽에서 풀린다.
     *
     * **안 보이는 칸도 본다.** 채울 때는 안 보이는 칸을 거르지만(`isVisible`),
     * 손을 들지 말지는 너그럽게 정한다. 숨은 비밀번호 칸 하나 때문에 로그인
     * 화면에서 아예 안 뜨는 편이 더 나쁘다. 대신 채울 것이 없으면 화면에
     * "채울 칸을 못 찾았습니다" 가 뜬다 — 조용히 닫히지 않는다.
     */
    private fun isLoginSignal(node: AssistStructure.ViewNode): Boolean {
      if (node.autofillHints?.any { LOGIN_HINTS.contains(it) } == true) return true

      val html = node.htmlInfo
      if (html != null && html.tag == "input") {
        /*
          `forEach` 를 안 쓴다. 그 안에서 `return` 하면 자바 쪽 `forEach` 로 잡혀서
          컴파일이 안 될 수 있다. 평범한 반복문이 여기서는 더 안전하다.
        */
        val attrs = html.attributes
        if (attrs != null) {
          for (attr in attrs) {
            if (attr.first == "type" && attr.second?.lowercase() == "password") return true
          }
        }
      }

      return isPassword(node.inputType)
    }

    private fun describe(node: AssistStructure.ViewNode, index: Int, visible: Boolean): JSONObject {
      val hints = JSONArray()
      node.autofillHints?.forEach { hints.put(it) }

      val html = node.htmlInfo
      var htmlType: String? = null
      var htmlName: String? = null
      if (html != null && html.tag == "input") {
        /*
          `android.util.Pair` 다. 코틀린 `Pair` 가 아니라서 `for ((a, b) in ...)` 로
          풀 수 없다 — component1/component2 가 없다. 컴파일이 거기서 멎는다.
        */
        html.attributes?.forEach { attr ->
          when (attr.first) {
            "type" -> htmlType = attr.second?.lowercase()
            "name" -> htmlName = attr.second
          }
        }
      }

      return JSONObject().apply {
        put("index", index)
        put("hints", hints)
        put("idEntry", node.idEntry ?: JSONObject.NULL)
        put("hint", node.hint ?: JSONObject.NULL)
        put("htmlType", htmlType ?: JSONObject.NULL)
        put("htmlName", htmlName ?: JSONObject.NULL)
        put("isPasswordInput", isPassword(node.inputType))
        // 글자를 넣을 수 있는 칸인가. 화면에 적혀 있기만 한 글자는 아니다.
        put("isEditable", node.className?.contains("EditText") == true || html?.tag == "input")
        /*
          지금 눈에 보이는 칸인가.

          한 화면에 로그인 방법이 여러 갈래인 앱이 많다 — 아이디 / 공동인증서 /
          간편인증. 고르지 않은 갈래의 칸도 **화면 구조에는 그대로 있다.** 그것을
          골라 채우면 값은 들어가는데 **사용자 눈에는 아무것도 안 채워진다.**
          닫히기만 하고 아무 일도 안 일어난 것처럼 보인다.
        */
        put("isVisible", visible)
      }
    }

    /** 안드로이드가 이 칸을 비밀번호 칸으로 표시했나. 갈래가 셋이라 다 본다. */
    private fun isPassword(inputType: Int): Boolean {
      val variation = inputType and InputType.TYPE_MASK_VARIATION
      return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
        variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
    }
  }
}
