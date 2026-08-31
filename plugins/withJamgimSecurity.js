const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 안드로이드 보안 설정 (명세 5.5)
 *
 * 1. OS 자동 백업 / 기기 간 전송 대상에서 금고 파일을 뺀다.
 *    allowBackup=false 만으로는 안드로이드 12+ 의 기기 간 전송(D2D)이 남으므로
 *    dataExtractionRules 로 클라우드 백업과 기기 전송을 모두 막는다.
 * 2. 인터넷 권한을 요청하지 않는다. MVP 목표는 권한 자체를 안 갖는 것이다 (명세 1장).
 *
 * FLAG_SECURE 는 실행 중에 expo-screen-capture 로 켠다
 * (src/app/platform/screenGuard.ts). 설정에서 끌 수 있어야 하기 때문이다.
 */
const RULES_FILE = 'jamgim_data_extraction_rules.xml';
const RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="root" />
    <exclude domain="file" />
    <exclude domain="database" />
    <exclude domain="sharedpref" />
  </cloud-backup>
  <device-transfer>
    <exclude domain="root" />
    <exclude domain="file" />
    <exclude domain="database" />
    <exclude domain="sharedpref" />
  </device-transfer>
</data-extraction-rules>
`;

const FULL_BACKUP_FILE = 'jamgim_full_backup_content.xml';
const FULL_BACKUP_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="root" />
  <exclude domain="file" />
  <exclude domain="database" />
  <exclude domain="sharedpref" />
</full-backup-content>
`;

function withBackupRuleFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, RULES_FILE), RULES_XML);
      fs.writeFileSync(path.join(xmlDir, FULL_BACKUP_FILE), FULL_BACKUP_XML);
      return cfg;
    },
  ]);
}

function withManifestFlags(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.$['android:allowBackup'] = 'false';
    application.$['android:dataExtractionRules'] = `@xml/${RULES_FILE.replace('.xml', '')}`;
    application.$['android:fullBackupContent'] = `@xml/${FULL_BACKUP_FILE.replace('.xml', '')}`;
    return cfg;
  });
}

module.exports = function withJamgimSecurity(config) {
  return withManifestFlags(withBackupRuleFiles(config));
};
