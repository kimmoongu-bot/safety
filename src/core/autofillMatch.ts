/**
 * 채우기 화면에서 **어느 항목을 맨 위에 보여 줄지** 정한다
 * (docs/자동완성.md 3-2단계).
 *
 * 금고에 항목이 스무 개쯤 있는데 그중 하나를 찾아 스크롤하는 것은, 앱을 열고
 * 복사해 오는 것과 별로 다르지 않다. 눌렀을 때 맨 위에 그것이 있어야 값어치가 있다.
 *
 * **고르지는 않는다.** 자동으로 채우지 않고 사람이 누르게 한다 (명세 5장의 정신).
 * 여기서 하는 일은 줄 세우기뿐이다. 잘못 세워도 사용자가 다른 것을 고를 수 있다.
 *
 * 순수 함수다. 자동 완성의 나머지는 실기기에서만 확인되지만 이것은 여기서 본다.
 *
 * ## 여기서 못 하는 것 — 한글 이름
 *
 * **`실손24` 와 `silson24.or.kr` 은 여기서 만나지 못한다.** 글자가 다르기 때문이다.
 * 그런데 우리 손님은 한글로 적는다 — `대성은행`, `모모랜드`. 그러면 줄 세우기가
 * 아무 일도 안 한 것과 같아진다.
 *
 * 소리로 옮겨 견주는 것은 답이 아니다. `실손` 을 `silson` 으로 옮기는 규칙을
 * 우리가 만들면 `실손`·`shilson`·`silsohn` 중 무엇이 맞는지 다투게 되고, 틀리면
 * 엉뚱한 항목을 맨 위에 올린다.
 *
 * **진짜 답은 사용자가 한 번 고른 것을 기억하는 것이다.** 남들이 다 그렇게 한다.
 * 그러려면 항목에 "어느 앱·어느 주소의 것인가" 를 적어 둘 자리가 있어야 하고,
 * 그건 금고 구조를 바꾸는 일이다. 다음 단계로 미룬다.
 *
 * 그때까지 이 함수는 **영문으로 적어 둔 항목에만** 쓸모가 있다. 못 맞히면 금고에
 * 담긴 차례 그대로 보여 준다 — 섞어 놓으면 더 헷갈린다.
 */

/** 누가 달라고 하는가. */
export type Asking = {
  /** 꾸러미 이름. 예: `kr.co.silson24.app` */
  packageName: string;
  /** 브라우저 안이면 웹 주소. 예: `www.silson24.or.kr` */
  webDomain: string | null;
};

/** 줄 세울 대상. 금고 항목에서 이름만 본다 — 비밀번호는 여기 오지 않는다. */
export type Named = { id: string; service: string };

/**
 * 이름에서 **알맹이만** 남긴다.
 *
 * `www.silson24.or.kr` → `silson24`
 * `kr.co.silson24.app` → `silson24`
 * `실손24` → `실손24`
 * `Naver 메일` → `naver메일`
 *
 * 흔한 꼬리를 떼는 것이 핵심이다. 안 떼면 `www.naver.com` 과 `naver` 가 남남이 된다.
 */
const HUSK = new Set([
  // 웹 주소 꼬리
  'www', 'com', 'net', 'org', 'co', 'kr', 'jp', 'ru', 'io', 'me', 'app', 'or', 'go', 'ac',
  // 꾸러미 이름 머리
  'android', 'mobile',
]);

export function coreName(raw: string): string {
  /*
    붙임표(-)로는 쪼개지 않는다. 주소에서 붙임표는 이름의 일부다 —
    `cat-show.co.kr` 을 쪼개면 `show` 가 남아서 엉뚱한 것과 만난다.
    쪼개는 것은 점과 빗금뿐이고, 붙임표와 밑줄은 그냥 지운다.
  */
  const cleaned = raw.toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
  const parts = cleaned.split(/[./]+/).filter((p) => p.length > 0 && !HUSK.has(p));
  if (parts.length === 0) return cleaned;
  /*
    남은 조각 중 **가장 긴 것**을 고른다. 회사 이름이 보통 제일 길다.
    `kr.co.silson24.app` 에서 `silson24`, `com.nhn.android.search` 에서 `search`…
    마지막 조각을 고르면 `app`·`search` 같은 것이 잡히고, 첫 조각을 고르면
    `kr`·`com` 이 잡힌다.
  */
  return parts.reduce((best, p) => (p.length > best.length ? p : best));
}

/**
 * 두 이름이 얼마나 닮았나. 0이면 남남, 클수록 가깝다.
 *
 * 글자를 하나씩 견주는 복잡한 셈은 하지 않는다. 이 자리에서 필요한 것은
 * "이게 그거다" 를 맞히는 것이지 비슷한 정도를 재는 것이 아니다.
 */
function closeness(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 3;
  // 한쪽이 다른 쪽을 통째로 품고 있다. `naver` 와 `navermail` 같은 경우.
  if (a.includes(b) || b.includes(a)) return 2;
  return 0;
}

/**
 * 이 요청에 가까운 것부터 줄을 세운다.
 *
 * 가까운 정도가 같으면 **최근에 고친 것**이 앞이다. 자주 쓰는 것이 위로 온다.
 */
export function rankForRequest<T extends Named>(
  records: readonly T[],
  asking: Asking,
  recency: (record: T) => number = () => 0,
): T[] {
  const wanted = [asking.webDomain, asking.packageName]
    .filter((v): v is string => !!v)
    .map(coreName)
    .filter((v) => v.length > 0);

  const scored = records.map((record) => {
    const name = coreName(record.service);
    const score = wanted.reduce((best, w) => Math.max(best, closeness(name, w)), 0);
    return { record, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || recency(b.record) - recency(a.record))
    .map((s) => s.record);
}

/**
 * 맨 위 것이 **자신 있게** 그것인가.
 *
 * 화면에서 "이것 같습니다" 라고 짚어 줄지 판단할 때 쓴다. 아니면 그냥 목록만
 * 보여 준다 — 엉뚱한 것을 짚어 주면 사용자가 그것을 믿는다.
 */
export function isConfident<T extends Named>(records: readonly T[], asking: Asking): boolean {
  const wanted = [asking.webDomain, asking.packageName]
    .filter((v): v is string => !!v)
    .map(coreName);
  const hits = records.filter((r) => wanted.some((w) => closeness(coreName(r.service), w) > 0));
  // 하나만 걸려야 자신 있는 것이다. 둘이면 사용자가 골라야 한다.
  return hits.length === 1;
}
