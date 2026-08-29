import { NodeCryptoProvider } from '../src/core/providers/nodeCryptoProvider.ts';
import { MINIMUM_PARAMS } from '../src/core/crypto/kdf.ts';
import { NonceSource } from '../src/core/crypto/nonce.ts';
import type { Clock } from '../src/core/ports.ts';
import { Vault } from '../src/core/vault.ts';
import { MemoryKeyStore, MemoryMetaStore, MemoryRecordStore } from '../src/data/adapters/memory.ts';

export const provider = new NodeCryptoProvider();

/**
 * 테스트에서는 보정을 건너뛰고 "최소 기준" 파라미터를 쓴다.
 * 최소 기준 자체는 코어가 강제하므로, 이 지름길로 보안이 약해지지는 않는다.
 */
export const TEST_KDF = MINIMUM_PARAMS.scrypt;

export class FakeClock implements Clock {
  private current: number;

  constructor(start = 1_700_000_000_000) {
    this.current = start;
  }
  now(): number {
    return this.current;
  }
  advance(ms: number): void {
    this.current += ms;
  }
  set(ms: number): void {
    this.current = ms;
  }
}

export type Harness = {
  vault: Vault;
  keyStore: MemoryKeyStore;
  metaStore: MemoryMetaStore;
  recordStore: MemoryRecordStore;
  clock: FakeClock;
  nonces: NonceSource;
  /** 앱을 껐다 켠 상황: 저장소는 그대로, Vault 객체만 새로 만든다. */
  restart(): Vault;
};

export function makeHarness(): Harness {
  const keyStore = new MemoryKeyStore(provider);
  const metaStore = new MemoryMetaStore();
  const recordStore = new MemoryRecordStore();
  const clock = new FakeClock();
  const nonces = new NonceSource(provider);
  const build = () =>
    new Vault({ provider, keyStore, metaStore, recordStore, clock, nonces, presetKdf: TEST_KDF });
  const harness: Harness = {
    vault: build(),
    keyStore,
    metaStore,
    recordStore,
    clock,
    nonces,
    restart() {
      harness.vault.lock();
      harness.vault = build();
      return harness.vault;
    },
  };
  return harness;
}

export const SAMPLE = {
  service: '현대카드',
  username: 'grandpa1948',
  password: 'Hyundai!2026#secret',
  memo: '주거래 카드. 명세서는 매달 5일.',
  category: '카드',
  pwChangedAt: 0,
};
