/**
 * 빌드 종류에 따라 app.json 을 조금 고친다.
 *
 * **개발용 빌드에서만 인터넷 권한을 준다.**
 *
 * 왜 필요한가: 화면을 고칠 때마다 클라우드 빌드를 15~20분씩 기다리는 것은 낭비다.
 * 개발용 빌드(dev client)를 한 번 깔아 두면, 그 뒤로는 피시가 켜 놓은 서버에서
 * 화면 코드를 받아와 몇 초 만에 바뀐다. 그러려면 폰이 피시에 접속해야 하고,
 * 인터넷 권한이 필요하다.
 *
 * 왜 위험한가: 명세 1장은 "MVP 목표는 인터넷 권한조차 요구하지 않는 것" 이고,
 * 그게 이 앱의 유일한 진짜 차별점이다. 실수로 배포판에 인터넷 권한이 들어가면
 * 스토어 권한 화면에 그대로 드러나고, 홍보 문구가 거짓말이 된다.
 *
 * 그래서 규칙을 이렇게 잡았다.
 *   - 기본값은 **막는 쪽**이다. 표시가 없으면 app.json 그대로 (인터넷 막힘).
 *   - 개발용 표시가 있을 때만 푼다. 이 빌드는 폰에 개발용으로만 깔고 배포하지 않는다.
 *
 * `tests/appConfig.test.ts` 가 이 규칙을 지킨다. preview·production·빈 값에서
 * 인터넷이 막혀 있는지 검사한다.
 */
const INTERNET = 'android.permission.INTERNET';
/** 개발용 앱은 꾸러미 이름을 달리해 진짜 앱과 따로 깔리게 한다. */
const DEV_SUFFIX = '.dev';

/**
 * 개발용 빌드인지 판단한다.
 *
 * `JAMGIM_DEV_BUILD` 는 eas.json 의 development 프로필에만 적어 둔 우리 표시다.
 * EAS 가 넣어 주는 값에 기대지 않고 우리가 직접 지정한다 — 그쪽이 안 오면
 * 20분 기다린 빌드가 폰에 붙지 않는데, 빌드가 끝나야 알 수 있다.
 *
 * `EAS_BUILD_PROFILE` 도 함께 받는다. 피시에서 `expo run:android` 로 직접 만들 때는
 * eas.json 을 거치지 않기 때문이다.
 */
function isDevBuild(env) {
  return env.JAMGIM_DEV_BUILD === '1' || env.EAS_BUILD_PROFILE === 'development';
}

/** 환경 값을 받아 설정을 돌려준다. 테스트가 이 함수를 직접 부른다. */
function resolve(config, env = {}) {
  if (!isDevBuild(env)) return config;
  return {
    ...config,
    // 홈 화면에서 둘을 구분할 수 있어야 한다.
    name: `${config.name} (개발)`,
    android: {
      ...config.android,
      /**
       * 꾸러미 이름을 달리한다.
       *
       * 같은 이름이면 안드로이드가 '같은 앱' 으로 보고 기존 앱을 덮어쓰려 한다.
       * 그러면 **금고에 넣어 둔 것이 다 지워진다.** 이름을 나누면 개발용과 진짜 앱이
       * 나란히 깔리고, 진짜 앱의 금고는 손대지 않는다.
       *
       * 배포용 이름 app.jamgim.vault 는 한 번 스토어에 올리면 영영 못 바꾼다.
       * 개발용에만 꼬리를 붙이는 이유다.
       */
      package: `${config.android?.package}${DEV_SUFFIX}`,
      // 개발용 빌드만. 피시의 화면 서버에 접속해야 한다.
      permissions: [INTERNET],
      blockedPermissions: (config.android?.blockedPermissions ?? []).filter((p) => p !== INTERNET),
    },
  };
}

module.exports = ({ config }) => resolve(config, process.env);
module.exports.resolve = resolve;
module.exports.isDevBuild = isDevBuild;
