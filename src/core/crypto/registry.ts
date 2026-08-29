import type { CryptoProvider } from './types.ts';
import { VaultError } from '../errors.ts';

let current: CryptoProvider | null = null;

/** 앱 시작 시(또는 테스트 setup 에서) 정확히 한 번 주입한다. */
export function setCryptoProvider(provider: CryptoProvider): void {
  current = provider;
}

export function getCryptoProvider(): CryptoProvider {
  if (!current) throw new VaultError('CRYPTO_UNAVAILABLE');
  return current;
}

export function hasCryptoProvider(): boolean {
  return current !== null;
}
