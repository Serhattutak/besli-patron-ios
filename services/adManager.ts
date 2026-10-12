import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-4873666267587702/1435662670';

let adsInitialization: Promise<unknown> | null = null;

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

export function gecisReklamGoster(): boolean {
  // Interstitial ads intentionally remain disabled until a suitable
  // in-game placement is explicitly implemented and tested.
  return false;
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
