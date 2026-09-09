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

module.exports = function withJamgimAutofill(config) {
  return withActivityEntry(withActivitySource(config));
};
