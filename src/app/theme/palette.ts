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
  frame: string;
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
 * 색으로 꾸미지 않는다. 다만 **뜻을 가진 색 둘은 남겼다** — `danger`(지우기)와
 * `ok`(잘됨). 지우는 단추가 다른 단추와 똑같아 보이면 안 된다.
 *
 * 옆에 적은 비율은 흰 바탕 위에서 잰 값이다. 명세는 4.5:1 이상을 요구한다.
 */
export const lightColors: Palette = {
  bg: '#FFFFFF', // 흰 종이
  surface: '#FFFFFF', // 카드·입력창도 같은 흰색 — 구분은 줄이 한다
  border: '#000000', // 검정 줄. 이 색이 화면의 뼈대다
  text: '#000000', // 21:1
  textDim: '#4A4A4A', // 9.0:1
  primary: '#2B2B2B', // 기본 버튼 바탕 — 먹색. 그 위 흰 글자 14.8:1
  primaryText: '#FFFFFF',
  secondary: '#000000', // 이름표 네모. 검정 바탕에 흰 글자
  accent: '#000000', // 21:1
  accentText: '#FFFFFF',
  danger: '#9B2226', // 7.9:1 — 지우기는 색이 뜻을 가진다
  ok: '#2E5E3E', // 7.5:1
  warnBg: '#FFFFFF',
  warnText: '#000000',
  warnBorder: '#000000',
  favorite: '#000000',
  frame: '#FFFFFF', // 상자 바깥도 흰색. 상자는 검정 줄로 드러난다
  toastOkBg: '#FFFFFF',
  toastBadBg: '#FFFFFF',
  statusBar: 'dark', // 바깥이 흰색이므로 시계는 어둡게
};

/**
 * 어두운 색 — **먹빛 바탕에 회색 줄.**
 *
 * 밝은 벌을 **그대로 뒤집지는 않는다.** 처음에는 그렇게 했다 — 흰 바탕에 검정 줄이니
 * 검정 바탕에 흰 줄로. 그런데 실기기에서 보니 흰 줄이 너무 세게 튀었다. 밝은 데서
 * 검정 줄은 바탕보다 **어두워서** 눈에 들어오지만, 어두운 데서 흰 줄은 바탕보다
 * **밝아서** 빛나 보인다. 같은 21:1 이라도 눈에 닿는 느낌이 다르다.
 *
 * 그래서 줄은 회색으로 내리고 바탕도 순검정에서 먹빛으로 올렸다. 글자는 읽혀야
 * 하므로 그대로 밝게 둔다 — **줄만 물러나고 글자는 안 물러난다.**
 *
 * 뜻을 가진 색 둘(`danger`·`ok`)은 어두운 바탕에서 보이도록 따로 골랐다.
 * 밝을 때 쓰던 짙은 빨강·초록은 어두운 바탕에서 안 보인다.
 */
export const darkColors: Palette = {
  bg: '#121212', // 순검정이 아니라 먹빛. 순검정 위에서는 모든 줄이 빛나 보인다
  surface: '#121212',
  /**
   * 줄.
   *
   * 바탕과의 대비가 2.4:1 이다 — 글자였다면 모자라지만 **줄은 글자가 아니다.**
   * 명세 3장이 4.5:1 을 요구하는 것은 읽어야 하는 것에 대한 것이고, 줄은
   * "여기까지" 를 말할 만큼만 보이면 된다. 여기서 더 올리면 다시 빛난다.
   */
  border: '#4E5257',
  text: '#E8E8E8', // 15.3:1
  textDim: '#A0A0A0', // 7.2:1
  primary: '#E8E8E8', // 밝은 버튼. 그 위 먹빛 글자 15.3:1
  primaryText: '#121212',
  secondary: '#E8E8E8',
  accent: '#E8E8E8',
  accentText: '#121212',
  danger: '#E88A8A', // 7.5:1
  ok: '#7FC49A', // 9.2:1
  warnBg: '#121212',
  warnText: '#E8E8E8',
  warnBorder: '#4E5257',
  favorite: '#E8E8E8',
  frame: '#121212',
  toastOkBg: '#121212',
  toastBadBg: '#121212',
  statusBar: 'light',
};

/**
 * 지금 쓰는 색.
 *
 * 화면 밖(스타일 만들 때)에서도 필요하므로 기본값은 밝은 것으로 둔다.
 * 화면 안에서는 `useColors()` 를 쓴다.
 */
export const colors = lightColors;
