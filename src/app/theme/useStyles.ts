import { useMemo } from 'react';
import { useLocale } from '../i18n/index.ts';
import { type FontFamily, familyFor } from './fonts.ts';
import { type Palette, useColors } from './index.ts';

/**
 * 색과 글꼴이 바뀌면 같이 바뀌는 스타일.
 *
 * 예전에는 파일을 읽을 때 `StyleSheet.create({...})` 로 스타일을 한 번 만들고 끝이었다.
 * 그러면 색이 파일 읽는 순간에 박혀서 밝게/어둡게를 바꿀 수 없다.
 *
 * 이제 스타일을 '만드는 방법'만 적어 두고, 화면이 그릴 때 지금 값으로 만든다.
 * 한 벌당 한 번만 만들어 두고 다시 쓴다 — 화면을 그릴 때마다 새로 만들면 느리고,
 * 스타일이 매번 새 값이 되어 괜히 다시 그리게 된다.
 *
 * **글꼴을 여기서 넘기는 이유.** 일본어는 다른 글꼴로 그려야 한다 (`fonts.ts`).
 * 글꼴 이름을 파일 맨 위에 상수로 두면 그것도 파일 읽는 순간에 박혀서 못 바꾼다.
 * 색과 똑같은 문제라 똑같이 푼다.
 *
 * 쓰는 법:
 *
 *   const useStyles = createStyles((c, f) => StyleSheet.create({
 *     box: { backgroundColor: c.bg },
 *     text: { fontFamily: f.family, fontSize: font.body, color: c.text },
 *   }));
 *
 *   function 화면() {
 *     const styles = useStyles();
 *     ...
 *   }
 */
export function createStyles<T>(build: (colors: Palette, fonts: FontFamily) => T): () => T {
  // 색 한 벌 × 글꼴 한 벌마다 하나씩. 둘 다 몇 개 안 되므로 그냥 들고 있는다.
  const cache = new Map<Palette, Map<FontFamily, T>>();
  return function useStyles(): T {
    const colors = useColors();
    const { locale } = useLocale();
    const fonts = familyFor(locale);
    return useMemo(() => {
      let byFont = cache.get(colors);
      if (!byFont) {
        byFont = new Map();
        cache.set(colors, byFont);
      }
      let made = byFont.get(fonts);
      if (!made) {
        made = build(colors, fonts);
        byFont.set(fonts, made);
      }
      return made;
    }, [colors, fonts]);
  };
}
