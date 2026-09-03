/**
 * 바이트 유틸 — 문자열/바이트/Base64 변환.
 * 순수 함수만 둔다. 여기서는 어떤 값도 로그로 남기지 않는다.
 */

import { VaultError } from './errors.ts';

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function utf8ToBytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
  /* istanbul ignore next — 최신 RN/Node 에는 TextEncoder 가 있다 */
  throw new Error('TextEncoder unavailable');
}

export function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  /* istanbul ignore next */
  throw new Error('TextDecoder unavailable');
}

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = i + 1 < bytes.length ? (bytes[i + 1] as number) : undefined;
    const b2 = i + 2 < bytes.length ? (bytes[i + 2] as number) : undefined;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64_ALPHABET[b2 & 0x3f];
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[\s=]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let idx = 0;
  for (const ch of clean) {
    const v = B64_ALPHABET.indexOf(ch);
    // base64 가 아닌 글자가 섞였다 = 저장된 것이 깨졌거나 우리가 만든 파일이 아니다.
    // 여기서 평범한 Error 를 던지면 화면에 영어 부스러기가 그대로 나간다.
    if (v < 0) throw new VaultError('DATA_DAMAGED');
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[idx++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, idx);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** 길이가 달라도 조기 반환하지 않는 상수시간 비교. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * 메모리의 비밀값을 0으로 덮어쓴다.
 * JS 런타임에서 완전한 소거는 보장할 수 없다(GC 사본). 그래도 살아있는
 * 참조를 통해 값이 다시 읽히는 것은 막는다 — 명세 5.5 의 최선 노력 구현.
 */
export function wipe(...secrets: (Uint8Array | undefined | null)[]): void {
  for (const s of secrets) if (s) s.fill(0);
}
