import type { CryptoProvider, KdfAlgorithm, KdfParams } from './types.ts';
import { AES_KEY_BYTES } from './types.ts';
import { VaultError } from '../errors.ts';

/**
 * KDF 정책 (명세 2장 / 5.1).
 *
 * 우선순위: Argon2id → scrypt → PBKDF2-HMAC-SHA256(60만 회 이상).
 * 실제로 쓴 파라미터는 래핑 결과와 함께 저장한다. 그래야 나중에
 * 파라미터를 올려도 예전 금고를 계속 열 수 있다.
 */

/** 저사양 기기에서 0.5~1초를 목표로 한 시작값. 기기별로 보정한다. */
export const BASELINE_PARAMS: Record<KdfAlgorithm, KdfParams> = {
  argon2id: { alg: 'argon2id', memoryKiB: 47104, iterations: 2, parallelism: 1, keyLength: AES_KEY_BYTES },
  scrypt: { alg: 'scrypt', N: 1 << 15, r: 8, p: 1, keyLength: AES_KEY_BYTES },
  'pbkdf2-sha256': { alg: 'pbkdf2-sha256', iterations: 600_000, keyLength: AES_KEY_BYTES },
};

/** 어떤 경우에도 이 아래로는 내려가지 않는다. 보정이 약하게 나와도 마찬가지. */
export const MINIMUM_PARAMS: Record<KdfAlgorithm, KdfParams> = {
  argon2id: { alg: 'argon2id', memoryKiB: 19456, iterations: 2, parallelism: 1, keyLength: AES_KEY_BYTES },
  scrypt: { alg: 'scrypt', N: 1 << 14, r: 8, p: 1, keyLength: AES_KEY_BYTES },
  'pbkdf2-sha256': { alg: 'pbkdf2-sha256', iterations: 600_000, keyLength: AES_KEY_BYTES },
};

export const KDF_TARGET_MS = { min: 500, max: 1000 } as const;

export function strongestSupportedKdf(provider: CryptoProvider): KdfAlgorithm {
  const order: KdfAlgorithm[] = ['argon2id', 'scrypt', 'pbkdf2-sha256'];
  const found = order.find((alg) => provider.kdfSupport.includes(alg));
  if (!found) throw new VaultError('CRYPTO_UNAVAILABLE');
  return found;
}

export function defaultParams(provider: CryptoProvider): KdfParams {
  return BASELINE_PARAMS[strongestSupportedKdf(provider)];
}

/** 저장된 파라미터가 최소 기준을 넘는지 확인한다. */
export function assertParamsAcceptable(params: KdfParams): void {
  const min = MINIMUM_PARAMS[params.alg];
  if (params.keyLength !== AES_KEY_BYTES) throw new VaultError('UNSUPPORTED_FORMAT');
  if (params.alg === 'pbkdf2-sha256') {
    if (params.iterations < (min as typeof params).iterations) throw new VaultError('UNSUPPORTED_FORMAT');
  } else if (params.alg === 'scrypt') {
    const m = min as typeof params;
    if (params.N < m.N || params.r < m.r || params.p < m.p) throw new VaultError('UNSUPPORTED_FORMAT');
  } else {
    const m = min as typeof params;
    if (params.memoryKiB < m.memoryKiB || params.iterations < m.iterations) {
      throw new VaultError('UNSUPPORTED_FORMAT');
    }
  }
}

/**
 * 위쪽 한계. 보정이 아무리 "더 올려도 된다"고 나와도 이 위로는 가지 않는다.
 * 저사양 기기에서 메모리 부족으로 앱이 죽는 쪽이 훨씬 나쁘다.
 */
const MAX_ARGON2_MEMORY_KIB = 65_536; // 64 MiB
const MAX_SCRYPT_N = 1 << 17; // 128 MiB (r=8)
const MAX_PBKDF2_ITERATIONS = 3_000_000;

function scaleParams(params: KdfParams, factor: number): KdfParams {
  const clampedFactor = Math.min(4, Math.max(0.25, factor));
  switch (params.alg) {
    case 'argon2id':
      return {
        ...params,
        memoryKiB: Math.min(
          MAX_ARGON2_MEMORY_KIB,
          Math.round((params.memoryKiB * clampedFactor) / 1024) * 1024,
        ),
      };
    case 'scrypt': {
      const steps = Math.round(Math.log2(clampedFactor));
      const exp = Math.log2(params.N) + steps;
      return { ...params, N: 2 ** Math.min(Math.log2(MAX_SCRYPT_N), Math.max(14, exp)) };
    }
    case 'pbkdf2-sha256':
      return {
        ...params,
        iterations: Math.min(
          MAX_PBKDF2_ITERATIONS,
          Math.round((params.iterations * clampedFactor) / 10_000) * 10_000,
        ),
      };
  }
}

function meetsMinimum(params: KdfParams): boolean {
  try {
    assertParamsAcceptable(params);
    return true;
  } catch {
    return false;
  }
}

/**
 * 기기에서 실제로 걸리는 시간을 재서 파라미터를 맞춘다.
 * 최초 금고 생성 시 1회 실행하고, 결과를 금고 메타에 저장한다.
 */
export async function calibrateKdf(
  provider: CryptoProvider,
  now: () => number = () => Date.now(),
): Promise<{ params: KdfParams; measuredMs: number }> {
  const alg = strongestSupportedKdf(provider);
  let params = BASELINE_PARAMS[alg];
  const probePassword = provider.randomBytes(16);
  const probeSalt = provider.randomBytes(16);

  let measuredMs = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = now();
    await provider.deriveKey(probePassword, probeSalt, params);
    measuredMs = now() - started;
    if (measuredMs >= KDF_TARGET_MS.min && measuredMs <= KDF_TARGET_MS.max) break;
    const target = (KDF_TARGET_MS.min + KDF_TARGET_MS.max) / 2;
    const next = scaleParams(params, measuredMs === 0 ? 4 : target / measuredMs);
    if (!meetsMinimum(next)) break; // 최소 기준 아래로는 절대 낮추지 않는다.
    params = next;
  }
  probePassword.fill(0);
  return { params, measuredMs };
}

export async function deriveKek(
  provider: CryptoProvider,
  secret: Uint8Array,
  salt: Uint8Array,
  params: KdfParams,
): Promise<Uint8Array> {
  assertParamsAcceptable(params);
  const key = await provider.deriveKey(secret, salt, params);
  if (key.length !== AES_KEY_BYTES) throw new VaultError('CRYPTO_UNAVAILABLE');
  return key;
}
