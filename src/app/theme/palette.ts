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
 * 밝은 색 — 디자인 시안의 색 체계.
 *
 * 옆에 적은 비율은 바탕 위에서 잰 값이다. 명세는 4.5:1 이상을 요구한다.
 * 시안의 강조색 #8A6A45 는 크림 바탕에서 4.48:1 로 아슬하게 미달이라 조금 어둡게 했다.
 */
export const lightColors: Palette = {
  bg: '#F6F3EC', // 크림 — 화면 바탕
  surface: '#FFFFFF', // 입력창·카드
  border: '#D6D0C4', // 따뜻한 회색 테두리 (글자가 아니라 대비 규칙 밖)
  text: '#202124', // 14.5:1
  textDim: '#5A5750', // 6.5:1
  primary: '#202124', // 기본 버튼 바탕. 그 위 흰 글자 16.1:1
  primaryText: '#FFFFFF',
  secondary: '#3C4A3B', // 짙은 초록 8.5:1
  accent: '#7D5F3C', // 시안 #8A6A45 를 4.5:1 넘도록 조정 → 5.3:1
  accentText: '#FFFFFF',
  danger: '#9B2226', // 7.2:1
  ok: '#2E5E3E', // 6.8:1
  warnBg: '#F6EEDC',
  warnText: '#5C4718',
  warnBorder: '#D8C08A',
  favorite: '#7D5F3C',
  frame: '#202124',
  toastOkBg: '#E7EFE6',
  toastBadBg: '#F6E4E2',
  statusBar: 'light', // 액자 바깥이 어두우므로 시계는 밝게
};

/**
 * 어두운 색.
 *
 * 밝을 때 통과한 색은 어두운 바탕에서 대부분 실패한다. 전부 다시 재서 넣었다.
 * 옆의 비율은 바탕 #16191D 위에서 잰 값이다.
 *
 * 기본 버튼을 **뒤집는다.** 밝을 때는 먹색 바탕에 흰 글자였지만, 어두운 바탕에서
 * 먹색 버튼은 바탕에 묻혀 보이지 않는다. 밝은 바탕에 먹색 글자로 바꾼다.
 */
export const darkColors: Palette = {
  bg: '#16191D',
  surface: '#22262B',
  border: '#39404A',
  text: '#F3F0E8', // 15.5:1
  textDim: '#A8A29A', // 7.0:1
  primary: '#EDE8DC', // 밝은 버튼. 그 위 먹색 글자 14.4:1
  primaryText: '#16191D',
  secondary: '#7FA37B', // 6.2:1
  accent: '#C79A62', // 6.9:1
  accentText: '#16191D', // 갈색 버튼 위에는 먹색 글자가 더 잘 보인다 6.9:1
  danger: '#E88A8A', // 7.1:1
  ok: '#7FC49A', // 8.6:1
  warnBg: '#2E2716',
  warnText: '#E8D9A8',
  warnBorder: '#6B5A2E',
  favorite: '#C79A62',
  frame: '#0E1013', // 액자는 바탕보다 한 겹 더 어둡게
  toastOkBg: '#1D2A22',
  toastBadBg: '#2E1D1D',
  statusBar: 'light',
};

/**
 * 지금 쓰는 색.
 *
 * 화면 밖(스타일 만들 때)에서도 필요하므로 기본값은 밝은 것으로 둔다.
 * 화면 안에서는 `useColors()` 를 쓴다.
 */
export const colors = lightColors;
