import type { CryptoProvider } from './crypto/types.ts';
import { VaultError } from './errors.ts';
import { utf8ToBytes } from './bytes.ts';

/**
 * 복구 코드 (명세 6.1) — 사람이 종이에 옮겨 적는 값.
 *
 * 4자 × 4묶음 = 16자. 뒤 2자는 오타 검사용이라 실제 무작위 정보량은 14자 × 5비트 = 70비트.
 * 이 코드로 열쇠를 만드는 데 기기에서 1초쯤 걸리게 맞춰 두었으므로, 70비트면
 * 모든 컴퓨터를 동원해도 뚫는 데 걸리는 시간이 우주 나이를 훌쩍 넘는다.
 * 종이에 옮겨 적는 값이라 짧을수록 잘못 적을 위험이 준다.
 *
 * 헷갈리는 글자(I, L, O, U)는 알파벳에서 뺐고, 입력할 때는 비슷한 글자를 자동으로 고쳐 준다.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUP_SIZE = 4;
const GROUP_COUNT = 4;
export const RECOVERY_CODE_LENGTH = GROUP_SIZE * GROUP_COUNT; // 16
const RANDOM_LENGTH = RECOVERY_CODE_LENGTH - 2;

/**
 * 예전에 만든 금고는 24자(6자 × 4묶음) 코드를 쓴다. 길이를 줄이면서 그 코드가
 * 안 열리게 되면 사용자가 복구 수단을 잃는다. 그래서 옛 길이도 계속 받는다.
 * 새로 만드는 것은 항상 16자다.
 */
const ACCEPTED_LENGTHS = [RECOVERY_CODE_LENGTH, 24] as const;

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

/**
 * 화면 표시용: WZC7-1W7M-KHRP-DNEN
 * 길이와 상관없이 언제나 네 묶음으로 나눈다. 16자면 4자씩, 옛 24자면 6자씩이다.
 */
export function formatRecoveryCode(code: string): string {
  if (code.length === 0 || code.length % GROUP_COUNT !== 0) return code;
  const size = code.length / GROUP_COUNT;
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += size) groups.push(code.slice(i, i + size));
  return groups.join('-');
}

/** 화면에 한 줄씩 보여 주려고 묶음만 떼어 준다. */
export function recoveryCodeGroups(code: string): string[] {
  return formatRecoveryCode(code).split('-');
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
  if (!ACCEPTED_LENGTHS.includes(norm.length as (typeof ACCEPTED_LENGTHS)[number])) return false;
  const bodyLength = norm.length - 2; // 뒤 2자는 오타 검사용
  return checksum(norm.slice(0, bodyLength)) === norm.slice(bodyLength);
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
  if (!isValidRecoveryCode(norm)) throw new VaultError('WRONG_RECOVERY_CODE');
  return utf8ToBytes(norm);
}
