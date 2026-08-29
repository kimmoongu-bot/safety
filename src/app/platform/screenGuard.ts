import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * 화면 보호 (명세 5.5)
 * - 안드로이드: FLAG_SECURE. 캡처와 최근 앱 목록 미리보기를 함께 막는다.
 * - iOS: FLAG_SECURE 가 없다. 앱이 백그라운드로 갈 때 가림 뷰를 덮는다
 *   (src/app/components/PrivacyShield.tsx).
 */
export async function enableScreenGuard(): Promise<void> {
  try {
    await ScreenCapture.preventScreenCaptureAsync('jamgim');
  } catch {
    // 지원하지 않는 기기에서는 조용히 넘어간다. 가림 뷰는 그대로 동작한다.
  }
}

export async function disableScreenGuard(): Promise<void> {
  try {
    await ScreenCapture.allowScreenCaptureAsync('jamgim');
  } catch {
    /* 무시 */
  }
}

/** iOS 는 가림 뷰가 필요하다. */
export const needsPrivacyShield = Platform.OS === 'ios';
