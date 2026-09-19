const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 자동 완성 채우기 화면 (docs/자동완성.md 3단계)
 *
 * 자동 완성의 나머지는 `modules/jamgim-autofill/` 에 있다. **이 액티비티만 앱 쪽에
 * 둔다.** 리액트 네이티브가 앱 모듈에만 딸려 있기 때문이다. 자세한 것은
 * `plugins/android/JamgimFillActivity.kt` 맨 위에 적었다.
 *
 * 코틀린 코드를 이 파일 안에 문자열로 박지 않고 옆의 `.kt` 파일에서 읽어 온다.
 * 문자열로 박으면 편집기가 코틀린으로 봐 주지 않아서, 틀린 곳을 빌드가 돌 때까지
 * 아무도 모른다.
 */
const SOURCE = path.join(__dirname, 'android', 'JamgimFillActivity.kt');
const PACKAGE_DIR = path.join('app', 'jamgim', 'vault');
const CLASS_NAME = 'app.jamgim.vault.JamgimFillActivity';

function withActivitySource(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', PACKAGE_DIR,
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(SOURCE, path.join(dir, 'JamgimFillActivity.kt'));
      return cfg;
    },
  ]);
}

function withActivityEntry(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.activity = application.activity ?? [];
    if (application.activity.some((a) => a.$['android:name'] === CLASS_NAME)) return cfg;

    application.activity.push({
      $: {
        'android:name': CLASS_NAME,
        /*
          standard 여야 한다. singleTask 나 singleInstance 면 결과를 돌려줄 수 없고,
          자동 완성은 곧바로 '취소' 로 받는다. 이 화면이 따로 있는 이유가 그것이다.
        */
        'android:launchMode': 'standard',
        /*
          테마를 여기서 준다. 본 화면(MainActivity)은 코드에서 `setTheme(R.style.AppTheme)`
          를 부르지만 이 액티비티는 그럴 수 없다 — 개발용 빌드는 꾸러미 이름에 `.dev`
          를 붙여서 `app.jamgim.vault.R` 이라는 것이 아예 없다. 이유는
          `plugins/android/JamgimFillActivity.kt` 맨 위에 적었다.
          매니페스트에 적으면 aapt 가 이름으로 찾아 주고, 화면이 만들어질 때
          적용되니 코드로 부르는 것보다 오히려 이르다.
        */
        'android:theme': '@style/AppTheme',
        // 남의 앱이 이 화면을 띄울 수 없게 한다. 부르는 것은 시스템뿐이다.
        'android:exported': 'false',
        /*
          빈 taskAffinity + 최근 앱에서 빼기.
          비밀번호를 고르던 화면이 최근 앱 목록에 남으면 안 된다 (명세 5.5).
          우리 본 화면 옆에 나란히 뜨는 것도 막는다.
        */
        'android:taskAffinity': '',
        'android:excludeFromRecents': 'true',
        // 자판이 뜰 때 창을 줄인다. 본 화면과 같은 값이어야 화면이 똑같이 움직인다.
        'android:windowSoftInputMode': 'adjustResize',
        'android:configChanges':
          'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode',
      },
    });
    return cfg;
  });
}

/**
 * 홈 화면에 아이콘이 있는 앱은 보이게 해 달라고 적어 둔다 (docs/자동완성.md 27장).
 *
 * **왜.** 채우기·담기 화면은 "누가 달라고 하는지" 를 앱 이름으로 보여 준다. 가짜 앱을
 * 거르는 것은 결국 사람 눈이다. 그런데 안드로이드 11부터 앱은 허락받은 다른 앱만 볼 수
 * 있어서, 이름을 물으면 "그런 앱 없다" 가 온다. 다시 깔고 나면 손택스가 그랬다 —
 * 제목에 `kr.go.nts.android` 가 떴다.
 *
 * **왜 이 방법인가.** 모든 앱을 보는 권한(QUERY_ALL_PACKAGES)도 있지만, 그건 권한
 * 목록에 "설치된 앱 전부 보기" 로 뜬다. 스토어 문구가 "권한 목록에서 확인해 보세요"
 * 라고 하는 앱이다. 이쪽은 권한이 아니라 **조건**이라 목록에 아무것도 늘지 않는다.
 * 자동 완성 요청에 딸려 오는 창 제목도 봤지만 앱 이름이 아니라 내부 이름이었다.
 *
 * **대가.** 이 앱이 폰에 무엇이 깔렸는지 알 수 있게 된다. 쓰는 곳은 요청한 앱의 이름을
 * 읽는 한 곳뿐이고, 인터넷이 없어 어디로도 보낼 수 없다. 위협 모델에 적었다.
 */
function withLauncherQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const queries = manifest.queries[0];
    queries.intent = queries.intent ?? [];
    const has = queries.intent.some(
      (i) =>
        i.action?.some((a) => a.$['android:name'] === 'android.intent.action.MAIN') &&
        i.category?.some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER'),
    );
    if (!has) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
      });
    }
    return cfg;
  });
}

module.exports = function withJamgimAutofill(config) {
  return withLauncherQueries(withActivityEntry(withActivitySource(config)));
};
