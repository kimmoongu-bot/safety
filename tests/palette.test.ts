import test from 'node:test';
import assert from 'node:assert/strict';
import { darkColors, lightColors, type Palette } from '../src/app/theme/palette.ts';

/**
 * 명세 3장: 본문 대비 4.5:1 이상.
 *
 * 색을 손볼 때마다 사람이 계산기를 두드릴 수는 없다. 두 벌 모두 여기서 잰다.
 * 어두운 모드를 넣을 때 밝을 때 통과한 색이 대부분 실패한다는 것을 확인했다.
 */
const MIN = 4.5;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  assert.equal(h.length, 6, `색 형식이 이상하다: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [설명, 글자색, 바탕색] */
function pairs(c: Palette): [string, string, string][] {
  return [
    ['본문 / 바탕', c.text, c.bg],
    ['본문 / 카드', c.text, c.surface],
    ['흐린 글자 / 바탕', c.textDim, c.bg],
    ['흐린 글자 / 카드', c.textDim, c.surface],
    ['강조 / 바탕', c.accent, c.bg],
    ['강조 / 카드', c.accent, c.surface],
    ['위험 / 바탕', c.danger, c.bg],
    ['위험 / 카드', c.danger, c.surface],
    ['성공 / 바탕', c.ok, c.bg],
    ['기본 버튼 글자 / 기본 버튼', c.primaryText, c.primary],
    ['강조 버튼 글자 / 강조 버튼', c.accentText, c.accent],
    ['알림(잘됨) 글자 / 알림 바탕', c.text, c.toastOkBg],
    ['알림(오류) 글자 / 알림 바탕', c.text, c.toastBadBg],
    ['경고 글자 / 경고 바탕', c.warnText, c.warnBg],
    ['이름표 글자 / 초록 네모', c.primaryText, c.secondary],
  ];
}

for (const [name, palette] of [['밝은 색', lightColors], ['어두운 색', darkColors]] as const) {
  test(`${name} — 모든 글자 대비가 4.5:1 이상이다`, () => {
    const failures: string[] = [];
    for (const [what, fg, bg] of pairs(palette)) {
      const r = contrast(fg, bg);
      if (r < MIN) failures.push(`${what} ${fg} on ${bg} = ${r.toFixed(2)}:1`);
    }
    assert.deepEqual(failures, [], `${name}에서 미달:\n  ${failures.join('\n  ')}`);
  });
}

test('두 색 한 벌이 같은 이름을 모두 갖는다', () => {
  assert.deepEqual(Object.keys(lightColors).sort(), Object.keys(darkColors).sort());
});

test('어두운 색이 실제로 어둡고 밝은 색이 실제로 밝다', () => {
  assert.ok(luminance(darkColors.bg) < 0.1, '어두운 바탕이 어둡지 않다');
  assert.ok(luminance(lightColors.bg) > 0.7, '밝은 바탕이 밝지 않다');
  assert.ok(luminance(darkColors.text) > 0.7, '어두운 모드 글자가 밝지 않다');
  assert.ok(luminance(lightColors.text) < 0.1, '밝은 모드 글자가 어둡지 않다');
});
