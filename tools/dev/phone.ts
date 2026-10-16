/**
 * 폰을 화면 서버에 붙인다.
 *
 *     npm run dev:phone
 *
 * `npm run dev` 가 돌고 있는 상태에서, **다른 창**에서 친다.
 *
 * 세 가지를 한다.
 *
 * 1. `adb reverse` — 폰 안의 8081번 문을 피시의 8081번 문으로 잇는다. 와이파이를
 *    거치지 않고 USB 선으로 곧장 가므로, 공유기가 무엇을 막아 두든 상관없다.
 *    **선을 뽑으면 풀린다.** 다시 꽂았으면 이걸 다시 돌려야 한다.
 * 2. `force-stop` — 개발용 앱을 완전히 끈다. 떠 있는 채로 주소를 보내면 안드로이드가
 *    "이미 떠 있다"며 그냥 전달만 하고 앱은 꿈쩍도 안 한다.
 * 3. `am start` — 주소를 통째로 앱에 꽂는다. 폰에서 손으로 치지 않아도 된다.
 *
 * 꾸러미 이름은 `app.config.js` 가 정한 것을 그대로 읽는다. 여기에 베껴 적으면
 * 저쪽을 고칠 때 이쪽만 옛날 값으로 남는다.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const appJson = require('../../app.json') as { expo: { slug: string } & Record<string, unknown> };
const { resolve } = require('../../app.config.js') as {
  resolve: (config: Record<string, unknown>, env: Record<string, string>) => {
    android: { package: string };
  };
};

const dev = resolve(appJson.expo, { JAMGIM_DEV_BUILD: '1' });

/**
 * 개발용 앱을 부르는 주소 머리는 **`exp+` 가 붙은 쪽**이다.
 *
 * `app.json` 의 `scheme`(`jamgim`) 이 아니다. expo-dev-client 가 설치되면서
 * `exp+<slug>` 라는 머리를 따로 등록하고, 엑스포 CLI 도 여러 개 중에 `exp+` 로
 * 시작하는 것을 골라 쓴다 (`@expo/cli` 의 utils/scheme.js). 실기기에서 붙은 것도
 * 이 주소다. 맨 `jamgim://` 은 확인해 보지 않았으므로 쓰지 않는다.
 */
const scheme = `exp+${appJson.expo.slug}`;
const port = process.env.RCT_METRO_PORT ?? '8081';
const url = `http://127.0.0.1:${port}`;
const deepLink = `${scheme}://expo-development-client/?url=${encodeURIComponent(url)}`;

/** adb 를 한 번 돌리고, 못 돌면 그 자리에서 멎는다. 조용히 넘기면 뭐가 안 됐는지 모른다. */
function adb(...args: string[]): void {
  console.log(`adb ${args.join(' ')}`);
  const done = spawnSync('adb', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (done.error) {
    console.error('\nadb 를 찾지 못했습니다. 안드로이드 스튜디오의 platform-tools 가 PATH 에 있어야 합니다.');
    process.exit(1);
  }
  if (done.status !== 0) process.exit(done.status ?? 1);
}

adb('reverse', `tcp:${port}`, `tcp:${port}`);
adb('shell', 'am', 'force-stop', dev.android.package);
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', deepLink);

console.log(`\n${dev.android.package} 를 ${url} 로 열었습니다.`);
console.log('메트로 창에 Android Bundling 이 지나가면 제대로 가는 중입니다.');
