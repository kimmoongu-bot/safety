import test from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK, pickLocale } from '../src/app/i18n/pickLocale.ts';

const ALL = ['ko', 'en', 'ja'] as const;

test('사용자가 고른 언어가 가장 앞선다', () => {
  assert.equal(pickLocale(ALL, ['ja-JP'], 'ko'), 'ko');
});

test('사용자가 고른 언어가 없으면 기기 언어를 본다', () => {
  assert.equal(pickLocale(ALL, ['ja-JP'], 'de'), 'ja');
});

test('기기 언어를 따라간다', () => {
  assert.equal(pickLocale(ALL, ['ko-KR'], undefined), 'ko');
  assert.equal(pickLocale(ALL, ['ja-JP'], undefined), 'ja');
});

test('지역이 달라도 언어가 같으면 쓴다 (en-GB → en)', () => {
  assert.equal(pickLocale(ALL, ['en-GB'], undefined), 'en');
});

test('없는 언어면 영어로 간다 — 한국어로 두면 태국 사용자가 한 글자도 못 읽는다', () => {
  assert.equal(pickLocale(ALL, ['th-TH'], undefined), FALLBACK);
});

test('기기가 여러 언어를 원하면 앞선 것부터 본다', () => {
  assert.equal(pickLocale(ALL, ['th-TH', 'ja-JP', 'ko-KR'], undefined), 'ja');
});

test('한국어뿐일 때도 무너지지 않는다', () => {
  assert.equal(pickLocale(['ko'], ['th-TH'], undefined), 'ko');
});

test('대소문자를 가리지 않는다', () => {
  assert.equal(pickLocale(ALL, ['KO-kr'], undefined), 'ko');
  assert.equal(pickLocale(ALL, [], 'KO'), 'ko');
});
