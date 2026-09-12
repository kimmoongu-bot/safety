import { requireOptionalNativeModule } from 'expo-modules-core';
import type { CandidateField } from '../../src/core/autofill.ts';

/**
 * 자동 완성 (docs/자동완성.md).
 *
 * **없을 수 있다.** 안드로이드 8.0 아래, 아이폰, 그리고 네이티브가 안 붙은 빌드에서는
 * 이 모듈이 통째로 없다. 그래서 `requireOptionalNativeModule` 로 받고, 없으면
 * "안 되는 기기" 와 똑같이 다룬다. 없다고 앱이 죽으면 안 된다.
 */
type Native = {
  isSupported(): boolean;
  isEnabled(): boolean;
  openSettings(): boolean;
  /**
   * 요청 내용. **글(JSON)로 받는다.**
   *
   * 지도(Map)나 기록(Record)으로 주고받으면 네이티브 경계에서 모양이 맞는지가
   * 빌드 때까지 드러나지 않는다. 글 하나면 틀릴 구석이 없고, 어차피 여기서
   * 한 번 풀어야 한다.
   */
  getRequest(): string | null;
  respond(payload: string): boolean;
  cancelFill(): boolean;
};

const native = requireOptionalNativeModule<Native>('JamgimAutofill');

/** 이 기기가 자동 완성을 할 줄 아는가. */
export function isAutofillSupported(): boolean {
  return native?.isSupported() ?? false;
}

/** 지금 잠김이 자동 완성 앱으로 뽑혀 있는가. */
export function isAutofillEnabled(): boolean {
  return native?.isEnabled() ?? false;
}

/** 자동 완성 앱을 고르는 폰 설정 화면을 연다. 열렸으면 참. */
export function openAutofillSettings(): boolean {
  return native?.openSettings() ?? false;
}

export type FillRequest = {
  fields: CandidateField[];
  /**
   * 코틀린이 긁어 온 단서 **원문**.
   *
   * `fields` 는 판단에 쓰는 것만 골라 담은 것이고, 이쪽은 온 것을 그대로 둔 것이다.
   * 개발용 빌드의 '칸 정보' 화면이 이것을 보여 준다 (docs/자동완성.md 19장).
   *
   * **왜 따로 두나.** 보기용으로 쓰는 표시(`importantForAutofill`, 웹 칸의
   * `readonly` 같은 것)를 `CandidateField` 에 넣으면, 판단에 안 쓰는 것이 판단
   * 자리에 쌓인다. 코어는 고르는 데 필요한 것만 안다.
   */
  rawFields: string;
  askingPackage: string;
  webDomain: string | null;
  askingLabel: string | null;
};

/**
 * 지금 채우기 요청이 있으면 준다. 없으면 `null`.
 *
 * JSON 이 깨져 있어도 던지지 않는다. 채우기 화면에서 예외가 나면 사용자에게는
 * 그냥 빈 화면이 보인다. 요청이 없는 것과 똑같이 다룬다.
 */
export function getFillRequest(): FillRequest | null {
  const raw = native?.getRequest();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      fields: string;
      askingPackage: string;
      webDomain: string | null;
      askingLabel: string | null;
    };
    const fields = JSON.parse(parsed.fields) as CandidateField[];
    if (!Array.isArray(fields)) return null;
    return {
      fields,
      rawFields: parsed.fields,
      askingPackage: parsed.askingPackage,
      webDomain: parsed.webDomain,
      askingLabel: parsed.askingLabel,
    };
  } catch {
    return null;
  }
}

/** 채우지 않고 닫는다. */
export function cancelFill(): void {
  native?.cancelFill();
}

/** 고른 값. 자리 번호는 `getFillRequest` 가 준 칸 목록의 자리다. */
export type FillAnswer = {
  usernameIndex: number | null;
  passwordIndex: number | null;
  username: string;
  password: string;
};

/**
 * 고른 값을 안드로이드에 돌려주고 화면을 닫는다 (docs/자동완성.md 4단계).
 *
 * 돌려줬으면 참. 거짓이면 아무 일도 안 일어났다는 뜻이므로, 부르는 쪽이
 * 사용자에게 알려야 한다 — 조용히 닫히면 왜 안 채워졌는지 알 길이 없다.
 */
export function respondWithFill(answer: FillAnswer): boolean {
  if (!native) return false;
  return native.respond(
    JSON.stringify({
      // 네이티브 쪽은 -1 을 "그 칸은 안 채운다" 로 읽는다.
      usernameIndex: answer.usernameIndex ?? -1,
      passwordIndex: answer.passwordIndex ?? -1,
      username: answer.username,
      password: answer.password,
    }),
  );
}
