import * as SQLite from 'expo-sqlite';
import type { RecordStore } from '../../core/ports.ts';
import type { VaultRecord } from '../../core/schema.ts';
import { type Handle, openOnce } from '../openOnce.ts';

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

/** 넣기 한 줄. 여러 개를 한 거래로 묶을 때 이것만 되풀이한다. */
const INSERT = `
  INSERT INTO records (id, created_at, updated_at, favorite, schema_version, nonce, ciphertext, tag)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    updated_at = excluded.updated_at,
    favorite = excluded.favorite,
    schema_version = excluded.schema_version,
    nonce = excluded.nonce,
    ciphertext = excluded.ciphertext,
    tag = excluded.tag
`;

function insert(db: SQLite.SQLiteDatabase, record: VaultRecord): Promise<unknown> {
  return db.runAsync(
    INSERT,
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

/** 열기만 갈아 끼울 수 있게 해 둔다. 테스트에서 진짜 SQLite 없이 확인하기 위한 것이다. */
export type DbOpener = (name: string) => Promise<SQLite.SQLiteDatabase>;

/**
 * **우리만 쓰는 연결로 연다.**
 *
 * 이것을 켜지 않으면 expo-sqlite 가 같은 파일에 대해 이미 열려 있는 연결을 돌려준다.
 * 그러면 자바스크립트 손잡이는 둘인데 진짜 데이터베이스는 하나가 되고, 먼저 버려진
 * 손잡이가 쓰레기 수집될 때 **남은 손잡이가 쓰는 데이터베이스를 닫아 버린다.**
 * 그 뒤 질의가 NullPointerException 으로 죽는다. 자세한 것은 `openOnce.ts` 에 적었다.
 *
 * 쓰는 곳이 이 저장소 하나뿐이라 연결을 나눠 쓸 이유도 없다.
 */
const OPEN_OPTIONS: SQLite.SQLiteOpenOptions = { useNewConnection: true };

export class ExpoSqliteRecordStore implements RecordStore {
  /**
   * 한 번만 연다. 놓을 때는 반드시 닫는다.
   * 왜 그래야 하는지는 `src/data/openOnce.ts` 에 적었다 — 실기기에서 세 번 물렸다.
   */
  private readonly db: Handle<SQLite.SQLiteDatabase>;

  constructor(opener: DbOpener = (name) => SQLite.openDatabaseAsync(name, OPEN_OPTIONS)) {
    this.db = openOnce(
      async () => {
        const db = await opener(DB_NAME);
        // WAL 을 쓰지 않는다. 쓰는 곳이 한 군데뿐이고 쓰는 양도 적어서 얻을 것이 없는데,
        // -wal 과 -shm 파일이 더 생기고 앱을 갱신할 때 깨질 구석만 는다.
        await db.execAsync(CREATE_TABLE);
        return db;
      },
      (db) => db.closeAsync(),
    );
  }

  /**
   * 질의를 하되, 실패하면 **한 번만** 닫고 다시 열어 본다. 규칙은 `Handle.use` 에 적었다.
   *
   * **여기 있는 질의는 두 번 해도 안전하다.** 넣기는 같은 id 면 덮어쓰고(UPSERT),
   * 지우기는 없으면 아무 일도 안 하며, 읽기는 바꾸는 것이 없다.
   */
  private query<R>(work: (db: SQLite.SQLiteDatabase) => Promise<R>): Promise<R> {
    return this.db.use(work);
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
    await this.query((db) => insert(db, record));
  }

  /**
   * 여러 개를 한 거래로 넣는다. 되돌리기에서 쓴다 — 절반만 들어가면 안 된다.
   *
   * 거래 **안에서는** 다시 열기를 타지 않는다. 한복판에서 연결을 닫고 새로 열면
   * 열려 있던 거래가 통째로 날아간다. 거래 전체가 하나의 `query` 다.
   */
  async putMany(records: VaultRecord[]): Promise<void> {
    await this.query((db) =>
      db.withTransactionAsync(async () => {
        for (const record of records) await insert(db, record);
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.query((db) => db.runAsync('DELETE FROM records WHERE id = ?', id));
  }

  async clear(): Promise<void> {
    await this.query((db) => db.execAsync('DELETE FROM records; VACUUM;'));
  }

  /**
   * 손잡이를 닫고 놓는다. 앱이 뒤로 갈 때 부른다.
   *
   * 뒤로 간 사이에 안드로이드가 앱을 정리하면, 들고 있던 손잡이는 못 쓰게 된다.
   * 위의 다시 열기가 살려 내기는 하지만, 살려 내기 전에 화면 하나가 이미 비어
   * 보인다 — 금고를 열었는데 목록이 없는 것처럼. 그래서 먼저 놓는다.
   * 다음에 쓸 때 새로 연다. 여는 비용은 파일 하나 여는 정도다.
   *
   * 어차피 뒤로 갈 때 금고도 잠그므로(명세 5.5) 들고 있을 이유도 없다.
   */
  release(): Promise<void> {
    return this.db.release();
  }
}
