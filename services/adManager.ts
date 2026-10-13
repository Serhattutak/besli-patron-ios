import mobileAds, {
  AdsConsent,
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-4873666267587702/9741126127';

const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-4873666267587702/1435662670';

let adsInitialization: Promise<boolean> | null = null;
let adsSdkInitialized = false;
const GECIS_REKLAM_ARALIGI_MS = 4 * 60 * 1000;
let sonGecisReklamiZamani = Date.now();
let gecisReklamiDevamEdiyor = false;

/**
 * Refresh UMP consent on launch and initialize Mobile Ads only when
 * the current consent state permits ad requests. The result is shared
 * so concurrent ad actions cannot race the consent flow.
 */
export async function reklamlariBaslat(): Promise<boolean> {
  if (!adsInitialization) {
    adsInitialization = (async (): Promise<boolean> => {
      try {
        const consentInfo = await AdsConsent.gatherConsent();
        if (!consentInfo.canRequestAds) {
          console.log('Reklam isteği yapılmadı: UMP izin vermiyor.');
          return false;
        }
        if (!adsSdkInitialized) {
          await mobileAds().initialize();
          adsSdkInitialized = true;
        }
        return true;
      } catch (error) {
        console.log('Reklam rızası kontrolü başarısız:', error);
        // UMP may still have a valid decision from the previous session.
        try {
          const consentInfo = await AdsConsent.getConsentInfo();
          if (!consentInfo.canRequestAds) return false;
          if (!adsSdkInitialized) {
            await mobileAds().initialize();
            adsSdkInitialized = true;
          }
          return true;
        } catch (fallbackError) {
          console.log('Reklam rızası doğrulanamadı:', fallbackError);
          return false;
        }
      }
    })();
    adsInitialization = adsInitialization.catch((error) => {
      adsInitialization = null;
      console.log('Google Mobile Ads başlatılamadı:', error);
      return false;
    });
  }

  return adsInitialization;
}

/**
 * Interstitial is considered only at the natural day-end transition.
 * A four-minute minimum interval is enforced; if the ad fails to load,
 * gameplay continues without blocking the player.
 */
export async function gecisReklamGoster(): Promise<boolean> {
  if (!INTERSTITIAL_AD_UNIT_ID || gecisReklamiDevamEdiyor || Date.now() - sonGecisReklamiZamani < GECIS_REKLAM_ARALIGI_MS) {
    return false;
  }

  gecisReklamiDevamEdiyor = true;
  try {
    if (!(await reklamlariBaslat())) {
      gecisReklamiDevamEdiyor = false;
      return false;
    }
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

/** Open the UMP privacy choices form from an explicit user action. */
export async function gizlilikTercihleriniAc(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    if (info.privacyOptionsRequirementStatus !== 'REQUIRED') {
      // Refresh the consent state even when no separate privacy form is required.
      adsInitialization = null;
      return await reklamlariBaslat();
    }
    await AdsConsent.showPrivacyOptionsForm();
    // Re-evaluate ad eligibility after the user changes their choices.
    adsInitialization = null;
    return await reklamlariBaslat();
  } catch (error) {
    console.log('Gizlilik tercihleri açılamadı:', error);
    return false;
  }
}

export async function gunSonuReklamKontrol(): Promise<void> {
  // No automatic end-of-session ad is shown.
}

export async function odulluReklamIzle(): Promise<boolean> {
  try {
    if (!(await reklamlariBaslat())) return false;

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
