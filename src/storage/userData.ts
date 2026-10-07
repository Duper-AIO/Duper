import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { requireSupabase } from '../lib/supabase';

const APP_DATA_KEY = 'DHIRAJX_APP_DATA';
const PLANNER_KEY = 'plannerTasks_v3';
const FOCUS_KEY = 'focus_of_day_v1';
const WATER_KEY = 'water_tracker_v1';
const NOTES_KEY = 'app_data_notes_v12.json';
const EXPENSES_KEY = 'expenses_data_store.json';
const MIGRATION_KEY = 'duper:legacy-data-migrated';
const DATA_KEYS = [APP_DATA_KEY, PLANNER_KEY, FOCUS_KEY, WATER_KEY, NOTES_KEY, EXPENSES_KEY];
const FILES: Record<string, string> = {
  [NOTES_KEY]: 'app_data_notes_v12.json',
  [EXPENSES_KEY]: 'expenses_data_store.json'
};

let activeUserId: string | null = null;

const localKey = (userId: string, key: string) => `duper:${userId}:${key}`;
const fileUri = (name: string) => `${FileSystem.documentDirectory || ''}${name}`;

async function readLocalFile(key: string): Promise<string | null> {
  const name = FILES[key];
  if (!name || !FileSystem.documentDirectory) return null;
  const uri = fileUri(name);
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? FileSystem.readAsStringAsync(uri) : null;
}

async function writeLocalFile(key: string, value: string): Promise<void> {
  const name = FILES[key];
  if (!name || !FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(fileUri(name), value);
}

async function readLegacyValue(key: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(key);
  if (stored !== null) return stored;
  if (key === EXPENSES_KEY) {
    const legacyExpenseFile = `${FileSystem.documentDirectory || ''}app_data_expenses_v5.json`;
    if (!FileSystem.documentDirectory) return null;
    const info = await FileSystem.getInfoAsync(legacyExpenseFile);
    if (info.exists) return FileSystem.readAsStringAsync(legacyExpenseFile);
  }
  return readLocalFile(key);
}

async function cacheValue(userId: string, key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(localKey(userId, key), value);
  if (key === PLANNER_KEY) {
    await AsyncStorage.setItem(key, value);
  }
  await writeLocalFile(key, value);
}

export async function syncUserData(userId: string): Promise<void> {
  const client = requireSupabase();
  const { data: remoteRows, error } = await client
    .from('duper_user_data')
    .select('key, value')
    .eq('user_id', userId);

  if (error) throw error;

  const rows = remoteRows as { key: string; value: string }[];
  activeUserId = userId;

  if (rows.length === 0) {
    const migrationComplete = await AsyncStorage.getItem(MIGRATION_KEY);
    const entries = migrationComplete
      ? []
      : (await Promise.all(DATA_KEYS.map(async (key) => ({ key, value: await readLegacyValue(key) })))).filter(
          (entry): entry is { key: string; value: string } => entry.value !== null
        );

    if (entries.length > 0) {
      const { error: migrationError } = await client.from('duper_user_data').upsert(
        entries.map(({ key, value }) => ({
          user_id: userId,
          key,
          value,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'user_id,key' }
      );
      if (migrationError) throw migrationError;
    }
    await AsyncStorage.removeItem(PLANNER_KEY);
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    for (const key of Object.keys(FILES)) {
      if (!entries.some((entry) => entry.key === key) && FileSystem.documentDirectory) {
        await FileSystem.deleteAsync(fileUri(FILES[key]), { idempotent: true });
      }
    }
    for (const { key, value } of entries) await cacheValue(userId, key, value);
    return;
  }

  await AsyncStorage.removeItem(PLANNER_KEY);
  for (const key of DATA_KEYS) {
    await AsyncStorage.removeItem(localKey(userId, key));
    const name = FILES[key];
    if (name && FileSystem.documentDirectory) {
      await FileSystem.deleteAsync(fileUri(name), { idempotent: true });
    }
  }
  await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  for (const { key, value } of rows) {
    if (DATA_KEYS.includes(key)) await cacheValue(userId, key, value);
  }
}

export async function getUserData(key: string): Promise<string | null> {
  if (!activeUserId) throw new Error('User data cannot be read before the account has synced.');
  return AsyncStorage.getItem(localKey(activeUserId, key));
}

export async function cacheUserData(key: string, value: string): Promise<void> {
  const userId = activeUserId;
  if (!userId) throw new Error('User data cannot be saved before the account has synced.');
  await cacheValue(userId, key, value);
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

export async function syncUserDataItem(key: string, value: string, userId = activeUserId): Promise<void> {
  if (!userId) throw new Error('User data cannot be saved before the account has synced.');
  const { error } = await requireSupabase().from('duper_user_data').upsert(
    { user_id: userId, key, value, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,key' }
  );
  if (error) throw error;
}

export async function setUserData(key: string, value: string): Promise<void> {
  const userId = activeUserId;
  if (!userId) throw new Error('User data cannot be saved before the account has synced.');
  await cacheValue(userId, key, value);
  await syncUserDataItem(key, value, userId);
}

export async function saveWidgetPlannerData(value: string): Promise<void> {
  await AsyncStorage.setItem(PLANNER_KEY, value);
  const client = requireSupabase();
  const { data, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!data.session) return;

  const userId = data.session.user.id;
  await AsyncStorage.setItem(localKey(userId, PLANNER_KEY), value);
  const { error } = await client.from('duper_user_data').upsert(
    { user_id: userId, key: PLANNER_KEY, value, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,key' }
  );
  if (error) throw error;
}

export async function removeUserData(keys: string[]): Promise<void> {
  if (!activeUserId) throw new Error('User data cannot be removed before the account has synced.');
  const userId = activeUserId;
  const { error } = await requireSupabase()
    .from('duper_user_data')
    .delete()
    .eq('user_id', userId)
    .in('key', keys);
  if (error) throw error;

  await AsyncStorage.multiRemove(keys.map((key) => localKey(userId, key)));
  if (keys.includes(PLANNER_KEY)) await AsyncStorage.removeItem(PLANNER_KEY);
  for (const key of keys) {
    const name = FILES[key];
    if (name && FileSystem.documentDirectory) {
      await FileSystem.deleteAsync(fileUri(name), { idempotent: true });
    }
  }
}

export async function clearUserSessionData(): Promise<void> {
  activeUserId = null;
  await AsyncStorage.multiRemove(DATA_KEYS);
  if (FileSystem.documentDirectory) {
    await Promise.all(
      Object.values(FILES).map((name) =>
        FileSystem.deleteAsync(fileUri(name), { idempotent: true })
      )
    );
  }
}

export const userDataKeys = {
  app: APP_DATA_KEY,
  planner: PLANNER_KEY,
  focus: FOCUS_KEY,
  water: WATER_KEY,
  notes: NOTES_KEY,
  expenses: EXPENSES_KEY
};
