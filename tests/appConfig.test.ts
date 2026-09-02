import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/**
 * 개발용 빌드에서만 인터넷 권한이 열려야 한다.
 *
 * 명세 1장은 "MVP 목표는 인터넷 권한조차 요구하지 않는 것" 이고, 그게 이 앱의 유일한
 * 진짜 차별점이다. 실수로 배포판에 인터넷 권한이 들어가면 스토어 권한 화면에 그대로
 * 드러나고, 홍보 문구("보낼 곳 자체가 없습니다")가 거짓말이 된다.
 *
 * 사람이 눈으로 지킬 수 있는 규칙이 아니라서 검사로 못박는다.
 */
const require_ = createRequire(import.meta.url);
const appJson = require_('../app.json') as { expo: Record<string, unknown> };
const easJson = require_('../eas.json') as {
  build: Record<string, { env?: Record<string, string> }>;
};
const { resolve } = require_('../app.config.js') as {
  resolve: (
    config: Record<string, unknown>,
    env?: Record<string, string | undefined>,
  ) => { name?: string; android?: { package?: string; permissions?: string[]; blockedPermissions?: string[] } };
};

const INTERNET = 'android.permission.INTERNET';

function internetAllowed(env: Record<string, string | undefined>): boolean {
  const out = resolve(appJson.expo, env);
  const asked = out.android?.permissions ?? [];
  const blocked = out.android?.blockedPermissions ?? [];
  return asked.includes(INTERNET) || !blocked.includes(INTERNET);
}

test('개발용 표시가 있으면 인터넷 권한이 열린다', () => {
  assert.equal(internetAllowed({ JAMGIM_DEV_BUILD: '1' }), true, '개발용은 열려야 화면 서버에 붙는다');
});

test('피시에서 직접 만들 때도 열린다 (eas.json 을 안 거치는 경로)', () => {
  assert.equal(internetAllowed({ EAS_BUILD_PROFILE: 'development' }), true);
});

const closed: Record<string, string | undefined>[] = [
  {},
  { EAS_BUILD_PROFILE: 'preview' },
  { EAS_BUILD_PROFILE: 'production' },
  { EAS_BUILD_PROFILE: 'Development' }, // 대소문자가 다르면 안 열린다
  { EAS_BUILD_PROFILE: '' },
  { JAMGIM_DEV_BUILD: '0' },
  { JAMGIM_DEV_BUILD: 'true' }, // '1' 이 아니면 안 열린다
  { JAMGIM_DEV_BUILD: '' },
];
for (const env of closed) {
  test(`배포용에서는 인터넷 권한이 막힌다 — ${JSON.stringify(env)}`, () => {
    assert.equal(internetAllowed(env), false, `${JSON.stringify(env)} 에서 인터넷이 열렸다`);
  });
}

test('개발용 표시는 eas.json 의 development 프로필에만 있다', () => {
  const offenders = Object.entries(easJson.build)
    .filter(([name, profile]) => name !== 'development' && profile.env?.JAMGIM_DEV_BUILD !== undefined)
    .map(([name]) => name);
  assert.deepEqual(offenders, [], `개발용 표시가 붙은 배포 프로필: ${offenders.join(', ')}`);
  assert.equal(easJson.build.development?.env?.JAMGIM_DEV_BUILD, '1', 'development 프로필에는 표시가 있어야 한다');
});

test('개발용 앱은 꾸러미 이름이 달라 진짜 앱과 따로 깔린다', () => {
  /**
   * 같은 이름이면 안드로이드가 '같은 앱' 으로 보고 기존 앱을 덮어쓰려 한다.
   * 그러면 금고에 넣어 둔 것이 다 지워진다.
   */
  const real = (appJson.expo.android as { package: string }).package;
  const dev = resolve(appJson.expo, { JAMGIM_DEV_BUILD: '1' });
  assert.notEqual(dev.android?.package, real, '개발용이 진짜 앱을 덮어쓴다');
  assert.equal(dev.android?.package, `${real}.dev`);
  assert.ok(dev.name?.includes('개발'), '홈 화면에서 구분할 수 있어야 한다');
});

test('배포용 꾸러미 이름은 그대로다 — 한 번 올리면 못 바꾼다', () => {
  const real = (appJson.expo.android as { package: string }).package;
  for (const env of [{}, { EAS_BUILD_PROFILE: 'preview' }, { EAS_BUILD_PROFILE: 'production' }]) {
    assert.equal(resolve(appJson.expo, env).android?.package, real, `${JSON.stringify(env)} 에서 이름이 바뀌었다`);
  }
});

test('app.json 자체는 언제나 인터넷을 막아 둔다', () => {
  const android = appJson.expo.android as { blockedPermissions?: string[]; permissions?: string[] };
  assert.ok(android.blockedPermissions?.includes(INTERNET), 'app.json 에서 인터넷을 막아야 한다');
  assert.deepEqual(android.permissions, [], 'app.json 은 어떤 권한도 요청하지 않는다');
});
