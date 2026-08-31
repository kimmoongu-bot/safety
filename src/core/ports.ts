import type { VaultMeta, VaultRecord } from './schema.ts';
import type { SealedBlob } from './crypto/aead.ts';

/**
 * 코어가 바깥 세상에 요구하는 것들. 구현은 src/data 와 src/app/platform 에 있다.
 * 코어는 SQLite 도, expo-secure-store 도 직접 알지 못한다.
 */

/** OS 키 저장소 (Android Keystore / iOS Keychain). */
export interface SecureKeyStore {
  /** 기기 키: 저장된 래핑 결과를 한 겹 더 감싸는 키. 없으면 만들어 반환한다. */
  getOrCreateDeviceKey(): Promise<Uint8Array>;
  getDeviceKey(): Promise<Uint8Array | null>;
  /** 생체 키: 생체인증을 통과해야만 읽힌다. 생체정보 재등록 시 무효화된다. */
  getBiometricKey(): Promise<Uint8Array | null>;
  createBiometricKey(): Promise<Uint8Array>;
  deleteBiometricKey(): Promise<void>;
  /** 금고 초기화. 키 저장소의 흔적을 모두 지운다. */
  clear(): Promise<void>;
}

/** 금고 메타 + 실패 카운터 저장소. 파일 하나로 충분하다. */
export interface MetaStore {
  readMeta(): Promise<VaultMeta | null>;
  writeMeta(meta: VaultMeta): Promise<void>;
  readGuard(): Promise<SealedBlob | null>;
  writeGuard(blob: SealedBlob): Promise<void>;
  clear(): Promise<void>;
}

/** 레코드 저장소 (SQLCipher/SQLite). 암호문 블롭만 오간다. */
export interface RecordStore {
  list(): Promise<VaultRecord[]>;
  get(id: string): Promise<VaultRecord | null>;
  put(record: VaultRecord): Promise<void>;
  putMany(records: VaultRecord[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
