/**
 * 개인정보 처리방침을 **웹 한 장**으로 만든다.
 *
 * 스토어는 방침을 볼 수 있는 웹 주소를 요구한다. 그런데 방침 원본은
 * `docs/개인정보처리방침.md` 다. 웹 페이지를 손으로 따로 쓰면 사본이 하나 더
 * 생기고, 언젠가 한쪽만 고친다. 그래서 **원본에서 만들어 낸다.**
 *
 *     node tools/site/build-privacy.mjs
 *
 * `tests/site.test.ts` 가 만들어 둔 것과 지금 만든 것이 같은지 본다. 원본을
 * 고치고 이걸 안 돌리면 검사가 걸린다.
 *
 * ## 옮기는 것과 안 옮기는 것
 *
 * **맨 위 인용 덩이는 안 옮긴다.** 그건 "여기를 고치면 저기도 고쳐라" 같은 우리끼리
 * 하는 말이라, 방침을 읽으러 온 사람에게는 아무 뜻이 없다.
 *
 * ## 모르는 것은 옮기지 않고 멈춘다
 *
 * 이 변환기는 원본에 실제로 쓰인 것만 안다 — 제목, 문단, 굵은 글씨, 메일 주소.
 * 목록이나 표가 새로 들어오면 **소리 내어 멎는다.** 조용히 넘기면 방침의 한
 * 줄이 웹에서 사라지는데, 그건 아무도 모른다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = join('docs', '개인정보처리방침.md');
const TARGET = join('site', 'index.html');

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 굵은 글씨와 메일 주소. 그 밖의 표시는 위에 적은 대로 멎게 한다. */
function inline(text) {
  const unknown = /`|\[[^\]]*\]\(|^\s*[-*]\s|^\s*\|/.exec(text);
  if (unknown) throw new Error(`옮길 줄 모르는 표시가 있다: ${text.trim()}`);
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');
}

function blocks(markdown) {
  const out = [];
  let paragraph = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    out.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (const line of markdown.split('\n')) {
    // 우리끼리 하는 말. 웹에는 안 나간다.
    if (line.startsWith('>')) continue;
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      out.push({ kind: 'h2', text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith('# ')) {
      flush();
      out.push({ kind: 'h1', text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith('#')) throw new Error(`더 작은 제목은 아직 못 옮긴다: ${line}`);
    paragraph.push(line.trim());
  }
  flush();
  return out;
}

/*
  꾸밈은 최소로 둔다. 읽으러 온 사람이 있고, 그 사람은 대개 급하다.

  글자 크기를 px 로 박지 않는다. 폰이나 브라우저에서 글씨를 키워 둔 분이
  그대로 크게 보셔야 한다 — 앱에서 지키는 것을 여기서 어길 이유가 없다.
  색은 밝은 화면과 어두운 화면을 따로 둔다.
*/
const STYLE = `
:root { color-scheme: light dark; }
body {
  margin: 0 auto; padding: 1.5rem 1.25rem 4rem; max-width: 38rem;
  font-family: system-ui, -apple-system, "Malgun Gothic", sans-serif;
  font-size: 1.0625rem; line-height: 1.7;
  color: #24211c; background: #f6f3ec;
}
h1 { font-size: 1.5rem; line-height: 1.4; margin: 0 0 0.25rem; }
h2 { font-size: 1.1875rem; line-height: 1.4; margin: 2rem 0 0.5rem; }
p { margin: 0.75rem 0; }
a { color: #6b4f2e; }
strong { font-weight: 600; }
@media (prefers-color-scheme: dark) {
  body { color: #ece7dd; background: #191714; }
  a { color: #d8b384; }
}
`.trim();

function page(parts) {
  const title = parts.find((b) => b.kind === 'h1')?.text ?? '개인정보 처리방침';
  const body = parts
    .map((b) => `    <${b.kind}>${inline(b.text)}</${b.kind}>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
${STYLE}
    </style>
  </head>
  <body>
${body}
  </body>
</html>
`;
}

export function buildPrivacyHtml(markdown) {
  return page(blocks(markdown));
}

export const PRIVACY_SOURCE = SOURCE;
export const PRIVACY_TARGET = TARGET;

// 직접 부르면 파일을 쓴다. 검사에서 부르면 글만 돌려받는다.
if (process.argv[1] && process.argv[1].endsWith('build-privacy.mjs')) {
  const html = buildPrivacyHtml(readFileSync(SOURCE, 'utf8'));
  writeFileSync(TARGET, html);
  console.log(`${TARGET} — ${html.length}자`);
}
