import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState } from '../types/game';

const SAVE_KEY = 'beslipatron_save';

/*
 * Kayıt kuyruğu:
 * Aynı anda başlayan eski/yeni kayıtların birbirinin üzerine yazmasını önler.
 * Sardur Technologies - Beşli Patron
 */
let saveQueue: Promise<void> = Promise.resolve();

export function saveGame(state: GameState): Promise<void> {
  const serialized = JSON.stringify(state);

  saveQueue = saveQueue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(SAVE_KEY, serialized))
    .catch((e) => {
      console.error('Save failed:', e);
    });

  return saveQueue;
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

export async function hasSavedGame(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    return raw !== null;
  } catch {
    return false;
  }
}

export async function deleteSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.error('Delete failed:', e);
  }
}
