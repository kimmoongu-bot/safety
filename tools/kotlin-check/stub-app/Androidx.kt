package androidx.appcompat.app

/**
 * `AppCompatActivity` 대역 (`tools/kotlin-check.sh`).
 *
 * 진짜는 구글 메이븐(`dl.google.com`)에 있는데 이 환경에서는 막혀 있다. 리액트의
 * `ReactActivity` 가 이것을 물려받으므로, 없으면 컴파일러가 윗대를 못 읽어서
 * 아무것도 검사하지 못한다.
 *
 * **이 대역이 검사에서 빠뜨리는 것:** 진짜 AppCompatActivity 에만 있는 것(조각
 * 관리, 뒤로 가기 신호 같은 것)을 쓰면 여기서는 통과하고 실기기 빌드에서 깨진다.
 * 이 파일에서는 그런 것을 쓰지 않는다.
 */
open class AppCompatActivity : android.app.Activity()
