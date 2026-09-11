import test from 'node:test';
import assert from 'node:assert/strict';
import { type CandidateField, type FieldWords, pickFields } from '../src/core/autofill.ts';
import { FIELD_WORDS } from '../src/app/i18n/autofillWords.ts';

/**
 * 아이디 칸과 비밀번호 칸 가려내기 (docs/자동완성.md 2단계).
 *
 * 이 판단이 틀리면 **비밀번호가 아이디 칸에 들어간다.** 화면에 그대로 보이고,
 * 그 앱이 서버로 보낸다. 그래서 "확신이 없으면 비워 둔다" 를 함께 지킨다.
 *
 * 자동 완성의 나머지는 실기기에서만 확인되지만, 이 판단만은 여기서 확인할 수 있다.
 */

let next = 0;
function field(over: Partial<CandidateField> = {}): CandidateField {
  return {
    index: next++,
    hints: [],
    idEntry: null,
    hint: null,
    htmlType: null,
    htmlName: null,
    isPasswordInput: false,
    isEditable: true,
    isVisible: true,
    ...over,
  };
}

/** 앱에 실제로 실리는 낱말로 검사한다. 검사용 낱말을 따로 두면 진짜를 안 본다. */
function pick(fields: CandidateField[], words: FieldWords = FIELD_WORDS) {
  return pickFields(fields, words);
}

/** 화면 하나를 만든다. 자리 번호를 0부터 다시 매긴다. */
function screen(...fs: Partial<CandidateField>[]): CandidateField[] {
  next = 0;
  return fs.map((f) => field(f));
}

// ── 앱이 스스로 밝힌 경우 (제일 정확하다) ──────────────────────────────────

test('autofillHints 가 있으면 그대로 따른다', () => {
  const s = screen({ hints: ['username'] }, { hints: ['password'] });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('순서가 뒤바뀌어 있어도 이름표를 따른다', () => {
  // 비밀번호가 위에 있는 화면도 있다. 자리로 판단하면 틀린다.
  const s = screen({ hints: ['password'] }, { hints: ['username'] });
  assert.deepEqual(pick(s), { username: 1, password: 0 });
});

test('메일 주소로 로그인하는 화면', () => {
  const s = screen({ hints: ['emailAddress'] }, { hints: ['password'] });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('가입 화면처럼 newPassword 라도 비밀번호 칸이다', () => {
  const s = screen({ hints: ['newUsername'] }, { hints: ['newPassword'] });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

// ── 웹 페이지 ──────────────────────────────────────────────────────────────

test('브라우저 안의 입력 칸 종류를 본다', () => {
  const s = screen(
    { htmlType: 'email', htmlName: 'email' },
    { htmlType: 'password', htmlName: 'password' },
  );
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

// ── 아무 이름표도 없는 경우 ────────────────────────────────────────────────

test('안드로이드가 붙인 비밀번호 표시를 본다', () => {
  const s = screen({ idEntry: 'field_one' }, { idEntry: 'field_two', isPasswordInput: true });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('이름표에 적힌 말을 본다', () => {
  const s = screen({ idEntry: 'login_id' }, { idEntry: 'login_password' });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('한국어 안내 글도 읽는다', () => {
  // 국내 앱은 이것 말고 단서가 없을 때가 많다.
  const s = screen({ hint: '아이디' }, { hint: '비밀번호' });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('단서가 하나도 없으면 비밀번호 칸 바로 위를 아이디로 본다', () => {
  // 로그인 화면은 거의 언제나 아이디가 위, 비밀번호가 아래다.
  const s = screen({ idEntry: 'a' }, { idEntry: 'b', isPasswordInput: true });
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('바로 위를 볼 때 사이에 낀 칸이 있으면 가장 가까운 것을 고른다', () => {
  const s = screen(
    { idEntry: 'banner' },
    { idEntry: 'account_box' },
    { idEntry: 'pw', isPasswordInput: true },
  );
  assert.equal(pick(s).username, 1);
});

// ── 틀리면 큰일 나는 것들 ──────────────────────────────────────────────────

test('비밀번호 칸을 아이디 칸으로도 고르지 않는다', () => {
  // 같은 칸을 둘 다로 고르면 비밀번호가 아이디로도 채워진다.
  const s = screen({ hints: ['password'] });
  const got = pick(s);
  assert.equal(got.password, 0);
  assert.equal(got.username, null, '기댈 곳이 없으면 비워 둬야 한다');
});

test('비밀번호 칸을 못 찾으면 아이디도 짐작하지 않는다', () => {
  // 로그인 화면인지조차 알 수 없다. 검색창에 아이디를 넣는 일이 생긴다.
  const s = screen({ idEntry: 'anything' }, { idEntry: 'whatever' });
  assert.deepEqual(pick(s), { username: null, password: null });
});

test('검색창은 아이디 칸이 아니다', () => {
  const s = screen({ idEntry: 'search_box' }, { idEntry: 'pw', isPasswordInput: true });
  assert.equal(pick(s).username, null, '검색창에 아이디를 넣으면 안 된다');
});

test('인증번호 칸은 아이디 칸이 아니다', () => {
  const s = screen({ hint: '인증번호' }, { idEntry: 'pw', isPasswordInput: true });
  assert.equal(pick(s).username, null);
});

test('비밀번호 칸이 둘이면 앞의 것을 쓴다', () => {
  // 가입 화면의 "비밀번호 / 다시 입력". 앞의 것이 진짜다.
  const s = screen(
    { hints: ['username'] },
    { idEntry: 'password', isPasswordInput: true },
    { idEntry: 'password_confirm', isPasswordInput: true },
  );
  assert.deepEqual(pick(s), { username: 0, password: 1 });
});

test('글자를 넣을 수 없는 칸은 보지 않는다', () => {
  // 화면에 적혀 있기만 한 글자. 여기에 비밀번호를 넣으려 들면 안 된다.
  const s = screen(
    { idEntry: 'title_password', isEditable: false },
    { idEntry: 'id_input' },
    { idEntry: 'pw_input', isPasswordInput: true },
  );
  assert.deepEqual(pick(s), { username: 1, password: 2 });
});

/**
 * 실기기에서 나온 것이다. 손택스 로그인 화면에서 항목을 골랐는데 화면만 닫히고
 * 두 칸 다 비어 있었다. 값은 넘어갔는데 **안 보이는 칸에** 들어간 것이다.
 *
 * 로그인 갈래가 여럿인 앱(아이디 / 공동인증서 / 간편인증)에서는 고르지 않은
 * 갈래의 칸도 화면 구조에 그대로 남아 있다. 그것이 목록에서 더 앞에 오면
 * 우리가 그쪽을 고른다. 사용자 눈에는 아무 일도 안 일어난 것으로 보인다.
 */
test('안 보이는 칸은 고르지 않는다', () => {
  const s = screen(
    // 고르지 않은 갈래의 칸. 구조에는 있지만 화면에는 없다.
    { idEntry: 'cert_id', isVisible: false },
    { idEntry: 'cert_password', isPasswordInput: true, isVisible: false },
    // 지금 보이는 갈래.
    { idEntry: 'login_id' },
    { idEntry: 'login_password', isPasswordInput: true },
  );
  assert.deepEqual(pick(s), { username: 2, password: 3 });
});

test('보이는 칸이 하나도 없으면 아무것도 고르지 않는다', () => {
  // 여기서 억지로 고르면 값이 안 보이는 칸에 들어가고 화면만 닫힌다.
  const s = screen(
    { idEntry: 'login_id', isVisible: false },
    { idEntry: 'login_password', isPasswordInput: true, isVisible: false },
  );
  assert.deepEqual(pick(s), { username: null, password: null });
});

test('칸이 하나도 없어도 죽지 않는다', () => {
  assert.deepEqual(pick([]), { username: null, password: null });
});

// ── 우리가 지원하는 말로 적힌 앱 ───────────────────────────────────────────
//
// 채우려는 앱이 무슨 말로 적혀 있는지는 우리 화면 언어와 상관없다.
// 한국 사람이 일본 앱에 로그인할 수 있다. 그때 못 골라 주면 쓸모가 없다.

const SCREENS: readonly { tag: string; id: string; pw: string }[] = [
  { tag: 'ko', id: '아이디', pw: '비밀번호' },
  { tag: 'en', id: 'Username', pw: 'Password' },
  { tag: 'ja', id: 'ユーザー名', pw: 'パスワード' },
  { tag: 'ru', id: 'Логин', pw: 'Пароль' },
];

for (const s of SCREENS) {
  test(`${s.tag} 로 적힌 로그인 화면을 알아본다`, () => {
    /*
      **비밀번호 칸을 일부러 위에 둔다.**

      아이디를 아래에 두면 "비밀번호 칸 바로 위" 규칙이 못 쓴다. 그래야 이 검사가
      낱말만 본다. 순서대로 두면 낱말 목록이 통째로 비어 있어도 통과해 버린다 —
      검사가 저 혼자 맞히는 셈이라 아무것도 지키지 못한다.
    */
    const fields = screen({ hint: s.pw }, { hint: s.id });
    assert.deepEqual(pick(fields), { username: 1, password: 0 }, `${s.tag} 낱말이 빠졌다`);
  });
}

test('낱말은 전부 소문자로 적는다', () => {
  // 찾을 때 소문자로 바꿔서 보므로, 대문자가 섞이면 그 낱말은 영영 안 걸린다.
  const wrong: string[] = [];
  for (const [group, words] of Object.entries(FIELD_WORDS)) {
    for (const w of words) if (w !== w.toLowerCase()) wrong.push(`${group}: ${w}`);
  }
  assert.deepEqual(wrong, [], `대문자가 섞인 낱말: ${wrong.join(', ')}`);
});
