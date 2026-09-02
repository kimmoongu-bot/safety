import { type Catalog, type Message } from './types.ts';

/**
 * 가짜 언어 — 번역을 기다리지 않고 화면 깨짐을 잡는다 (`docs/국제화.md` 4장).
 *
 * 지금 "스크롤 없이 한 화면에 들어온다" 는 것을 실기기에서 확인했지만,
 * **그건 한국어라서 들어온 것이다.** 같은 뜻이 독일어·핀란드어에서는 1.8배까지
 * 길어진다. 번역이 온 다음에 알면 늦다.
 *
 * 그래서 문장을 일부러 늘린 언어를 하나 만들어 둔다. 이 언어로 화면을 훑으면
 * 어디가 넘치는지 미리 보인다.
 *
 * 자리 표시자(`{name}`)는 건드리지 않는다. 늘렸다가 값이 안 들어가면 그게 더 큰 문제다.
 */
export const PSEUDO_LOCALE = 'xx-LONG';

/** 늘릴 때 붙이는 글자. 한글과 라틴 문자를 섞어 글꼴 문제도 같이 드러낸다. */
const PADDING = '뷁Wǿ';

/** 독일어·핀란드어가 한국어 대비 이 정도까지 길어진다. */
export const STRETCH = 1.8;

export function stretch(text: string, ratio = STRETCH): string {
  // 자리 표시자를 뺀 길이를 기준으로 늘린다.
  const bare = text.replace(/\{\w+\}/g, '');
  const extra = Math.max(0, Math.round(bare.length * (ratio - 1)));
  if (extra === 0) return text;
  let pad = '';
  while (pad.length < extra) pad += PADDING;
  return `${text} ${pad.slice(0, extra)}`;
}

/** 문장 목록 하나를 통째로 늘린 목록으로 바꾼다. */
export function makePseudo(catalog: Catalog, ratio = STRETCH): Catalog {
  const out: Catalog = {};
  for (const [key, value] of Object.entries(catalog)) {
    out[key] = (typeof value === 'function'
      ? ((p) => stretch(value(p), ratio)) satisfies Message
      : stretch(value, ratio)) as Message;
  }
  return out;
}
