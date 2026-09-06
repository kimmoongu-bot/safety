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

  return get;
}
