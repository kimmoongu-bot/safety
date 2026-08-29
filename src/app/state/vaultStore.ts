import { create } from 'zustand';
import type { OpenRecord, VaultPayload } from '../../core/schema.ts';
import type { AppSettings } from '../../core/settings.ts';
import { DEFAULT_SETTINGS } from '../../core/settings.ts';
import { VaultError, isVaultError } from '../../core/errors.ts';
import type { Vault } from '../../core/vault.ts';

export type Route =
  | { name: 'loading' }
  | { name: 'setup' }
  | { name: 'lock' }
  | { name: 'list' }
  | { name: 'search'; query: string }
  | { name: 'add' }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string }
  | { name: 'settings' }
  | { name: 'backup' };

export type Toast = { text: string; tone: 'ok' | 'bad' } | null;

/**
 * 화면에서 "성공했는가"를 값으로 판단하면 안 된다. 성공해도 돌려줄 값이 없는
 * 동작(잠금 열기, 저장 등)이 많기 때문이다. 그래서 결과를 따로 감싼다.
 */
export type RunResult<T> = { ok: true; value: T } | { ok: false };

type State = {
  vault: Vault | null;
  stack: Route[];
  records: OpenRecord[];
  settings: AppSettings;
  toast: Toast;
  busy: boolean;
  /** 잠금 화면에 보여 줄 남은 대기 시간(ms). */
  waitMs: number;
  failures: number;
  /** 마지막으로 화면을 만진 시각. 자동 잠금 판단에 쓴다. */
  lastActivityAt: number;
  /**
   * 이 시각까지는 백그라운드로 나가도 잠그지 않는다.
   * 파일 고르기·보내기처럼 사용자가 방금 누른 시스템 창이 앱을 잠깐 가릴 때만 쓴다.
   */
  systemDialogUntil: number;
};

type Actions = {
  attach(vault: Vault): void;
  go(route: Route): void;
  back(): void;
  reset(route: Route): void;
  refresh(): Promise<void>;
  refreshLockState(): Promise<void>;
  lock(): void;
  touch(): void;
  beginSystemDialog(): void;
  endSystemDialog(): void;
  showToast(text: string, tone?: 'ok' | 'bad'): void;
  hideToast(): void;
  run<T>(work: () => Promise<T>): Promise<RunResult<T>>;
  loadSettings(): Promise<void>;
  saveSettings(patch: Partial<AppSettings>): Promise<void>;
  addRecord(payload: VaultPayload): Promise<OpenRecord | undefined>;
  updateRecord(id: string, patch: Partial<VaultPayload> & { favorite?: boolean }): Promise<void>;
  removeRecord(id: string): Promise<void>;
};

export const useVaultStore = create<State & Actions>((set, get) => ({
  vault: null,
  stack: [{ name: 'loading' }],
  records: [],
  settings: DEFAULT_SETTINGS,
  toast: null,
  busy: false,
  waitMs: 0,
  failures: 0,
  lastActivityAt: Date.now(),
  systemDialogUntil: 0,

  attach(vault) {
    set({ vault });
  },

  go(route) {
    set((s) => ({ stack: [...s.stack, route], lastActivityAt: Date.now() }));
  },

  back() {
    set((s) => ({ stack: s.stack.length > 1 ? s.stack.slice(0, -1) : s.stack, lastActivityAt: Date.now() }));
  },

  reset(route) {
    set({ stack: [route], lastActivityAt: Date.now() });
  },

  async refresh() {
    const vault = get().vault;
    if (!vault || !vault.isUnlocked) return;
    const [records, settings] = await Promise.all([vault.listOpenRecords(), vault.readSettings()]);
    set({ records, settings });
  },

  async refreshLockState() {
    const vault = get().vault;
    if (!vault) return;
    const view = await vault.lockoutView();
    set({ waitMs: view.waitMs, failures: view.failures });
  },

  /**
   * 잠그기 — 메모리에 있던 DEK 와 열린 내용을 모두 버린다 (명세 5.5).
   * 전역 스토어에 금고 데이터를 오래 두지 않기 위해 records 도 함께 비운다.
   */
  lock() {
    get().vault?.lock();
    set({ records: [], stack: [{ name: 'lock' }], toast: null });
  },

  touch() {
    set({ lastActivityAt: Date.now() });
  },

  /**
   * 파일 고르기·보내기 창을 열기 직전에 부른다.
   * 이 창들은 앱을 백그라운드로 밀어내는데, 그때마다 잠기면 백업과 되살리기를
   * 끝낼 수 없다. 그래서 사용자가 방금 누른 경우에 한해, 2분 동안만 예외를 둔다.
   * 그 사이에도 화면은 가림 뷰로 덮이고, 2분을 넘겨 돌아오면 그냥 잠근다.
   */
  beginSystemDialog() {
    set({ systemDialogUntil: Date.now() + 2 * 60_000 });
  },

  endSystemDialog() {
    set({ systemDialogUntil: 0, lastActivityAt: Date.now() });
  },

  showToast(text, tone = 'ok') {
    set({ toast: { text, tone } });
  },

  hideToast() {
    set({ toast: null });
  },

  /** 오류를 사용자 문장으로 바꿔 토스트로 알린다. 원인 값은 절대 싣지 않는다. */
  async run(work) {
    set({ busy: true });
    try {
      return { ok: true, value: await work() };
    } catch (e) {
      const message = isVaultError(e)
        ? (e as VaultError).userMessage
        : '잘 되지 않았습니다. 다시 해 주세요.';
      get().showToast(message, 'bad');
      return { ok: false };
    } finally {
      set({ busy: false, lastActivityAt: Date.now() });
    }
  },

  /**
   * 잠금 화면에서도 설정이 필요하다(생체인증 버튼을 보일지 등).
   * 설정은 기기 키로 감싸 두므로 금고를 열기 전에도 읽을 수 있다.
   */
  async loadSettings() {
    const vault = get().vault;
    if (!vault) return;
    try {
      set({ settings: await vault.readSettings() });
    } catch {
      // 아직 금고가 없거나 읽을 수 없으면 기본값 그대로 둔다.
    }
  },

  async saveSettings(patch) {
    const vault = get().vault;
    if (!vault) return;
    const settings = await vault.updateSettings(patch);
    set({ settings });
  },

  async addRecord(payload) {
    const vault = get().vault;
    if (!vault) return undefined;
    const record = await vault.addRecord(payload);
    await get().refresh();
    return record;
  },

  async updateRecord(id, patch) {
    const vault = get().vault;
    if (!vault) return;
    await vault.updateRecord(id, patch);
    await get().refresh();
  },

  async removeRecord(id) {
    const vault = get().vault;
    if (!vault) return;
    await vault.removeRecord(id);
    await get().refresh();
  },
}));

/** 검색 — 금고를 연 뒤 메모리에서 거른다 (명세 4장). */
export function filterRecords(records: OpenRecord[], query: string): OpenRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return records;
  return records.filter((r) =>
    [r.service, r.username, r.memo, r.category].some((field) => field.toLowerCase().includes(q)),
  );
}
