/**
 * 무엇이든 '한 번만 열기'. 놓을 때는 반드시 닫는다.
 *
 * 실기기에서 이 오류가 세 번 났다.
 *   Call to function 'NativeDatabase.prepareAsync' has been rejected.
 *   → Caused by: java.lang.NullPointerException
 *
 * 세 번째에 expo-sqlite 와 expo-modules-core 의 안드로이드 소스를 끝까지 읽고
 * 원인을 찾았다. **한 파일에 손잡이를 두 개 만들면, 먼저 버려진 쪽이
 * 나중 것까지 같이 죽인다.**
 *
 *   1. `SQLiteModule.kt` 의 생성자는 같은 경로를 다시 열면 **새로 열지 않고**
 *      이미 열려 있는 코틀린 객체를 그대로 돌려준다 (`findCachedDatabase`).
 *      자바스크립트 쪽에는 손잡이가 두 개 생기지만, 진짜 데이터베이스는 하나다.
 *   2. `SharedObjectRegistry.delete` 는 자바스크립트 손잡이가 쓰레기 수집될 때
 *      `sharedObjectDidRelease()` 를 부르고, `NativeDatabase` 는 거기서
 *      **`ref.close()` 로 진짜 데이터베이스를 닫아 버린다.**
 *   3. 그런데 이 길은 `isClosed` 를 켜지 않는다. 그래서 남은 손잡이로 질의하면
 *      "닫힌 것을 쓴다"는 점잖은 오류가 아니라, 닫힌 내부를 그대로 만져서
 *      **NullPointerException** 이 난다. 우리가 본 그 오류다.
 *
 * **지난번 고침이 바로 이 조건을 만들었다.** 질의가 실패하면 손잡이를 그냥 버리고
 * 새로 열었는데, 버려진 손잡이는 잠시 뒤 쓰레기 수집되면서 **새로 연 손잡이가 쓰는
 * 데이터베이스를 닫았다.** 살리려던 것이 죽이고 있었다.
 *
 * 그래서 두 가지를 바꾼다.
 *   - **놓을 때는 반드시 닫는다.** 그냥 버리는 길을 아예 없앤다 —
 *     이 파일이 내주는 것에는 `reset()` 이 없다.
 *   - 저장소는 `useNewConnection` 으로 연다. 위 1번을 건너뛰어서 우리 손잡이가
 *     남의 것과 **절대 겹치지 않는다.**
 */
export type Handle<T> = {
  /**
   * 열어서 쓴다. 실패하면 **한 번만** 닫고 다시 열어 해 본다.
   *
   * 안드로이드가 앱을 뒤로 보내면서 데이터베이스를 정리하는 경우가 있다. 그때
   * 들고 있던 것을 닫고 새로 열면 살아난다. 안 그러면 앱을 껐다 켜기 전까지
   * 영영 안 되고, 사용자에게는 앱이 고장 난 것으로 보인다.
   *
   * 다시 하는 것은 한 번뿐이다. 계속 하면 진짜 고장난 것을 감추고 화면만 멈춘다.
   * 두 번 다 실패하면 **처음 오류**를 던진다 — 그게 진짜 원인이고, 두 번째 것은
   * 그 뒤에 따라온 것일 수 있다.
   *
   * 넘기는 `work` 는 **두 번 해도 안전한 것**이어야 한다.
   */
  use<R>(work: (value: T) => Promise<R>): Promise<R>;
  /** 닫고 놓는다. 연 적이 없으면 아무 일도 하지 않는다. 다음에 쓸 때 새로 연다. */
  release(): Promise<void>;
  /** 지금 들고 있는 것이 있나. */
  opened(): boolean;
};

export function openOnce<T>(
  open: () => Promise<T>,
  close: (value: T) => Promise<void>,
): Handle<T> {
  /*
    다 열린 값이 아니라 **여는 중인 약속**을 들고 있는다.
    다 열린 값만 보면 두 곳에서 동시에 불렀을 때 둘 다 "아직 안 열렸네" 하고
    각자 연다 — `await` 앞에서 갈라지기 때문이다. 그러면 위에 적은 손잡이 두 개
    상태가 되고, 바로 그것이 우리를 세 번 물었다.
  */
  let pending: Promise<T> | null = null;

  const get = (): Promise<T> => {
    if (!pending) {
      pending = open().catch((e: unknown) => {
        // 실패한 약속은 버린다. 들고 있으면 한 번 실패한 뒤로 영영 다시 시도할 수 없다.
        // 열리지 않았으니 닫을 것도 없다.
        pending = null;
        throw e;
      });
    }
    return pending;
  };

  const release = async (): Promise<void> => {
    if (!pending) return; // 연 적이 없으면 놓을 것도 없다. 놓겠다고 새로 여는 것은 말이 안 된다
    const holding = pending;
    // 먼저 놓는다. 닫다가 실패해도 다음에는 새로 열어야 하기 때문이다.
    pending = null;
    try {
      await close(await holding);
    } catch {
      // 이미 죽어서 못 닫는 경우가 바로 우리가 고치려는 그 경우다. 우리는 이미 놓았다.
    }
  };

  const use = async <R>(work: (value: T) => Promise<R>): Promise<R> => {
    try {
      return await work(await get());
    } catch (first) {
      // 그냥 버리지 않는다. 닫아야 남은 손잡이를 죽이지 않는다 — 이 파일 맨 위 참고.
      await release();
      try {
        return await work(await get());
      } catch {
        throw first;
      }
    }
  };

  return { use, release, opened: () => pending !== null };
}
