import { Platform } from 'react-native';

/**
 * 어느 글꼴로 그릴지는 **화면 언어에 따라 달라진다.**
 *
 * Pretendard 에는 한글·라틴·키릴이 다 들어 있지만 **일본어 한자가 하나도 없다.**
 * 없는 글자를 만나면 안드로이드가 시스템 글꼴로 대신 그리는데, 앱이 죽지도 않고
 * 글자도 보여서 아무 일 없어 보인다. 실제로는 한 문장 안에서 글꼴이 섞이고,
 * 기기에 따라 한자가 중국식 모양으로 나온다.
 *
 * 그래서 일본어 화면에서만 Noto Sans JP 로 바꾼다. 필요한 글자만 남겨 잘라서
 * 두 벌에 약 590KB 다 (`tools/fonts/subset_ja.py`). 통짜로 넣으면 11MB 다.
 *
 * 이름이 플랫폼마다 다르다. 안드로이드는 파일 이름을, 아이폰은 글꼴 안에 적힌
 * 이름을 쓴다.
 */
export type FontFamily = {
  /** 본문·설명에 쓰는 보통 굵기 */
  family: string;
  /** 제목·버튼·이름표에 쓰는 굵은 것 */
  familyBold: string;
};

const LATIN: FontFamily = Platform.select({
  android: { family: 'Pretendard-Regular', familyBold: 'Pretendard-SemiBold' },
  default: { family: 'Pretendard', familyBold: 'Pretendard' },
});

const JAPANESE: FontFamily = Platform.select({
  android: { family: 'NotoSansJP-Regular', familyBold: 'NotoSansJP-SemiBold' },
  default: { family: 'Noto Sans JP', familyBold: 'Noto Sans JP' },
});

/**
 * 이 언어를 그릴 글꼴.
 *
 * 일본어만 다르다. 한국어·영어·러시아어는 Pretendard 하나로 다 된다
 * (`tests/fontCoverage.test.ts` 가 실제로 들어 있는지 확인한다).
 */
export function familyFor(locale: string): FontFamily {
  return locale.toLowerCase().startsWith('ja') ? JAPANESE : LATIN;
}
