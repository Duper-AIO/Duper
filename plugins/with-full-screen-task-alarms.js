const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod
} = require('@expo/config-plugins');

const PATCH_MARKER = '// Duper full-screen task reminder';
const ORIGINAL_CONTENT_INTENT = `    builder.setContentIntent(
      createNotificationResponseIntent(
        context,
        notification,
        defaultAction
      )
    )`;
const FULL_SCREEN_CONTENT_INTENT = `    val taskAlarmIntent = createNotificationResponseIntent(
      context,
      notification,
      defaultAction
    )
    builder.setContentIntent(taskAlarmIntent)
    if (content.categoryId == "alarm" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      // Duper full-screen task reminder
      builder.setCategory(NotificationCompat.CATEGORY_ALARM)
      builder.setFullScreenIntent(taskAlarmIntent, true)
    }`;

function withFullScreenReminderIntent(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const builderPath = path.join(
        modConfig.modRequest.projectRoot,
        'node_modules',
        'expo-notifications',
        'android',
        'src',
        'main',
        'java',
        'expo',
        'modules',
        'notifications',
        'notifications',
        'presentation',
        'builders',
        'ExpoNotificationBuilder.kt'
      );

      if (!fs.existsSync(builderPath)) {
        throw new Error(`Could not find Expo notification builder at ${builderPath}`);
      }

      const source = await fs.promises.readFile(builderPath, 'utf8');
      if (source.includes(PATCH_MARKER)) return modConfig;
      if (!source.includes(ORIGINAL_CONTENT_INTENT)) {
        throw new Error('Could not patch Expo notification builder: expected content intent code was not found.');
      }

      await fs.promises.writeFile(
        builderPath,
        source.replace(ORIGINAL_CONTENT_INTENT, FULL_SCREEN_CONTENT_INTENT),
        'utf8'
      );
      return modConfig;
    }
  ]);
}

function withFullScreenReminderManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const permissions = manifest['uses-permission'] || [];
    const permissionName = 'android.permission.USE_FULL_SCREEN_INTENT';

    if (!permissions.some((permission) => permission.$?.['android:name'] === permissionName)) {
      permissions.push({ $: { 'android:name': permissionName } });
    }
    manifest['uses-permission'] = permissions;

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    const mainActivity = application.activity?.find((activity) =>
      activity.$?.['android:name']?.endsWith('.MainActivity')
    );
    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }

    return modConfig;
  });
}

module.exports = function withFullScreenTaskAlarms(config) {
  return withFullScreenReminderManifest(withFullScreenReminderIntent(config));
};
