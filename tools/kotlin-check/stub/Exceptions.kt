package expo.modules.kotlin.exception

/** 진짜도 `class` 다. `object` 가 아니므로 `Exceptions.ReactContextLost()` 로 부른다. */
class Exceptions {
  class AppContextLost : Exception()
  class ReactContextLost : Exception()
}
