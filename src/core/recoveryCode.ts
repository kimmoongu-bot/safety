import type { CryptoProvider } from './crypto/types.ts';
import { VaultError } from './errors.ts';
import { utf8ToBytes } from './bytes.ts';

/**
 * 복구 코드 (명세 6.1) — 사람이 종이에 옮겨 적는 값.
 *
 * 6자 × 4묶음 = 24자. 뒤 2자는 오타 검사용이라 실제 무작위 정보량은 22자 × 5비트 = 110비트.
 * 헷갈리는 글자(I, L, O, U)는 알파벳에서 뺐고, 입력할 때는 비슷한 글자를 자동으로 고쳐 준다.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUP_SIZE = 6;
const GROUP_COUNT = 4;
export const RECOVERY_CODE_LENGTH = GROUP_SIZE * GROUP_COUNT; // 24
const RANDOM_LENGTH = RECOVERY_CODE_LENGTH - 2;

const CONFUSABLE: Record<string, string> = {
  I: '1',
  L: '1',
  O: '0',
  U: 'V',
};

function checksum(chars: string): string {
  let c1 = 0;
  let c2 = 0;
  for (let i = 0; i < chars.length; i++) {
    const idx = ALPHABET.indexOf(chars[i] as string);
    c1 = (c1 + idx) % 32;
    c2 = (c2 + (i + 1) * idx) % 32;
  }
  return (ALPHABET[c1] as string) + (ALPHABET[c2] as string);
}

/** 화면 표시용: ABCDEF-GHJKMN-... */
export function formatRecoveryCode(code: string): string {
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += GROUP_SIZE) groups.push(code.slice(i, i + GROUP_SIZE));
  return groups.join('-');
}

/** 입력 정리: 공백·하이픈 제거, 대문자화, 헷갈리는 글자 교정. */
export function normalizeRecoveryCode(input: string): string {
  let out = '';
  for (const raw of input.toUpperCase()) {
    const ch = CONFUSABLE[raw] ?? raw;
    if (ALPHABET.includes(ch)) out += ch;
  }
  return out;
}

export function isValidRecoveryCode(input: string): boolean {
  const norm = normalizeRecoveryCode(input);
  if (norm.length !== RECOVERY_CODE_LENGTH) return false;
  return checksum(norm.slice(0, RANDOM_LENGTH)) === norm.slice(RANDOM_LENGTH);
}

export function generateRecoveryCode(provider: CryptoProvider): string {
  const bytes = provider.randomBytes(RANDOM_LENGTH);
  let body = '';
  // 256 / 32 = 8 이므로 하위 5비트를 그대로 써도 균등하다.
  for (let i = 0; i < RANDOM_LENGTH; i++) body += ALPHABET[(bytes[i] as number) & 31];
  bytes.fill(0);
  return body + checksum(body);
}

/** KDF 입력으로 쓸 바이트. 반드시 정규화한 뒤에 변환한다. */
export function recoveryCodeToSecret(input: string): Uint8Array {
  const norm = normalizeRecoveryCode(input);
  if (norm.length !== RECOVERY_CODE_LENGTH) throw new VaultError('WRONG_RECOVERY_CODE');
  if (!isValidRecoveryCode(norm)) throw new VaultError('WRONG_RECOVERY_CODE');
  return utf8ToBytes(norm);
}
