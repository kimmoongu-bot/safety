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
) {
  companion object {
    fun from(structure: AssistStructure): LoginFields {
      val fields = JSONArray()
      val ids = mutableListOf<AutofillId>()
      val anyIds = mutableListOf<AutofillId>()
      var domain: String? = null

      fun visit(node: AssistStructure.ViewNode) {
        // 첫 번째로 나온 주소만 쓴다. 풀어 쓴다 — 짧게 쓰면 무엇이 어디에 담기는지 흐려진다.
        val found = node.webDomain
        if (domain == null && found != null && found.isNotEmpty()) {
          domain = found
        }

        val id = node.autofillId
        if (id != null) {
          anyIds.add(id)
          if (node.autofillType == View.AUTOFILL_TYPE_TEXT) {
            fields.put(describe(node, ids.size))
            ids.add(id)
          }
        }
        for (i in 0 until node.childCount) visit(node.getChildAt(i))
      }

      for (i in 0 until structure.windowNodeCount) visit(structure.getWindowNodeAt(i).rootViewNode)
      return LoginFields(fields.toString(), ids, anyIds, domain)
    }

    private fun describe(node: AssistStructure.ViewNode, index: Int): JSONObject {
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
