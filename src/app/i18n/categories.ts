import type { MessageKey } from './ko.ts';

/**
 * 갈래.
 *
 * **금고에는 아래 코드가 저장되고 화면에는 번역된 말이 나온다.** 한국어를 그대로
 * 저장하면 일본어 사용자가 자기 금고에서 한국어 갈래를 보게 된다.
 *
 * 이 코드는 저장되는 값이므로 **한 번 정하면 바꾸지 않는다** (`docs/국제화.md` 2장).
 * 보이는 말은 언제든 바꿀 수 있다.
 */
export const CATEGORY_CODES = ['bank', 'card', 'shopping', 'gov', 'telecom', 'other'] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];

export const DEFAULT_CATEGORY: CategoryCode = 'other';

function isCode(value: string): value is CategoryCode {
  return (CATEGORY_CODES as readonly string[]).includes(value);
}

/**
 * 저장된 값을 화면에 보여 줄 말로 바꾼다.
 *
 * 코드를 쓰기 전에 저장된 항목에는 한국어가 그대로 들어 있다("은행"). 그런 값은
 * **번역하지 않고 그대로 보여 준다.** 옛 항목이 갑자기 빈칸이 되면 안 된다.
 */
export function categoryLabel(stored: string, t: (key: MessageKey) => string): string {
  return isCode(stored) ? t(`category.${stored}`) : stored;
}
