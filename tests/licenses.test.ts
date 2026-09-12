import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT_EMAIL, OFL_TEXT, THIRD_PARTY } from '../src/app/licenses.ts';

/**
 * 남의 것을 넣었으면 그 사실을 밝힌다.
 *
 * 글꼴 두 벌이 SIL Open Font License 1.1 이고, 이 허락서는 **저작권 표시와 허락서를
 * 사본마다 함께 배포할 것**을 요구한다. 글꼴 파일 이름표 안에도 들어 있지만
 * (자를 때 `--name-IDs=*` 로 지켰다), 사람이 읽을 수 있는 곳에도 둔다.
 *
 * 글꼴을 하나 더 넣고 여기 적는 것을 잊는 것이 실제로 있을 법한 일이라, 파일 목록과
 * 맞춰 본다.
 */
const FONT_DIR = 'assets/fonts';

function fontFiles(): string[] {
  return readdirSync(FONT_DIR).filter((f) => /\.(otf|ttf)$/i.test(f));
}

test('넣은 글꼴마다 저작권 표시가 있다', () => {
  const declared = new Set(THIRD_PARTY.map((t) => t.licenseFile.replace('-OFL.txt', '')));
  const missing: string[] = [];
  for (const file of fontFiles()) {
    // Pretendard-Regular.otf → Pretendard
    const family = file.split('-')[0] ?? '';
    if (!declared.has(family)) missing.push(file);
  }
  assert.deepEqual(missing, [], `허락서에 안 적힌 글꼴: ${missing.join(', ')}`);
});

test('적어 둔 저작권 표시가 원본과 같다', () => {
  // 손으로 옮겨 적은 것이라 한 글자만 틀려도 표시가 아니게 된다.
  for (const item of THIRD_PARTY) {
    const original = readFileSync(join(FONT_DIR, item.licenseFile), 'utf8');
    const flat = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    assert.ok(
      flat(original).includes(flat(item.copyright)),
      `${item.name}: 적어 둔 저작권 표시가 ${item.licenseFile} 에 없다`,
    );
  }
});

test('허락서 본문이 잘리지 않았다', () => {
  // 앞뒤가 다 있어야 허락서다. 가운데만 있으면 아무 뜻이 없다.
  assert.match(OFL_TEXT, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(OFL_TEXT, /PERMISSION & CONDITIONS/);
  assert.match(OFL_TEXT, /OTHER DEALINGS IN THE FONT SOFTWARE\.\s*$/);
  assert.ok(OFL_TEXT.length > 3_000, `본문이 너무 짧다 (${OFL_TEXT.length}자)`);
});

test('허락서 본문은 옮기지 않는다', () => {
  // 원문이 효력을 갖는다. 한국어가 섞였다면 누가 손댄 것이다.
  assert.ok(!/[가-힣]/.test(OFL_TEXT), '허락서에 한국어가 섞였다');
});

test('문의 주소를 적었다면 주소 꼴이어야 한다', () => {
  // 아직 안 정했으면 빈 값이고, 그때는 화면에 문의 줄이 안 나간다.
  if (!CONTACT_EMAIL) return;
  assert.match(CONTACT_EMAIL, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, '주소 꼴이 아니다');
});

/**
 * 앱과 개인정보처리방침에 적힌 주소가 같아야 한다.
 *
 * 스토어는 방침 문서를 걸어 두게 하고, 심사에서 그 안의 연락처를 본다. 앱에는
 * 이 주소, 문서에는 저 주소면 "연락이 닿지 않는다" 로 걸린다. 무엇보다 사용자가
 * 어느 쪽으로 보내야 할지 모르게 된다.
 *
 * 두 곳을 사람이 맞춰 두는 규칙은 언젠가 어긋난다. 그래서 검사가 본다.
 */
test('앱과 개인정보처리방침의 문의 주소가 같다', () => {
  if (!CONTACT_EMAIL) return;
  const policy = readFileSync(join('docs', '개인정보처리방침.md'), 'utf8');
  assert.ok(
    policy.includes(CONTACT_EMAIL),
    `개인정보처리방침에 ${CONTACT_EMAIL} 이 없다 — 두 곳이 어긋났다`,
  );
});
