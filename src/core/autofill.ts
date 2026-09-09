/**
 * 화면에서 아이디 칸과 비밀번호 칸을 가려낸다 (docs/자동완성.md 2단계).
 *
 * **왜 여기 있나.** 자동 완성의 나머지는 전부 안드로이드 위에서만 돌아서 실기기가
 * 아니면 확인할 방법이 없다. 그런데 "어느 칸이 무엇인가" 하는 판단은 순수하다 —
 * 값을 넣으면 답이 나온다. 그래서 떼어 내 여기 둔다. 코틀린은 화면에서 단서를
 * 긁어 오기만 하고, 판단은 이쪽이 한다.
 *
 * 이 판단이 틀리면 **비밀번호가 아이디 칸에 들어간다.** 화면에 그대로 보이고,
 * 그 앱이 서버로 보낸다. 그래서 확신이 없으면 아무것도 고르지 않는 쪽을 택한다.
 */

/** 코틀린이 화면 한 칸에서 긁어 오는 단서. 없는 것은 `null` 이다. */
export type CandidateField = {
  /** 코틀린 쪽 목록에서의 자리. 답으로 이 번호를 돌려준다. */
  index: number;
  /** 앱이 스스로 밝힌 용도 (`android:autofillHints`). 있으면 이게 제일 정확하다. */
  hints: readonly string[];
  /** 칸의 이름표 (`android:id` 의 뒷부분). 예: `login_password` */
  idEntry: string | null;
  /** 칸에 흐리게 적혀 있는 안내 글. 예: "아이디를 입력하세요" */
  hint: string | null;
  /** 웹이라면 `<input type=...>`. 예: `password`, `email` */
  htmlType: string | null;
  /** 웹이라면 `<input name=...>`. 예: `user_id` */
  htmlName: string | null;
  /** 안드로이드가 이 칸을 비밀번호 칸으로 표시했나 (`inputType` 의 비밀번호 갈래). */
  isPasswordInput: boolean;
  /** 사람이 글자를 넣을 수 있는 칸인가. 아니면 볼 것도 없다. */
  isEditable: boolean;
};

export type FieldPick = {
  /** 아이디를 넣을 칸. 못 찾았으면 `null`. */
  username: number | null;
  /** 비밀번호를 넣을 칸. 못 찾았으면 `null`. */
  password: number | null;
};

/*
  안드로이드가 정해 둔 이름들. 앱이 이걸 적어 뒀으면 추측할 필요가 없다.
  (`android.view.View.AUTOFILL_HINT_*`)
*/
const HINT_PASSWORD = new Set(['password', 'newPassword']);
const HINT_USERNAME = new Set(['username', 'newUsername', 'emailAddress', 'phone']);

/**
 * 이름표에서 찾을 낱말들.
 *
 * **낱말은 코어에 두지 않는다.** 여기 있는 것은 판단이고, 말은 `src/app/i18n/` 이
 * 가진다 (명세대로, 그리고 `tests/hygiene.test.ts` 가 지킨다). 낱말을 여기 박으면
 * 일본어·러시아어를 더할 때 손댈 곳이 두 군데가 된다.
 *
 * 우리 화면 언어와는 상관없다는 점이 중요하다. **채우려는 앱**이 무슨 말로 적혀
 * 있는지가 문제라, 우리가 지원하는 말은 전부 한꺼번에 넣는다. 한국 사람이 일본
 * 앱에 로그인할 수 있다.
 */
export type FieldWords = {
  password: readonly string[];
  username: readonly string[];
  /**
   * 아이디 칸을 찾을 때 **건드리지 않을** 말들.
   *
   * 검색창은 아이디 칸으로도 걸리고, "비밀번호 확인" 은 비밀번호로도 걸린다.
   * 아무 칸에나 아이디를 넣느니 비워 두는 편이 낫다.
   */
  avoid: readonly string[];
};

function haystack(field: CandidateField): string {
  return [field.idEntry, field.hint, field.htmlName].filter(Boolean).join(' ').toLowerCase();
}

function hasAny(text: string, words: readonly string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * 아이디 칸과 비밀번호 칸을 고른다.
 *
 * 순서대로 본다. 앞의 것이 더 믿을 만하다.
 *  1. 앱이 스스로 밝힌 용도 (`autofillHints`)
 *  2. 웹의 `<input type>`
 *  3. 안드로이드가 붙인 비밀번호 표시 (`inputType`)
 *  4. 이름표에 들어 있는 말
 *  5. 비밀번호 칸을 찾았는데 아이디 칸을 못 찾았으면, **그 바로 위 칸**
 *
 * 비밀번호 칸이 여럿이면 **맨 앞의 것**을 쓴다. 가입 화면의 "비밀번호 / 다시 입력"
 * 에서 앞의 것이 진짜다.
 */
export function pickFields(fields: readonly CandidateField[], words: FieldWords): FieldPick {
  const usable = fields.filter((f) => f.isEditable);

  const password =
    firstOf(usable, (f) => f.hints.some((h) => HINT_PASSWORD.has(h))) ??
    firstOf(usable, (f) => f.htmlType === 'password') ??
    firstOf(usable, (f) => f.isPasswordInput) ??
    firstOf(usable, (f) => hasAny(haystack(f), words.password));

  // 비밀번호로 고른 칸을 아이디로도 고르면 안 된다.
  const forUser = usable.filter((f) => f.index !== password);

  const username =
    firstOf(forUser, (f) => f.hints.some((h) => HINT_USERNAME.has(h))) ??
    firstOf(forUser, (f) => f.htmlType === 'email') ??
    firstOf(
      forUser,
      (f) => !hasAny(haystack(f), words.avoid) && hasAny(haystack(f), words.username),
    ) ??
    justAbove(forUser, password, words.avoid);

  return { username, password };
}

function firstOf(
  fields: readonly CandidateField[],
  ok: (f: CandidateField) => boolean,
): number | null {
  for (const f of fields) if (ok(f)) return f.index;
  return null;
}

/**
 * 비밀번호 칸 **바로 위**의 글자 칸.
 *
 * 로그인 화면은 거의 언제나 아이디가 위, 비밀번호가 아래다. 아무 단서가 없을 때
 * 마지막으로 기대는 자리다.
 *
 * 비밀번호 칸을 못 찾았으면 하지 않는다. 기댈 자리가 없는데 아무 칸이나 고르면,
 * 검색창에 아이디를 넣는 일이 생긴다.
 */
function justAbove(
  fields: readonly CandidateField[],
  password: number | null,
  avoid: readonly string[],
): number | null {
  if (password === null) return null;
  let best: number | null = null;
  for (const f of fields) {
    if (f.index >= password) break;
    if (f.isPasswordInput) continue;
    if (hasAny(haystack(f), avoid)) continue;
    best = f.index;
  }
  return best;
}
