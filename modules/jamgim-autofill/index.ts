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
