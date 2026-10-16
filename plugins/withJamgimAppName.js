const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const { DEV_NAME_SUFFIX } = require('../app.config.js');

/**
 * 홈 화면(런처)에 보이는 앱 이름을 **언어별로 나눈다.**
 *
 * - 한국어 폰 → `잠김`
 * - 그 밖의 모든 언어 → `Kepta` (app.json 의 `name`)
 *
 * ## 왜 플러그인이어야 하나
 *
 * 안드로이드는 런처 이름을 `res/values…` 폴더의 `strings.xml` 안 `app_name` 에서 읽는다.
 * `app.json` 의 `name` 은 **기본값 하나**만 만들어 준다 — 언어별로 나눌 자리가 없다.
 * 그래서 `values-ko/` 를 따로 써 줘야 하는데, `android/` 는 `prebuild` 가 **매번
 * 지우고 새로 만드는** 폴더라 손으로 넣으면 다음 빌드에서 사라진다. 실제로 오늘만
 * `prebuild --clean` 을 세 번 돌렸다.
 *
 * 플러그인에 적어 두면 `prebuild` 가 돌 때마다 다시 써진다. EAS 빌드도 서버에서
 * `prebuild` 를 돌리므로 똑같이 적용된다.
 *
 * ## 개발용 빌드
 *
 * 개발용은 이름 끝에 ` (개발)` 이 붙는다. 그 판단은 `app.config.js` 가 이미 했고,
 * 결과를 `extra.devBuild` 에 남겨 둔다. **꾸러미 이름의 `.dev` 를 보고 되짚지 않는다** —
 * 그건 안드로이드에만 있는 것이고, 저쪽이 정한 것을 이쪽에서 추측하는 꼴이 된다.
 */
const KO_APP_NAME = '잠김';

/** XML 에서 뜻을 갖는 글자. 이름에 `&` 나 `'` 가 들어오면 파일이 깨진다. */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 한국어 `strings.xml` 의 내용.
 *
 * 밖으로 내보내는 이유는 **검사가 이것만 따로 부르기 위해서**다
 * (`tests/appName.test.ts`). 파일을 실제로 쓰는 쪽은 안드로이드 폴더가 있어야 해서
 * 노드에서 그냥 돌릴 수 없다.
 */
function koStringsXml(devBuild) {
  const name = devBuild ? `${KO_APP_NAME}${DEV_NAME_SUFFIX}` : KO_APP_NAME;
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">${escapeXml(name)}</string>
</resources>
`;
}

module.exports = function withJamgimAppName(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'values-ko');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'strings.xml'), koStringsXml(cfg.extra?.devBuild === true));
      return cfg;
    },
  ]);
};

module.exports.koStringsXml = koStringsXml;
module.exports.KO_APP_NAME = KO_APP_NAME;
