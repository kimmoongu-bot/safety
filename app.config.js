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
 *   - 기본값은 **막는 쪽**이다. EAS_BUILD_PROFILE 이 없거나 무엇이든,
 *     'development' 가 **아니면** app.json 그대로 (인터넷 막힘).
 *   - 'development' 일 때만 푼다. 이 빌드는 폰에 개발용으로만 깔고 배포하지 않는다.
 *
 * `tests/appConfig.test.ts` 가 이 규칙을 지킨다. preview·production·빈 값에서
 * 인터넷이 막혀 있는지 검사한다.
 */
const DEV_PROFILE = 'development';
const INTERNET = 'android.permission.INTERNET';

/** 빌드 프로필 이름을 받아 설정을 돌려준다. 테스트가 이 함수를 직접 부른다. */
function resolve(config, profile) {
  if (profile !== DEV_PROFILE) return config;
  return {
    ...config,
    android: {
      ...config.android,
      // 개발용 빌드만. 피시의 화면 서버에 접속해야 한다.
      permissions: [INTERNET],
      blockedPermissions: (config.android?.blockedPermissions ?? []).filter((p) => p !== INTERNET),
    },
  };
}

module.exports = ({ config }) => resolve(config, process.env.EAS_BUILD_PROFILE);
module.exports.resolve = resolve;
