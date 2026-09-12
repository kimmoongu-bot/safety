import Constants from 'expo-constants';

/**
 * 이 빌드가 개발용인가.
 *
 * `app.config.js` 가 개발용 빌드에만 `extra.devBuild` 를 넣는다. 배포판에는
 * 없으므로 거짓이 된다. `tests/appConfig.test.ts` 가 그것을 지킨다.
 *
 * **꾸러미 이름의 `.dev` 를 보지 않는다.** 그것도 `app.config.js` 가 붙이는
 * 것이라 결국 같은 곳을 두 번 읽는 셈인데, 한쪽만 바뀌면 조용히 어긋난다.
 * 표시는 하나만 둔다.
 *
 * 이걸로 가리는 것은 **개발용 편의**뿐이다. 보안 규칙(명세 5장)을 이걸로 켜고
 * 끄지 않는다 — 배포판에서 꺼지는 보안은 보안이 아니다.
 */
const extra = Constants.expoConfig?.extra as { devBuild?: unknown } | undefined;

export const IS_DEV_BUILD = extra?.devBuild === true;
