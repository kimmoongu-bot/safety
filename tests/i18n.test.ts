import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../src/app/i18n/en.ts';
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
const MIGRATED = [
  'src/app/screens/LockScreen.tsx',
  'src/app/screens/VaultListScreen.tsx',
  'src/app/screens/SearchResultsScreen.tsx',
  'src/app/screens/EditScreen.tsx',
  'src/app/screens/DetailScreen.tsx',
  'src/app/components/RecordCard.tsx',
  'src/app/platform/biometrics.ts',
  'src/app/screens/SetupScreen.tsx',
  'src/app/screens/SettingsScreen.tsx',
  'src/app/screens/BackupScreen.tsx',
  'src/app/components/PinPad.tsx',
  'src/app/components/Basics.tsx',
  'src/app/components/Confirm.tsx',
  'src/app/components/PrivacyShield.tsx',
  'src/app/components/RecoveryCodeView.tsx',
  'src/app/App.tsx',
  'src/app/state/vaultStore.ts',
  'src/app/platform/screenGuard.ts',
  'src/app/platform/reminders.ts',
  'src/app/platform/backupFile.ts',
].map((p) => join(...p.split('/')));

/**
 * 주석을 지운 소스.
 *
 * 주석의 한국어는 옮길 대상이 아니다 — 저와 다음 개발자가 읽는 글이다.
 * 줄 끝에 붙은 주석(`code(); // 설명`)과 화면 코드 안의 주석(`{/* 설명 *​/}`)까지
 * 지워야 한다. 줄 첫머리만 보면 그것들을 놓친다.
 */
function withoutComments(source: string): string[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '') // 여러 줄 주석과 JSX 안 주석
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '')); // 줄 끝 주석
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
      if (key && !(key in ko)) missing.push(`${file} → ${key}`);
    }
  }
  assert.deepEqual(missing, [], `문장 목록에 없는 열쇠:\n  ${missing.join('\n  ')}`);
});

test('옮긴 파일에는 화면용 한국어가 남아 있지 않다', () => {
  const offenders: string[] = [];
  for (const file of MIGRATED) {
    withoutComments(readFileSync(file, 'utf8')).forEach((line, i) => {
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
    ['list.unreadable', { count: 2 }],
    ['list.noMatch', { query: '네이버' }],
    ['search.found', { count: 2 }],
    ['card.label', { service: '네이버', username: 'kim' }],
    ['detail.autoHide', { seconds: 15 }],
    ['detail.copied', { what: '비밀번호', seconds: 60 }],
    ['detail.emptyField', { what: '아이디' }],
    ['detail.deleteMessage', { service: '네이버' }],
    ['backup.last', { when: '2026년 9월 2일' }],
    ['backup.passwordHint', { min: 8 }],
    ['backup.made', { count: 3 }],
    ['backup.picked', { name: 'a.jamgim' }],
    ['backup.pickedToast', { name: 'a.jamgim' }],
    ['backup.previewCount', { count: 3 }],
    ['backup.restored', { count: 3 }],
    ['settings.clipboardAfter', { seconds: 60 }],
    ['settings.screenGuardFailed', { reason: '알 수 없음' }],
    ['common.recoveryCodeLabel', { code: 'ABCD' }],
    ['common.failedWhy', { why: '무슨 일' }],
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

test('옛 항목의 갈래는 번역하지 않고 그대로 보여 준다', async () => {
  /**
   * 갈래 코드를 쓰기 전에 저장된 항목에는 한국어가 그대로 들어 있다("은행").
   * 그런 값을 번역하려 들면 못 찾아서 빈칸이 되거나 열쇠 이름이 나온다.
   * 옛 항목이 갑자기 이상해지면 안 된다.
   */
  const { categoryLabel, CATEGORY_CODES } = await import('../src/app/i18n/categories.ts');
  const t = ((key: string) => translate(ko, key)) as never;

  assert.equal(categoryLabel('은행', t), '은행', '옛 값은 그대로');
  assert.equal(categoryLabel('내가 만든 갈래', t), '내가 만든 갈래');
  for (const code of CATEGORY_CODES) {
    const shown = categoryLabel(code, t);
    assert.notEqual(shown, code, `${code} 가 번역되지 않았다`);
    assert.ok(!shown.includes('.'), `${code} → ${shown} 처럼 열쇠 이름이 나오면 안 된다`);
  }
});

// ── 영어 문장 ────────────────────────────────────────────────────────────────

test('영어 문장 목록이 한국어와 열쇠가 같다', () => {
  const koKeys = Object.keys(ko).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(enKeys, koKeys);
});

test('영어 문장에 한글이 남아 있지 않다', () => {
  // ko.ts 를 복사해 옮기다 한 줄을 빠뜨리면 영어 화면에 한국어가 튀어나온다.
  const left: string[] = [];
  for (const [key, value] of Object.entries(en)) {
    const text = typeof value === 'function' ? String(value) : String(value);
    if (/[가-힣]/.test(text)) left.push(key);
  }
  assert.deepEqual(left, [], `안 옮긴 문장: ${left.join(', ')}`);
});

/**
 * 이 문장이 받는 값 이름들.
 *
 * 글이면 `{name}` 을 뽑고, 함수면 **매개변수에 적힌 이름**을 뽑는다.
 * 함수 본문의 `${name}` 을 보면 안 된다 — 값을 빼먹은 문장은 본문에도 그 이름이
 * 없어서, 볼 것이 없어지고 검사가 저절로 통과한다.
 */
function paramNames(message: unknown): string[] {
  if (typeof message === 'string') {
    return [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
  }
  if (typeof message !== 'function') return [];
  const head = /^\(\s*\{([^}]*)\}/.exec(String(message));
  if (!head?.[1]) return [];
  return head[1]
    .split(',')
    .map((piece) => (piece.split(':')[0] ?? '').trim())
    .filter((name) => /^\w+$/.test(name))
    .sort();
}

test('두 언어가 받는 값 이름이 같다', () => {
  /*
    한국어가 `{label}` 인데 영어가 `{name}` 이면 화면에 `{name}` 이 그대로 나온다.
    열쇠 이름이 맞고 문장도 그럴듯해서 눈으로는 못 잡는다.
  */
  const mismatched: string[] = [];
  for (const key of Object.keys(ko)) {
    const a = paramNames((ko as Record<string, unknown>)[key]).join(',');
    const b = paramNames((en as Record<string, unknown>)[key]).join(',');
    if (a !== b) mismatched.push(`${key}: ko(${a}) vs en(${b})`);
  }
  assert.deepEqual(mismatched, [], `값 이름이 다른 곳: ${mismatched.join(' / ')}`);
});

test('영어 문장이 받은 값을 실제로 보여 준다', () => {
  /*
    개수에 따라 갈리는 문장을 함수로 적다가 값을 빼먹기 쉽다.
    `({ count }) => 'Found some.'` 처럼 되면 화면에서 숫자가 사라진다.

    기대하는 값 이름은 **한국어 쪽에서** 가져온다. 영어 쪽에서 가져오면 빼먹은
    문장은 애초에 검사 대상에서 빠진다.

    숫자는 7 을 넣는다. 1 을 넣으면 "1 time" 처럼 숫자를 글자로 적는 갈래로 빠져
    자리 표시자 없이도 통과해 버린다.
  */
  const SENTINEL: Record<string, string | number> = {
    count: 7, seconds: 7, minutes: 7, digit: 7, min: 7,
    how: 'ZZQ1', what: 'ZZQ2', service: 'ZZQ3', name: 'ZZQ4',
    wait: 'ZZQ5', why: 'ZZQ6', reason: 'ZZQ7', query: 'ZZQ8',
    username: 'ZZQ9', code: 'ZZQ10', when: 'ZZQ11', label: 'ZZQ12',
  };
  const missing: string[] = [];
  for (const key of Object.keys(ko)) {
    const value = (en as Record<string, unknown>)[key];
    const wanted = paramNames((ko as Record<string, unknown>)[key]);
    if (wanted.length === 0) continue;
    const out =
      typeof value === 'function'
        ? (value as (p: Record<string, string | number>) => string)(SENTINEL)
        : String(value);
    for (const nameWanted of wanted) {
      const mark = SENTINEL[nameWanted];
      if (mark === undefined) {
        missing.push(`${key}:${nameWanted} (검사에 넣을 값이 없다)`);
        continue;
      }
      // 글로 남은 문장은 아직 `{name}` 인 채다. 그것도 통과로 본다.
      const shown = out.includes(String(mark)) || out.includes(`{${nameWanted}}`);
      if (!shown) missing.push(`${key}:${nameWanted}`);
    }
  }
  assert.deepEqual(missing, [], `값이 문장에 안 나오는 곳: ${missing.join(', ')}`);
});
