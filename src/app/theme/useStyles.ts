import { useMemo } from 'react';
import { type Palette, useColors } from './index.ts';

/**
 * 색이 바뀌면 같이 바뀌는 스타일.
 *
 * 예전에는 파일을 읽을 때 `StyleSheet.create({...})` 로 스타일을 한 번 만들고 끝이었다.
 * 그러면 색이 파일 읽는 순간에 박혀서 밝게/어둡게를 바꿀 수 없다.
 *
 * 이제 스타일을 '만드는 방법'만 적어 두고, 화면이 그릴 때 지금 색으로 만든다.
 * 한 벌당 한 번만 만들어 두고 다시 쓴다 — 화면을 그릴 때마다 새로 만들면 느리고,
 * 스타일이 매번 새 값이 되어 괜히 다시 그리게 된다.
 *
 * 쓰는 법:
 *
 *   const useStyles = createStyles((c) => StyleSheet.create({ box: { backgroundColor: c.bg } }));
 *
 *   function 화면() {
 *     const styles = useStyles();
 *     ...
 *   }
 */
export function createStyles<T>(build: (colors: Palette) => T): () => T {
  const cache = new Map<Palette, T>();
  return function useStyles(): T {
    const colors = useColors();
    return useMemo(() => {
      let made = cache.get(colors);
      if (!made) {
        made = build(colors);
        cache.set(colors, made);
      }
      return made;
    }, [colors]);
  };
}
