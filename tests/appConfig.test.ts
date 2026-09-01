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
const { resolve } = require_('../app.config.js') as {
  resolve: (config: Record<string, unknown>, profile?: string) => {
    android?: { permissions?: string[]; blockedPermissions?: string[] };
  };
};

const INTERNET = 'android.permission.INTERNET';

function internetAllowed(profile?: string): boolean {
  const out = resolve(appJson.expo, profile);
  const asked = out.android?.permissions ?? [];
  const blocked = out.android?.blockedPermissions ?? [];
  return asked.includes(INTERNET) || !blocked.includes(INTERNET);
}

test('개발용 빌드에서만 인터넷 권한이 열린다', () => {
  assert.equal(internetAllowed('development'), true, '개발용은 열려야 화면 서버에 붙는다');
});

for (const profile of ['preview', 'production', 'Development', 'dev', '', undefined]) {
  test(`배포용에서는 인터넷 권한이 막힌다 — 프로필 ${JSON.stringify(profile)}`, () => {
    assert.equal(internetAllowed(profile), false, `${String(profile)} 에서 인터넷이 열렸다`);
  });
}

test('app.json 자체는 언제나 인터넷을 막아 둔다', () => {
  const android = appJson.expo.android as { blockedPermissions?: string[]; permissions?: string[] };
  assert.ok(android.blockedPermissions?.includes(INTERNET), 'app.json 에서 인터넷을 막아야 한다');
  assert.deepEqual(android.permissions, [], 'app.json 은 어떤 권한도 요청하지 않는다');
});
