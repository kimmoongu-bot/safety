import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ko } from '../src/app/i18n/ko.ts';
import { makePseudo } from '../src/app/i18n/pseudo.ts';
import { translate } from '../src/app/i18n/types.ts';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

const files = sourceFiles(join('src', 'app'));

/**
 * 옮기기가 끝난 파일.
 *
 * 여기 적힌 파일에는 화면에 보이는 한국어가 남아 있으면 안 된다.
 * 파일을 하나 옮길 때마다 여기에 더한다. **줄어들기만 하고 늘어나지 않는 목록의 반대** —
 * 늘어나기만 하는 목록이다. 한 번 옮긴 파일에 한국어가 다시 들어오면 검사가 잡는다.
 */
const MIGRATED = ['src/app/screens/LockScreen.tsx'].map((p) => join(...p.split('/')));

/** 주석 줄인가 */
function isComment(line: string): boolean {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
}

test('문장 목록에 열쇠가 실제로 들어 있다', () => {
  assert.ok(Object.keys(ko).length > 20, `열쇠 ${Object.keys(ko).length}개`);
});

test('화면이 부르는 열쇠는 모두 문장 목록에 있다', () => {
  const missing: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
      const key = m[1];
      if (!(key in ko)) missing.push(`${file} → ${key}`);
    }
  }
  assert.deepEqual(missing, [], `문장 목록에 없는 열쇠:\n  ${missing.join('\n  ')}`);
});

test('옮긴 파일에는 화면용 한국어가 남아 있지 않다', () => {
  const offenders: string[] = [];
  for (const file of MIGRATED) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (isComment(line)) return;
        if (/[가-힣]/.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim().slice(0, 60)}`);
      });
  }
  assert.deepEqual(offenders, [], `옮기다 만 문장:\n  ${offenders.join('\n  ')}`);
});

test('자리 표시자가 들어가는 문장은 값을 받으면 자리가 사라진다', () => {
  const withParams: [string, Record<string, string | number>][] = [
    ['lock.failures', { count: 3 }],
    ['lock.failuresWithWait', { count: 5, wait: '30초 뒤에 다시 해 주세요' }],
    ['lock.waitSeconds', { seconds: 30 }],
    ['lock.waitMinutes', { minutes: 5 }],
    ['pinpad.digit', { digit: 7 }],
    ['pinpad.entered', { count: 4 }],
  ];
  for (const [key, params] of withParams) {
    const made = translate(ko, key, params);
    assert.ok(!made.includes('{'), `${key} 에 값이 안 들어갔다: ${made}`);
  }
});

test('조사가 앞말에 따라 바뀐다', () => {
  assert.equal(translate(ko, 'lock.openWithBiometric', { how: '지문' }), '지문으로 열기');
  assert.equal(translate(ko, 'lock.openWithBiometric', { how: '얼굴' }), '얼굴로 열기');
});

test('가짜 언어에도 같은 열쇠가 모두 있다', () => {
  const pseudo = makePseudo(ko);
  assert.deepEqual(Object.keys(pseudo).sort(), Object.keys(ko).sort());
});

test('없는 열쇠는 빈칸이 아니라 열쇠 이름이 나온다', () => {
  assert.equal(translate(ko, 'nope.missing'), 'nope.missing');
});
