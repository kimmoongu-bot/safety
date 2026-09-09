import { requireOptionalNativeModule } from 'expo-modules-core';

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
