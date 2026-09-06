import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { en } from '../src/app/i18n/en.ts';
import { ja } from '../src/app/i18n/ja.ts';
import { ko } from '../src/app/i18n/ko.ts';
import { ru } from '../src/app/i18n/ru.ts';

/**
 * 화면에 쓰는 글자가 앱에 넣은 글꼴에 실제로 들어 있는지 본다.
 *
 * **왜 필요한가.** 글꼴에 없는 글자를 만나면 안드로이드가 시스템 글꼴로 대신
 * 그린다. 앱은 안 죽고 글자도 보이므로 **아무 일도 없어 보인다.** 그런데 한 문장
 * 안에서 글꼴이 섞이고, 어떤 기기에서는 네모(□)가 나온다.
 *
 * 이 검사를 안 만들고 일본어를 넣었다가 실제로 당했다. Pretendard 에는 히라가나와
 * 가타카나는 있는데 **한자가 하나도 없다.** 넣은 일본어 문장에서 168자가 글꼴에
 * 없었고, 눈으로는 알 수 없었다.
 */

/** OTF/TTF 의 cmap(글자 ↔ 글리프 대응표)에서 담고 있는 글자 번호를 읽는다. */
function fontCodepoints(path: string): Set<number> {
  const buf = readFileSync(path);
  const numTables = buf.readUInt16BE(4);
  let cmapOffset = 0;
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    if (buf.toString('latin1', rec, rec + 4) === 'cmap') cmapOffset = buf.readUInt32BE(rec + 8);
  }
  assert.ok(cmapOffset, `${path}: cmap 표가 없다`);

  // 여러 벌 중 유니코드용(format 4)을 고른다.
  const subtableCount = buf.readUInt16BE(cmapOffset + 2);
  let chosen = 0;
  for (let i = 0; i < subtableCount; i += 1) {
    const rec = cmapOffset + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const sub = cmapOffset + buf.readUInt32BE(rec + 4);
    const unicode = (platform === 3 && encoding === 1) || (platform === 0 && encoding >= 3);
    if (unicode && buf.readUInt16BE(sub) === 4) chosen = sub;
  }
  assert.ok(chosen, `${path}: 읽을 수 있는 유니코드 표가 없다`);

  const segX2 = buf.readUInt16BE(chosen + 6);
  const segments = segX2 / 2;
  const endsAt = chosen + 14;
  const startsAt = endsAt + segX2 + 2;
  const out = new Set<number>();
  for (let i = 0; i < segments; i += 1) {
    const end = buf.readUInt16BE(endsAt + i * 2);
    const start = buf.readUInt16BE(startsAt + i * 2);
    if (end === 0xffff) continue; // 마지막 칸은 끝 표시일 뿐이다
    for (let cp = start; cp <= end; cp += 1) out.add(cp);
  }
  return out;
}

/** 문장 목록에 실제로 쓰인 글자를 모은다. 함수로 적은 문장은 안쪽 글까지 본다. */
function charsUsed(catalog: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  for (const value of Object.values(catalog)) {
    const text = typeof value === 'function' ? String(value) : String(value);
    for (const ch of text) out.add(ch);
  }
  return out;
}

/**
 * 언어마다 **실제로 그려질 글꼴**. `src/app/theme/fonts.ts` 의 짝이다.
 *
 * 여기와 저기가 어긋나면 검사는 통과하는데 화면은 깨진다. 언어를 더하거나
 * 글꼴을 바꿀 때 두 곳을 같이 고쳐야 한다.
 */
const LATIN = ['assets/fonts/Pretendard-Regular.otf', 'assets/fonts/Pretendard-SemiBold.otf'];
const JAPANESE = ['assets/fonts/NotoSansJP-Regular.ttf', 'assets/fonts/NotoSansJP-SemiBold.ttf'];

/**
 * 검사할 언어와, 그 언어를 그릴 글꼴.
 *
 * **언어를 더할 때 여기에 한 줄 더한다.** 안 적으면 그 언어의 글자가 글꼴에 있는지
 * 아무도 안 본 채로 배포된다.
 *
 * 예외 목록은 두지 않는다. "이 글자는 시스템 글꼴로 그려져도 괜찮다" 를 한 번
 * 허용하면 그 언어 화면에 글꼴이 섞이는 것을 받아들이는 것이고, 그 판단이 목록에
 * 조용히 쌓인다. 글꼴이 모자라면 예외를 적는 대신 글꼴을 넣는다.
 */
const CATALOGS: { tag: string; catalog: Record<string, unknown>; fonts: string[] }[] = [
  { tag: 'ko', catalog: ko, fonts: LATIN },
  { tag: 'en', catalog: en, fonts: LATIN },
  { tag: 'ru', catalog: ru, fonts: LATIN },
  { tag: 'ja', catalog: ja, fonts: JAPANESE },
];

test('글꼴 파일을 읽을 수 있다', () => {
  for (const font of LATIN) {
    const got = fontCodepoints(font);
    assert.ok(got.size > 1000, `${font}: 글자가 ${got.size}자뿐이다 — 잘못 읽었다`);
    // 한글·라틴·키릴은 반드시 있어야 한다. 없으면 파일이 바뀐 것이다.
    for (const ch of '가힣AZaz09АЯая') {
      assert.ok(got.has(ch.codePointAt(0) ?? 0), `${font}: '${ch}' 가 없다`);
    }
  }
  for (const font of JAPANESE) {
    const got = fontCodepoints(font);
    // 필요한 글자만 남기고 잘라낸 글꼴이라 작다 (`tools/fonts/subset_ja.py`).
    // 가나와 영문·숫자는 반드시 있어야 한다 — 일본어 화면에도 이름과 숫자가 나온다.
    for (const ch of 'あんアンAZaz09') {
      assert.ok(got.has(ch.codePointAt(0) ?? 0), `${font}: '${ch}' 가 없다`);
    }
  }
});

test('화면에 쓰는 글자가 그 언어의 글꼴에 들어 있다', () => {
  const report: string[] = [];
  for (const { tag, catalog, fonts } of CATALOGS) {
    // 굵은 글꼴에도 있어야 한다. 한쪽에만 있으면 제목에서만 글꼴이 바뀐다.
    for (const font of fonts) {
      const inFont = fontCodepoints(font);
      const missing = [...charsUsed(catalog)].filter((ch) => {
        const cp = ch.codePointAt(0) ?? 0;
        return cp > 0x7f && !inFont.has(cp);
      });
      if (missing.length > 0) {
        report.push(`${tag} / ${font}: ${missing.length}자 없음 (${missing.slice(0, 12).join(' ')}…)`);
      }
    }
  }
  assert.deepEqual(report, [], `글꼴에 없는 글자: ${report.join(' / ')}`);
});

test('굵은 글꼴도 보통 글꼴과 같은 글자를 담고 있다', () => {
  // 한쪽에만 있으면 굵게 쓴 곳에서만 글꼴이 바뀐다. 제목에서만 모양이 다른 셈이다.
  for (const pair of [LATIN, JAPANESE]) {
    const regular = fontCodepoints(pair[0] ?? '');
    const bold = fontCodepoints(pair[1] ?? '');
    const onlyRegular = [...regular].filter((cp) => !bold.has(cp));
    assert.deepEqual(onlyRegular, [], `${pair[0]}: 보통 글꼴에만 있는 글자 ${onlyRegular.length}자`);
  }
});
