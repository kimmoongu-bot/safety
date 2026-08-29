import type { SealedBlob } from './crypto/aead.ts';
import type { KdfParams } from './crypto/types.ts';

/** 레코드 구조 버전. 마이그레이션 판단에 쓴다 (명세 4장). */
export const RECORD_SCHEMA_VERSION = 1;
/** 금고 메타(키 계층) 구조 버전. */
export const VAULT_FORMAT_VERSION = 1;

/**
 * 저장되는 값은 두 종류뿐이다: 평문 메타 / 암호문 블롭.
 * 서비스명·아이디를 포함한 모든 내용은 cipher 안에만 있다.
 */
export type VaultRecord = {
  id: string; // UUID v4 — 평문
  createdAt: number; // epoch ms — 평문
  updatedAt: number; // epoch ms — 평문
  favorite: boolean; // 평문
  schemaVersion: number; // 평문 — 마이그레이션용
  cipher: SealedBlob;
};

/** 열었을 때에만 존재하는 구조. 디스크에 이 모양으로는 절대 저장되지 않는다. */
export type VaultPayload = {
  service: string;
  username: string;
  password: string;
  memo: string;
  category: string;
  pwChangedAt: number;
  /** 직전 비밀번호 1개 (설정에서 끌 수 있음, 명세 7장) */
  prevPassword?: string;
};

/** 화면에서 다루는 "열린 항목" = 평문 메타 + 열린 내용. */
export type OpenRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  schemaVersion: number;
} & VaultPayload;

export type WrapSlot = 'pin' | 'recovery' | 'biometric';

/**
 * DEK 를 한 벌씩 감싸 둔 것.
 * blob 은 "KEK 로 감싼 결과"를 OS 키 저장소의 기기 키로 한 겹 더 감싼 값이다
 * (명세 5.3 — 키 저장소에는 DEK 원본을 넣지 않는다).
 */
export type WrappedDek = {
  slot: WrapSlot;
  /** pin / recovery 슬롯에만 있다. biometric 슬롯은 키 저장소 키를 그대로 쓴다. */
  kdf?: KdfParams;
  salt?: string; // base64
  blob: SealedBlob;
};

export type VaultMeta = {
  formatVersion: number;
  vaultId: string;
  createdAt: number;
  /** 파라미터 보정 때 실제로 측정된 시간(ms). 참고용. */
  kdfMeasuredMs: number;
  wraps: WrappedDek[];
  /** 마지막 백업 시각. 90일 알림 판단에 쓴다 (명세 6.3). */
  lastBackupAt?: number;
  /**
   * 복구 코드 사본 — DEK 로 감싸 둔다 (명세 6.1 "설정에서 재확인 가능").
   * 금고를 연 사람만 볼 수 있으므로 새로 드러나는 비밀은 없다.
   */
  recoveryCodeCopy?: SealedBlob;
};

export function findWrap(meta: VaultMeta, slot: WrapSlot): WrappedDek | undefined {
  return meta.wraps.find((w) => w.slot === slot);
}

export function toOpenRecord(record: VaultRecord, payload: VaultPayload): OpenRecord {
  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    favorite: record.favorite,
    schemaVersion: record.schemaVersion,
    ...payload,
  };
}
