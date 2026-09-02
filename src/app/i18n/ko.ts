import { ro, eul } from '../josa.ts';
import { type Catalog, fill } from './types.ts';

/**
 * 한국어 문장.
 *
 * **번역자에게는 이 파일만 건네면 된다.** 코드를 볼 필요가 없다.
 *
 * 규칙 두 가지 (`docs/국제화.md` 3장):
 *
 * 1. **문장을 조각으로 잇지 않는다.** 값이 들어갈 자리는 `{name}` 으로 적고,
 *    나머지는 그 언어의 완성된 문장이다. 어순이 반대인 언어(영어)로도 넘어가려면
 *    이래야 한다.
 *      한국어  {label}을 복사했습니다
 *      영어     Copied {label}
 *
 * 2. **조사는 한국어 안에서만 푼다.** 앞말 받침에 따라 "지문으로 / 얼굴로" 가
 *    달라진다. 이런 문장만 함수로 적는다. 다른 언어는 그냥 글이면 된다.
 */
export const ko = {
  // ── 잠금 화면 ──────────────────────────────────────────────
  'lock.title': '잠김',
  'lock.open': '금고 열기',
  'lock.openWithBiometric': ({ how }) => `${ro(String(how))} 열기`,
  'lock.forgotPin': 'PIN(핀)을 잊었어요 (복구 코드)',
  'lock.failures': 'PIN(핀)을 {count}번 잘못 눌렀습니다.',
  'lock.failuresWithWait': 'PIN(핀)을 {count}번 잘못 눌렀습니다. {wait}.',
  'lock.waitSeconds': '{seconds}초 뒤에 다시 해 주세요',
  'lock.waitMinutes': '{minutes}분 뒤에 다시 해 주세요',
  'lock.recoveryTitle': '복구 코드로 열기',
  'lock.recoveryHelp': '최초 설정 때 적어 둔 복구 코드를 입력해 주세요.',
  'lock.recoveryLabel': '복구 코드',
  'lock.recoveryPlaceholder': '예: WZC7-1W7M-KHRP-DNEN',
  'lock.biometricPrompt': ({ how }) => `${ro(String(how))} 금고를 엽니다`,

  // ── 최초 설정 ─────────────────────────────────────────────
  'setup.biometricTitle': ({ how }) => `${ro(String(how))}도 열까요?`,
  'setup.biometricYes': ({ how }) => `${ro(String(how))}도 열기`,
  'setup.biometricWhy': ({ how }) =>
    `${eul(String(how))} 쓰면 매번 PIN(핀)을 누르지 않아도 됩니다. 나중에 설정에서 바꿀 수 있습니다.`,
  'setup.biometricUnavailable': ({ how }) =>
    fill('이 기기에는 {how} 확인이 준비되어 있지 않습니다. 숫자로만 열 수 있습니다.', { how: String(how) }),

  // ── 숫자판 ────────────────────────────────────────────────
  'pinpad.erase': '지움',
  'pinpad.eraseOne': '한 글자 지우기',
  'pinpad.digit': '숫자 {digit}',
  'pinpad.entered': '{count}자리 입력함',

  // ── 지문·얼굴 ─────────────────────────────────────────────
  // 기기가 무엇을 지원하는지에 따라 골라 쓴다. 다른 언어에서는 이 세 낱말만 옮기면
  // 위의 "{how}로 열기" 같은 문장이 저절로 맞는다.
  'biometric.finger': '지문',
  'biometric.face': '얼굴',
  'biometric.both': '지문·얼굴',
  'biometric.reason': '금고를 열려면 확인이 필요합니다',
  'biometric.cancel': '취소',
  'biometric.fallback': 'PIN(핀)으로 열기',

  // ── 설정 ──────────────────────────────────────────────────
  'settings.recoveryReason': '복구 코드를 보려면 확인이 필요합니다',

  // ── 두루 쓰는 것 ──────────────────────────────────────────
  'common.back': '‹ 뒤로',
  'common.backLabel': '뒤로',
} satisfies Catalog;

export type MessageKey = keyof typeof ko;
