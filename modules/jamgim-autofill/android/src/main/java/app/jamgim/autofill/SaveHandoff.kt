package app.jamgim.autofill

/**
 * 담기 요청에서 **칸에 든 글자**를 화면에 건네는 자리 (docs/자동완성.md 22장).
 *
 * ## 왜 인텐트로 안 넘기나
 *
 * 담기 요청에는 사용자가 방금 친 아이디와 **비밀번호**가 들어 있다. 그것을
 * 인텐트에 실어 보내면 값이 안드로이드 얼개를 한 바퀴 돌게 된다. 자동 완성
 * 서비스와 우리 앱은 **같은 프로세스**라 그럴 까닭이 없다 — 여기 놓고 저기서
 * 집으면 된다.
 *
 * 채우기 쪽(`respond`)에서 값이 인텐트를 타는 것은 어쩔 수 없다. 그건 안드로이드에
 * 답을 돌려주는 정해진 길이다. 이쪽은 우리끼리 주고받는 것이라 고를 수 있다.
 *
 * ## 오래 들고 있지 않는다
 *
 * 담기 화면이 닫히면 지운다 (`JamgimFillActivity.onDestroy`, `finishSave`,
 * `cancelFill`). 화면이 뜨지도 못했으면 다음 담기 요청이 덮어쓴다.
 *
 * 여기 담기는 것은 **그 화면에 사람이 친 글자 전부**다. 우리 화면은 그중 아이디와
 * 비밀번호 두 개만 가져간다. 나머지는 자바스크립트로 넘어가지도, 어디에 적히지도
 * 않는다 (명세 5.5).
 */
object SaveHandoff {
  private var values: List<String?> = emptyList()

  fun set(next: List<String?>) {
    values = next
  }

  /** 자리 번호로 하나. 없으면 `null`. */
  fun value(index: Int): String? = values.getOrNull(index)

  fun clear() {
    values = emptyList()
  }
}
