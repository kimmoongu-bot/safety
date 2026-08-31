import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOVERY_CODE_LENGTH,
  formatRecoveryCode,
  generateRecoveryCode,
  isValidRecoveryCode,
  normalizeRecoveryCode,
  recoveryCodeToSecret,
} from '../src/core/recoveryCode.ts';
import { isVaultError } from '../src/core/errors.ts';
import { provider } from './helpers.ts';

test('복구 코드는 4자 4묶음이고 검사 문자가 맞는다', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateRecoveryCode(provider);
    assert.equal(code.length, 16);
    assert.equal(code.length, RECOVERY_CODE_LENGTH);
    assert.equal(formatRecoveryCode(code).split('-').length, 4);
    assert.ok(isValidRecoveryCode(code));
  }
});

/**
 * 옛 24자 코드를 하나 만들어 낸다. 실제 사용자의 코드를 저장소에 적어 둘 수는
 * 없으므로, 검사 문자 2자를 전부 대입해 맞는 것을 찾는다.
 */
function makeLegacyCode(): string {
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const body = 'K4ANB8JNKMGAM49HZ7NBW2'; // 22자
  for (const a of ALPHABET) {
    for (const b of ALPHABET) {
      const candidate = body + a + b;
      if (isValidRecoveryCode(candidate)) return candidate;
    }
  }
  throw new Error('옛 형식 코드를 만들지 못했다');
}

test('예전에 만든 24자 코드도 계속 열린다', () => {
  // 길이를 줄이면서 옛 코드가 막히면 그 금고는 복구 수단을 잃는다.
  const old = makeLegacyCode();
  assert.equal(old.length, 24);
  assert.ok(isValidRecoveryCode(old));
  assert.ok(isValidRecoveryCode(formatRecoveryCode(old).toLowerCase()));
  assert.equal(formatRecoveryCode(old).split('-').length, 4);
  assert.doesNotThrow(() => recoveryCodeToSecret(old));
});

test('16자도 24자도 아닌 길이는 거절한다', () => {
  for (const bad of ['ABCD', 'ABCD-EFGH-JKMN-PQRS-TVWX']) {
    assert.ok(!isValidRecoveryCode(bad));
  }
});

test('같은 복구 코드가 되풀이되지 않는다', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) seen.add(generateRecoveryCode(provider));
  assert.equal(seen.size, 2000);
});

test('소문자·공백·하이픈으로 적어도 알아본다', () => {
  const code = generateRecoveryCode(provider);
  const messy = ` ${formatRecoveryCode(code).toLowerCase()} `.replace(/-/g, ' - ');
  assert.equal(normalizeRecoveryCode(messy), code);
  assert.ok(isValidRecoveryCode(messy));
});

test('헷갈리는 글자(O/0, I/1, L/1, U/V)를 고쳐 준다', () => {
  assert.equal(normalizeRecoveryCode('O0IL1U'), '00111V');
});

test('한 글자만 틀려도 걸러낸다', () => {
  const code = generateRecoveryCode(provider);
  const wrong = (code[0] === 'A' ? 'B' : 'A') + code.slice(1);
  assert.ok(!isValidRecoveryCode(wrong));
});

test('앞뒤 두 글자를 바꿔 적으면 걸러낸다', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateRecoveryCode(provider);
    if (code[0] === code[1]) continue;
    const swapped = (code[1] as string) + (code[0] as string) + code.slice(2);
    assert.ok(!isValidRecoveryCode(swapped));
  }
});

test('형식이 틀린 복구 코드는 쉬운 문장으로 거절한다', () => {
  assert.throws(
    () => recoveryCodeToSecret('123'),
    (e: unknown) => isVaultError(e, 'WRONG_RECOVERY_CODE'),
  );
});
