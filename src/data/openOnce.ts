/**
 * 무엇이든 '한 번만 열기'. 죽으면 다시 열 수 있다.
 *
 * 실기기에서 이 오류가 두 번 났다.
 *   Call to function 'NativeDatabase.prepareAsync' has been rejected.
 *   → Caused by: java.lang.NullPointerException
 *
 * **첫 번째 원인은 두 번 연 것이었다.** 흔한 모양의 코드가 이렇게 생겼는데,
 *
 *   if (this.db) return this.db;
 *   this.db = await open();
 *
 * 두 곳에서 동시에 부르면 **둘 다** 아직 비어 있는 것을 보고 각자 연다.
 * `await` 앞에서 갈라지기 때문이다. 같은 파일을 두 번 여는 셈이고, 한쪽 손잡이가
 * 버려지면 그 뒤 질의가 죽는다. 다 열린 값이 아니라 **여는 중인 약속**을 들고
 * 있으면 이 틈이 없어진다.
 *
 * **두 번째 원인은 열린 뒤에 죽는 것이었다.** 위 고침은 '여는 데 실패했을 때' 만
 * 버렸다. 열기는 성공했는데 그 뒤에 손잡이가 죽으면 — 안드로이드가 앱을 뒤로
 * 보내면서 정리하는 경우가 있다 — 죽은 것을 계속 붙들고 있어서 **앱을 껐다 켜기
 * 전까지 영영 안 된다.** 사용자에게는 앱이 고장 난 것으로 보인다.
 *
 * 그래서 버릴 수 있게 해 둔다. 부르는 쪽이 실패를 보면 `reset()` 하고 다시 연다.
 */
export type Reopenable<T> = (() => Promise<T>) & {
  /** 들고 있던 것을 버린다. 다음에 부르면 새로 연다. */
  reset(): void;
  /** 지금 들고 있는 것이 있나. 놓기 전에 확인하려고 둔다 — 없는데 놓겠다고 열면 안 된다. */
  opened(): boolean;
};

export function openOnce<T>(open: () => Promise<T>): Reopenable<T> {
  let pending: Promise<T> | null = null;

  const get = (): Promise<T> => {
    if (!pending) {
      pending = open().catch((e: unknown) => {
        // 실패한 약속은 버린다. 들고 있으면 한 번 실패한 뒤로 영영 다시 시도할 수 없다.
        pending = null;
        throw e;
      });
    }
    return pending;
  };

  get.reset = () => {
    pending = null;
  };

  get.opened = () => pending !== null;

  return get;
}

/**
 * 한 번 해 보고, 실패하면 **한 번만** 다시 열어 해 본다.
 *
 * 안드로이드가 앱을 뒤로 보내면서 데이터베이스 손잡이를 정리하는 경우가 있다.
 * 그러면 다음 질의가 위의 NullPointerException 으로 죽는다. 들고 있던 것을 버리고
 * 다시 열면 살아난다. 안 그러면 앱을 껐다 켜기 전까지 영영 안 된다.
 *
 * 다시 하는 것은 한 번뿐이다. 계속 하면 진짜 고장난 것을 감추고 화면만 멈춘다.
 * 두 번 다 실패하면 **처음 오류**를 던진다 — 그게 진짜 원인이고, 두 번째 것은
 * 그 뒤에 따라온 것일 수 있다.
 *
 * 부르는 쪽은 `work` 를 **두 번 해도 안전한 것**으로 넘겨야 한다.
 */
export async function withReopen<T, R>(
  get: Reopenable<T>,
  work: (value: T) => Promise<R>,
): Promise<R> {
  try {
    return await work(await get());
  } catch (first) {
    get.reset();
    try {
      return await work(await get());
    } catch {
      throw first;
    }
  }
}

/**
 * 들고 있던 것을 닫고 놓는다. 연 적이 없으면 아무 일도 하지 않는다 —
 * 놓겠다고 새로 여는 것은 말이 안 된다.
 *
 * 닫기 전에 먼저 놓는다. 닫다가 실패해도 다음에는 새로 열어야 하기 때문이다.
 * 닫기가 실패해도 삼킨다. 이미 죽어 있어서 못 닫는 경우가 바로 우리가 고치려는 그 경우다.
 */
export async function releaseHandle<T>(
  get: Reopenable<T>,
  close: (value: T) => Promise<void>,
): Promise<void> {
  if (!get.opened()) return;
  const holding = get();
  get.reset();
  try {
    await close(await holding);
  } catch {
    // 이미 죽었거나 닫는 중에 실패했다. 어느 쪽이든 우리는 이미 놓았다.
  }
}
