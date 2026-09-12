#!/usr/bin/env bash
#
# 자동 완성 네이티브 코드를 **개발 기기에서** 컴파일해 본다 (docs/자동완성.md).
#
# ## 왜 있나
#
# 실기기 빌드 한 번이 15분이다. 코틀린 오류 하나 때문에 그 15분을 세 번 버렸다.
# 오류는 `android.util.Pair` 를 코틀린식으로 풀려 한 것과, 모듈에 없는
# androidx 표시를 쓴 것이었다 — 둘 다 컴파일러가 1초면 잡는 것들이다.
#
# ## 어떻게 되나
#
# 안드로이드 SDK 는 이 환경에서 받을 수 없다(`dl.google.com` 이 막혀 있다).
# 그런데 Maven 은 열려 있고, 거기에 코틀린 컴파일러와 **안드로이드 프레임워크
# 클래스**(로보렉트릭이 올려 둔 것)가 있다. 둘을 받아서 컴파일만 해 본다.
#
# ## 채우기 화면도 본다
#
# `plugins/android/JamgimFillActivity.kt` 는 한동안 여기서 못 보는 파일이었고,
# 하필 그 파일이 빌드를 깼다 — 개발용 빌드에서만 없는 `R` 과 `BuildConfig` 를
# 썼다. 리액트 네이티브는 Maven 에 있으므로(react-android) 받아서 같이 건다.
# androidx 와 expo 는 못 받아서 `tools/kotlin-check/stub-app/` 에 대역을 세웠다.
#
# ## 무엇을 못 보나
#
# 대역이 있는 곳은 못 본다. 대역에 있는 것이 진짜에 없어도 여기서는 통과한다.
# 그래서 `tests/hygiene.test.ts` 가 진짜 expo 파일을 따로 읽어 본다.
# 여기서 통과해도 **빌드가 된다는 뜻은 아니다.** 틀린 곳 몇 가지를
# 미리 걸러 줄 뿐이다.
#
#     ./tools/kotlin-check.sh
#
# ## 결과 읽는 법
#
# 아무 말도 없으면 통과다. 오류는 이렇게 나온다.
#
#     .../LoginFields.kt:83:33: error: function 'component1()' is ambiguous ...
#
# **`e:` 로 찾지 마라.** 코틀린 1.x 는 그렇게 적었지만 2.x 는 `파일:줄:칸: error:`
# 로 적는다. 한 번 `e:` 로 찾다가 "오류가 없다" 고 잘못 읽었다.
#
set -euo pipefail
cd "$(dirname "$0")/.."

CACHE="${JAMGIM_KOTLIN_CACHE:-${TMPDIR:-/tmp}/jamgim-kotlin-check}"
MAVEN=https://repo1.maven.org/maven2
KOTLIN=2.1.21
# package.json 의 react-native 와 같아야 한다. 올릴 때 같이 올린다.
RN=0.86.3
# 안드로이드 15 프레임워크. 자동 완성은 8.0(API 26)부터라 어느 최신판이든 된다.
ANDROID=15-robolectric-13954326

mkdir -p "$CACHE"

# Maven 은 파일마다 지문(.sha1)을 같이 올려 둔다. 그것과 맞는지 본다.
#
# **크기로 짐작하지 않는다.** 이 파일은 186MB 인데 회선이 느려서 받는 데 한참
# 걸린다. 받는 도중의 크기를 보고 "잘렸다"거나 "너무 크다"고 두 번 넘겨짚었고,
# 두 번 다 틀렸다 — 그냥 아직 받는 중이었다. 그 바람에 멀쩡한 파일을 지우고
# 처음부터 다시 받기도 했다.
#
# 압축 목록 읽기(`unzip -l`)도 모자란다. 받다 만 파일에서도 통할 때가 있다.
# 지문은 다르다. 맞으면 맞는 것이고 아니면 아닌 것이다. 짐작할 여지가 없다.
verify() { # 이름 경로
  local name=$1 path=$2
  local want
  want=$(curl -fsS "$MAVEN/$path.sha1" | tr -d ' \n-' | cut -c1-40) || return 1
  local got
  got=$(sha1sum "$CACHE/$name" | cut -d' ' -f1)
  [ "$want" = "$got" ]
}

fetch() { # 이름 경로
  local name=$1 path=$2
  if [ -s "$CACHE/$name" ] && verify "$name" "$path"; then return 0; fi
  echo "받는 중: $name (186MB 짜리가 있다. 느린 회선에서는 오래 걸린다)"
  # 이어받기를 켠다. 큰 파일이라 도중에 끊기면 처음부터 받는 것이 아깝다.
  # 이어받기가 어긋나더라도 아래 지문 검사가 잡으므로 위험하지 않다.
  curl -fsS -C - --retry 5 --retry-all-errors -o "$CACHE/$name" "$MAVEN/$path"
  verify "$name" "$path" || {
    # 이어받기가 어긋났을 수 있다. 한 번만 처음부터 받아 본다.
    rm -f "$CACHE/$name"
    curl -fsS --retry 5 --retry-all-errors -o "$CACHE/$name" "$MAVEN/$path"
    verify "$name" "$path" || { echo "받았는데 지문이 다르다: $name"; exit 2; }
  }
}

fetch kotlin-compiler.jar        "org/jetbrains/kotlin/kotlin-compiler/$KOTLIN/kotlin-compiler-$KOTLIN.jar"
fetch kotlin-stdlib.jar          "org/jetbrains/kotlin/kotlin-stdlib/$KOTLIN/kotlin-stdlib-$KOTLIN.jar"
fetch kotlin-reflect.jar         "org/jetbrains/kotlin/kotlin-reflect/$KOTLIN/kotlin-reflect-$KOTLIN.jar"
fetch kotlin-script-runtime.jar  "org/jetbrains/kotlin/kotlin-script-runtime/$KOTLIN/kotlin-script-runtime-$KOTLIN.jar"
fetch kotlin-daemon-embeddable.jar "org/jetbrains/kotlin/kotlin-daemon-embeddable/$KOTLIN/kotlin-daemon-embeddable-$KOTLIN.jar"
fetch trove4j.jar                "org/jetbrains/intellij/deps/trove4j/1.0.20200330/trove4j-1.0.20200330.jar"
# 컴파일러가 속으로 코루틴을 쓴다. 없으면 클래스를 못 찾겠다며 멎는다.
fetch coroutines.jar             "org/jetbrains/kotlinx/kotlinx-coroutines-core-jvm/1.8.1/kotlinx-coroutines-core-jvm-1.8.1.jar"
fetch annotations.jar            "org/jetbrains/annotations/23.0.0/annotations-23.0.0.jar"
fetch android-all.jar            "org/robolectric/android-all/$ANDROID/android-all-$ANDROID.jar"
# 리액트 네이티브. 받는 것은 168MB 인데 쓰는 것은 그 안의 classes.jar(3MB)뿐이다.
# 나머지는 기계어라 컴파일에는 필요 없다.
fetch react-android.aar          "com/facebook/react/react-android/$RN/react-android-$RN-release.aar"
unzip -o -q "$CACHE/react-android.aar" classes.jar -d "$CACHE"
mv -f "$CACHE/classes.jar" "$CACHE/react-android.jar"

# 파일을 하나씩 적지 않는다. 새 파일을 만들고 여기 더하는 것을 두 번 빠뜨렸고,
# 두 번 다 "왜 클래스를 못 찾지" 로 시간을 썼다. 폴더째 건다.
RUNNER=$(ls "$CACHE"/kotlin-*.jar "$CACHE"/trove4j.jar "$CACHE"/annotations.jar "$CACHE"/coroutines.jar | tr '\n' ':')
SRC=modules/jamgim-autofill/android/src/main/java/app/jamgim/autofill

java -cp "$RUNNER" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-stdlib -nowarn -d "$CACHE/out" \
  -cp "$CACHE/android-all.jar:$CACHE/kotlin-stdlib.jar" \
  "$SRC"/*.kt \
  tools/kotlin-check/stub/*.kt \
  tools/kotlin-check/R.kt

# 채우기 화면. **`R` 과 `BuildConfig` 를 일부러 안 걸었다.** 개발용 빌드에서는
# 그 둘이 이 꾸러미 이름 아래에 없다 — 있는 척하면 검사가 거짓말을 한다.
java -cp "$RUNNER" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-stdlib -nowarn -d "$CACHE/out-app" \
  -cp "$CACHE/android-all.jar:$CACHE/kotlin-stdlib.jar:$CACHE/react-android.jar:$CACHE/out" \
  plugins/android/JamgimFillActivity.kt \
  tools/kotlin-check/stub-app/*.kt
