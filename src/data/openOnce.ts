/**
 * 무엇이든 '한 번만 열기'.
 *
 * 실기기에서 이 오류가 났다.
 *   Call to function 'NativeDatabase.prepareAsync' has been rejected.
 *   → Caused by: java.lang.NullPointerException
 *
 * 원인은 데이터베이스를 두 번 연 것이었다. 흔한 모양의 코드가 이렇게 생겼는데,
 *
 *   if (this.db) return this.db;
 *   this.db = await open();
 *
 * 두 곳에서 동시에 부르면 **둘 다** 아직 비어 있는 것을 보고 각자 연다.
 * `await` 앞에서 갈라지기 때문이다. 같은 파일을 두 번 여는 셈이고, 한쪽 손잡이가
 * 버려지면 그 뒤 질의가 죽는다.
 *
 * 다 열린 값이 아니라 **여는 중인 약속**을 들고 있으면 이 틈이 없어진다.
 * 나중에 부른 쪽은 먼저 시작한 열기를 기다린다.
 *
 * 실패한 약속은 버린다. 들고 있으면 한 번 실패한 뒤로 영영 다시 시도할 수 없다.
 */
export function openOnce<T>(open: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = open().catch((e: unknown) => {
        pending = null;
        throw e;
      });
    }
    return pending;
  };
}
