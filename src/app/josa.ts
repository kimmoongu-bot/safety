/**
 * 조사 붙이기.
 *
 * 화면에 나오는 말이 "지문·얼굴으로도 열까요?" 처럼 어색해지는 것을 막는다.
 * 앞 글자의 받침에 따라 조사가 달라진다.
 *  - 로 / 으로 : 받침이 없거나 ㄹ 받침이면 "로" (얼굴로, 지문으로)
 *  - 을 / 를   : 받침이 있으면 "을" (지문을, 얼굴을)
 *  - 이 / 가, 은 / 는 도 같은 규칙
 */
function batchim(word: string): { has: boolean; isRieul: boolean } {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (Number.isNaN(code) || code < 0 || code > 11171) return { has: false, isRieul: false };
  const jong = code % 28;
  return { has: jong !== 0, isRieul: jong === 8 };
}

/** 지문 → 지문으로 · 얼굴 → 얼굴로 */
export function ro(word: string): string {
  const { has, isRieul } = batchim(word);
  return `${word}${!has || isRieul ? '로' : '으로'}`;
}

/** 지문 → 지문을 · 코 → 코를 */
export function eul(word: string): string {
  return `${word}${batchim(word).has ? '을' : '를'}`;
}

/** 지문 → 지문이 · 코 → 코가 */
export function i(word: string): string {
  return `${word}${batchim(word).has ? '이' : '가'}`;
}
