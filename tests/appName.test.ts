import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ko } from '../src/app/i18n/ko.ts';
import { en } from '../src/app/i18n/en.ts';
import { ja } from '../src/app/i18n/ja.ts';
import { ru } from '../src/app/i18n/ru.ts';

/**
 * 앱 이름은 **언어마다 다르다.**
 *
 * - 한국어: `잠김`
 * - 그 밖: `Kepta`
 *
 * 이름이 세 군데에서 따로 만들어진다 — `app.json`(기본 런처 이름),
 * `plugins/withJamgimAppName.js`(한국어 런처 이름), `i18n`(앱 안 화면).
 * 한 군데만 고치면 홈 화면은 `Kepta` 인데 앱을 열면 `잠김` 이라고 적혀 있는 꼴이 된다.
 * 사람이 눈으로 지킬 수 있는 규칙이 아니라서 여기서 못박는다.
 */
const require_ = createRequire(import.meta.url);
const appJson = require_('../app.json') as { expo: Record<string, unknown> };
const { resolve } = require_('../app.config.js') as {
  resolve: (config: Record<string, unknown>, env?: Record<string, string | undefined>) => { name?: string };
};
const plugin = require_('../plugins/withJamgimAppName.js') as {
  koStringsXml: (devBuild: boolean) => string;
  KO_APP_NAME: string;
};

const KO = '잠김';
const DEFAULT = 'Kepta';

test('기본 런처 이름은 Kepta 다', () => {
  assert.equal(resolve(appJson.expo, {}).name, DEFAULT);
});

test('개발용 빌드만 이름 뒤에 꼬리가 붙는다', () => {
  const dev = resolve(appJson.expo, { JAMGIM_DEV_BUILD: '1' }).name;
  assert.equal(dev, `${DEFAULT} (개발)`, '홈 화면에서 진짜 앱과 구분되어야 한다');
});

test('한국어 런처 이름은 잠김 이다', () => {
  const xml = plugin.koStringsXml(false);
  assert.match(xml, /<string name="app_name">잠김<\/string>/);
});

test('개발용에서는 한국어 이름에도 같은 꼬리가 붙는다', () => {
  /*
    꼬리를 한쪽에만 붙이면 폰 언어에 따라 `Kepta (개발)` 과 `잠김` 이 섞여 나온다.
    그러면 홈 화면에서 어느 것이 진짜 앱인지 알 수 없다.
  */
  const xml = plugin.koStringsXml(true);
  assert.match(xml, /<string name="app_name">잠김 \(개발\)<\/string>/);
});

test('한국어 strings.xml 이 안드로이드가 읽을 수 있는 꼴이다', () => {
  const xml = plugin.koStringsXml(false);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'), '선언이 맨 앞에 와야 한다');
  assert.match(xml, /<resources>[\s\S]*<\/resources>/);
});

test('앱 안 화면의 이름도 같은 규칙을 따른다', () => {
  assert.equal(ko['common.appName'], KO);
  assert.equal(ko['lock.title'], KO);
  for (const [tag, catalog] of [['en', en], ['ja', ja], ['ru', ru]] as const) {
    assert.equal(catalog['common.appName'], DEFAULT, `${tag} 의 앱 이름`);
    assert.equal(catalog['lock.title'], DEFAULT, `${tag} 의 잠금 화면 제목`);
  }
});

test('옛 이름이 어디에도 남아 있지 않다', () => {
  /*
    `Jamgim` 은 이름을 바꾸기 전에 쓰던 것이다. 한 줄이라도 남으면 그 화면에서만
    옛 이름이 튀어나온다 — 백업 파일 이름, 알림 제목처럼 눈에 잘 안 띄는 자리가 특히 그렇다.
  */
  for (const [tag, catalog] of [['ko', ko], ['en', en], ['ja', ja], ['ru', ru]] as const) {
    for (const [key, value] of Object.entries(catalog)) {
      if (typeof value !== 'string') continue;
      assert.ok(!value.includes('Jamgim'), `${tag} 의 ${key} 에 옛 이름이 남아 있다: ${value}`);
    }
  }
});
