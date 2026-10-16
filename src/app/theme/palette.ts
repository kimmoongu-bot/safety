/**
 * 색 한 벌 — 밝은 것과 어두운 것.
 *
 * **이 파일은 react-native 를 부르지 않는다.** 그래야 노드에서 그냥 읽을 수 있고,
 * `tests/palette.test.ts` 가 모든 색의 대비를 직접 재서 검사할 수 있다.
 * 색을 손볼 때마다 사람이 계산기를 두드릴 수는 없다.
 */
/** 한 벌의 색. 밝은 것과 어두운 것이 같은 이름을 갖는다. */
export type Palette = {
  bg: string;
  surface: string;
  border: string;
  /** 숫자판처럼 테두리 없이 바탕만 살짝 띄워 놓는 칸 */
  keyFill: string;
  text: string;
  textDim: string;
  primary: string;
  primaryText: string;
  secondary: string;
  accent: string;
  accentText: string;
  danger: string;
  ok: string;
  warnBg: string;
  warnText: string;
  warnBorder: string;
  favorite: string;
  toastOkBg: string;
  toastBadBg: string;
  /** 시계·배터리를 밝게 그릴지 어둡게 그릴지 */
  statusBar: 'light' | 'dark';
};

/**
 * 밝은 색 — **흰 바탕에 검정 줄.**
 *
 * 바탕과 카드가 **같은 흰색**이다. 그래서 무엇이 어디까지인지는 전부 `border`
 * 가 그리는 검정 줄이 말한다. 줄이 화면의 뼈대다.
 *
 * 색으로 꾸미지 않는다. 색을 가진 것은 셋뿐이고 모두 **뜻이 있다** —
 * `accent`(누를 곳 하나), `danger`(지우기), `ok`(잘됨).
 * 지우는 단추가 다른 단추와 똑같아 보이면 안 된다.
 *
 * 옆에 적은 비율은 흰 바탕 위에서 잰 값이다. 명세는 4.5:1 이상을 요구한다.
 */
export const lightColors: Palette = {
  bg: '#FFFFFF', // 흰 종이
  surface: '#FFFFFF', // 카드·입력창도 같은 흰색 — 구분은 줄이 한다
  border: '#000000', // 검정 줄. 이 색이 화면의 뼈대다
  keyFill: '#F1F3F5', // 숫자판. 테두리 없이 바탕만 살짝 띄운다. 그 위 글자 15.6:1
  text: '#1A1A1A', // 17.4:1
  textDim: '#4A4A4A', // 9.0:1
  primary: '#1A1A1A', // 기본 버튼 바탕. 그 위 흰 글자 17.4:1
  primaryText: '#FFFFFF',
  secondary: '#1A1A1A', // 이름표 네모. 먹색 바탕에 흰 글자
  accent: '#1D4ED8', // 6.7:1 — 화면에서 색을 가진 것은 이 하나뿐이다
  accentText: '#FFFFFF',
  danger: '#9B2226', // 7.9:1 — 지우기는 색이 뜻을 가진다
  ok: '#2E5E3E', // 7.5:1
  warnBg: '#FFFFFF',
  warnText: '#000000',
  warnBorder: '#000000',
  favorite: '#1A1A1A',
  toastOkBg: '#FFFFFF',
  toastBadBg: '#FFFFFF',
  statusBar: 'dark', // 바깥이 흰색이므로 시계는 어둡게
};

/**
 * 어두운 색 — **검정 바탕에 흰 줄.**
 *
 * 밝은 것을 그대로 뒤집은 것이다. 흰 바탕에 검정 줄이면, 어두운 데서는 검정
 * 바탕에 흰 줄이어야 같은 생김새가 된다.
 *
 * 뜻을 가진 색 셋(`accent`·`danger`·`ok`)만 어두운 바탕에서 보이도록 따로 골랐다.
 * 밝을 때 쓰던 짙은 파랑·빨강·초록은 검정 위에서 안 보인다.
 */
export const darkColors: Palette = {
  bg: '#000000',
  surface: '#000000',
  border: '#FFFFFF', // 밝은 데서 검정이던 줄이 여기서는 흰 줄이다
  keyFill: '#202427', // 숫자판. 밝은 데서 살짝 어둡던 칸이 여기서는 살짝 밝다. 그 위 글자 15.6:1
  text: '#FFFFFF', // 21:1
  textDim: '#B5B5B5', // 10.3:1
  primary: '#FFFFFF', // 밝은 버튼. 그 위 검정 글자 21:1
  primaryText: '#000000',
  secondary: '#FFFFFF',
  accent: '#7FB0FF', // 9.5:1 — 밝은 벌의 파랑을 어두운 바탕에서 읽히게 올린 것
  accentText: '#000000',
  danger: '#E88A8A', // 8.2:1
  ok: '#7FC49A', // 10.1:1
  warnBg: '#000000',
  warnText: '#FFFFFF',
  warnBorder: '#FFFFFF',
  favorite: '#FFFFFF',
  toastOkBg: '#000000',
  toastBadBg: '#000000',
  statusBar: 'light',
};

/**
 * 지금 쓰는 색.
 *
 * 화면 밖(스타일 만들 때)에서도 필요하므로 기본값은 밝은 것으로 둔다.
 * 화면 안에서는 `useColors()` 를 쓴다.
 */
export const colors = lightColors;
