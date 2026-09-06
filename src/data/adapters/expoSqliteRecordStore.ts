import * as SQLite from 'expo-sqlite';
import type { RecordStore } from '../../core/ports.ts';
import type { VaultRecord } from '../../core/schema.ts';
import { type Reopenable, openOnce } from '../openOnce.ts';

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

const CREATE_TABLE = `
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
`;

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

/** 열기만 갈아 끼울 수 있게 해 둔다. 테스트에서 진짜 SQLite 없이 확인하기 위한 것이다. */
export type DbOpener = (name: string) => Promise<SQLite.SQLiteDatabase>;

export class ExpoSqliteRecordStore implements RecordStore {
  /**
   * 한 번만 연다. 왜 이렇게 해야 하는지는 `src/data/openOnce.ts` 에 적었다 —
   * 실기기에서 데이터베이스가 두 번 열려 질의가 죽은 적이 있다.
   */
  private readonly open: Reopenable<SQLite.SQLiteDatabase>;

  constructor(opener: DbOpener = (name) => SQLite.openDatabaseAsync(name)) {
    this.open = openOnce(async () => {
      const db = await opener(DB_NAME);
      // WAL 을 쓰지 않는다. 쓰는 곳이 한 군데뿐이고 쓰는 양도 적어서 얻을 것이 없는데,
      // -wal 과 -shm 파일이 더 생기고 앱을 갱신할 때 깨질 구석만 는다.
      await db.execAsync(CREATE_TABLE);
      return db;
    });
  }

  /**
   * 질의를 하되, 실패하면 **한 번만** 다시 열어 본다.
   *
   * 안드로이드가 앱을 뒤로 보내면서 데이터베이스 손잡이를 정리하는 경우가 있다.
   * 그러면 다음 질의가 이렇게 죽는다.
   *   Call to function 'NativeDatabase.prepareAsync' has been rejected.
   *   → Caused by: java.lang.NullPointerException
   * 들고 있던 손잡이를 버리고 다시 열면 살아난다. 안 그러면 앱을 껐다 켜기 전까지
   * 영영 안 되고, 사용자에게는 앱이 고장 난 것으로 보인다.
   *
   * **두 번 해도 안전하다.** 넣기는 같은 id 면 덮어쓰고(UPSERT), 지우기는 없으면
   * 아무 일도 안 하며, 읽기는 바꾸는 것이 없다. 그래서 그냥 다시 해 볼 수 있다.
   *
   * 다시 열기는 한 번뿐이다. 계속 하면 진짜 고장난 것을 감추고 화면만 멈춘다.
   * 두 번 다 실패하면 **처음 오류**를 던진다 — 그게 진짜 원인이고, 두 번째 것은
   * 그 뒤에 따라온 것일 수 있다.
   */
  private async query<R>(work: (db: SQLite.SQLiteDatabase) => Promise<R>): Promise<R> {
    try {
      return await work(await this.open());
    } catch (first) {
      this.open.reset();
      try {
        return await work(await this.open());
      } catch {
        throw first;
      }
    }
  }

  async list(): Promise<VaultRecord[]> {
    return this.query(async (db) => {
      const rows = await db.getAllAsync<Row>('SELECT * FROM records');
      return rows.map(toRecord);
    });
  }

  async get(id: string): Promise<VaultRecord | null> {
    return this.query(async (db) => {
      const row = await db.getFirstAsync<Row>('SELECT * FROM records WHERE id = ?', id);
      return row ? toRecord(row) : null;
    });
  }

  async put(record: VaultRecord): Promise<void> {
    await this.query((db) =>
      db.runAsync(
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
      ),
    );
  }

  async putMany(records: VaultRecord[]): Promise<void> {
    await this.query((db) =>
      db.withTransactionAsync(async () => {
        for (const record of records) await this.put(record);
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.query((db) => db.runAsync('DELETE FROM records WHERE id = ?', id));
  }

  async clear(): Promise<void> {
    await this.query((db) => db.execAsync('DELETE FROM records; VACUUM;'));
  }
}
