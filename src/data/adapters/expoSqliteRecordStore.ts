import * as SQLite from 'expo-sqlite';
import type { RecordStore } from '../../core/ports.ts';
import type { VaultRecord } from '../../core/schema.ts';

/**
 * 레코드 저장소.
 *
 * 이 표에는 평문 메타(id, 시각, 즐겨찾기, 구조 버전)와 암호문 블롭만 들어간다.
 * 서비스명까지 암호문 안에 있으므로 SQL LIKE 검색은 되지 않는다. 검색은
 * 금고를 연 뒤 메모리에서 한다 (명세 4장).
 *
 * SQLCipher 를 쓸 수 있으면 파일 자체도 암호화하는 편이 낫지만, 그렇지 않아도
 * 저장되는 값이 이미 전부 암호문이라 평문이 새지 않는다.
 */
const DB_NAME = 'jamgim.db';

type Row = {
  id: string;
  created_at: number;
  updated_at: number;
  favorite: number;
  schema_version: number;
  nonce: string;
  ciphertext: string;
  tag: string;
};

function toRecord(row: Row): VaultRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favorite: row.favorite === 1,
    schemaVersion: row.schema_version,
    cipher: { nonce: row.nonce, ciphertext: row.ciphertext, tag: row.tag },
  };
}

export class ExpoSqliteRecordStore implements RecordStore {
  private db: SQLite.SQLiteDatabase | null = null;

  private async open(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        favorite INTEGER NOT NULL DEFAULT 0,
        schema_version INTEGER NOT NULL,
        nonce TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        tag TEXT NOT NULL
      );
    `);
    this.db = db;
    return db;
  }

  async list(): Promise<VaultRecord[]> {
    const db = await this.open();
    const rows = await db.getAllAsync<Row>('SELECT * FROM records');
    return rows.map(toRecord);
  }

  async get(id: string): Promise<VaultRecord | null> {
    const db = await this.open();
    const row = await db.getFirstAsync<Row>('SELECT * FROM records WHERE id = ?', id);
    return row ? toRecord(row) : null;
  }

  async put(record: VaultRecord): Promise<void> {
    const db = await this.open();
    await db.runAsync(
      `INSERT INTO records (id, created_at, updated_at, favorite, schema_version, nonce, ciphertext, tag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         updated_at = excluded.updated_at,
         favorite = excluded.favorite,
         schema_version = excluded.schema_version,
         nonce = excluded.nonce,
         ciphertext = excluded.ciphertext,
         tag = excluded.tag`,
      record.id,
      record.createdAt,
      record.updatedAt,
      record.favorite ? 1 : 0,
      record.schemaVersion,
      record.cipher.nonce,
      record.cipher.ciphertext,
      record.cipher.tag,
    );
  }

  async putMany(records: VaultRecord[]): Promise<void> {
    const db = await this.open();
    await db.withTransactionAsync(async () => {
      for (const record of records) await this.put(record);
    });
  }

  async remove(id: string): Promise<void> {
    const db = await this.open();
    await db.runAsync('DELETE FROM records WHERE id = ?', id);
  }

  async clear(): Promise<void> {
    const db = await this.open();
    await db.execAsync('DELETE FROM records; VACUUM;');
  }
}
