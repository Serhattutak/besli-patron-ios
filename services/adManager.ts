// ============================================
// BEŞLİ PATRON — adManager.ts (REKLAM SİSTEMİ)
// Kural: her 2 oyun gününün sonunda 1 geçiş reklamı.
// Sayaç cihazda saklanır; reklam gösterilemezse sayaç korunur.
// YAYINA ÇIKARKEN: AdMob'dan gerçek ID'leri alıp aşağıdaki
// iki boş satıra yazman yeterli — kodun geri kalanı aynı kalır.
// ============================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mobileAds,
  TestIds,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

// === AYARLAR ===
const REKLAM_ARALIGI = 2;        // kaç oyun gününde bir geçiş reklamı
const REKLAM_GECIKME_MS = 4000;  // gün sonu özeti göründükten sonra reklama kadar bekleme
const SAYAC_KEY = 'besli_patron_reklam_sayac';

// AdMob hesabın açılınca doldur ('ca-app-pub-xxxx/yyyy' biçiminde):
const GERCEK_GECIS_ID = '';
const GERCEK_ODULLU_ID = '';

const GECIS_REKLAM_ID = GERCEK_GECIS_ID ? GERCEK_GECIS_ID : TestIds.INTERSTITIAL;
const ODULLU_REKLAM_ID = GERCEK_ODULLU_ID ? GERCEK_ODULLU_ID : TestIds.REWARDED;

let gecisReklam: InterstitialAd | null = null;
let gecisYuklu = false;

// Uygulama açılışında bir kez çağrılır (_layout.tsx)
export async function reklamlariBaslat(): Promise<void> {
  try { await mobileAds().initialize(); } catch {}
  gecisYukle();
}

function gecisYukle(): void {
  gecisReklam = InterstitialAd.createForAdRequest(GECIS_REKLAM_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  gecisReklam.addAdEventListener(AdEventType.LOADED, () => { gecisYuklu = true; });
  gecisReklam.addAdEventListener(AdEventType.CLOSED, () => {
    gecisYuklu = false;
    setTimeout(gecisYukle, 1000); // sıradaki reklamı önden yükle
  });
  gecisReklam.addAdEventListener(AdEventType.ERROR, () => {
    gecisYuklu = false;
    setTimeout(gecisYukle, 20000); // internet yoksa sonra tekrar dene
  });
}

// Reklam yüklüyse gösterir ve true döner; yüklü değilse false döner
export function gecisReklamGoster(): boolean {
  if (!gecisReklam || !gecisYuklu) return false;
  try {
    gecisReklam.show();
    gecisYuklu = false;
    return true;
  } catch {
    return false;
  }
}

// Gün sonu çağrılır (GameContext endDay). Özet okunsun diye gecikmeli çalışır.
export async function gunSonuReklamKontrol(): Promise<void> {
  await new Promise(r => setTimeout(r, REKLAM_GECIKME_MS));
  try {
    let sayac = Number((await AsyncStorage.getItem(SAYAC_KEY)) ?? '0');
    if (!Number.isFinite(sayac) || sayac < 0) sayac = 0;
    sayac += 1;

    if (sayac >= REKLAM_ARALIGI) {
      if (gecisReklamGoster()) {
        sayac = 0; // reklam GERÇEKTEN gösterildiyse sıfırla
        setTimeout(gecisYukle, 1000);
      }
      // gösterilemediyse sayaç aynı kalır → bir sonraki gün tekrar dener
    }
    await AsyncStorage.setItem(SAYAC_KEY, String(sayac));
  } catch {}
}

// ÖDÜLLÜ REKLAM: tamamen izlerse true döner (ödül ver), kapatırsa false
export function odulluReklamIzle(): Promise<boolean> {
  return new Promise(resolve => {
    let bitti = false;
    let odulVerildi = false;
    const bitir = (sonuc: boolean) => {
      if (bitti) return;
      bitti = true;
      clearTimeout(guvenlik);
      resolve(sonuc);
    };
    const guvenlik = setTimeout(() => bitir(false), 30000); // 30 sn'de sonuç yoksa vazgeç

    const reklam = RewardedAd.createForAdRequest(ODULLU_REKLAM_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    reklam.addAdEventListener(RewardedAdEventType.LOADED, () => {
      reklam.show().catch(() => bitir(false));
    });
    reklam.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { odulVerildi = true; });
    reklam.addAdEventListener(AdEventType.CLOSED, () => bitir(odulVerildi));
    reklam.addAdEventListener(AdEventType.ERROR, () => bitir(false));
    reklam.load().catch(() => bitir(false));
  });
}
