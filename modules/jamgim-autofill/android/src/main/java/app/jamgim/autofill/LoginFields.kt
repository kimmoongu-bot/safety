package app.jamgim.autofill

import android.app.assist.AssistStructure
import android.os.Build
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
   * 비밀번호 칸의 번호. 없으면 `null`.
   *
   * 담기 제안(docs/자동완성.md 22장)에 쓴다. 안드로이드에 "이 칸이 바뀌면 담을지
   * 물어봐 달라" 고 알려 주려면 **채우기를 내놓을 때** 그 칸을 지목해야 하는데,
   * 그 시점에는 자바스크립트가 없다. 그래서 이것만은 코틀린이 고른다.
   *
   * 낱말은 여전히 안 본다 — 구조로 드러나는 것만 본다(`isPasswordSignal`).
   * "어느 칸이 아이디인가" 는 그대로 자바스크립트가 정한다.
   */
  val passwordId: AutofillId?,
  /**
   * 칸에 **들어 있는 글자**. 자리 번호가 `ids` 와 같다.
   *
   * **담기 요청에서만 채운다.** 채우기 요청에서는 통째로 비어 있다 — 남의 앱
   * 화면에 적힌 글자를 이유 없이 들고 있을 까닭이 없다 (명세 5.5).
   *
   * 여기 담긴 것도 인텐트로 넘기지 않는다. `SaveHandoff` 를 거쳐 우리 화면이
   * **고른 두 개만** 가져간다.
   */
  val values: List<String?>,
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
    /** 비밀번호 칸이라는 표시. 안드로이드 이름과 웹 이름을 같이 본다. */
    private val PASSWORD_HINTS = setOf(
      "password", "newPassword",
      "current-password", "new-password",
    )

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
        **웹은 이름이 다르다.** 웹 페이지 안의 칸은 브라우저 부품이 `autocomplete`
        값을 그대로 넘긴다 — 안드로이드의 `newPassword` 가 웹에서는 `new-password`
        다. 실기기에서 손택스가 그렇게 왔다.
      */
      "current-password", "new-password", "email",
      /*
        `phone` 은 **일부러 뺐다.** 주문·배송 화면에 전화번호 칸이 흔하다.
        그것까지 받으면 다시 아무 데서나 뜨게 된다.
      */
    )

    /**
     * 화면을 훑어 단서를 모은다.
     *
     * `withValues` 는 **담기 요청에서만** 참이다. 그때만 칸에 든 글자를 함께
     * 담는다. 같은 훑기에서 담으므로 자리 번호가 어긋날 수 없다 — 따로 한 번 더
     * 훑으면 두 목록이 소리 없이 엇갈릴 수 있다.
     */
    fun from(structure: AssistStructure, withValues: Boolean = false): LoginFields {
      val fields = JSONArray()
      val ids = mutableListOf<AutofillId>()
      val anyIds = mutableListOf<AutofillId>()
      val values = mutableListOf<String?>()
      var domain: String? = null
      var login = false
      var passwordId: AutofillId? = null

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
            values.add(if (withValues) textOf(node) else null)
            // 여럿이면 맨 앞의 것. 가입 화면의 "비밀번호 / 다시 입력" 에서 앞이 진짜다.
            if (passwordId == null && here && isPasswordSignal(node)) passwordId = id
          }
        }
        for (i in 0 until node.childCount) visit(node.getChildAt(i), here)
      }

      for (i in 0 until structure.windowNodeCount) visit(structure.getWindowNodeAt(i).rootViewNode, true)
      return LoginFields(fields.toString(), ids, anyIds, domain, passwordId, values, login)
    }

    /**
     * 칸에 들어 있는 글자.
     *
     * 두 군데를 본다. `autofillValue` 가 제 것이지만, 그것을 안 채우고 보이는
     * 글자만 두는 앱이 있다.
     */
    private fun textOf(node: AssistStructure.ViewNode): String? {
      val value = node.autofillValue
      if (value != null && value.isText) return value.textValue?.toString()
      return node.text?.toString()
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
      return isPasswordSignal(node)
    }

    /**
     * 이 칸이 **비밀번호 칸**이라고 말해 주나.
     *
     * 위 `isLoginSignal` 은 아이디 칸 표시까지 받아 주지만, 이쪽은 비밀번호만
     * 본다. 담기 제안에서 "이 칸이 바뀌면 물어봐 달라" 고 지목할 칸이라, 아이디
     * 칸을 지목하면 아이디만 고치고 나가도 담을지 묻게 된다.
     */
    private fun isPasswordSignal(node: AssistStructure.ViewNode): Boolean {
      if (node.autofillHints?.any { PASSWORD_HINTS.contains(it) } == true) return true

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
      /*
        웹 입력 칸의 **모든** 표시를 그대로 담는다. 판단에는 안 쓰고 개발용 빌드의
        '칸 정보' 화면에서 눈으로 보기 위한 것이다 (docs/자동완성.md 19장).
        `readonly` 처럼 우리가 아직 안 보는 표시가 있는지 알려면 다 보여야 한다.
      */
      val htmlAttrs = JSONObject()
      if (html != null && html.tag == "input") {
        /*
          `android.util.Pair` 다. 코틀린 `Pair` 가 아니라서 `for ((a, b) in ...)` 로
          풀 수 없다 — component1/component2 가 없다. 컴파일이 거기서 멎는다.
        */
        html.attributes?.forEach { attr ->
          val key = attr.first
          if (key != null) htmlAttrs.put(key, attr.second ?: JSONObject.NULL)
          when (key) {
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

        /*
          아래는 **판단에 안 쓴다.** 개발용 빌드의 '칸 정보' 화면에서 보기 위한
          것이다 (docs/자동완성.md 19장). 손택스처럼 채워도 소용없는 칸을 어떻게
          가려낼지 정하려면 앱이 그 칸을 어떻게 신고하는지부터 봐야 한다.

          **칸에 든 글자는 담지 않는다.** 여기 오는 것은 남의 앱 화면이다
          (명세 5.5). 이름표와 표시만 본다.
        */
        put("className", node.className ?: JSONObject.NULL)
        put("inputType", node.inputType)
        put("isFocused", node.isFocused)
        put("htmlAttrs", htmlAttrs)
        put("importantForAutofill", importance(node))
      }
    }

    /**
     * 안드로이드가 이 칸을 자동 완성 대상으로 보는가.
     *
     * 앱이 `importantForAutofill="no"` 를 붙여 두면 "여기는 자동 완성하지 마라"
     * 는 뜻이다. 지금은 **보기만 하고 판단에는 안 쓴다** — 실기기에서 어떤 값이
     * 오는지 확인한 뒤에 쓸지 정한다.
     *
     * 안드로이드 9.0(API 28)부터 읽을 수 있다. 그 아래에서는 알 수 없으므로
     * `null` 이다. 모르는 것을 "auto" 로 적으면 확인한 것처럼 보인다.
     */
    private fun importance(node: AssistStructure.ViewNode): Any {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return JSONObject.NULL
      return when (node.importantForAutofill) {
        View.IMPORTANT_FOR_AUTOFILL_AUTO -> "auto"
        View.IMPORTANT_FOR_AUTOFILL_YES -> "yes"
        View.IMPORTANT_FOR_AUTOFILL_NO -> "no"
        View.IMPORTANT_FOR_AUTOFILL_YES_EXCLUDE_DESCENDANTS -> "yesExcludeDescendants"
        View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS -> "noExcludeDescendants"
        else -> node.importantForAutofill.toString()
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
