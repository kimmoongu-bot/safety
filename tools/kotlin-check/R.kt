package app.jamgim.autofill

/**
 * 검사용 R 대역 (`tools/kotlin-check.sh`).
 *
 * 진짜 R 은 그레이들이 `res/` 를 보고 만든다. 이 환경에서는 그레이들을 못 돌리므로,
 * 서비스가 쓰는 이름만 같은 모양으로 세워 둔다.
 *
 * **여기 이름은 `res/` 의 파일 이름·id 와 같아야 한다.** 한쪽만 고치면 검사는
 * 통과하는데 실기기에서 자원을 못 찾는다. 자원 이름을 바꾸면 여기도 같이 바꾼다.
 *   - `res/layout/jamgim_autofill_row.xml`
 *   - 그 안의 `@+id/jamgim_autofill_row_text`
 */
object R {
  object layout {
    const val jamgim_autofill_row: Int = 1
  }
  object id {
    const val jamgim_autofill_row_text: Int = 2
  }
}
