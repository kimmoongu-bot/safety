import test from 'node:test';
import assert from 'node:assert/strict';
import {
  type Asking,
  coreName,
  isConfident,
  rankForRequest,
  siteKey,
  withSite,
} from '../src/core/autofillMatch.ts';

/**
 * 채우기 화면에서 어느 항목을 맨 위에 보여 줄지 (docs/자동완성.md 3-2단계).
 *
 * 금고에 스무 개가 있는데 그중 하나를 찾아 스크롤해야 한다면, 앱을 열고 복사해
 * 오는 것과 다를 바 없다. 눌렀을 때 맨 위에 그것이 있어야 값어치가 있다.
 */

const from = (packageName: string, webDomain: string | null = null): Asking => ({
  packageName,
  webDomain,
});

const vault = (...names: string[]) => names.map((service, i) => ({ id: String(i), service }));
const top = (names: string[], asking: Asking) => rankForRequest(vault(...names), asking)[0]?.service;

// ── 이름에서 알맹이 뽑기 ───────────────────────────────────────────────────

test('웹 주소에서 꼬리를 뗀다', () => {
  assert.equal(coreName('www.silson24.or.kr'), 'silson24');
  assert.equal(coreName('nid.naver.com'), 'naver');
});

test('붙임표는 이름의 일부다', () => {
  // 쪼개면 `show` 가 남아서 이름에 show 가 든 아무 항목과 만난다.
  assert.equal(coreName('m.cat-show.co.kr'), 'catshow');
});

test('꾸러미 이름에서도 알맹이를 뽑는다', () => {
  assert.equal(coreName('kr.co.silson24.app'), 'silson24');
  assert.equal(coreName('com.kakao.talk'), 'kakao');
});

test('한글 이름은 그대로 둔다', () => {
  assert.equal(coreName('실손24'), '실손24');
  assert.equal(coreName('대성은행'), '대성은행');
});

test('띄어쓰기는 지운다', () => {
  // 사람이 "네이버 메일" 이라고 적어 둔 것과 naver 가 만나야 한다.
  assert.equal(coreName('Naver 메일'), 'naver메일');
});

// ── 줄 세우기 ──────────────────────────────────────────────────────────────

test('주소와 이름이 같으면 맨 위', () => {
  assert.equal(top(['대성은행', 'silson24', '모모랜드'], from('x.y', 'www.silson24.or.kr')), 'silson24');
});

test('영문 이름으로 적어 둔 것도 찾는다', () => {
  assert.equal(top(['모모랜드', 'silson24'], from('x.y', 'www.silson24.or.kr')), 'silson24');
});

test('주소가 없으면 꾸러미 이름으로 찾는다', () => {
  // 앱에서 부른 경우다. 브라우저가 아니면 주소가 없다.
  assert.equal(top(['대성은행', 'kakao'], from('com.kakao.talk', null)), 'kakao');
});

test('한쪽이 다른 쪽을 품고 있어도 찾는다', () => {
  assert.equal(top(['모모랜드', '네이버메일'], from('com.nhn.naver', null)), '모모랜드',
    '엉뚱하게 걸리면 안 된다');
  assert.equal(top(['모모랜드', 'naver메일'], from('com.nhn.naver', null)), 'naver메일');
});

test('아무것도 안 맞으면 순서를 뒤집지 않는다', () => {
  const got = rankForRequest(vault('가', '나', '다'), from('com.unknown.app', null));
  assert.deepEqual(got.map((r) => r.service), ['가', '나', '다'], '섞어 놓으면 더 헷갈린다');
});

test('가까운 정도가 같으면 최근에 고친 것이 앞', () => {
  const records = [
    { id: 'old', service: '은행', updatedAt: 100 },
    { id: 'new', service: '은행', updatedAt: 900 },
  ];
  const got = rankForRequest(records, from('com.x.은행', null), (r) => r.updatedAt);
  assert.equal(got[0]?.id, 'new');
});

test('금고가 비어 있어도 죽지 않는다', () => {
  assert.deepEqual(rankForRequest([], from('com.x.y', null)), []);
});

// ── 짚어 줄지 말지 ─────────────────────────────────────────────────────────

test('딱 하나 걸리면 자신 있다', () => {
  assert.equal(isConfident(vault('대성은행', 'silson24'), from('x', 'www.silson24.or.kr')), true);
});

test('둘이 걸리면 사용자가 골라야 한다', () => {
  // "네이버 메일" 과 "네이버 카페" 를 따로 적어 둔 경우. 짚어 주면 안 된다.
  const got = isConfident(vault('naver메일', 'naver카페'), from('x', 'nid.naver.com'));
  assert.equal(got, false, '엉뚱한 것을 짚어 주면 사용자가 그것을 믿는다');
});

test('하나도 안 걸리면 짚어 주지 않는다', () => {
  assert.equal(isConfident(vault('가', '나'), from('com.unknown.app', null)), false);
});

// ── 여기서 못 하는 것 ──────────────────────────────────────────────────────

test('**한글로 적어 둔 항목은 영문 주소와 만나지 못한다**', () => {
  /*
    이것은 고쳐야 할 버그가 아니라 **지금 못 하는 일**이다. 검사로 적어 두는
    이유는, 나중에 누가 "줄 세우기 되던데요" 하고 믿어 버리지 않게 하기 위해서다.

    우리 손님은 한글로 적는다 — 대성은행, 실손24. 그러면 줄 세우기가 아무 일도
    안 한 것과 같아진다. 진짜 답은 사용자가 한 번 고른 것을 기억하는 것이고,
    그건 금고 구조를 바꾸는 일이라 다음 단계다 (docs/자동완성.md).
  */
  assert.notEqual(coreName('실손24'), coreName('www.silson24.or.kr'));
  assert.equal(
    top(['대성은행', '실손24', '모모랜드'], from('kr.co.silson24.app', 'www.silson24.or.kr')),
    '대성은행',
    '못 맞히면 담긴 차례 그대로 — 섞어 놓으면 더 헷갈린다',
  );
  assert.equal(isConfident(vault('대성은행', '실손24'), from('x', 'www.silson24.or.kr')), false);
});

// ── 고른 것을 기억하기 (6단계) ─────────────────────────────────────────────
//
// 이름 견주기로는 `실손24` 와 `silson24.or.kr` 이 영영 못 만난다. 우리 손님은
// 한글로 적는다. 그래서 **사용자가 한 번 고른 자리**를 적어 두고 그 다음부터는
// 그것을 본다.

test('주소가 있으면 주소로 적는다', () => {
  // 앱 안에 웹을 띄운 경우 꾸러미는 그 앱 하나인데 사이트는 여럿일 수 있다.
  assert.equal(siteKey(from('kr.or.silson.KACR', 'www.silson24.or.kr')), 'web:silson24.or.kr');
});

test('주소가 없으면 꾸러미 이름으로 적는다', () => {
  assert.equal(siteKey(from('com.kakao.talk')), 'app:com.kakao.talk');
});

test('적을 것이 없으면 적지 않는다', () => {
  assert.equal(siteKey(from('', null)), null);
  assert.equal(siteKey(from('  ', '  ')), null);
});

test('앞의 www 만 뗀다', () => {
  // 더 떼기 시작하면 어디까지 뗄지를 우리가 정하게 된다.
  assert.equal(siteKey(from('x', 'WWW.Naver.com')), 'web:naver.com');
  assert.equal(siteKey(from('x', 'mob.hometax.go.kr')), 'web:mob.hometax.go.kr');
});

test('이미 적힌 자리는 다시 적지 않는다', () => {
  // null 이어야 금고에 쓰지 않는다. 쓰는 것은 고치는 것이 아니다.
  assert.equal(withSite(['web:naver.com'], 'web:naver.com'), null);
});

test('새 자리는 뒤에 붙인다', () => {
  assert.deepEqual(withSite(['web:a.com'], 'app:b'), ['web:a.com', 'app:b']);
  assert.deepEqual(withSite(undefined, 'app:b'), ['app:b']);
});

test('오래된 자리부터 밀어낸다', () => {
  const many = Array.from({ length: 8 }, (_, i) => `app:${i}`);
  const next = withSite(many, 'app:new');
  assert.equal(next?.length, 8, '끝없이 커지면 안 된다');
  assert.equal(next?.[7], 'app:new');
  assert.equal(next?.[0], 'app:1', '맨 처음 것이 밀려난다');
});

/**
 * 이것이 6단계의 요점이다. 한글 이름은 주소와 절대 안 만나는데, 한 번 고르고
 * 나면 만난다.
 */
test('한글 이름도 한 번 고르고 나면 맨 위에 온다', () => {
  const asking = from('kr.or.silson.KACR', 'www.silson24.or.kr');
  const records = [
    { id: 'a', service: '네이버' },
    { id: 'b', service: '실손24', sites: ['web:silson24.or.kr'] },
    { id: 'c', service: '카카오' },
  ];
  assert.equal(rankForRequest(records, asking)[0]?.id, 'b');
  assert.equal(isConfident(records, asking), true);
});

test('적어 둔 자리가 이름 견주기를 이긴다', () => {
  // 이름으로는 `naver` 가 딱 맞지만, 사용자가 이 자리에서 고른 것은 다른 것이다.
  const asking = from('com.nhn.android.search', 'www.naver.com');
  const records = [
    { id: 'a', service: 'naver' },
    { id: 'b', service: '둘째 계정', sites: ['web:naver.com'] },
  ];
  assert.equal(rankForRequest(records, asking)[0]?.id, 'b');
});

test('같은 자리에 둘이면 자신 있다고 하지 않는다', () => {
  // 한 사이트에 계정이 둘인 사람이 있다. 그때는 사용자가 골라야 한다.
  const asking = from('x', 'naver.com');
  const records = [
    { id: 'a', service: '개인', sites: ['web:naver.com'] },
    { id: 'b', service: '업무', sites: ['web:naver.com'] },
  ];
  assert.equal(isConfident(records, asking), false);
  // 그래도 둘 다 위로 온다.
  assert.deepEqual(rankForRequest(records, asking).map((r) => r.id), ['a', 'b']);
});

test('기억이 없으면 예전처럼 이름으로 견준다', () => {
  const asking = from('kr.or.silson.KACR', 'www.silson24.or.kr');
  const records = [{ id: 'a', service: '네이버' }, { id: 'b', service: 'silson24' }];
  assert.equal(rankForRequest(records, asking)[0]?.id, 'b');
});
