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
# ## 무엇을 못 보나
#
# Expo 와 리액트 네이티브에 기대는 파일은 못 본다 — 그 라이브러리는 Maven 에
# 없다. `JamgimAutofillModule.kt` 와 `plugins/android/JamgimFillActivity.kt` 가
# 그렇다. 여기서 통과해도 **빌드가 된다는 뜻은 아니다.** 틀린 곳 몇 가지를
# 미리 걸러 줄 뿐이다.
#
#     ./tools/kotlin-check.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

CACHE="${JAMGIM_KOTLIN_CACHE:-${TMPDIR:-/tmp}/jamgim-kotlin-check}"
MAVEN=https://repo1.maven.org/maven2
KOTLIN=2.1.21
# 안드로이드 15 프레임워크. 자동 완성은 8.0(API 26)부터라 어느 최신판이든 된다.
ANDROID=15-robolectric-13954326

mkdir -p "$CACHE"

fetch() { # 이름 경로
  local name=$1 path=$2
  [ -s "$CACHE/$name" ] && return 0
  echo "받는 중: $name"
  # 큰 파일이 도중에 잘린 적이 있다. 이어받기와 다시 시도를 켠다.
  curl -fsS -C - --retry 5 --retry-all-errors -o "$CACHE/$name" "$MAVEN/$path"
}

fetch kotlin-compiler.jar        "org/jetbrains/kotlin/kotlin-compiler/$KOTLIN/kotlin-compiler-$KOTLIN.jar"
fetch kotlin-stdlib.jar          "org/jetbrains/kotlin/kotlin-stdlib/$KOTLIN/kotlin-stdlib-$KOTLIN.jar"
fetch kotlin-reflect.jar         "org/jetbrains/kotlin/kotlin-reflect/$KOTLIN/kotlin-reflect-$KOTLIN.jar"
fetch kotlin-script-runtime.jar  "org/jetbrains/kotlin/kotlin-script-runtime/$KOTLIN/kotlin-script-runtime-$KOTLIN.jar"
fetch kotlin-daemon-embeddable.jar "org/jetbrains/kotlin/kotlin-daemon-embeddable/$KOTLIN/kotlin-daemon-embeddable-$KOTLIN.jar"
fetch trove4j.jar                "org/jetbrains/intellij/deps/trove4j/1.0.20200330/trove4j-1.0.20200330.jar"
fetch annotations.jar            "org/jetbrains/annotations/23.0.0/annotations-23.0.0.jar"
fetch android-all.jar            "org/robolectric/android-all/$ANDROID/android-all-$ANDROID.jar"

# 받다 만 파일을 통과시키지 않는다. 잘린 jar 은 "클래스를 못 찾겠다" 로 나와서
# 진짜 코드 잘못처럼 보인다.
for jar in "$CACHE"/*.jar; do
  unzip -l "$jar" >/dev/null 2>&1 || { echo "망가진 파일: $jar — 지우고 다시 받으세요"; exit 2; }
done

RUNNER=$(ls "$CACHE"/kotlin-*.jar "$CACHE"/trove4j.jar "$CACHE"/annotations.jar | tr '\n' ':')
SRC=modules/jamgim-autofill/android/src/main/java/app/jamgim/autofill

java -cp "$RUNNER" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-stdlib -nowarn -d "$CACHE/out" \
  -cp "$CACHE/android-all.jar:$CACHE/kotlin-stdlib.jar" \
  "$SRC/LoginFields.kt" \
  "$SRC/JamgimAutofillService.kt" \
  tools/kotlin-check/R.kt
