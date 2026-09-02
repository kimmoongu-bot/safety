/**
 * 어느 언어로 보여 줄지 고른다 (`docs/국제화.md` 5장).
 *
 *   1) 사용자가 설정에서 고른 것
 *   2) 없으면 기기 언어에 맞는 것
 *   3) 그것도 없으면 영어
 *
 * **기본값이 영어인 이유**: 태국어 폰에서 앱을 열었는데 한국어가 뜨면 한 글자도
 * 못 읽는다. 영어면 최소한 버튼은 알아본다.
 *
 * **이 파일은 react-native 를 부르지 않는다.** 규칙만 있으므로 노드에서 검사한다.
 */
export const FALLBACK = 'en';

/** `ko-KR` → `ko`. 지역까지 맞는 것이 있으면 그것을 먼저 쓴다. */
function base(tag: string): string {
  return tag.toLowerCase().split(/[-_]/)[0] ?? '';
}

export function pickLocale(
  available: readonly string[],
  deviceTags: readonly string[],
  chosen?: string,
): string {
  const has = (tag: string) => available.find((a) => a.toLowerCase() === tag.toLowerCase());

  // 1) 사용자가 고른 것이 실제로 있으면 그것
  if (chosen) {
    const exact = has(chosen) ?? has(base(chosen));
    if (exact) return exact;
  }

  // 2) 기기가 원하는 순서대로 본다. 지역까지 맞는 것을 먼저 찾고, 없으면 언어만 맞춰 본다.
  for (const tag of deviceTags) {
    const exact = has(tag);
    if (exact) return exact;
    const loose = available.find((a) => base(a) === base(tag));
    if (loose) return loose;
  }

  // 3) 영어. 그것도 없으면 가진 것 중 첫 번째 (한 언어뿐일 때를 위한 안전장치)
  return has(FALLBACK) ?? available[0] ?? FALLBACK;
}
