import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-4873666267587702/1435662670';

export async function reklamlariBaslat(): Promise<void> {
  return;
}

export function gecisReklamGoster(): boolean {
  return false;
}

export async function gunSonuReklamKontrol(): Promise<void> {
  return;
}

export function odulluReklamIzle(): Promise<boolean> {
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);

    let odulVerildi = false;
    let tamamlandi = false;

    const temizle = () => {
      unsubscribeLoaded();
      unsubscribeReward();
      unsubscribeClosed();
      unsubscribeError();
    };

    const bitir = (sonuc: boolean) => {
      if (tamamlandi) return;

      tamamlandi = true;
      temizle();
      resolve(sonuc);
    };

    const unsubscribeLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        ad.show();
      }
    );

    const unsubscribeReward = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        odulVerildi = true;
      }
    );

    const unsubscribeClosed = ad.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        bitir(odulVerildi);
      }
    );

    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.log('Rewarded reklam hatasi:', error);
        bitir(false);
      }
    );

    try {
      ad.load();
    } catch (error) {
      console.log('Rewarded reklam yuklenemedi:', error);
      bitir(false);
    }
  });
}
