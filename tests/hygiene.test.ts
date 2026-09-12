import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * 소스 자체를 검사하는 규칙 — 명세 2장(금지 목록)과 5.5(로그 금지)를
 * 사람 눈이 아니라 테스트로 지킨다.
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

const files = sourceFiles('src');

test('검사할 소스가 실제로 있다', () => {
  assert.ok(files.length > 20, `찾은 파일 ${files.length}개`);
});

test('어디에도 console 호출이 없다 (명세 5.5 로그 금지)', () => {
  const offenders: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    source.split('\n').forEach((line, i) => {
      if (/(^|[^\w.])console\s*\./.test(line)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `console 호출이 남아 있다: ${offenders.join(', ')}`);
});

test('금지된 저장소를 쓰지 않는다 (명세 2장)', () => {
  const banned = [/AsyncStorage/, /\bMMKV\b/, /react-native-mmkv/];
  const offenders: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(source)) offenders.push(`${file} → ${pattern}`);
    }
  }
  assert.deepEqual(offenders, [], `금지된 저장소를 참조한다: ${offenders.join(', ')}`);
});

test('네트워크를 부르지 않는다 (명세 1장: 인터넷 권한 없이 동작)', () => {
  const banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /\bWebSocket\b/, /\baxios\b/];
  const offenders: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(source)) offenders.push(`${file} → ${pattern}`);
    }
  }
  assert.deepEqual(offenders, [], `네트워크 호출이 있다: ${offenders.join(', ')}`);
});

test('코어는 화면·플랫폼 모듈을 알지 못한다', () => {
  const coreFiles = files.filter((f) => f.startsWith(join('src', 'core')));
  const offenders: string[] = [];
  for (const file of coreFiles) {
    const source = readFileSync(file, 'utf8');
    if (/from '(react|react-native|expo[^']*|zustand)'/.test(source)) offenders.push(file);
    if (/\.\.\/app\//.test(source) || /\.\.\/data\//.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `코어가 바깥을 참조한다: ${offenders.join(', ')}`);
});

test('릴리스 빌드에서 console 을 지우도록 설정되어 있다', () => {
  const babel = readFileSync('babel.config.js', 'utf8');
  assert.ok(babel.includes('transform-remove-console'), 'babel.config.js 에 console 제거 설정이 없다');
});

test('안드로이드 OS 자동 백업에서 금고를 제외한다 (명세 5.5)', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')) as {
    expo: { android: { allowBackup: boolean; permissions: string[]; blockedPermissions: string[] } };
  };
  assert.equal(app.expo.android.allowBackup, false);
  assert.deepEqual(app.expo.android.permissions, []); // 인터넷 권한도 요청하지 않는다
  assert.ok(app.expo.android.blockedPermissions.includes('android.permission.INTERNET'));

  const plugin = readFileSync('plugins/withJamgimSecurity.js', 'utf8');
  assert.ok(plugin.includes('dataExtractionRules'));
  assert.ok(plugin.includes('device-transfer'));
});

test('글자에 굵기 숫자를 직접 주지 않는다 (가짜 굵기 방지)', () => {
  /**
   * 굵기는 글꼴 이름으로 고른다 (theme 의 font.family / font.familyBold).
   * 여기에 fontWeight: '700' 같은 값을 같이 주면, 안드로이드가 이미 굵은 글꼴을
   * **한 번 더** 굵게 그린다(가짜 굵기). 획이 뭉개지고 글자가 지저분해진다.
   *
   * theme 파일만 예외다 — 거기서 WEIGHT 를 정의한다.
   */
  const offenders: string[] = [];
  for (const file of files) {
    if (file.endsWith(join('theme', 'index.ts'))) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/fontWeight\s*:\s*['"]/.test(line)) offenders.push(`${file}:${i + 1}`);
      });
  }
  assert.deepEqual(offenders, [], `굵기를 숫자로 준 곳: ${offenders.join(', ')}`);
});

test('글자 크기를 정하는 곳은 글꼴도 함께 정한다', () => {
  /**
   * fontSize 만 주고 fontFamily 를 빠뜨리면 그 글자만 시스템 기본 글꼴로 나온다.
   * 한 화면에 두 글꼴이 섞여 보이는데, 눈에 잘 안 띄어서 놓치기 쉽다.
   */
  const offenders: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!/fontSize\s*:/.test(line)) return;
      // 같은 줄이나 바로 위 줄에 글꼴이 있어야 한다 (한 줄짜리·여러 줄짜리 둘 다)
      const near = [lines[i - 1] ?? '', line].join(' ');
      if (!/fontFamily\s*:/.test(near)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `글꼴을 안 정한 곳: ${offenders.join(', ')}`);
});

test('src/core 에는 사람이 읽을 한국어 문장이 없다 (국제화)', () => {
  /**
   * 코어는 오류 **코드**만 던지고, 말은 `src/app/i18n/ko.ts` 가 정한다.
   * 코어에 한국어를 박아 두면 번역자가 손대야 할 파일이 두 곳이 되고,
   * 한 곳을 옮기면 다른 곳이 조용히 남는다.
   *
   * 주석은 한국어로 쓴다. 그건 화면에 안 나가고, 우리가 읽을 것이다.
   */
  const offenders: string[] = [];
  for (const file of files) {
    if (!file.startsWith(join('src', 'core'))) continue;
    const source = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '') // 여러 줄 주석
      .replace(/\/\/.*$/gm, ''); // 한 줄 주석
    source.split('\n').forEach((line, i) => {
      // 따옴표 안에 한글이 있으면 화면에 나갈 말이다.
      if (/(['"`])[^'"`\n]*[가-힣][^'"`\n]*\1/.test(line)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `코어에 박힌 한국어: ${offenders.join(', ')}`);
});

/**
 * 데이터베이스를 **우리만 쓰는 연결**로 연다.
 *
 * 이것을 켜지 않으면 expo-sqlite 가 같은 파일에 이미 열려 있는 연결을 돌려준다.
 * 그러면 자바스크립트 손잡이는 둘인데 진짜 데이터베이스는 하나가 되고, 먼저 버려진
 * 손잡이가 쓰레기 수집될 때 남은 손잡이가 쓰는 데이터베이스를 닫아 버린다.
 * 그 뒤 질의가 NullPointerException 으로 죽는다 — 실기기에서 세 번 났다.
 *
 * 코드에서만 지킬 수 있는 규칙이라 소스를 본다. 노드에서는 expo-sqlite 를
 * 불러올 수 없어서 저장소를 실제로 돌려 볼 방법이 없다.
 */
test('SQLite 를 우리만 쓰는 연결로 연다', () => {
  const path = 'src/data/adapters/expoSqliteRecordStore.ts';
  const source = readFileSync(path, 'utf8');
  assert.match(source, /useNewConnection:\s*true/, `${path} 가 연결을 남과 나눠 쓴다`);
  assert.match(
    source,
    /SQLite\.openDatabaseAsync\(name,\s*OPEN_OPTIONS\)/,
    `${path} 가 옵션 없이 열고 있다`,
  );
});

/**
 * 빌드에 필요한 파일이 깃에 들어 있어야 한다.
 *
 * EAS 는 **깃이 아는 파일만** 빌드 서버로 보낸다. 여기 있는데 깃에 없으면
 * 빌드 서버에는 없는 것이고, prebuild 가 그 파일을 찾다가 죽는다.
 *
 * 실제로 이것 때문에 빌드가 죽었다. `.gitignore` 에 `android/` 라고만 적혀 있어서
 * **어느 깊이의 `android` 폴더든 전부** 무시했다. prebuild 가 만드는 최상위
 * `android/` 를 무시하려던 것인데, `modules/jamgim-autofill/android/` 와
 * `plugins/android/` 까지 같이 무시됐다. 네이티브 코드가 통째로 안 올라갔다.
 *
 * 여기서는 눈에 안 띈다 — 내 컴퓨터에는 파일이 있으니 `expo config` 도, 번들도
 * 다 통과한다. 그래서 검사로 지킨다.
 */
test('modules 와 plugins 아래에 깃이 무시하는 파일이 없다', () => {
  const out = execFileSync('git', ['status', '--ignored', '--porcelain', 'modules', 'plugins'], {
    encoding: 'utf8',
  });
  const ignored = out
    .split('\n')
    .filter((line) => line.startsWith('!!'))
    .map((line) => line.slice(3).trim());
  assert.deepEqual(ignored, [], `깃이 무시해서 빌드 서버에 안 가는 것: ${ignored.join(', ')}`);
});

/**
 * 채우기 액티비티는 `R` 도 `BuildConfig` 도 쓸 수 없다.
 *
 * 그 둘은 꾸러미 이름 아래에 생기는데, 개발용 빌드는 이름에 `.dev` 를 붙인다
 * (app.config.js). 이 파일의 꾸러미 이름은 고정이라 못 찾는다. 클라우드에서는
 * 되고 **내 피시에서만** 빌드가 깨져서 15분을 버렸다. 자세한 것은 그 파일 위에.
 */
test('채우기 액티비티가 R 과 BuildConfig 를 안 쓴다', () => {
  const source = readFileSync('plugins/android/JamgimFillActivity.kt', 'utf8')
    // 주석에는 적혀 있다. 하지 말라고 적어 둔 것이니 코드만 본다.
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\bR\.\w/.test(source), 'R 을 쓰면 개발용 빌드에서 깨진다');
  assert.ok(!/\bBuildConfig\b/.test(source), 'BuildConfig 를 쓰면 개발용 빌드에서 깨진다');
});

/**
 * 대역이 거짓말을 하지 않는지 본다.
 *
 * `tools/kotlin-check/stub-app/ExpoWrapper.kt` 는 Expo 의 진짜 클래스를 흉내 낸
 * 것이다. 흉내가 진짜보다 너그러우면 검사는 통과하고 빌드는 깨진다. 그래서
 * 우리가 쓰는 생성자(값 두 개짜리)가 진짜에 정말 있는지 여기서 확인한다.
 * Expo 를 올린 뒤 이 검사가 깨지면, 대역이 아니라 액티비티를 고쳐야 한다.
 */
test('Expo 의 ReactActivityDelegateWrapper 에 우리가 쓰는 생성자가 있다', () => {
  const source = readFileSync(
    'node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt',
    'utf8',
  );
  assert.match(
    source,
    /constructor\(activity: ReactActivity, delegate: ReactActivityDelegate\)/,
    '값 두 개짜리 생성자가 없어졌다 — 채우기 액티비티를 고쳐야 한다',
  );
});

test('설정 플러그인이 읽는 파일이 실제로 있다', () => {
  // 플러그인이 `fs.copyFileSync` 로 읽는 파일이다. 없으면 prebuild 가 죽는다.
  assert.ok(
    readFileSync('plugins/android/JamgimFillActivity.kt', 'utf8').includes('class JamgimFillActivity'),
    '채우기 액티비티 원본이 없거나 비어 있다',
  );
});

/**
 * 화면을 만들었으면 들어가는 길도 있어야 한다.
 *
 * 실제로 이런 일이 있었다. 정보 화면을 다 만들고, 길 이름도 넣고, 화면을 고르는
 * 곳에도 넣었는데, **설정 화면에 단추를 넣는 수정만 조용히 빠졌다.** 앱에는
 * 멀쩡히 들어 있지만 사용자는 영영 볼 수 없는 화면이 됐다.
 *
 * 타입 검사도 테스트도 이것을 못 잡는다. 코드가 다 맞고, 다만 아무도 그 화면을
 * 부르지 않을 뿐이다.
 *
 * 설정에서만 들어갈 수 있는 화면들을 여기 적어 둔다. 설정에 새 화면을 달면
 * 여기에도 한 줄 는다.
 */
/**
 * 자동 완성은 **설정에서 켤 수 있어야 한다.**
 *
 * 안드로이드는 우리가 몰래 못 켜게 하고 사용자가 직접 고르게 한다. 그 화면은
 * "설정 → 일반 → 비밀번호, 패스키, 자동 완성 → 자동 완성 서비스" 에 있다.
 * 중장년층에게 그걸 찾아가시라고 하는 것은 무리다 — 못 찾으면 이 기능은 만든
 * 적이 없는 것과 같다.
 *
 * 네이티브 쪽은 진작 있었는데 화면에 붙이는 것만 오래 빠져 있었다. 정보 화면도
 * 똑같이 당했다 (아래 검사). 그래서 여기도 못박는다.
 */
test('설정 화면에서 자동 완성을 켤 수 있다', () => {
  const source = readFileSync('src/app/screens/SettingsScreen.tsx', 'utf8');
  assert.ok(
    source.includes('openAutofillSettings'),
    '설정에 자동 완성 켜는 단추가 없다 — 사용자가 이 기능에 닿을 수 없다',
  );
});

test('설정에서만 갈 수 있는 화면은 설정에 단추가 있다', () => {
  const source = readFileSync('src/app/screens/SettingsScreen.tsx', 'utf8');
  const missing: string[] = [];
  for (const route of ['backup', 'info']) {
    if (!source.includes(`name: '${route}'`)) missing.push(route);
  }
  assert.deepEqual(missing, [], `설정에서 갈 수 없는 화면: ${missing.join(', ')}`);
});
