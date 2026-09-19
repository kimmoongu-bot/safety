import test from 'node:test';
import assert from 'node:assert/strict';
import { isMaskOnly } from '../src/core/maskedValue.ts';

test('손택스가 준 별표 열 개는 가린 값이다', () => {
  assert.equal(isMaskOnly('**********'), true);
});

test('점으로 가린 것도 가린 값이다', () => {
  assert.equal(isMaskOnly('••••••'), true);
  assert.equal(isMaskOnly('●●●●'), true);
  assert.equal(isMaskOnly('＊＊＊'), true);
});

test('진짜 비밀번호는 가린 값이 아니다', () => {
  assert.equal(isMaskOnly('abc*123'), false);
  assert.equal(isMaskOnly('**a**'), false);
  assert.equal(isMaskOnly('비밀번호'), false);
});

test('빈 값은 가린 값이 아니다 — 비어 있는 것은 따로 다룬다', () => {
  assert.equal(isMaskOnly(''), false);
  assert.equal(isMaskOnly(null), false);
  assert.equal(isMaskOnly(undefined), false);
});
