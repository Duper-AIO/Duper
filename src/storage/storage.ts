import { AppData } from '../data/defaultData';
import { getUserData, setUserData, userDataKeys } from './userData';

export async function loadAppData(): Promise<AppData | null> {
  const json = await getUserData(userDataKeys.app);
  return json ? JSON.parse(json) as AppData : null;
}

export async function saveAppData(data: AppData): Promise<void> {
  await setUserData(userDataKeys.app, JSON.stringify(data));
}
