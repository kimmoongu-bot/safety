import * as Clipboard from 'expo-clipboard';
import { shouldClearClipboard } from '../lockPolicy.ts';

/**
 * 클립보드 (명세 5.5)
 *
 * "복사 후 기본 60초에 비운다"가 규칙이다. **앱을 벗어날 때 비우면 안 된다.**
 * 비밀번호를 복사하는 이유가 다른 앱에 붙여넣기 위해서인데, 카카오톡으로
 * 넘어가는 순간 비워 버리면 붙여넣기가 아예 안 된다. 실기기에서 그랬다.
 *
 * 시간을 재는 방법이 두 겹이다.
 *  1. 앱이 떠 있는 동안에는 타이머로 지운다.
 *  2. 다른 앱에 갔다 돌아오면, 그 사이에 시간이 지났는지 확인해서 지운다.
 *     안드로이드는 앱이 뒤로 가면 타이머를 멈추기 때문에 1번만으로는 부족하다.
 *
 * 지울 때는 우리가 넣은 값이 아직 그대로일 때만 지운다. 그 사이 사용자가 다른
 * 것을 복사했다면 건드리지 않는다.
 */
type Pending = { value: string; dueAt: number };

let pending: Pending | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export async function copySensitive(value: string, clearAfterSeconds: number): Promise<void> {
  await Clipboard.setStringAsync(value);
  cancelPendingClear();
  if (clearAfterSeconds <= 0) {
    await clearNow();
    return;
  }
  pending = { value, dueAt: Date.now() + clearAfterSeconds * 1000 };
  timer = setTimeout(() => void clearIfDue(), clearAfterSeconds * 1000);
}

/** 시간이 되었으면 지운다. 앱이 다시 앞으로 나올 때도 부른다. */
export async function clearIfDue(now = Date.now()): Promise<void> {
  if (!pending) return;
  if (!shouldClearClipboard({ dueAt: pending.dueAt, now })) return;
  const { value } = pending;
  pending = null;
  cancelPendingClear();
  await clearIfUnchanged(value);
}

async function clearIfUnchanged(value: string): Promise<void> {
  try {
    const current = await Clipboard.getStringAsync();
    if (current === value) await Clipboard.setStringAsync('');
  } catch {
    // 클립보드를 읽지 못하면 그냥 비운다.
    await Clipboard.setStringAsync('');
  }
}

function cancelPendingClear(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

/** 금고를 지울 때처럼 지금 당장 비워야 할 때만 쓴다. */
export async function clearNow(): Promise<void> {
  cancelPendingClear();
  pending = null;
  await Clipboard.setStringAsync('');
}
