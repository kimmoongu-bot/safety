import test from 'node:test';
import assert from 'node:assert/strict';
import { makePseudo, stretch, STRETCH } from '../src/app/i18n/pseudo.ts';
import { translate } from '../src/app/i18n/types.ts';

test('문장이 실제로 길어진다', () => {
  const before = '금고 열기';
  const after = stretch(before);
  assert.ok(after.length > before.length * 1.5, `${before} → ${after}`);
  assert.ok(after.startsWith(before), '원래 문장이 앞에 남아야 무엇인지 알아본다');
});

test('자리 표시자는 건드리지 않는다', () => {
  const out = stretch('{label}을(를) 복사했습니다');
  assert.ok(out.includes('{label}'), `자리 표시자가 깨졌다: ${out}`);
});

test('자리 표시자 길이는 늘리는 기준에서 뺀다', () => {
  // {name} 여섯 글자가 기준에 들어가면 짧은 문장이 지나치게 길어진다
  const short = stretch('{name}');
  assert.equal(short, '{name}', '늘릴 알맹이가 없으면 그대로 둔다');
});

test('빈 문장은 그대로 둔다', () => {
  assert.equal(stretch(''), '');
});

test('목록 전체를 늘린다 — 함수로 된 문장도 함께', () => {
  const ko = { plain: '열기', withJosa: (p: Record<string, string | number>) => `${p.what}으로 열기` };
  const long = makePseudo(ko);
  assert.ok(translate(long, 'plain').length > 2);
  const made = translate(long, 'withJosa', { what: '지문' });
  assert.ok(made.startsWith('지문으로 열기'), made);
  assert.ok(made.length > '지문으로 열기'.length);
});

test('늘리는 비율이 독일어·핀란드어만큼은 된다', () => {
  assert.ok(STRETCH >= 1.6, '너무 짧게 잡으면 깨짐을 못 잡는다');
});
