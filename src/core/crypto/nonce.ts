import type { CryptoProvider } from './types.ts';
import { AES_NONCE_BYTES } from './types.ts';
import { toBase64 } from '../bytes.ts';

/**
 * nonce 생성기 (명세 4장: 레코드마다 새로 생성, 재사용 금지).
 *
 * 96비트 난수 nonce 는 같은 키로 2^32 개를 써도 충돌 확률이 무시할 수준이지만,
 * "재사용 금지"를 코드로 강제하기 위해 생성 이력을 확인한다.
 * 이력은 상한을 두고 (메모리 보호) 그 안에서 중복이면 다시 뽑는다.
 */
export class NonceSource {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];
  private readonly historyLimit: number;
  private readonly provider: CryptoProvider;
  private issued = 0;

  constructor(provider: CryptoProvider, historyLimit = 100_000) {
    this.provider = provider;
    this.historyLimit = historyLimit;
  }

  get issuedCount(): number {
    return this.issued;
  }

  next(): Uint8Array {
    for (let attempt = 0; attempt < 8; attempt++) {
      const nonce = this.provider.randomBytes(AES_NONCE_BYTES);
      const key = toBase64(nonce);
      if (this.seen.has(key)) continue; // 사실상 일어나지 않지만, 일어나면 버린다.
      this.seen.add(key);
      this.order.push(key);
      if (this.order.length > this.historyLimit) {
        const dropped = this.order.shift();
        if (dropped) this.seen.delete(dropped);
      }
      this.issued += 1;
      return nonce;
    }
    // 8번 연속 충돌 = 난수원이 고장 난 것이다. 조용히 넘어가면 안 된다.
    throw new Error('nonce source is not producing unique values');
  }

  /** 외부에서 읽어 온 nonce(백업 가져오기 등)를 이력에 등록한다. */
  remember(nonce: Uint8Array): void {
    const key = toBase64(nonce);
    if (!this.seen.has(key)) {
      this.seen.add(key);
      this.order.push(key);
    }
  }

  has(nonce: Uint8Array): boolean {
    return this.seen.has(toBase64(nonce));
  }
}
