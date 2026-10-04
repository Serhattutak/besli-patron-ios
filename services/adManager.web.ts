// ============================================
// BESLI PATRON — adManager.web.ts (WEB STUB)
// react-native-google-mobile-ads yalnizca native platformlarda calisir.
// Web bundle'inda native-only modul import hatasini onlemek icin
// web platformunda bu bos (no-op) surum kullanilir.
// Native surum: services/adManager.ts
// ============================================

export async function reklamlariBaslat(): Promise<void> {}

export function gecisReklamGoster(): boolean {
  return false;
}

export async function gunSonuReklamKontrol(): Promise<void> {}

export function odulluReklamIzle(): Promise<boolean> {
  return Promise.resolve(false);
}