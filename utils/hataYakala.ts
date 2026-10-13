// BELI PATRON - gecici tani modulu v2.1 (Sardur Technologies)
// native Alert KULLANMAZ - iOS 26'da UIAlertController cokuyor.
// Hata: AsyncStorage'a yazilir. Panoya otomatik kopyalama yapilmaz.
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANAHTAR = 'belipatron_son_js_hata';
const GU: any = globalThis as any;
const DEV: boolean = !!GU.__DEV__;

function raporla(hata: any, olumsuz: boolean): string {
  const mesaj = String((hata && hata.message) || hata || 'bilinmeyen');
  const yigin = String((hata && hata.stack) || '');
  return 'BELIPATRON-HATA(' + (olumsuz ? 'olumsuz' : 'kurtarilabilir') + ' @ ' + new Date().toISOString() + ')\nMESAJ: ' + mesaj + '\nYIGIN: ' + yigin.slice(0, 1200);
}

const ORIJINAL = typeof GU.ErrorUtils?.getGlobalHandler === 'function' ? GU.ErrorUtils.getGlobalHandler() : null;

GU.ErrorUtils?.setGlobalHandler?.((hata: any, olumsuz?: boolean) => {
  const r = raporla(hata, !!olumsuz);
  AsyncStorage.setItem(ANAHTAR, r).catch(() => {});
  if (DEV && ORIJINAL) { try { ORIJINAL(hata, olumsuz); } catch (e) {} }
});
