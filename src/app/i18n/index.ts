import { useMemo } from 'react';
import { ko, type MessageKey } from './ko.ts';
import { makePseudo, PSEUDO_LOCALE } from './pseudo.ts';
import { pickLocale } from './pickLocale.ts';
import { type Catalog, type Params, translate } from './types.ts';

export type { MessageKey };
export { PSEUDO_LOCALE };

/**
 * 가진 언어.
 *
 * 지금은 한국어뿐이다. 영어·일본어를 넣을 때 여기에 한 줄씩 더한다
 * (`docs/국제화.md` 6장).
 *
 * `xx-LONG` 은 사람이 쓰는 언어가 아니다. 문장을 1.8배로 늘려 놓은 것으로,
 * 번역을 기다리지 않고 화면 깨짐을 잡는 데 쓴다. 설정에서 고를 수 있게 하지 않는다.
 */
const CATALOGS: Record<string, Catalog> = {
  ko,
  [PSEUDO_LOCALE]: makePseudo(ko),
};

export const AVAILABLE = ['ko'] as const;

/** 기기가 원하는 언어. Intl 이 없거나 막히면 빈 목록으로 둔다. */
function deviceTags(): string[] {
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale];
  } catch {
    return [];
  }
}

/** 지금 쓸 언어와 문장 목록. */
export function useLocale(chosen?: string): { locale: string; catalog: Catalog } {
  return useMemo(() => {
    const locale = chosen === PSEUDO_LOCALE ? PSEUDO_LOCALE : pickLocale(AVAILABLE, deviceTags(), chosen);
    return { locale, catalog: CATALOGS[locale] ?? ko };
  }, [chosen]);
}

/**
 * 화면에서 문장을 꺼내 쓴다.
 *
 *   const t = useT();
 *   <Text>{t('lock.open')}</Text>
 *   <Text>{t('lock.failures', { count: 3 })}</Text>
 *
 * 열쇠 이름을 잘못 적으면 타입 검사에서 걸린다. 없는 열쇠를 부르면 화면에
 * 열쇠 이름이 그대로 나온다 — 빈칸보다 눈에 띄어서 바로 고치게 된다.
 */
export function useT(chosen?: string): (key: MessageKey, params?: Params) => string {
  const { catalog } = useLocale(chosen);
  return useMemo(() => (key: MessageKey, params?: Params) => translate(catalog, key, params), [catalog]);
}
