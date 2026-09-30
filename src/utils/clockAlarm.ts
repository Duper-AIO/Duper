import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

export async function openClockAlarm(options: {
  title: string;
  date: string;
  startTime: string;
  leadMinutes: number;
  vibrate: boolean;
}): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('Device Clock alarms are only available on Android.');

  const [year, month, day] = options.date.split('-').map(Number);
  const [hour, minute] = options.startTime.split(':').map(Number);
  const alarmDate = new Date(year, month - 1, day, hour, minute);
  alarmDate.setMinutes(alarmDate.getMinutes() - options.leadMinutes);
  const now = new Date();
  if (alarmDate.toDateString() !== now.toDateString() || alarmDate <= now) {
    throw new Error('Android Clock accepts a time, not a task date. Use the scheduled task reminder for future dates or times that have passed.');
  }

  await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
    extra: {
      'android.intent.extra.alarm.HOUR': alarmDate.getHours(),
      'android.intent.extra.alarm.MINUTES': alarmDate.getMinutes(),
      'android.intent.extra.alarm.MESSAGE': options.title,
      'android.intent.extra.alarm.VIBRATE': options.vibrate,
      'android.intent.extra.alarm.SKIP_UI': false,
    },
  });
}