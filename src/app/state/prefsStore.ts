import { create } from 'zustand';
import {
  DEFAULT_PREFS,
  type DisplayPrefs,
  type DisplayPrefsStore,
  type ThemeChoice,
} from '../../core/prefs.ts';

/**
 * 밝기와 언어.
 *
 * 금고 설정(vaultStore.settings)과 따로 둔다. 저 쪽은 금고를 열어야 의미가 있지만
 * 이 둘은 **잠금 화면부터** 필요하다. 잠금 화면은 금고를 열기 전에 그려진다.
 *
 * 저장 자리와 그 이유는 core/prefs.ts 에 적어 두었다.
 */
type State = {
  store: DisplayPrefsStore | null;
  prefs: DisplayPrefs;
  /**
   * 저장해 둔 값을 읽어 왔는가.
   *
   * 읽기 전에는 화면을 그리지 않는다. 그리면 폰 설정대로 한 번 그린 뒤 저장된
   * 값으로 다시 그려서, 앱을 열 때마다 색이 한 번 번쩍인다.
   */
  loaded: boolean;
};

/**
 * 저장해 둔 값을 이만큼 기다린다. 파일 하나와 OS 키 저장소 한 번이라 보통은
 * 훨씬 빨리 끝난다. 넘어가면 기본값으로 먼저 그린다.
 */
const READ_TIMEOUT_MS = 1_500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Actions = {
  /** 앱이 뜰 때 한 번. 저장해 둔 값을 읽어 온다. */
  load(store: DisplayPrefsStore): Promise<void>;
  setTheme(theme: ThemeChoice): Promise<boolean>;
  setLocale(locale: string): Promise<boolean>;
  /**
   * 금고를 초기화한 뒤 부른다.
   *
   * 초기화는 기기 키를 지운다. 그러면 저장해 둔 화면 설정은 열 수 없는 파일이 되고,
   * 다음에 앱을 켜면 언어가 폰 설정으로 돌아가 있다. 쓰던 말이 갑자기 바뀌는 셈이라
   * 새 기기 키로 지금 값을 한 번 더 써 둔다.
   */
  resave(): Promise<void>;
};

export const usePrefsStore = create<State & Actions>((set, get) => ({
  store: null,
  prefs: { ...DEFAULT_PREFS },
  loaded: false,

  async load(store) {
    set({ store });
    /*
      읽기를 기다리되 **무한정 기다리지는 않는다.**

      이 값을 읽기 전에는 화면을 안 그린다. 그래서 읽기가 안 끝나면 앱이 빈 화면에
      멈춘다 — 사용자에게는 앱이 죽은 것으로 보이고, 무엇이 잘못됐는지 알 길이 없다.
      화면 밝기 하나 때문에 금고에 못 들어가는 것은 말이 안 된다.

      시간이 지나면 기본값으로 먼저 그리고, 읽기가 나중에 끝나면 그때 반영한다.
      늦게 오면 색이 한 번 바뀌지만, 안 뜨는 것보다는 낫다.
    */
    // 여기서 던지지 않는다 (core/prefs.ts). 못 읽으면 기본값이 온다.
    const reading = store.read().then((prefs) => {
      set({ prefs, loaded: true });
    });
    await Promise.race([reading, wait(READ_TIMEOUT_MS)]);
    set({ loaded: true });
  },

  setTheme(theme) {
    return save(get, set, { theme });
  },

  setLocale(locale) {
    return save(get, set, { locale });
  },

  async resave() {
    const { store, prefs } = get();
    if (!store) return;
    try {
      await store.write(prefs);
    } catch {
      // 초기화 직후다. 여기서 실패해도 화면은 지금 값 그대로 돌아간다.
    }
  },
}));

/**
 * 화면에는 먼저 반영하고 저장은 그 다음이다.
 *
 * 파일 쓰기를 기다렸다가 반영하면 누른 뒤 잠깐 아무 일도 안 일어난 것처럼 보인다.
 * 저장에 실패하면 false 를 돌려준다 — 부르는 쪽에서 알린다. 화면은 그대로 두는데,
 * 지금 화면과 다른 값으로 되돌리면 사용자는 자기가 잘못 눌렀다고 생각한다.
 */
async function save(
  get: () => State & Actions,
  set: (partial: Partial<State>) => void,
  patch: Partial<DisplayPrefs>,
): Promise<boolean> {
  const { store, prefs } = get();
  const next = { ...prefs, ...patch };
  set({ prefs: next });
  if (!store) return false;
  try {
    // 저장소가 값을 다듬어 돌려준다 (모르는 언어 등). 다듬어진 값을 화면에도 맞춘다.
    set({ prefs: await store.write(next) });
    return true;
  } catch {
    return false;
  }
}
