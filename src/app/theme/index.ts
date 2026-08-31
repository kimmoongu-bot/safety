/**
 * 화면 기준값 (명세 3장 UI 원칙)
 * - 본문 최소 17sp
 * - 터치 타깃 최소 48dp
 * - 본문 대비 4.5:1 이상
 * - 글꼴 200% 확대에서도 레이아웃이 깨지지 않아야 하므로, 높이는 고정하지 않고
 *   최소값(minHeight)만 준다.
 */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F4F6F8',
  border: '#C9CED6',
  text: '#14181F', // 흰 바탕 대비 16.5:1
  textDim: '#4A5260', // 흰 바탕 대비 8.6:1
  primary: '#1350A8', // 흰 바탕 대비 7.5:1
  primaryText: '#FFFFFF',
  danger: '#A61B1B', // 흰 바탕 대비 7.3:1
  ok: '#12654A',
  warnBg: '#FFF6E0',
  warnText: '#6B4A00',
  favorite: '#B26A00',
  /** 앱 상자 바깥 바탕. 앱이 액자 안에 담긴 것처럼 보이게 한다. */
  frame: '#1E232B',
} as const;

export const font = {
  body: 18,
  bodySmall: 17,
  label: 17,
  title: 26,
  big: 22,
  huge: 34,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34,
} as const;

/** 터치 타깃 최소 크기 */
export const TOUCH = 48;

export const radius = { sm: 8, md: 12, lg: 18 } as const;

/**
 * 앱 상자 (액자)
 *
 * 화면 전체를 채우지 않고, 둘레에 여백을 두고 모서리 둥근 상자 안에 담는다.
 * 여백을 늘리면 그만큼 쓸 수 있는 화면이 줄어든다. 명세 3장이 요구하는
 * 본문 17sp · 터치 48dp · 글꼴 200% 확대를 지켜야 하므로 얇게 잡는다.
 */
export const frame = { inset: 10, radius: 22 } as const;
