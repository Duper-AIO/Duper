import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { requireSupabase } from '../lib/supabase';

const MEDIA_BUCKET = 'duper-media';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0));
  let byteIndex = 0;
  let buffer = 0;
  let bits = 0;

  for (const character of base64) {
    if (character === '=') break;
    const value = alphabet.indexOf(character);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[byteIndex++] = (buffer >> bits) & 0xff;
    }
  }

  return bytes.buffer;
}

function fileExtension(uri: string, fallback: string): string {
  const name = uri.split(/[?#]/, 1)[0].split('/').pop() || '';
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  return extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : fallback;
}

function contentType(extension: string, mediaType: 'image' | 'audio'): string {
  const known: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    caf: 'audio/x-caf',
    '3gp': 'audio/3gpp'
  };
  return known[extension] || `${mediaType}/${extension}`;
}

export async function uploadUserMedia(
  uri: string,
  mediaType: 'image' | 'audio',
  objectName: string
): Promise<string> {
  const { data, error: sessionError } = await requireSupabase().auth.getSession();
  if (sessionError) throw sessionError;
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in before uploading media.');

  const extension = fileExtension(uri, mediaType === 'image' ? 'jpg' : 'm4a');
  const path = `${userId}/${mediaType === 'image' ? 'profile' : 'voice-notes'}/${objectName}.${extension}`;
  const bytes = Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:')
    ? await fetch(uri).then(async (response) => {
        if (!response.ok) throw new Error(`Could not read media file (${response.status}).`);
        return response.arrayBuffer();
      })
    : base64ToArrayBuffer(
        await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
      );
  const { error } = await requireSupabase()
    .storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: contentType(extension, mediaType),
      upsert: true
    });

  if (error) throw error;
  return path;
}

export async function getUserMediaUrl(path: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteUserMedia(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { data, error: sessionError } = await requireSupabase().auth.getSession();
  if (sessionError) throw sessionError;
  const userId = data.session?.user.id;
  if (!userId || paths.some((path) => !path.startsWith(`${userId}/`))) {
    throw new Error('Refusing to delete media outside the signed-in user account.');
  }
  const { error } = await requireSupabase().storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw error;
}

export function isLocalMediaUri(uri: string | undefined): uri is string {
  return Boolean(uri && (
    uri.startsWith('file://')
    || uri.startsWith('content://')
    || uri.startsWith('blob:')
    || uri.startsWith('data:')
  ));
}

export type VoiceMediaItem = {
  id: string;
  uri: string;
  storagePath?: string;
};

export async function prepareVoiceMedia<T extends VoiceMediaItem>(
  notes: T[]
): Promise<{ displayNotes: T[]; storedNotes: T[] }> {
  const displayNotes = await Promise.all(notes.map(async (note) => {
    let storagePath = note.storagePath;
    if (!storagePath && isLocalMediaUri(note.uri)) {
      storagePath = await uploadUserMedia(note.uri, 'audio', note.id);
    }
    if (!storagePath) return note;
    return { ...note, storagePath, uri: await getUserMediaUrl(storagePath) };
  }));

  const storedNotes = displayNotes.map((note) => (
    note.storagePath ? { ...note, uri: '' } : note
  ));
  return { displayNotes, storedNotes };
}

export async function prepareProfileMedia<T extends { avatarUri?: string; avatarStoragePath?: string }>(
  profile: T
): Promise<T> {
  let storagePath = profile.avatarStoragePath;
  if (!storagePath && isLocalMediaUri(profile.avatarUri)) {
    storagePath = await uploadUserMedia(profile.avatarUri, 'image', 'avatar');
  }
  if (!storagePath) return profile;
  return {
    ...profile,
    avatarStoragePath: storagePath,
    avatarUri: await getUserMediaUrl(storagePath)
  };
}
