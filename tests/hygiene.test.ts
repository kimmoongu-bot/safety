import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
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
