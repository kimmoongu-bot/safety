import type { CryptoProvider } from './crypto/types.ts';

const HEX = '0123456789abcdef';

/** UUID v4 (RFC 4122) — 난수는 CryptoProvider 에서만 가져온다. */
export function uuidV4(provider: CryptoProvider): string {
  const b = provider.randomBytes(16);
  b[6] = ((b[6] as number) & 0x0f) | 0x40;
  b[8] = ((b[8] as number) & 0x3f) | 0x80;
  let out = '';
  for (let i = 0; i < 16; i++) {
    const v = b[i] as number;
    out += (HEX[v >> 4] as string) + (HEX[v & 0x0f] as string);
    if (i === 3 || i === 5 || i === 7 || i === 9) out += '-';
  }
  return out;
}
