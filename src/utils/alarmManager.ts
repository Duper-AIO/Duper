// src/utils/alarmManager.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * CONFIGURATION
 */
export const ANDROID_CHANNEL_IDS: Record<AlarmMode, string> = {
  sound: 'task-reminders-sound-v3',
  vibrate: 'task-reminders-vibrate-v3',
  silent: 'task-reminders-silent-v3',
};

export const ANDROID_CHANNEL_ID = ANDROID_CHANNEL_IDS.vibrate;

// Notification Handler
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const mode = notification.request.content.data?.alarmMode;
      return {
        shouldShowAlert: true,
        shouldPlaySound: Platform.OS === 'android' || mode !== 'silent',
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

// ---------------- TYPES ----------------

export type AlarmLeadMinutes = 0 | 5 | 10 | 30;
export type AlarmMode = 'silent' | 'sound' | 'vibrate';

export interface TaskForAlarm {
  id: string;
  title: string;
  date: string;       // "YYYY-MM-DD"
  startTime?: string; // "HH:mm" (24h)
}

export interface AlarmSettings {
  leadMinutes: AlarmLeadMinutes;
  mode: AlarmMode;
}

// ---------------- INIT ----------------

export async function initTaskAlarms() {
  if (Platform.OS === 'web') return;

  // Android channels are immutable after creation, so each mode has its own channel.
  if (Platform.OS === 'android') {
    for (const mode of ['sound', 'vibrate', 'silent'] as const) {
      try {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_IDS[mode], {
          name: `Task reminders (${mode})`,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: mode === 'vibrate' ? [0, 600, 300, 600, 300, 600] : [],
          lightColor: '#2563EB',
          sound: mode === 'sound' ? 'default' : null,
          enableVibrate: mode === 'vibrate',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      } catch (e) {
        console.warn(`Failed to set Android ${mode} notification channel`, e);
      }
    }
  }

  // 2. Setup Notification Categories (Actions: Snooze / Stop)
  try {
    await Notifications.setNotificationCategoryAsync('alarm', [
      {
        identifier: 'snooze',
        buttonTitle: 'Snooze 5 min',
        options: {
          opensAppToForeground: true, // Open app to run snooze logic
        },
      },
      {
        identifier: 'stop',
        buttonTitle: 'Stop',
        options: {
          opensAppToForeground: true, // Open app to stop vibration
        },
      },
    ]);
  } catch (e) {
    console.warn('Failed to set notification categories', e);
  }

  // 3. Request Permissions
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (e) {
    console.warn('Failed to get notification permissions', e);
  }
}

// ---------------- HELPER ----------------

export function getTaskStartDateTime(task: TaskForAlarm): Date {
  const [year, month, day] = task.date.split('-').map((p) => parseInt(p, 10));
  let hour = 9;
  let minute = 0;

  if (task.startTime) {
    const [h, m] = task.startTime.split(':').map((p) => parseInt(p, 10));
    if (!isNaN(h)) hour = h;
    if (!isNaN(m)) minute = m;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// ---------------- MAIN: SCHEDULE ----------------

export async function scheduleTaskReminder(
  task: TaskForAlarm,
  settings: AlarmSettings
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { leadMinutes } = settings;
  const mode: AlarmMode = Platform.OS === 'android' ? settings.mode : settings.mode === 'silent' ? 'silent' : 'sound';

  if (leadMinutes <= 0) return null;

  await initTaskAlarms();
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    console.warn('Task reminder was not scheduled because notification permission is not granted');
    return null;
  }

  const taskDateTime = getTaskStartDateTime(task);
  const triggerTime = new Date(taskDateTime.getTime() - leadMinutes * 60 * 1000);
  const now = new Date();

  if (triggerTime.getTime() <= now.getTime()) {
    return null;
  }

  // Prepare content
  const content: Notifications.NotificationContentInput = {
    title: `Upcoming: ${task.title}`,
    body: leadMinutes === 5 
      ? 'Tap to stop or snooze' 
      : `Starts in ${leadMinutes} minutes`,
    categoryIdentifier: 'alarm', // <--- Links to the Snooze/Stop buttons
    priority: Notifications.AndroidNotificationPriority.MAX, // <--- Key for waking screen
    autoDismiss: false, // <--- Keeps notification visible
    data: {
      taskId: task.id,
      taskTitle: task.title,
      taskDate: task.date,
      taskStartTime: task.startTime ?? null,
      alarmMode: mode,
      leadMinutes,
    },
  };

  content.sound = mode === 'sound' || (Platform.OS === 'ios' && mode === 'vibrate') ? 'default' : false;

  // Prepare Trigger
  const trigger: any = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: triggerTime,
    channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_IDS[mode] : undefined,
  };

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
    return id;
  } catch (e) {
    console.warn('Failed to schedule task reminder', e);
    return null;
  }
}

export async function cancelReminderById(notificationId: string) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Failed to cancel scheduled reminder', e);
  }
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Failed to dismiss delivered reminder', e);
  }
}