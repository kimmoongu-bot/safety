import type { Catalog, Message } from './types.ts';
import type { MessageKey } from './ko.ts';

/**
 * English wording.
 *
 * Hand a translator this file alone — they never need to read code.
 *
 * Two rules (`docs/국제화.md` ch.3):
 *
 * 1. **Never build a sentence out of pieces.** Write `{name}` where a value goes
 *    and keep the rest a complete sentence in this language. Word order differs
 *    between languages, so only whole sentences survive translation.
 * 2. **Korean particles stay in Korean.** English needs none, so every message
 *    here is either a plain string or — where the count changes the wording —
 *    a small function.
 *
 * `Record<MessageKey, Message>` means a key that exists in `ko.ts` but not here
 * is a **compile error**, not a blank on someone's screen.
 *
 * Wording follows the same rule as the Korean: plain words, no jargon
 * (spec ch.3). "Open", not "decrypt". "PIN", not "master password".
 */

/** Written for people who are not comfortable with phones. Short sentences. */
export const en = {
  // ── Lock screen ───────────────────────────────────────────
  /**
   * The app's name on screen.
   *
   * Left as the romanised Korean name. It is a brand, and the tagline below it
   * says what the app is. Change this one line if the name changes.
   */
  'lock.title': 'Jamgim',
  'lock.tagline': 'Your private vault.',
  'lock.open': 'Open vault',
  'lock.openWithBiometric': ({ how }) => `Open with ${how}`,
  'lock.forgotPin': 'I forgot my PIN (use recovery code)',
  'lock.failures': ({ count }) =>
    Number(count) === 1 ? 'Wrong PIN, 1 time.' : `Wrong PIN, ${count} times.`,
  'lock.failuresWithWait': ({ count, wait }) =>
    Number(count) === 1 ? `Wrong PIN, 1 time. ${wait}.` : `Wrong PIN, ${count} times. ${wait}.`,
  'lock.waitSeconds': ({ seconds }) =>
    Number(seconds) === 1 ? 'Try again in 1 second' : `Try again in ${seconds} seconds`,
  'lock.waitMinutes': ({ minutes }) =>
    Number(minutes) === 1 ? 'Try again in 1 minute' : `Try again in ${minutes} minutes`,
  'lock.recoveryTitle': 'Open with recovery code',
  'lock.recoveryHelp': 'Enter the recovery code you wrote down when you set up the vault.',
  'lock.recoveryLabel': 'Recovery code',
  'lock.recoveryPlaceholder': 'e.g. WZC7-1W7M-KHRP-DNEN',
  'lock.biometricPrompt': ({ how }) => `Opening your vault with ${how}`,

  // ── Setting up ────────────────────────────────────────────
  'setup.biometricTitle': ({ how }) => `Open with ${how} too?`,
  'setup.biometricYes': ({ how }) => `Open with ${how}`,
  'setup.biometricWhy': ({ how }) =>
    `With ${how} you will not have to enter your PIN every time. You can change this later in Settings.`,
  'setup.biometricUnavailable': ({ how }) =>
    `This phone is not set up for ${how}. You can open the vault with your PIN.`,

  // ── Number pad ────────────────────────────────────────────
  'pinpad.erase': 'Erase',
  'pinpad.eraseOne': 'Erase one digit',
  'pinpad.digit': 'Digit {digit}',
  'pinpad.entered': ({ count }) => (Number(count) === 1 ? '1 digit entered' : `${count} digits entered`),

  // ── Fingerprint and face ──────────────────────────────────
  // Which one shows depends on what the phone supports. Translate these three
  // words and every "Open with {how}" sentence above falls into place.
  'biometric.finger': 'your fingerprint',
  'biometric.face': 'your face',
  'biometric.both': 'your fingerprint or face',
  'biometric.reason': 'Please confirm it is you to open the vault',
  'biometric.cancel': 'Cancel',
  'biometric.fallback': 'Use PIN instead',

  // ── My vault (the list) ───────────────────────────────────
  'list.title': 'My vault',
  'list.add': '＋ Add new',
  'list.settings': 'Settings',
  'list.searchPlaceholder': 'What are you looking for?',
  'list.searchLabel': 'Search box',
  'list.unreadable': ({ count }) =>
    Number(count) === 1
      ? '1 item could not be opened. If you have a backup file, try restoring from it.'
      : `${count} items could not be opened. If you have a backup file, try restoring from it.`,
  'list.empty': 'Nothing saved yet.',
  'list.emptyHint': 'Tap “＋ Add new” below to start.',
  'list.favoriteOn': 'Added to the ones you use often.',
  'list.favoriteOff': 'Removed from the ones you use often.',
  'list.noMatch': 'Nothing matches “{query}”.',
  'list.addThisName': 'Add new with this name',

  // ── Search results ────────────────────────────────────────
  'search.title': 'Search results',
  'search.found': ({ count }) => (Number(count) === 1 ? 'Found 1.' : `Found ${count}.`),

  // ── Account card ──────────────────────────────────────────
  'card.label': '{service}, username {username}',
  'card.noName': 'No name',
  'card.noUsername': 'No username',
  'card.none': 'None',
  'card.stale': 'Not changed in over a year',
  'card.favoriteAdd': 'Add to the ones you use often',
  'card.favoriteRemove': 'Remove from the ones you use often',

  // ── Setting up (continued) ────────────────────────────────
  'setup.pinTitle': 'Create your PIN',
  'setup.pinAgainTitle': 'Please enter it once more',
  'setup.pinHelp': 'Choose the numbers you will use to open your vault. Four digits or more.',
  'setup.pinAgainHelp': 'Enter the PIN you just chose one more time.',
  'setup.next': 'Next',
  'setup.pinMismatch': 'The two PINs do not match. Please start again.',
  'setup.pinOnly': 'Use numbers only',
  'setup.codeTitle': 'Write down your recovery code',
  'setup.codeWarn':
    'This is the only way to open your vault if you forget your PIN. Write it on paper and keep it somewhere other than your phone. Do not take a screenshot.',
  'setup.codeNext': 'On the next screen you will type this code in yourself to confirm.',
  'setup.codeWrote': 'I wrote it down. Next',
  'setup.codeCheckTitle': 'Enter the recovery code you wrote down',
  'setup.codeCheckHelp': 'Capital letters and spaces do not matter.',
  'setup.lastWarnWithBiometric': ({ how }) =>
    `You can also open the vault with ${how}. If your PIN, recovery code and backup file are all gone, the vault cannot be opened.`,
  'setup.lastWarn':
    'If your PIN, recovery code and backup file are all gone, the vault cannot be opened.',
  'setup.finish': 'I understand — start',
  'setup.codeMismatch': 'That recovery code does not match. Check what you wrote down.',
  'setup.done': 'Your vault is ready.',

  // ── Categories ────────────────────────────────────────────
  // The vault stores the code (bank, card…) and the screen shows these words.
  // Storing the words themselves would show Korean categories to an English user.
  'category.bank': 'Bank',
  'category.card': 'Card',
  'category.shopping': 'Shopping',
  'category.gov': 'Government',
  'category.telecom': 'Phone & internet',
  'category.other': 'Other',

  // ── Adding and editing ────────────────────────────────────
  'edit.titleNew': 'Add new',
  'edit.titleEdit': 'Edit',
  'edit.save': 'Save',
  'edit.service': 'Where do you use this?',
  'edit.serviceHint': 'e.g. Chase, Visa, Amazon',
  'edit.username': 'Username',
  'edit.password': 'Password',
  'edit.show': 'Show',
  'edit.hide': 'Hide',
  'edit.category': 'Category',
  'edit.memo': 'Note',
  'edit.needService': 'Please write where you use this.',
  'edit.saved': 'Saved.',
  'edit.updated': 'Updated.',
  'edit.pwDateNote': 'When you change the password, the date is saved with it.',

  // ── Viewing an item ───────────────────────────────────────
  'detail.title': 'Item',
  'detail.notFound': 'That item was not found.',
  'detail.edit': 'Edit',
  'detail.delete': 'Delete',
  'detail.username': 'Username',
  'detail.password': 'Password',
  'detail.memo': 'Note',
  'detail.none': 'None',
  'detail.hidden': '●●●●●●●●',
  'detail.copyUsername': 'Copy username',
  'detail.copyPassword': 'Copy password',
  'detail.reveal': 'Show',
  'detail.conceal': 'Hide',
  'detail.autoHide': ({ seconds }) =>
    Number(seconds) === 1 ? 'Hides again in 1 second.' : `Hides again in ${seconds} seconds.`,
  'detail.pwChangedAt': 'Password last changed',
  'detail.noDate': 'Not recorded',
  'detail.staleNotice': 'Not changed in over a year. It is worth changing.',
  'detail.prevPassword': 'Previous password',
  'detail.prevWhy': 'Kept so you can go back if the new password does not work.',
  'detail.deleteTitle': 'Delete this item?',
  'detail.deleteMessage': ({ service }) => `Deleting “${service}” cannot be undone.`,
  'detail.deleted': 'Deleted.',
  'detail.emptyField': ({ what }) => `${what} is empty.`,
  'detail.copied': ({ what, seconds }) =>
    Number(seconds) === 1
      ? `Copied ${what}. It will be cleared in 1 second.`
      : `Copied ${what}. It will be cleared in ${seconds} seconds.`,

  // ── Backup file name ──────────────────────────────────────
  /**
   * The front of the backup file name. `_20260307.jamgim` is added after it.
   * This is what shows in the files app. "DoNotDelete" is there to stop someone
   * clearing it out by mistake.
   * Do not use characters a file name cannot hold: \ / : * ? " < > |
   */
  'backup.fileNamePrefix': 'Jamgim_Backup_DoNotDelete',

  // ── Vault errors ──────────────────────────────────────────
  // The core (src/core) throws codes only; the wording lives here.
  'error.WRONG_PIN': 'That PIN is not right.',
  'error.WRONG_RECOVERY_CODE': 'That recovery code is not right.',
  'error.WRONG_BACKUP_PASSWORD': 'That backup password is not right.',
  'error.LOCKED_OUT': 'Too many wrong tries. Please wait a moment and try again.',
  'error.VAULT_NOT_FOUND': 'There is no vault yet.',
  'error.VAULT_ALREADY_EXISTS': 'There is already a vault.',
  'error.DATA_DAMAGED': 'What was saved has been damaged.',
  'error.UNSUPPORTED_FORMAT': 'This is not a Jamgim backup file, or it is a different version.',
  'error.CRYPTO_UNAVAILABLE': 'This phone cannot keep a vault safely.',
  'error.VAULT_LOCKED': 'The vault is locked.',
  'error.INVALID_INPUT': 'Please check what you entered.',

  // Same kind of failure, but what to do about it differs.
  'error.BACKUP_PASSWORD_SAME_AS_PIN': 'Please make the backup password different from your PIN.',
  'error.BACKUP_PASSWORD_TOO_SHORT': 'The backup password must be at least {count} characters.',
  'error.WIPED_AFTER_FAILURES': 'The vault was erased after 10 wrong tries.',
  'error.BIOMETRIC_NOT_SET_UP':
    'This phone cannot open the vault with a fingerprint or face. Please enter your PIN.',
  'error.BIOMETRIC_CHANGED':
    'The fingerprint or face on this phone has changed. Please open with your PIN.',
  'error.RECORD_NOT_FOUND': 'That item was not found.',
  'error.NO_RECOVERY_CODE_COPY': 'There is no copy of the recovery code. Please make a new one.',

  // ── Settings ──────────────────────────────────────────────
  'settings.recoveryReason': 'Please confirm it is you to see the recovery code',
  'settings.title': 'Settings',
  'settings.checkFailed': 'Could not confirm.',
  'settings.theme': 'Screen brightness',
  'settings.themeSystem': 'Follow phone',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeWhy': 'Dark is easier on the eyes at night.',
  'settings.language': 'Language',
  'settings.languageSystem': 'Follow phone',
  'settings.saveFailed': 'Could not save the setting. It will go back if you restart the app.',
  'settings.autoLock': 'Lock by itself after how long?',
  'settings.autoLockNow': 'Right away',
  'settings.autoLock1m': '1 minute',
  'settings.autoLock5m': '5 minutes',
  'settings.biometric': 'Open with fingerprint or face',
  'settings.biometricWhy': 'When on, you can open the vault without entering your PIN.',
  'settings.biometricNone': 'This phone is not set up for fingerprint or face.',
  'settings.biometricOn': 'You can now open with your fingerprint or face.',
  'settings.biometricOff': 'Opening with fingerprint or face is off.',
  'settings.clipboard': 'Clear what you copied after how long?',
  'settings.clipboardAfter': ({ seconds }) =>
    Number(seconds) === 1 ? 'After 1 second' : `After ${seconds} seconds`,
  'settings.screenGuard': 'Block screenshots',
  'settings.screenGuardWhy': 'Blocks screenshots and the preview in your recent apps.',
  'settings.screenGuardOn': 'Screenshots are blocked.',
  'settings.screenGuardOff': 'Screenshot blocking is off.',
  'settings.screenGuardFailed': 'Could not block the screen. ({reason})',
  'settings.keepPrev': 'Keep 1 previous password',
  'settings.keepPrevWhy': 'So you can go back if the new password does not work.',
  'settings.wipe': 'Erase the vault after 10 wrong tries',
  'settings.wipeWhy':
    'When on, entering the wrong PIN 10 times erases the whole vault. Without a backup file it cannot be brought back.',
  'settings.recoveryHeading': 'Recovery code',
  'settings.recoveryHide': 'Hide again',
  'settings.recoveryShow': 'Show recovery code again',
  'settings.pinHeading': 'Change your PIN',
  'settings.pinCurrent': 'Current PIN',
  'settings.pinNext': 'New PIN',
  'settings.pinChange': 'Change',
  'settings.pinChanged': 'Your PIN has been changed.',
  'settings.cancel': 'Never mind',
  'settings.backupHeading': 'Backup',
  'settings.backupGo': 'Make a backup file / restore from one',
  'settings.wipeHeading': 'Erase the vault',
  'settings.wipeExplain':
    'If your PIN, fingerprint, recovery code and backup file are all gone, the vault cannot be opened. You can erase it and start over, but what was inside will not come back.',
  'settings.wipeStart': 'Erase the vault and start over',
  'settings.wipeAsksTwice': 'You will be asked twice before anything is erased.',
  'settings.wipe1Title': 'Really erase it? (1 of 2)',
  'settings.wipe1Message':
    'Every username and password you saved will be gone. This cannot be undone.',
  'settings.wipe1Confirm': 'Continue',
  'settings.wipe2Title': 'Last check (2 of 2)',
  'settings.wipe2Message':
    'Without a backup file, what you erase now cannot be brought back by any means.',
  'settings.wipe2Confirm': 'Erase it',
  'settings.wiped': 'The vault has been erased.',

  // ── Backup and restore ────────────────────────────────────
  'backup.title': 'Backup & restore',
  'backup.never': 'Not done even once yet',
  'backup.last': 'Last backup: {when}',
  'backup.stale': 'It has been 90 days since your last backup. Please make a new backup file.',
  'backup.makeHeading': 'Make a backup file',
  'backup.makeWarn':
    'This file cannot be opened without its password. Do not send the file and the password to the same place.',
  'backup.familyTip':
    'Giving the file alone to two or three family members means you can restore it even if you lose your phone. Do not pass on the backup password — write it on paper yourself and keep it somewhere other than your phone. Messaging apps often stop letting you download a file after a while, so check that the person actually saved it on their phone.',
  'backup.password': 'Backup password',
  'backup.passwordHint': 'At least {min} characters. Make it different from the PIN you open the app with.',
  'backup.passwordAgain': 'Backup password once more',
  'backup.mismatch': 'The two backup passwords do not match.',
  'backup.make': 'Make the backup file and send it',
  'backup.made': ({ count }) =>
    Number(count) === 1 ? 'Made a backup file holding 1 item.' : `Made a backup file holding ${count} items.`,
  'backup.restoreHeading': 'Restore from a backup file',
  'backup.restoreWhen':
    'Use this when you have changed phones or reinstalled the app. What is in the vault now will be replaced by what is in the file.',
  'backup.pick': 'Choose a file',
  'backup.picked': 'Chosen file: {name}',
  'backup.pickedToast': ({ name }) => `Chose ${name}.`,
  'backup.pickFirst': 'Please choose a file first.',
  'backup.filePassword': 'That file’s backup password',
  'backup.preview': 'Open it (check how many)',
  'backup.previewCount': ({ count }) =>
    Number(count) === 1 ? 'It holds 1 item.' : `It holds ${count} items.`,
  'backup.restore': 'Restore from this file',
  'backup.restored': ({ count }) =>
    Number(count) === 1 ? 'Restored 1 item.' : `Restored ${count} items.`,
  'backup.confirmTitle': 'Replace what is in the vault now?',
  'backup.confirmMessage':
    'What is in the vault now will be gone and replaced by what is in the file.',
  'backup.confirmLabel': 'Restore',

  // ── Used throughout ───────────────────────────────────────
  'common.back': '‹ Back',
  'common.backLabel': 'Back',
  'common.cancel': 'Never mind',
  'common.on': 'On',
  'common.off': 'Off',
  'common.appName': 'Jamgim',
  'common.recoveryCodeLabel': 'Recovery code {code}',
  'common.failed': 'That did not work. Please try again.',
  'common.failedWhy': 'That did not work. ({why})',
  'common.unknownReason': 'Reason unknown',

  // ── System dialogs and notifications ──────────────────────
  'system.shareBackup': 'Send the backup file',
  'system.reminderTitle': 'Jamgim — time to back up',
  'system.reminderBody':
    'It has been 90 days since your last backup. Please make a new backup file.',
  'system.guardUnsupported': 'This phone cannot block the screen.',
} satisfies Record<MessageKey, Message> satisfies Catalog;
