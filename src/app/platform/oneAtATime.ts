/**
 * 한 줄로 세우기.
 *
 * 먼저 시킨 일이 끝나야 다음 일이 시작한다. 앞의 것이 실패해도 줄은 계속 간다.
 *
 * 왜 필요한가. 화면 캡처 막기를 **켜는 일과 끄는 일**이 겹칠 수 있다. 앱을 켜면
 * 설정을 읽기 전에 기본값(켬)으로 한 번 걸고, 읽고 나서 "꺼짐" 이면 푼다. 이 둘이
 * 동시에 날아가면 어느 것이 나중에 도착할지 알 수 없다. 푸는 것이 먼저 도착하면
 * **설정은 꺼짐인데 화면은 계속 안 찍히는** 상태가 된다.
 *
 * 시킨 순서대로 도착하게 하면 마지막에 시킨 것이 이긴다. 그게 우리가 원하는 것이다.
 */
export function oneAtATime(): <T>(work: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(work: () => Promise<T>): Promise<T> => {
    // 앞의 것이 성공하든 실패하든 이어서 한다. 한 번 실패했다고 줄이 끊기면 안 된다.
    const run = tail.then(work, work);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
