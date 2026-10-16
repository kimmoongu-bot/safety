/**
 * 개발용 화면 서버(메트로) 켜기.
 *
 *     npm run dev
 *
 * ## 왜 따로 두나
 *
 * 그냥 `npx expo start --dev-client` 를 하면 메트로가 폰에게 **와이파이 주소**를
 * 알려 준다 (예: `192.168.45.63:8081`). 공유기가 기기끼리 통신을 막아 두면 폰이
 * 거기로 못 간다. 실기기에서 "Connecting to the development server…" 에서 멈췄다.
 *
 * 그렇다고 `--localhost` 를 주면 **서버가 `localhost` 라는 이름에만 귀를 연다**
 * (`@expo/cli` 의 MetroBundlerDevServer). 윈도우에서 그 이름은 보통 IPv6(`::1`)
 * 로 풀리는데, USB 길(`adb reverse`)은 IPv4(`127.0.0.1`) 로 찾아간다. 서로 다른
 * 문이라 연결은 되고 한 글자도 못 받고 끊긴다 — okhttp 가 "unexpected end of
 * stream" 을 던졌다.
 *
 * 그래서 **서버는 모든 문을 열어 두고, 폰에게 알려 주는 주소만 `127.0.0.1` 로**
 * 바꾼다. 그 일을 하는 것이 `REACT_NATIVE_PACKAGER_HOSTNAME` 이다
 * (`@expo/cli` 의 UrlCreator 가 이 값을 가장 먼저 본다).
 *
 * 이 값은 **창마다 따로** 넣어야 하는 것이라, 파워셸 창을 새로 열 때마다 날아갔다.
 * 그래서 사람이 외우는 대신 여기에 적어 둔다.
 */
import { spawn } from 'node:child_process';

/** 이미 정해 둔 것이 있으면 그걸 쓴다. 일부러 다르게 주고 싶을 때가 있다. */
process.env.REACT_NATIVE_PACKAGER_HOSTNAME ??= '127.0.0.1';

console.log(`화면 서버 주소: http://${process.env.REACT_NATIVE_PACKAGER_HOSTNAME}:8081`);
console.log('폰을 붙이려면 다른 창에서: npm run dev:phone\n');

/*
  윈도우에서 `npx` 는 실행 파일이 아니라 `npx.cmd` 라서 셸을 거쳐야 한다.
  stdio 를 그대로 물려줘야 메트로 창에서 `r`(다시 읽기) 같은 키가 먹는다.
*/
const child = spawn('npx', ['expo', 'start', '--dev-client'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));
