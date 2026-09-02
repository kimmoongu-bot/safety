import { eul, i, ro } from '../josa.ts';
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

  // ── 내 금고 (목록) ────────────────────────────────────────
  'list.title': '내 금고',
  'list.add': '＋ 새로 넣기',
  'list.settings': '설정',
  'list.searchPlaceholder': '무엇을 찾으세요?',
  'list.searchLabel': '검색창',
  'list.unreadable': '{count}개 항목을 열지 못했습니다. 백업 파일이 있으면 되살려 보세요.',
  'list.empty': '아직 넣어 둔 것이 없습니다.',
  'list.emptyHint': '아래 “＋ 새로 넣기”를 눌러 시작하세요.',
  'list.favoriteOn': '자주 쓰는 것으로 두었습니다.',
  'list.favoriteOff': '자주 쓰는 것에서 뺐습니다.',
  'list.noMatch': '“{query}”에 맞는 것이 없습니다.',
  'list.addThisName': '이 이름으로 새로 넣기',

  // ── 찾은 것 ───────────────────────────────────────────────
  'search.title': '찾은 것',
  'search.found': '{count}개 찾았습니다.',

  // ── 계정 카드 ─────────────────────────────────────────────
  'card.label': '{service}, 아이디 {username}',
  'card.noName': '이름 없음',
  'card.noUsername': '아이디 없음',
  'card.none': '없음',
  'card.stale': '1년 넘게 안 바꿈',
  'card.favoriteAdd': '자주 쓰는 것으로 두기',
  'card.favoriteRemove': '자주 쓰는 것에서 빼기',

  // ── 최초 설정 (이어서) ────────────────────────────────────
  'setup.pinTitle': 'PIN(핀) 만들기',
  'setup.pinAgainTitle': '한 번 더 눌러 주세요',
  'setup.pinHelp': '금고를 열 때 쓸 숫자를 정합니다. 4자리 이상이면 됩니다.',
  'setup.pinAgainHelp': '방금 정한 PIN(핀)을 한 번 더 눌러 주세요.',
  'setup.next': '다음',
  'setup.pinMismatch': '두 번 누른 PIN(핀)이 다릅니다. 처음부터 다시 정해 주세요.',
  'setup.pinOnly': '숫자로만 열기',
  'setup.codeTitle': '복구 코드를 적어 두세요',
  'setup.codeWarn':
    'PIN(핀)을 잊었을 때 금고를 열 수 있는 유일한 방법입니다. 종이에 적어 폰과 다른 곳에 두세요. 화면을 캡처하지 마세요.',
  'setup.codeNext': '다음 화면에서 이 코드를 직접 입력해 확인합니다.',
  'setup.codeWrote': '적었습니다. 다음',
  'setup.codeCheckTitle': '적어 둔 복구 코드를 입력해 주세요',
  'setup.codeCheckHelp': '대문자·소문자, 띄어쓰기는 신경 쓰지 않아도 됩니다.',
  'setup.lastWarnWithBiometric':
    ({ how }) => `${ro(String(how))}도 열 수 있게 해 두었습니다. PIN(핀)·복구 코드·백업 파일이 모두 없으면 금고를 열 수 없습니다.`,
  'setup.lastWarn': 'PIN(핀)·복구 코드·백업 파일이 모두 없으면 금고를 열 수 없습니다.',
  'setup.finish': '확인하고 시작하기',
  'setup.codeMismatch': '복구 코드가 다릅니다. 적어 둔 것을 다시 보세요.',
  'setup.done': '금고를 만들었습니다.',

  // ── 갈래 ──────────────────────────────────────────────────
  // 금고에는 아래 '코드'(bank, card…)가 저장되고 화면에는 이 말이 나온다.
  // 한국어를 그대로 저장하면 일본어 사용자가 한국어 갈래를 보게 된다.
  'category.bank': '은행',
  'category.card': '카드',
  'category.shopping': '쇼핑',
  'category.gov': '관공서',
  'category.telecom': '통신',
  'category.other': '기타',

  // ── 넣기 · 고치기 ─────────────────────────────────────────
  'edit.titleNew': '새로 넣기',
  'edit.titleEdit': '고치기',
  'edit.save': '저장하기',
  'edit.service': '어디에서 쓰나요?',
  'edit.serviceHint': '예: 국민은행, 현대카드, 쿠팡',
  'edit.username': '아이디',
  'edit.password': '비밀번호',
  'edit.show': '보기',
  'edit.hide': '숨김',
  'edit.category': '갈래',
  'edit.memo': '메모',
  'edit.needService': '어디에서 쓰는 것인지 이름을 적어 주세요.',
  'edit.saved': '넣었습니다.',
  'edit.updated': '고쳤습니다.',
  'edit.pwDateNote': '비밀번호를 바꾸면 바꾼 날짜가 함께 기록됩니다.',

  // ── 항목 보기 ─────────────────────────────────────────────
  'detail.title': '항목',
  'detail.notFound': '항목을 찾지 못했습니다.',
  'detail.edit': '고치기',
  'detail.delete': '지우기',
  'detail.username': '아이디',
  'detail.password': '비밀번호',
  'detail.memo': '메모',
  'detail.none': '없음',
  'detail.hidden': '●●●●●●●●',
  'detail.copyUsername': '아이디 복사',
  'detail.copyPassword': '비밀번호 복사',
  'detail.reveal': '보기',
  'detail.conceal': '숨기기',
  'detail.autoHide': '{seconds}초 뒤에 저절로 숨깁니다.',
  'detail.pwChangedAt': '비밀번호 바꾼 날',
  'detail.noDate': '기록 없음',
  'detail.staleNotice': '1년 넘게 바꾸지 않았습니다. 한 번 바꿔 두면 좋습니다.',
  'detail.prevPassword': '바꾸기 전 비밀번호',
  'detail.prevWhy': '새 비밀번호가 안 될 때 되돌리라고 하나만 남겨 둡니다.',
  'detail.deleteTitle': '이 항목을 지울까요?',
  'detail.deleteMessage': ({ service }) => `“${service}”${eul(String(service)).slice(-1)} 지우면 되돌릴 수 없습니다.`,
  'detail.deleted': '지웠습니다.',
  'detail.emptyField': ({ what }) => `${i(String(what))} 비어 있습니다.`,
  'detail.copied': ({ what, seconds }) =>
    `${eul(String(what))} 복사했습니다. ${seconds}초 뒤에 지웁니다.`,

  // ── 설정 ──────────────────────────────────────────────────
  'settings.recoveryReason': '복구 코드를 보려면 확인이 필요합니다',
  'settings.title': '설정',
  'settings.checkFailed': '확인하지 못했습니다.',
  'settings.theme': '화면 밝기',
  'settings.themeSystem': '폰 설정대로',
  'settings.themeLight': '밝게',
  'settings.themeDark': '어둡게',
  'settings.themeWhy': '어둡게 하면 밤에 눈이 덜 부십니다.',
  'settings.language': '언어',
  'settings.languageSystem': '폰 설정대로',
  'settings.saveFailed': '설정을 저장하지 못했습니다. 앱을 껐다 켜면 되돌아갑니다.',
  'settings.autoLock': '얼마 뒤에 저절로 잠글까요?',
  'settings.autoLockNow': '바로',
  'settings.autoLock1m': '1분',
  'settings.autoLock5m': '5분',
  'settings.biometric': '지문·얼굴로 열기',
  'settings.biometricWhy': '켜면 PIN(핀)을 누르지 않아도 열 수 있습니다.',
  'settings.biometricNone': '이 기기에는 지문·얼굴 확인이 준비되어 있지 않습니다.',
  'settings.biometricOn': '지문·얼굴로 열 수 있습니다.',
  'settings.biometricOff': '지문·얼굴 열기를 껐습니다.',
  'settings.clipboard': '복사한 내용을 언제 지울까요?',
  'settings.clipboardAfter': '{seconds}초 뒤',
  'settings.screenGuard': '화면 찍기 막기',
  'settings.screenGuardWhy': '캡처와 최근 앱 목록 미리보기를 막습니다.',
  'settings.screenGuardOn': '화면 찍기를 막습니다.',
  'settings.screenGuardOff': '화면 찍기 막기를 껐습니다.',
  'settings.screenGuardFailed': '화면 가리기를 걸지 못했습니다. ({reason})',
  'settings.keepPrev': '바꾸기 전 비밀번호 1개 남기기',
  'settings.keepPrevWhy': '새 비밀번호가 안 될 때 되돌리는 용도입니다.',
  'settings.wipe': '10번 틀리면 금고 지우기',
  'settings.wipeWhy':
    '켜면 PIN(핀)을 10번 잘못 누를 때 금고를 통째로 지웁니다. 백업 파일이 없으면 되살릴 수 없습니다.',
  'settings.recoveryHeading': '복구 코드',
  'settings.recoveryHide': '다시 숨기기',
  'settings.recoveryShow': '복구 코드 다시 보기',
  'settings.pinHeading': 'PIN(핀) 바꾸기',
  'settings.pinCurrent': '지금 쓰는 PIN(핀)',
  'settings.pinNext': '새로 쓸 PIN(핀)',
  'settings.pinChange': '바꾸기',
  'settings.pinChanged': 'PIN(핀)을 바꿨습니다.',
  'settings.cancel': '그만두기',
  'settings.backupHeading': '백업',
  'settings.backupGo': '백업 파일 만들기 / 가져오기',
  'settings.wipeHeading': '금고 초기화',
  'settings.wipeExplain':
    'PIN(핀)·지문·복구 코드·백업 파일이 모두 없으면 금고를 열 수 없습니다. 그럴 때는 금고를 지우고 새로 시작할 수 있지만, 넣어 둔 내용은 되살아나지 않습니다.',
  'settings.wipeStart': '금고 지우고 새로 시작',
  'settings.wipeAsksTwice': '지우기 전에 두 번 물어봅니다.',
  'settings.wipe1Title': '정말 지울까요? (1/2)',
  'settings.wipe1Message': '넣어 둔 아이디와 비밀번호가 모두 사라집니다. 되돌릴 수 없습니다.',
  'settings.wipe1Confirm': '계속',
  'settings.wipe2Title': '마지막 확인입니다 (2/2)',
  'settings.wipe2Message': '백업 파일이 없다면 지금 지운 내용은 어떤 방법으로도 되살릴 수 없습니다.',
  'settings.wipe2Confirm': '지우겠습니다',
  'settings.wiped': '금고를 지웠습니다.',

  // ── 백업 · 되살리기 ───────────────────────────────────────
  'backup.title': '백업 · 되살리기',
  'backup.never': '아직 한 번도 하지 않았습니다',
  'backup.last': '마지막 백업: {when}',
  'backup.stale': '마지막 백업 후 90일이 지났습니다. 새 백업 파일을 만들어 두세요.',
  'backup.makeHeading': '백업 파일 만들기',
  'backup.makeWarn': '이 파일은 비밀번호 없이는 열 수 없습니다. 파일과 비밀번호를 같은 곳으로 보내지 마세요.',
  'backup.familyTip':
    '가족(배우자·자녀) 2~3명에게 파일만 나눠 두면 폰을 잃어버려도 되살릴 수 있습니다. 백업 비밀번호는 전달하지 말고 본인만 종이에 적어 폰과 다른 곳에 두세요. 카카오톡 같은 메신저는 기간이 지나면 내려받을 수 없으니, 받은 사람이 폰에 실제로 저장했는지 확인해 주세요.',
  'backup.password': '백업 비밀번호',
  'backup.passwordHint': '{min}자 이상. 앱을 열 때 쓰는 PIN(핀)과 다르게 정해 주세요.',
  'backup.passwordAgain': '백업 비밀번호 한 번 더',
  'backup.mismatch': '두 번 적은 백업 비밀번호가 다릅니다.',
  'backup.make': '백업 파일 만들어 보내기',
  'backup.made': '{count}개를 담은 백업 파일을 만들었습니다.',
  'backup.restoreHeading': '백업 파일에서 되살리기',
  'backup.restoreWhen': '폰을 바꿨거나 앱을 지웠다 다시 깔았을 때 씁니다. 지금 금고에 든 내용은 파일 내용으로 바뀝니다.',
  'backup.pick': '파일 고르기',
  'backup.picked': '고른 파일: {name}',
  'backup.pickedToast': ({ name }) => `${eul(String(name))} 골랐습니다.`,
  'backup.pickFirst': '먼저 파일을 골라 주세요.',
  'backup.filePassword': '그 파일의 백업 비밀번호',
  'backup.preview': '열어 보기 (몇 개인지 확인)',
  'backup.previewCount': '{count}개가 들어 있습니다.',
  'backup.restore': '이 파일로 되살리기',
  'backup.restored': '{count}개를 되살렸습니다.',
  'backup.confirmTitle': '지금 금고 내용을 바꿀까요?',
  'backup.confirmMessage': '지금 들어 있는 내용은 사라지고 파일에 담긴 내용으로 바뀝니다.',
  'backup.confirmLabel': '되살리기',

  // ── 두루 쓰는 것 ──────────────────────────────────────────
  'common.back': '‹ 뒤로',
  'common.backLabel': '뒤로',
  'common.cancel': '그만두기',
  'common.on': '켜짐',
  'common.off': '꺼짐',
  'common.appName': '잠김',
  'common.recoveryCodeLabel': '복구 코드 {code}',
  'common.failed': '잘 되지 않았습니다. 다시 해 주세요.',
  'common.failedWhy': '잘 되지 않았습니다. ({why})',
  'common.unknownReason': '알 수 없는 이유',

  // ── 시스템 창·알림 ────────────────────────────────────────
  'system.shareBackup': '백업 파일 보내기',
  'system.reminderTitle': '잠김 — 백업할 때가 되었습니다',
  'system.reminderBody': '마지막 백업 후 90일이 지났습니다. 새 백업 파일을 만들어 두세요.',
  'system.guardUnsupported': '이 기기에서는 화면 가리기를 쓸 수 없습니다.',
} satisfies Catalog;

export type MessageKey = keyof typeof ko;
