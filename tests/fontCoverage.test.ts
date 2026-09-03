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

const FONTS = ['assets/fonts/Pretendard-Regular.otf', 'assets/fonts/Pretendard-SemiBold.otf'];

/**
 * 검사할 언어.
 *
 * **언어를 더할 때 여기에 한 줄 더한다.** 안 적으면 그 언어의 글자가 글꼴에 있는지
 * 아무도 안 본 채로 배포된다.
 */
const CATALOGS: Record<string, Record<string, unknown>> = { ko, en, ja, ru };

/**
 * 글꼴에 없어도 넘어가는 글자.
 *
 * 여기에 적는 것은 "이 글자는 시스템 글꼴로 그려져도 괜찮다"는 뜻이다.
 * **하나 적을 때마다 그 언어 화면에 글꼴이 섞인다는 것을 받아들이는 것이다.**
 */
const ALLOWED_MISSING: Record<string, string> = {
  ja: '일본어 한자는 Pretendard 에 없다. 안드로이드가 시스템 글꼴로 대신 그린다 — docs/국제화.md 5-3',
};

test('글꼴 파일을 읽을 수 있다', () => {
  for (const font of FONTS) {
    const got = fontCodepoints(font);
    assert.ok(got.size > 1000, `${font}: 글자가 ${got.size}자뿐이다 — 잘못 읽었다`);
    // 한글·라틴·키릴은 반드시 있어야 한다. 없으면 파일이 바뀐 것이다.
    for (const ch of '가힣AZaz09АЯая') {
      assert.ok(got.has(ch.codePointAt(0) ?? 0), `${font}: '${ch}' 가 없다`);
    }
  }
});

test('화면에 쓰는 글자가 글꼴에 들어 있다', () => {
  const inFont = fontCodepoints(FONTS[0] ?? '');
  const report: string[] = [];
  for (const [tag, catalog] of Object.entries(CATALOGS)) {
    if (ALLOWED_MISSING[tag]) continue;
    const missing = [...charsUsed(catalog)].filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp > 0x7f && !inFont.has(cp);
    });
    if (missing.length > 0) {
      report.push(`${tag}: ${missing.length}자 없음 (${missing.slice(0, 12).join(' ')}…)`);
    }
  }
  assert.deepEqual(report, [], `글꼴에 없는 글자: ${report.join(' / ')}`);
});

test('굵은 글꼴도 보통 글꼴과 같은 글자를 담고 있다', () => {
  // 한쪽에만 있으면 굵게 쓴 곳에서만 글꼴이 바뀐다. 제목에서만 모양이 다른 셈이다.
  const regular = fontCodepoints(FONTS[0] ?? '');
  const bold = fontCodepoints(FONTS[1] ?? '');
  const onlyRegular = [...regular].filter((cp) => !bold.has(cp));
  assert.deepEqual(onlyRegular, [], `보통 글꼴에만 있는 글자 ${onlyRegular.length}자`);
});
