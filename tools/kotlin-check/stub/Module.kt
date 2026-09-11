package expo.modules.kotlin.modules

import expo.modules.kotlin.AppContext

/**
 * 진짜에는 이것 말고도 있지만, **우리가 쓰는 것만** 적는다.
 *
 * 특히 `packageName` 같은 것을 넣지 않는다. 서비스(Context)에는 있고 모듈에는
 * 없는데, 그것을 모르고 쓴 적이 있어서 빌드를 한 번 태웠다. 대역에 없어야 잡힌다.
 */
abstract class Module {
  val appContext: AppContext = AppContext()
  abstract fun definition(): ModuleDefinitionData
}

class ModuleDefinitionData

@Suppress("FunctionName")
inline fun Module.ModuleDefinition(
  crossinline block: ModuleDefinitionBuilder.() -> Unit,
): ModuleDefinitionData {
  ModuleDefinitionBuilder().also(block)
  return ModuleDefinitionData()
}

class SyncFunctionComponent

class ModuleDefinitionBuilder {
  fun Name(name: String) {
    check(name.isNotEmpty())
  }

  /**
   * 진짜는 받는 값 개수마다 하나씩, 여러 벌이 있다. 여기서는 **한 벌뿐이다.**
   *
   * 진짜와 똑같이 두 벌(받는 값 없는 것 / 하나인 것)을 적어 봤더니 코틀린이
   * "어느 쪽인지 못 고르겠다" 고 했다. Expo 는 다른 설정으로 컴파일하는 모양인데,
   * 그것을 따라가는 것은 이 대역의 값어치에 비해 품이 많이 든다.
   *
   * 받는 값이 없는 곳도 이 한 벌로 통과한다 — 코틀린은 `{ ... }` 를 값 하나짜리
   * 함수로도 받아 주고, 그때 `it` 을 안 쓰면 그만이다.
   *
   * **그래서 이 대역은 "받는 값의 갈래가 맞는지" 는 못 본다.** 대신 중괄호 **안**은
   * 그대로 다 본다. 우리를 물었던 것이 전부 그 안에 있었다.
   */
  @Suppress("FunctionName")
  inline fun <reified R> Function(
    name: String,
    crossinline body: (p0: String) -> R,
  ): SyncFunctionComponent {
    check(name.isNotEmpty())
    return SyncFunctionComponent()
  }
}
