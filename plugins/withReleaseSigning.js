/**
 * Expo config plugin: adds a "release" signing config to android/app/build.gradle
 * that reads the upload keystore from Gradle properties (never committed).
 *
 * Put these in ~/.gradle/gradle.properties (or android/gradle.properties locally):
 *   ROBO_UPLOAD_STORE_FILE=/absolute/path/robotics-trainer-upload.keystore
 *   ROBO_UPLOAD_STORE_PASSWORD=*****
 *   ROBO_UPLOAD_KEY_ALIAS=robotics-trainer
 *   ROBO_UPLOAD_KEY_PASSWORD=*****
 *
 * If they are missing, the release build falls back to the debug key so that
 * `assembleRelease` still works for quick classroom installs.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// robotics-trainer: release signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    gradle = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARKER}
        release {
            if (project.hasProperty('ROBO_UPLOAD_STORE_FILE')) {
                storeFile file(ROBO_UPLOAD_STORE_FILE)
                storePassword ROBO_UPLOAD_STORE_PASSWORD
                keyAlias ROBO_UPLOAD_KEY_ALIAS
                keyPassword ROBO_UPLOAD_KEY_PASSWORD
            }
        }`,
    );

    // In buildTypes.release, use the release config when a keystore is configured.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      `$1signingConfig project.hasProperty('ROBO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
