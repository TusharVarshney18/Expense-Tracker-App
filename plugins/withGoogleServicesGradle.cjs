const fs = require('fs/promises');
const path = require('path');
const { withFinalizedMod } = require('@expo/config-plugins');

const PLUGIN_ID = 'com.google.gms.google-services';
const PLUGIN_VERSION = '4.5.0';

module.exports = function withGoogleServicesGradle(config) {
  if (!config.android?.googleServicesFile) return config;

  return withFinalizedMod(config, [
    'android',
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const rootGradlePath = path.join(androidRoot, 'build.gradle');
      const appGradlePath = path.join(androidRoot, 'app', 'build.gradle');

      let rootGradle = await fs.readFile(rootGradlePath, 'utf8');
      rootGradle = rootGradle.replace(
        /^\s*classpath\s*\(?\s*['"]com\.google\.gms:google-services(?::[^'"]+)?['"]\s*\)?\s*;?\s*$/gm,
        ''
      );

      const rootPlugins = `plugins {\n  id("${PLUGIN_ID}") version "${PLUGIN_VERSION}" apply false\n}\n`;
      const allProjectsMarker = '\nallprojects {';
      if (rootGradle.includes(`id("${PLUGIN_ID}")`)) {
        rootGradle = rootGradle.replace(
          new RegExp(`id\\(["']${PLUGIN_ID}["']\\)\\s+version\\s+["'][^"']+["']\\s+apply\\s+false`),
          `id("${PLUGIN_ID}") version "${PLUGIN_VERSION}" apply false`
        );
      } else if (rootGradle.includes(allProjectsMarker)) {
        rootGradle = rootGradle.replace(allProjectsMarker, `\n${rootPlugins}\nallprojects {`);
      } else {
        throw new Error('Could not find the Android root Gradle insertion point for Google Services.');
      }
      await fs.writeFile(rootGradlePath, rootGradle, 'utf8');

      let appGradle = await fs.readFile(appGradlePath, 'utf8');
      appGradle = appGradle.replace(
        /^\s*apply\s+plugin:\s*['"]com\.google\.gms\.google-services['"]\s*;?\s*$/gm,
        ''
      );
      if (!appGradle.includes(`id("${PLUGIN_ID}")`)) {
        appGradle = `plugins {\n  id("${PLUGIN_ID}")\n}\n\n${appGradle}`;
      }
      await fs.writeFile(appGradlePath, appGradle, 'utf8');
      return modConfig;
    }
  ]);
};
