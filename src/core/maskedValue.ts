/**
 * 가린 글자로만 된 값인지 본다.
 *
 * 보안 키패드를 쓰는 앱은 입력 칸에 진짜 비밀번호 대신 `**********` 같은 가린
 * 글자를 넣어 둔다. 진짜 값은 키패드 부품이 따로 들고 있다 (docs/자동완성.md 18장).
 * 담기에서 그 칸을 그대로 받아 오면 **별표가 비밀번호로 담긴다.** 사용자는 담긴 줄
 * 알고, 나중에 넣어 보면 틀린다. 안 묻는 것보다 나쁘다.
 *
 * 2026-09-19 손택스에서 실제로 받았다 — 별표 열 개.
 *
 * 진짜 비밀번호가 별표로만 되어 있을 수도 있지만, 그때 잃는 것은 "직접 넣어 주세요"
 * 한 번이다. 별표를 비밀번호로 담는 쪽이 훨씬 비싸다.
 */
const MASK_CHARS = new Set(['*', '＊', '•', '●', '·', '∙', '⋅']);

export function isMaskOnly(value: string | null | undefined): boolean {
  if (!value) return false;
  for (const ch of value) {
    if (!MASK_CHARS.has(ch)) return false;
  }
  return true;
}
