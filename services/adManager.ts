import mobileAds, {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-4873666267587702/0000000000';

const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-4873666267587702/1435662670';

let adsInitialization: Promise<unknown> | null = null;
const GECIS_REKLAM_ARALIGI_MS = 4 * 60 * 1000;
let sonGecisReklamiZamani = Date.now();
let gecisReklamiDevamEdiyor = false;

/**
 * Initialize Google Mobile Ads once before requesting any ad.
 * Keep this explicit: having the SDK installed alone does not start it.
 */
export async function reklamlariBaslat(): Promise<void> {
  if (!adsInitialization) {
    adsInitialization = mobileAds().initialize().catch((error) => {
      adsInitialization = null;
      console.log('Google Mobile Ads baslatilamadi:', error);
      throw error;
    });
  }

  await adsInitialization;
}

/**
 * Interstitial is considered only at the natural day-end transition.
 * A four-minute minimum interval is enforced; if the ad fails to load,
 * gameplay continues without blocking the player.
 */
export async function gecisReklamGoster(): Promise<boolean> {
  if (gecisReklamiDevamEdiyor || Date.now() - sonGecisReklamiZamani < GECIS_REKLAM_ARALIGI_MS) {
    return false;
  }

  gecisReklamiDevamEdiyor = true;
  try {
    await reklamlariBaslat();
    return await new Promise<boolean>((resolve) => {
      const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
      let tamamlandi = false;
      let unsubscribeLoaded = () => {};
      let unsubscribeClosed = () => {};
      let unsubscribeError = () => {};
      let watchdog: ReturnType<typeof setTimeout> | undefined;

      const bitir = (gosterildi: boolean) => {
        if (tamamlandi) return;
        tamamlandi = true;
        if (watchdog) clearTimeout(watchdog);
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
        gecisReklamiDevamEdiyor = false;
        if (gosterildi) sonGecisReklamiZamani = Date.now();
        resolve(gosterildi);
      };

      watchdog = setTimeout(() => bitir(false), 20000);
      unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        ad.show().catch((error) => {
          console.log('Gecis reklami gosterilemedi:', error);
          bitir(false);
        });
      });
      unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => bitir(true));
      unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Gecis reklami hatasi:', error);
        bitir(false);
      });

      try {
        ad.load();
      } catch (error) {
        console.log('Gecis reklami yuklenemedi:', error);
        bitir(false);
      }
    });
  } catch (error) {
    console.log('Gecis reklami sistemi hazir degil:', error);
    gecisReklamiDevamEdiyor = false;
    return false;
  }
}

export async function gunSonuReklamKontrol(): Promise<void> {
  // No automatic end-of-session ad is shown.
}

export async function odulluReklamIzle(): Promise<boolean> {
  try {
    await reklamlariBaslat();

    return await new Promise<boolean>((resolve) => {
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
      let odulVerildi = false;
      let tamamlandi = false;

      let unsubscribeLoaded = () => {};
      let unsubscribeReward = () => {};
      let unsubscribeClosed = () => {};
      let unsubscribeError = () => {};
      // Prevent the reward button from spinning forever if the SDK never
      // emits LOADED/ERROR (for example, no fill or a network timeout).
      let watchdog: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
        console.log('Rewarded reklam zaman asimina ugradi (45 sn).');
        bitir(false);
      }, 45000);

      const temizle = () => {
        unsubscribeLoaded();
        unsubscribeReward();
        unsubscribeClosed();
        unsubscribeError();
      };

      const bitir = (sonuc: boolean) => {
        if (tamamlandi) return;
        tamamlandi = true;
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = undefined;
        }
        temizle();
        resolve(sonuc);
      };

      unsubscribeLoaded = ad.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          ad.show().catch((error) => {
            console.log('Rewarded reklam gosterilemedi:', error);
            bitir(false);
          });
        }
      );

      unsubscribeReward = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          odulVerildi = true;
        }
      );

      unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        bitir(odulVerildi);
      });

      unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('Rewarded reklam hatasi:', error);
        bitir(false);
      });

      try {
        ad.load();
      } catch (error) {
        console.log('Rewarded reklam yuklenemedi:', error);
        bitir(false);
      }
    });
  } catch (error) {
    console.log('Reklam sistemi hazir degil:', error);
    return false;
  }
}
