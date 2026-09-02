/**
 * 문장 목록의 뼈대.
 *
 * **이 파일은 react-native 를 부르지 않는다.** 노드에서 그냥 읽혀야 검사할 수 있다.
 */

/** 문장에 끼워 넣는 값. `{name}` 자리에 들어간다. */
export type Params = Record<string, string | number>;

/**
 * 문장 하나.
 *
 * 보통은 그냥 글이다. 자리 표시자는 `{name}` 으로 적는다.
 *
 * 함수도 쓸 수 있다. 한국어처럼 **앞말에 따라 조사가 달라지는** 언어 때문이다
 * ("지문으로" / "얼굴로"). 다른 언어는 대부분 그냥 글이면 되므로, 번역자는
 * 글만 옮기면 된다.
 */
export type Message = string | ((p: Params) => string);

export type Catalog = Record<string, Message>;

/**
 * `{name}` 자리를 값으로 바꾼다.
 *
 * 없는 자리는 그대로 둔다 — 빈칸으로 만들면 문장이 이상해지는데 아무도 모른다.
 * 자리 표시자가 그대로 보이면 바로 눈에 띈다.
 */
export function fill(text: string, params: Params = {}): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function translate(catalog: Catalog, key: string, params: Params = {}): string {
  const found = catalog[key];
  if (found === undefined) {
    // 없는 열쇠는 열쇠 이름을 그대로 보여 준다. 빈칸보다 낫다 — 눈에 띄어야 고친다.
    return key;
  }
  return typeof found === 'function' ? found(params) : fill(found, params);
}

/**
 * 개수에 따라 갈리는 문장.
 *
 * 한국어·일본어는 한 갈래지만 영어는 둘, 러시아어는 셋, 아랍어는 여섯이다.
 * 어느 갈래인지는 `Intl.PluralRules` 가 안다.
 */
export function pluralKey(locale: string, count: number): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return 'other';
  }
}
