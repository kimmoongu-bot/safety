import * as Clipboard from 'expo-clipboard';

/**
 * 클립보드 (명세 5.5)
 * - 복사한 뒤 정해진 시간이 지나면 비운다 (기본 60초).
 * - 안드로이드 13+ 에서는 민감 데이터로 표시해 미리보기를 숨긴다.
 * - 지울 때는 우리가 넣은 값이 아직 그대로일 때만 지운다. 그 사이 사용자가
 *   다른 것을 복사했다면 건드리지 않는다.
 */
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

export async function copySensitive(value: string, clearAfterSeconds: number): Promise<void> {
  await Clipboard.setStringAsync(value, { isSensitive: true } as Clipboard.SetStringOptions);
  cancelPendingClear();
  if (clearAfterSeconds <= 0) return;
  pendingTimer = setTimeout(() => {
    void clearIfUnchanged(value);
  }, clearAfterSeconds * 1000);
}

export async function clearIfUnchanged(value: string): Promise<void> {
  try {
    const current = await Clipboard.getStringAsync();
    if (current === value) await Clipboard.setStringAsync('');
  } catch {
    // 클립보드를 읽지 못하면 그냥 비운다.
    await Clipboard.setStringAsync('');
  } finally {
    pendingTimer = null;
  }
}

export function cancelPendingClear(): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
}

/** 앱이 잠길 때 호출한다. 남은 예약을 없애고 즉시 비운다. */
export async function clearNow(): Promise<void> {
  cancelPendingClear();
  await Clipboard.setStringAsync('');
}
