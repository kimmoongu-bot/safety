import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildPrivacyHtml,
  PRIVACY_SOURCE,
  PRIVACY_TARGET,
} from '../tools/site/build-privacy.ts';

/**
 * 스토어는 개인정보 처리방침을 볼 수 있는 **웹 주소**를 요구한다.
 *
 * 그 페이지는 `docs/개인정보처리방침.md` 에서 만들어 낸다. 손으로 따로 쓰면 사본이
 * 둘이 되고, 언젠가 한쪽만 고친다. 그러면 앱에 적힌 말과 웹에 적힌 말이 달라지는데,
 * 그건 심사에서도 걸리고 무엇보다 읽는 사람을 속이는 셈이 된다.
 */

const source = readFileSync(PRIVACY_SOURCE, 'utf8');

test('올려 둔 웹 한 장이 방침 원본과 맞는다', () => {
  const made = buildPrivacyHtml(source);
  const kept = readFileSync(PRIVACY_TARGET, 'utf8');
  assert.equal(
    kept,
    made,
    '방침을 고치고 다시 만들지 않았다 — node --experimental-strip-types tools/site/build-privacy.ts',
  );
});

test('우리끼리 하는 말은 웹에 안 나간다', () => {
  // 원본 맨 위 인용 덩이는 "여기 고치면 저기도 고쳐라" 같은 개발 쪽지다.
  const made = buildPrivacyHtml(source);
  assert.ok(source.includes('src/app/i18n'), '원본에 그 쪽지가 있어야 이 검사가 뜻이 있다');
  assert.ok(!made.includes('src/app/i18n'), '개발 쪽지가 웹 페이지에 새어 나갔다');
  assert.ok(!made.includes('PRIVACY_UPDATED'));
});

test('문의 주소가 눌리는 링크로 나간다', () => {
  const made = buildPrivacyHtml(source);
  assert.match(made, /<a href="mailto:jamgim\.app@gmail\.com">/);
});

/**
 * 조용히 넘기면 방침의 한 줄이 웹에서 사라지는데, 그건 아무도 모른다.
 * 그래서 모르는 표시를 만나면 멎게 해 두었다.
 */
test('옮길 줄 모르는 표시를 만나면 멎는다', () => {
  assert.throws(() => buildPrivacyHtml('# 제목\n\n- 목록은 아직 못 옮긴다\n'));
  assert.throws(() => buildPrivacyHtml('# 제목\n\n[링크](https://example.com) 도 아직\n'));
  assert.throws(() => buildPrivacyHtml('# 제목\n\n### 더 작은 제목\n'));
});

/**
 * 앱 화면과 문서에 적힌 "마지막 수정" 날짜가 같아야 한다.
 *
 * 방침을 고치고 앱 쪽 날짜를 안 바꾸면, 사용자는 예전 방침을 보고 있다고 믿는다.
 * 사람이 두 곳을 맞춰 두는 규칙은 언젠가 어긋난다.
 */
test('앱 화면과 문서의 마지막 수정 날짜가 같다', () => {
  const inDoc = /마지막 수정:\s*(\d{4}-\d{2}-\d{2})/.exec(source)?.[1];
  const screen = readFileSync(join('src', 'app', 'screens', 'InfoScreen.tsx'), 'utf8');
  const inApp = /PRIVACY_UPDATED\s*=\s*'(\d{4}-\d{2}-\d{2})'/.exec(screen)?.[1];
  assert.ok(inDoc, '문서에서 날짜를 못 찾았다');
  assert.equal(inApp, inDoc, '앱 화면 날짜와 문서 날짜가 다르다');
});
