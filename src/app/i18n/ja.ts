import type { Catalog, Message } from './types.ts';
import type { MessageKey } from './ko.ts';

/**
 * 日本語の文言。
 *
 * **翻訳者にはこのファイルだけを渡せばよい。** コードを読む必要はない。
 *
 * ルールは二つ（`docs/국제화.md` 3章）。
 *
 * 1. **文を断片でつなげない。** 値の入る場所は `{name}` と書き、残りはこの言語の
 *    完成した文にする。語順の違う言語へ移すにはこうするしかない。
 * 2. **韓国語の助詞は韓国語の中だけで解く。** 日本語では「で」「を」が前の語で
 *    変わらないので、ここはすべて素の文でよい。
 *
 * `Record<MessageKey, Message>` を満たすので、`ko.ts` にあってここにない鍵は
 * 画面の空白ではなく**型エラー**になる。
 *
 * ---
 *
 * **注意 — この訳は母語話者の確認を受けていない。** 日本で公開する前に、日本語を
 * 使う人に一度読んでもらうこと。パスワードを預けるアプリでは、言い回しの
 * ぎこちなさ一つが信用を削る。
 *
 * 言葉づかいは韓国語版と同じ方針にした。中高年が主な対象なので、やさしい言葉を
 * 使い専門用語を避ける（仕様3章）。「復号」ではなく「開く」、
 * 「マスターパスワード」ではなく「暗証番号」。
 */
export const ja = {
  // ── ロック画面 ────────────────────────────────────────────
  /** アプリの名前。ローマ字のままにした。すぐ下の一行が何のアプリかを説明する。 */
  'lock.title': 'Jamgim',
  'lock.tagline': '自分だけのパスワード保管庫',
  'lock.open': '金庫を開く',
  'lock.openWithBiometric': ({ how }) => `${how}で開く`,
  'lock.forgotPin': '暗証番号を忘れました（復旧コード）',
  'lock.failures': '暗証番号を{count}回まちがえました。',
  'lock.failuresWithWait': '暗証番号を{count}回まちがえました。{wait}。',
  'lock.waitSeconds': '{seconds}秒後にもう一度お試しください',
  'lock.waitMinutes': '{minutes}分後にもう一度お試しください',
  'lock.recoveryTitle': '復旧コードで開く',
  'lock.recoveryHelp': '最初の設定のときに書き留めた復旧コードを入力してください。',
  'lock.recoveryLabel': '復旧コード',
  'lock.recoveryPlaceholder': '例: WZC7-1W7M-KHRP-DNEN',
  'lock.biometricPrompt': ({ how }) => `${how}で金庫を開きます`,

  // ── 最初の設定 ────────────────────────────────────────────
  'setup.biometricTitle': ({ how }) => `${how}でも開きますか？`,
  'setup.biometricYes': ({ how }) => `${how}でも開く`,
  'setup.biometricWhy': ({ how }) =>
    `${how}を使うと、毎回暗証番号を入力しなくても開けます。あとで設定から変えられます。`,
  'setup.biometricUnavailable': ({ how }) =>
    `この端末では${how}の確認が使えません。数字だけで開けます。`,

  // ── 数字キー ──────────────────────────────────────────────
  'pinpad.erase': '消す',
  'pinpad.eraseOne': '一文字消す',
  'pinpad.digit': '数字 {digit}',
  'pinpad.entered': '{count}桁入力しました',

  // ── 指紋・顔 ──────────────────────────────────────────────
  // 端末が対応しているものに合わせて選ぶ。この三語を訳せば、上の
  // 「{how}で開く」のような文はそのまま通る。
  'biometric.finger': '指紋',
  'biometric.face': '顔',
  'biometric.both': '指紋・顔',
  'biometric.reason': '金庫を開くには確認が必要です',
  'biometric.cancel': 'キャンセル',
  'biometric.fallback': '暗証番号で開く',

  // ── わたしの金庫（一覧） ──────────────────────────────────
  'list.title': 'わたしの金庫',
  'list.add': '＋ 新しく入れる',
  'list.settings': '設定',
  'list.searchPlaceholder': '何をお探しですか？',
  'list.searchLabel': '検索ボックス',
  'list.unreadable':
    '{count}件を開けませんでした。バックアップファイルがあれば、そこから戻してみてください。',
  'list.empty': 'まだ何も入っていません。',
  'list.emptyHint': '下の「＋ 新しく入れる」を押して始めてください。',
  'list.favoriteOn': 'よく使うものに入れました。',
  'list.favoriteOff': 'よく使うものから外しました。',
  'list.noMatch': '「{query}」に合うものがありません。',
  'list.addThisName': 'この名前で新しく入れる',

  // ── 見つかったもの ────────────────────────────────────────
  'search.title': '見つかったもの',
  'search.found': '{count}件見つかりました。',

  // ── アカウントのカード ────────────────────────────────────
  'card.label': '{service}、ID {username}',
  'card.noName': '名前なし',
  'card.noUsername': 'IDなし',
  'card.none': 'なし',
  'card.stale': '1年以上変えていません',
  'card.favoriteAdd': 'よく使うものに入れる',
  'card.favoriteRemove': 'よく使うものから外す',

  // ── 最初の設定（つづき） ──────────────────────────────────
  'setup.pinTitle': '暗証番号を作る',
  'setup.pinAgainTitle': 'もう一度入力してください',
  'setup.pinHelp': '金庫を開くときに使う数字を決めます。4桁以上です。',
  'setup.pinAgainHelp': 'いま決めた暗証番号をもう一度入力してください。',
  'setup.next': '次へ',
  'setup.pinMismatch': '2回入力した暗証番号がちがいます。はじめから決め直してください。',
  'setup.pinOnly': '数字だけで開く',
  'setup.codeTitle': '復旧コードを書き留めてください',
  'setup.codeWarn':
    '暗証番号を忘れたときに金庫を開ける唯一の方法です。紙に書いて、端末とは別の場所に置いてください。スクリーンショットは撮らないでください。',
  'setup.codeNext': '次の画面で、このコードを自分で入力して確認します。',
  'setup.codeWrote': '書き留めました。次へ',
  'setup.codeCheckTitle': '書き留めた復旧コードを入力してください',
  'setup.codeCheckHelp': '大文字・小文字、スペースは気にしなくて大丈夫です。',
  'setup.lastWarnWithBiometric': ({ how }) =>
    `${how}でも開けるようにしました。暗証番号・復旧コード・バックアップファイルがすべてないと、金庫は開けません。`,
  'setup.lastWarn':
    '暗証番号・復旧コード・バックアップファイルがすべてないと、金庫は開けません。',
  'setup.finish': '確認して始める',
  'setup.codeMismatch': '復旧コードがちがいます。書き留めたものをもう一度見てください。',
  'setup.done': '金庫を作りました。',

  // ── 分類 ──────────────────────────────────────────────────
  // 金庫には下の「コード」(bank, card…)が保存され、画面にはこの言葉が出る。
  'category.bank': '銀行',
  'category.card': 'カード',
  'category.shopping': 'ショッピング',
  'category.gov': '役所',
  'category.telecom': '通信',
  'category.other': 'その他',

  // ── 入れる・直す ──────────────────────────────────────────
  'edit.titleNew': '新しく入れる',
  'edit.titleEdit': '直す',
  'edit.save': '保存する',
  'edit.service': 'どこで使いますか？',
  'edit.serviceHint': '例: 三菱UFJ銀行、楽天カード、Amazon',
  'edit.username': 'ID',
  'edit.password': 'パスワード',
  'edit.show': '見る',
  'edit.hide': '隠す',
  'edit.category': '分類',
  'edit.memo': 'メモ',
  'edit.needService': 'どこで使うものか、名前を書いてください。',
  'edit.saved': '入れました。',
  'edit.updated': '直しました。',
  'edit.pwDateNote': 'パスワードを変えると、変えた日付もいっしょに記録されます。',

  // ── 項目を見る ────────────────────────────────────────────
  'detail.title': '項目',
  'detail.notFound': '項目が見つかりませんでした。',
  'detail.edit': '直す',
  'detail.delete': '消す',
  'detail.username': 'ID',
  'detail.password': 'パスワード',
  'detail.memo': 'メモ',
  'detail.none': 'なし',
  'detail.hidden': '●●●●●●●●',
  'detail.copyUsername': 'IDをコピー',
  'detail.copyPassword': 'パスワードをコピー',
  'detail.reveal': '見る',
  'detail.conceal': '隠す',
  'detail.autoHide': '{seconds}秒後に自動で隠します。',
  'detail.pwChangedAt': 'パスワードを変えた日',
  'detail.noDate': '記録なし',
  'detail.staleNotice': '1年以上変えていません。一度変えておくとよいです。',
  'detail.prevPassword': '変える前のパスワード',
  'detail.prevWhy': '新しいパスワードが使えないときに戻せるよう、1つだけ残します。',
  'detail.deleteTitle': 'この項目を消しますか？',
  'detail.deleteMessage': ({ service }) => `「${service}」を消すと元に戻せません。`,
  'detail.deleted': '消しました。',
  'detail.emptyField': ({ what }) => `${what}は空です。`,
  'detail.copied': ({ what, seconds }) => `${what}をコピーしました。${seconds}秒後に消します。`,

  // ── バックアップファイルの名前 ────────────────────────────
  /**
   * バックアップファイル名の頭。うしろに `_20260307.jamgim` が付く。
   * ファイルアプリに表示される名前。「削除禁止」は、うっかり消さないために入れた。
   * ファイル名に使えない文字（\ / : * ? " < > |）は入れないこと。
   */
  'backup.fileNamePrefix': 'Jamgim_バックアップ_削除禁止',

  // ── 金庫のエラー ──────────────────────────────────────────
  // コア（src/core）はコードだけを投げ、言葉はここで決める。
  'error.WRONG_PIN': '暗証番号が合いません。',
  'error.WRONG_RECOVERY_CODE': '復旧コードが合いません。',
  'error.WRONG_BACKUP_PASSWORD': 'バックアップのパスワードが合いません。',
  'error.LOCKED_OUT': '何度もまちがえました。少し待ってからお試しください。',
  'error.VAULT_NOT_FOUND': '金庫がまだありません。',
  'error.VAULT_ALREADY_EXISTS': 'すでに金庫があります。',
  'error.DATA_DAMAGED': '保存された内容が壊れています。',
  'error.UNSUPPORTED_FORMAT':
    'このファイルは Jamgim のバックアップファイルではないか、版がちがいます。',
  'error.CRYPTO_UNAVAILABLE': 'この端末では金庫を安全に使えません。',
  'error.VAULT_LOCKED': '金庫は閉じています。',
  'error.INVALID_INPUT': '入力した内容をご確認ください。',

  // 同じ種類でも、するべきことがちがう場合。
  'error.BACKUP_PASSWORD_SAME_AS_PIN':
    'バックアップのパスワードは、アプリの暗証番号とちがうものにしてください。',
  'error.BACKUP_PASSWORD_TOO_SHORT': 'バックアップのパスワードは{count}文字以上にしてください。',
  'error.WIPED_AFTER_FAILURES': '10回以上まちがえたので金庫を消しました。',
  'error.BIOMETRIC_NOT_SET_UP':
    'この端末では指紋・顔で開けません。暗証番号を入力してください。',
  'error.BIOMETRIC_CHANGED': '指紋・顔の情報が変わりました。暗証番号で開いてください。',
  'error.RECORD_NOT_FOUND': '項目が見つかりませんでした。',
  'error.NO_RECOVERY_CODE_COPY': '復旧コードの控えがありません。新しく作ってください。',

  // ── 設定 ──────────────────────────────────────────────────
  'settings.recoveryReason': '復旧コードを見るには確認が必要です',
  'settings.title': '設定',
  'settings.checkFailed': '確認できませんでした。',
  'settings.theme': '画面の明るさ',
  'settings.themeSystem': '端末に合わせる',
  'settings.themeLight': '明るく',
  'settings.themeDark': '暗く',
  'settings.themeWhy': '暗くすると夜に目がまぶしくありません。',
  'settings.language': '言語',
  'settings.languageSystem': '端末に合わせる',
  'settings.saveFailed': '設定を保存できませんでした。アプリを開き直すと元に戻ります。',
  'settings.autoLock': 'どのくらいで自動的に閉じますか？',
  'settings.autoLockNow': 'すぐに',
  'settings.autoLock1m': '1分',
  'settings.autoLock5m': '5分',
  'settings.biometric': '指紋・顔で開く',
  'settings.biometricWhy': 'onにすると、暗証番号を入力しなくても開けます。',
  'settings.biometricNone': 'この端末には指紋・顔の確認が用意されていません。',
  'settings.biometricOn': '指紋・顔で開けるようになりました。',
  'settings.biometricOff': '指紋・顔で開く設定をoffにしました。',
  'settings.clipboard': 'コピーした内容をいつ消しますか？',
  'settings.clipboardAfter': '{seconds}秒後',
  'settings.screenGuard': '画面の撮影を防ぐ',
  'settings.screenGuardWhy': 'スクリーンショットと、最近使ったアプリのプレビューを防ぎます。',
  'settings.screenGuardOn': '画面の撮影を防いでいます。',
  'settings.screenGuardOff': '画面の撮影を防ぐ設定をoffにしました。',
  'settings.screenGuardFailed': '画面を隠せませんでした。（{reason}）',
  'settings.keepPrev': '変える前のパスワードを1つ残す',
  'settings.keepPrevWhy': '新しいパスワードが使えないときに戻すためです。',
  'settings.wipe': '10回まちがえたら金庫を消す',
  'settings.wipeWhy':
    'onにすると、暗証番号を10回まちがえたときに金庫をまるごと消します。バックアップファイルがないと元に戻せません。',
  'settings.recoveryHeading': '復旧コード',
  'settings.recoveryHide': 'もう一度隠す',
  'settings.recoveryShow': '復旧コードをもう一度見る',
  'settings.pinHeading': '暗証番号を変える',
  'settings.pinCurrent': 'いまの暗証番号',
  'settings.pinNext': '新しい暗証番号',
  'settings.pinChange': '変える',
  'settings.pinChanged': '暗証番号を変えました。',
  'settings.cancel': 'やめる',
  'settings.backupHeading': 'バックアップ',
  'settings.backupGo': 'バックアップファイルを作る / 読み込む',
  'settings.wipeHeading': '金庫を初期化する',
  'settings.wipeExplain':
    '暗証番号・指紋・復旧コード・バックアップファイルがすべてないと、金庫は開けません。そのときは金庫を消して始め直せますが、入れておいた内容は戻りません。',
  'settings.wipeStart': '金庫を消して始め直す',
  'settings.wipeAsksTwice': '消す前に2回おたずねします。',
  'settings.wipe1Title': '本当に消しますか？（1/2）',
  'settings.wipe1Message': '入れておいたIDとパスワードがすべてなくなります。元に戻せません。',
  'settings.wipe1Confirm': '続ける',
  'settings.wipe2Title': '最後の確認です（2/2）',
  'settings.wipe2Message':
    'バックアップファイルがなければ、いま消す内容はどんな方法でも元に戻せません。',
  'settings.wipe2Confirm': '消します',
  'settings.wiped': '金庫を消しました。',

  // ── バックアップ・復元 ────────────────────────────────────
  'backup.title': 'バックアップ・復元',
  'backup.never': 'まだ一度もしていません',
  'backup.last': '最後のバックアップ: {when}',
  'backup.stale':
    '最後のバックアップから90日が過ぎました。新しいバックアップファイルを作っておいてください。',
  'backup.makeHeading': 'バックアップファイルを作る',
  'backup.makeWarn':
    'このファイルはパスワードがないと開けません。ファイルとパスワードを同じ場所に送らないでください。',
  'backup.familyTip':
    '家族（配偶者・子ども）2〜3人にファイルだけを預けておくと、端末をなくしても元に戻せます。バックアップのパスワードは渡さず、ご自身だけが紙に書いて端末とは別の場所に置いてください。メッセージアプリは時間が経つとダウンロードできなくなることがあるので、受け取った人が実際に端末へ保存したか確かめてください。',
  'backup.password': 'バックアップのパスワード',
  'backup.passwordHint': '{min}文字以上。アプリを開くときの暗証番号とはちがうものにしてください。',
  'backup.passwordAgain': 'バックアップのパスワードをもう一度',
  'backup.mismatch': '2回入力したバックアップのパスワードがちがいます。',
  'backup.make': 'バックアップファイルを作って送る',
  'backup.made': '{count}件を入れたバックアップファイルを作りました。',
  'backup.restoreHeading': 'バックアップファイルから戻す',
  'backup.restoreWhen':
    '端末を買い替えたときや、アプリを入れ直したときに使います。いま金庫にある内容は、ファイルの内容に置き換わります。',
  'backup.pick': 'ファイルを選ぶ',
  'backup.picked': '選んだファイル: {name}',
  'backup.pickedToast': ({ name }) => `${name}を選びました。`,
  'backup.pickFirst': '先にファイルを選んでください。',
  'backup.filePassword': 'そのファイルのバックアップのパスワード',
  'backup.preview': '開いてみる（何件か確かめる）',
  'backup.previewCount': '{count}件入っています。',
  'backup.restore': 'このファイルから戻す',
  'backup.restored': '{count}件を戻しました。',
  'backup.confirmTitle': 'いまの金庫の内容を置き換えますか？',
  'backup.confirmMessage': 'いま入っている内容はなくなり、ファイルの内容に置き換わります。',
  'backup.confirmLabel': '戻す',

  // ── あちこちで使うもの ────────────────────────────────────
  'common.back': '‹ 戻る',
  'common.backLabel': '戻る',
  'common.cancel': 'やめる',
  'common.on': 'on',
  'common.off': 'off',
  'common.appName': 'Jamgim',
  'common.recoveryCodeLabel': '復旧コード {code}',
  'common.failed': 'うまくいきませんでした。もう一度お試しください。',
  'common.failedWhy': 'うまくいきませんでした。（{why}）',
  'common.unknownReason': '原因は不明です',

  // ── システムの画面・通知 ──────────────────────────────────
  'system.shareBackup': 'バックアップファイルを送る',
  'system.reminderTitle': 'Jamgim — バックアップの時期です',
  'system.reminderBody':
    '最後のバックアップから90日が過ぎました。新しいバックアップファイルを作っておいてください。',
  'system.guardUnsupported': 'この端末では画面を隠せません。',
} satisfies Record<MessageKey, Message> satisfies Catalog;
