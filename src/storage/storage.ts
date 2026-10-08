import { AppData } from '../data/defaultData';
import { deleteUserMedia, prepareProfileMedia } from './media';
import { getUserData, setUserData, userDataKeys } from './userData';

export async function loadAppData(): Promise<AppData | null> {
  const json = await getUserData(userDataKeys.app);
  if (!json) return null;

  const data = JSON.parse(json) as AppData;
  const profile = await prepareProfileMedia(data.profile);
  if (!profile.avatarStoragePath) return data;
  const displayData = { ...data, profile };
  await storeAppData(displayData);
  return displayData;
}

async function storeAppData(data: AppData): Promise<void> {
  const storedData = {
    ...data,
    profile: {
      ...data.profile,
      avatarUri: data.profile.avatarStoragePath ? '' : data.profile.avatarUri
    }
  };
  await setUserData(userDataKeys.app, JSON.stringify(storedData));
}

export async function saveAppData(data: AppData): Promise<AppData> {
  const previousAvatarPath = data.profile.avatarStoragePath;
  const profile = await prepareProfileMedia(data.profile);
  const displayData = { ...data, profile };
  await storeAppData(displayData);
  if (previousAvatarPath && profile.avatarStoragePath !== previousAvatarPath) {
    await deleteUserMedia([previousAvatarPath]).catch((error) => {
      console.error('Could not remove previous profile picture:', error);
    });
  }
  return displayData;
}
