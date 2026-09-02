/**
 * 화면 기준값 (명세 3장 UI 원칙 + 디자인 시안)
 *
 * - 터치 타깃 최소 48dp
 * - 본문 대비 4.5:1 이상 — 아래 색은 전부 재서 넣었다
 * - 글꼴 200% 확대에서도 레이아웃이 깨지지 않아야 하므로, 높이는 고정하지 않고
 *   최소값(minHeight)만 준다
 *
 * **본문 크기는 명세를 벗어난다.** 명세 3장은 본문 최소 17sp 이지만 시안이 16 이고,
 * 기기에서 읽히는 것을 확인한 뒤 16 으로 확정했다 (2026-09-02).
 * 중장년층이 주 대상이라 정했던 숫자이므로, 나중에 실제 사용자에게서 "작다" 는 말이
 * 나오면 아래 `body` 한 줄만 고치면 된다.
 */

import { Platform, useColorScheme } from 'react-native';
import { usePrefsStore } from '../state/prefsStore.ts';
import { darkColors, lightColors, type Palette } from './palette.ts';

/**
 * 글꼴 — Pretendard (SIL OFL 1.1)
 *
 * 라이선스 원문은 `assets/fonts/Pretendard-OFL.txt` 에 같이 넣어 두었다.
 * OFL 은 소프트웨어에 넣어 파는 것을 명시적으로 허용한다. 글꼴 자체를 따로 팔거나,
 * 고친 것에 'Pretendard' 이름을 붙이는 것만 금지한다. 우리는 원본 그대로 넣는다.
 *
 * **굵기를 이름으로 직접 고른다.** 안드로이드에 굵기 짝짓기를 맡기면 없는 굵기를
 * 기계가 억지로 굵게 그려(가짜 굵기) 글자가 뭉개진다. 두 벌만 넣었으므로
 * 어느 것을 쓸지 우리가 정한다.
 *
 * 이름이 플랫폼마다 다르다. 안드로이드는 파일 이름을, 아이폰은 글꼴 안에 적힌
 * 이름을 쓴다. (아이폰은 아직 기기에서 확인하지 않았다.)
 */
const FAMILY = Platform.select({
  android: { regular: 'Pretendard-Regular', bold: 'Pretendard-SemiBold' },
  default: { regular: 'Pretendard', bold: 'Pretendard' },
});

/**
 * 색 — 디자인 시안의 색 체계.
 *
 * 옆에 적은 비율은 크림 바탕(#F6F3EC) 위에서 잰 값이다. 명세는 4.5:1 이상을 요구한다.
 * 시안의 강조색 #8A6A45 는 4.48:1 로 아슬하게 미달이라 조금 어둡게 했다.
 */
export { type Palette, lightColors, darkColors, colors } from './palette.ts';

/**
 * 글자 크기 — 시안의 단계를 따른다 (제목 20 · 본문 16 · 설명 13).
 *
 * 숫자판과 버튼 글자는 시안에 없어서 따로 정했다. 눌러야 하는 것이라
 * 읽는 글보다 크게 둔다.
 */
export const font = {
  /** 본문·설명에 쓰는 보통 굵기 */
  family: FAMILY.regular,
  /** 제목·버튼·이름표에 쓰는 굵은 것 (시안의 SemiBold) */
  familyBold: FAMILY.bold,
  title: 20,
  body: 16,
  bodySmall: 15,
  label: 16,
  caption: 13,
  big: 18, // 버튼
  huge: 28, // 숫자판
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34,
} as const;

/** 터치 타깃 최소 크기. 글자가 작아져도 이건 줄이지 않는다. */
export const TOUCH = 48;

export const radius = { sm: 8, md: 12, lg: 18 } as const;

/**
 * 굵기.
 *
 * 굵기는 글꼴 이름으로 고르므로 `fontWeight` 는 항상 'normal' 로 둔다.
 * '700' 같은 값을 같이 주면 안드로이드가 굵은 글꼴을 **한 번 더** 굵게 그려
 * 획이 뭉개진다.
 */
export const WEIGHT = 'normal' as const;

/**
 * 지금 쓸 색 한 벌.
 *
 * 설정에서 고른 값이 먼저다. '자동'이면 폰 설정을 따라간다.
 *
 * 고른 값은 잠금 화면에서도 읽혀야 해서 금고 밖에 따로 보관한다 — core/prefs.ts.
 * 금고 안에 두면 금고를 열기 전에는 못 읽어서, 잠금 화면만 폰 설정을 따르고
 * 금고를 여는 순간 색이 바뀐다.
 */
export function useColors(): Palette {
  const choice = usePrefsStore((s) => s.prefs.theme);
  const system = useColorScheme();
  const dark = choice === 'system' ? system === 'dark' : choice === 'dark';
  return dark ? darkColors : lightColors;
}

/**
 * 앱 상자 (액자)
 *
 * 화면 전체를 채우지 않고, 둘레에 여백을 두고 모서리 둥근 상자 안에 담는다.
 * 여백을 늘리면 그만큼 쓸 수 있는 화면이 줄어든다.
 */
export const frame = { inset: 10, radius: 22 } as const;
