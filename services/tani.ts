// ============================================
// BEŞLİ PATRON — services/tani.ts (TANIK SİSTEMİ)
// Sardur Technologies: Donma tanısı — hata kapanı + işlem günlüğü.
// Import edildiği anda kendini kurar.
// ============================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const HATA_ANAHTARI = 'besli_patron_son_hata';
const GUNLUK_ANAHTARI = 'besli_patron_islem_gunlugu';
const ESKI_HATA = 'besli_patron_son_hata_eski';

const gunluk: string[] = [];
let yazilacak = false;
let sayac = 0;
let baslangicYuklendi = false;

// ONCEKI OTURUM KURTARMA (Sardur Technologies):
// Uygulama tekrar acilinca diskteki gunluk bellege yuklenir; boylece
// yeni oturumun ilk yazisi donma anindaki kayitlari SILMEZ.
(async () => {
  try {
    const eski = await AsyncStorage.getItem(GUNLUK_ANAHTARI);
    if (eski) {
      for (const s of eski.split('\n')) gunluk.push(s);
      while (gunluk.length > 60) gunluk.shift();
    }
  } catch {}
  baslangicYuklendi = true;
})();

function damga(): string {
  const z = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(z.getHours())}:${p(z.getMinutes())}:${p(z.getSeconds())}`;
}

// Onemli islemlerden / state degisimlerinden sonra cagrilir
export function islemKaydet(aciklama: string): void {
  sayac += 1;
  gunluk.push(`#${sayac} ${damga()} ${aciklama}`);
  if (gunluk.length > 60) gunluk.shift();
  if (!yazilacak && baslangicYuklendi) {
    yazilacak = true;
    setTimeout(() => {
      yazilacak = false;
      AsyncStorage.setItem(GUNLUK_ANAHTARI, gunluk.join('\n')).catch(() => {});
    }, 2000);
  }
}

// Yakalanan hatayi diske yaz (uygulama olsa bile kayit kalir)
export async function sonHataKaydet(kaynak: string, hata: unknown): Promise<void> {
  try {
    const mesaj = hata instanceof Error
      ? `${hata.name}: ${hata.message}\n${hata.stack ?? ''}`
      : String(hata);
    const onceki = await AsyncStorage.getItem(HATA_ANAHTARI);
    if (onceki) await AsyncStorage.setItem(ESKI_HATA, onceki);
    await AsyncStorage.setItem(
      HATA_ANAHTARI,
      `KAYNAK: ${kaynak}\nZAMAN: ${new Date().toISOString()}\nSON ISLEMLER: ${gunluk.slice(-8).join(' | ')}\n\n${mesaj.slice(0, 4000)}`,
    );
  } catch {}
}

// Gelistirici paneli icin okuma
export async function taniOku(): Promise<string> {
  try {
    const hata = (await AsyncStorage.getItem(HATA_ANAHTARI)) ?? '(hata kaydi yok)';
    const eski = await AsyncStorage.getItem(ESKI_HATA);
    const islemler = (await AsyncStorage.getItem(GUNLUK_ANAHTARI)) ?? '(islem gunlugu yok)';
    return `===== SON HATA =====\n${hata}${eski ? `\n\n===== ONCEKI HATA =====\n${eski}` : ''}\n\n===== SON ISLEMLER =====\n${islemler}`;
  } catch {
    return 'Tani kayitlari okunamadi';
  }
}

function taniKur(): void {
  // 1) Senkron hatalar (release'de JS'i olduren tur)
  try {
    const g = globalThis as any;
    const eskiHandler = g.ErrorUtils?.getGlobalHandler?.();
    g.ErrorUtils?.setGlobalHandler?.((hata: any, fatal: any) => {
      sonHataKaydet(fatal ? 'ErrorUtils(fatal)' : 'ErrorUtils', hata);
      try { eskiHandler?.(hata, fatal); } catch {}
    });
  } catch {}
  // 2) Yakalanmayan promise reddleri
  try {
    // @ts-ignore - Metro runtime require
const rejTakip: any = require('promise/setimmediate/rejection-tracking');
    rejTakip.enable({
      onUnhandled: (_id: string, hata: unknown) => { sonHataKaydet('UnhandledRejection', hata); },
    });
  } catch {}
}

taniKur();