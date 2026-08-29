import type { CryptoProvider } from '../../core/crypto/types.ts';
import { AES_KEY_BYTES } from '../../core/crypto/types.ts';
import type { SealedBlob } from '../../core/crypto/aead.ts';
import type { MetaStore, RecordStore, SecureKeyStore } from '../../core/ports.ts';
import type { VaultMeta, VaultRecord } from '../../core/schema.ts';

/**
 * 메모리 구현 — 테스트와 개발용.
 * 실제 저장소 구현(SQLite/SecureStore)과 같은 포트를 만족하므로,
 * 코어 로직은 어느 쪽이든 동일하게 동작한다.
 */

export class MemoryKeyStore implements SecureKeyStore {
  private deviceKey: Uint8Array | null = null;
  private biometricKey: Uint8Array | null = null;
  /** 생체인증 요구를 흉내 낸다. false 면 키를 내주지 않는다. */
  biometricAvailable = true;
  private readonly provider: CryptoProvider;

  constructor(provider: CryptoProvider) {
    this.provider = provider;
  }

  async getOrCreateDeviceKey(): Promise<Uint8Array> {
    if (!this.deviceKey) this.deviceKey = this.provider.randomBytes(AES_KEY_BYTES);
    return Uint8Array.from(this.deviceKey);
  }

  async getDeviceKey(): Promise<Uint8Array | null> {
    return this.deviceKey ? Uint8Array.from(this.deviceKey) : null;
  }

  async createBiometricKey(): Promise<Uint8Array> {
    this.biometricKey = this.provider.randomBytes(AES_KEY_BYTES);
    return Uint8Array.from(this.biometricKey);
  }

  async getBiometricKey(): Promise<Uint8Array | null> {
    if (!this.biometricAvailable || !this.biometricKey) return null;
    return Uint8Array.from(this.biometricKey);
  }

  async deleteBiometricKey(): Promise<void> {
    this.biometricKey?.fill(0);
    this.biometricKey = null;
  }

  /** 생체정보 재등록을 흉내 낸다 (키 무효화). */
  simulateBiometricEnrollmentChange(): void {
    this.biometricKey?.fill(0);
    this.biometricKey = null;
  }

  async clear(): Promise<void> {
    this.deviceKey?.fill(0);
    this.deviceKey = null;
    await this.deleteBiometricKey();
  }
}

export class MemoryMetaStore implements MetaStore {
  private meta: string | null = null;
  private guard: string | null = null;

  async readMeta(): Promise<VaultMeta | null> {
    return this.meta ? (JSON.parse(this.meta) as VaultMeta) : null;
  }

  async writeMeta(meta: VaultMeta): Promise<void> {
    this.meta = JSON.stringify(meta);
  }

  async readGuard(): Promise<SealedBlob | null> {
    return this.guard ? (JSON.parse(this.guard) as SealedBlob) : null;
  }

  async writeGuard(blob: SealedBlob): Promise<void> {
    this.guard = JSON.stringify(blob);
  }

  async clear(): Promise<void> {
    this.meta = null;
    this.guard = null;
  }

  /** 테스트용: 실패 기록 파일만 지우는 상황(카운터 초기화 시도)을 만든다. */
  async deleteGuardOnly(): Promise<void> {
    this.guard = null;
  }

  /** 테스트용: 디스크에 실제로 남는 바이트를 그대로 본다. */
  rawBytes(): string {
    return `${this.meta ?? ''}\n${this.guard ?? ''}`;
  }
}

export class MemoryRecordStore implements RecordStore {
  private rows = new Map<string, string>();

  async list(): Promise<VaultRecord[]> {
    return [...this.rows.values()].map((r) => JSON.parse(r) as VaultRecord);
  }

  async get(id: string): Promise<VaultRecord | null> {
    const row = this.rows.get(id);
    return row ? (JSON.parse(row) as VaultRecord) : null;
  }

  async put(record: VaultRecord): Promise<void> {
    this.rows.set(record.id, JSON.stringify(record));
  }

  async putMany(records: VaultRecord[]): Promise<void> {
    for (const record of records) await this.put(record);
  }

  async remove(id: string): Promise<void> {
    this.rows.delete(id);
  }

  async clear(): Promise<void> {
    this.rows.clear();
  }

  rawBytes(): string {
    return [...this.rows.values()].join('\n');
  }
}
