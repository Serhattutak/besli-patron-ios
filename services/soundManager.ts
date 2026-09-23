// ============================================
// BEŞLİ PATRON — soundManager.ts (SES SİSTEMİ)
// Kullanım: sfx('tik') | sfx('para') | sfx('alkis')
// sesBaslat() uygulama açılışında 1 kez çağrılır (_layout.tsx).
// ============================================
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

type EfektAdi = 'tik' | 'para' | 'alkis';

const SES_ANAHTARI = 'besli_patron_sessiz';

const TIK = require('../assets/sounds/freesound_community-ui-click-43196.mp3');
const PARA = require('../assets/sounds/freesound_community-coin-spill-105867.mp3');
const ALKIS = require('../assets/sounds/gregorquendel-free-crowd-cheering-sounds-04-strong-cheering-ii-short-116191.mp3');
const MUZIK = require('../assets/sounds/attic13-ukulele-chords-c-minor-120-bpm-152521.mp3');

let muzik: Audio.Sound | null = null;
const efektler: Record<EfektAdi, Audio.Sound | null> = { tik: null, para: null, alkis: null };
let sessiz = false;
let basladi = false;

async function guvenliYukle(kaynak: number, ses: number, dongu = false): Promise<Audio.Sound | null> {
  try {
    const { sound } = await Audio.Sound.createAsync(kaynak, { volume: ses, isLooping: dongu });
    return sound;
  } catch {
    return null;
  }
}

// Uygulama açılışında bir kez çağrılır
export async function sesBaslat(): Promise<void> {
  if (basladi) return;
  basladi = true;

  // Sessiz mod tercihi kayıttan okunur
  try { sessiz = (await AsyncStorage.getItem(SES_ANAHTARI)) === 'evet'; } catch {}

  // Cihaz ses modu (başarısız olsa bile sesler çalışmaya devam eder)
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {}

  efektler.tik = await guvenliYukle(TIK, 0.5);
  efektler.para = await guvenliYukle(PARA, 0.8);
  efektler.alkis = await guvenliYukle(ALKIS, 0.9);

  if (!sessiz) await muzikBaslat();
}

// Kısa efekt çal — oyunu bekletmez
export function sfx(adi: EfektAdi): void {
  if (sessiz) return;
  const s = efektler[adi];
  if (!s) return;
  s.replayAsync().catch(() => {});
}

export async function muzikBaslat(): Promise<void> {
  try {
    if (!muzik) muzik = await guvenliYukle(MUZIK, 0.3, true);
    if (muzik && !(await muzik.isPlayingAsync())) await muzik.playAsync();
  } catch {}
}

export async function muzikDurdur(): Promise<void> {
  try { if (muzik) await muzik.pauseAsync(); } catch {}
}

// true dönerse artık SESSİZ, false dönerse ses açık
export async function sesAcKapa(): Promise<boolean> {
  sessiz = !sessiz;
  try { await AsyncStorage.setItem(SES_ANAHTARI, sessiz ? 'evet' : 'hayir'); } catch {}
  if (sessiz) await muzikDurdur();
  else await muzikBaslat();
  return sessiz;
}

export function sesSessizMi(): boolean {
  return sessiz;
}
