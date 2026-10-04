export interface Reservation {
  id: string;
  musteriAdi: string;
  musteriTipi:
    | 'mahalle'
    | 'ogrenci'
    | 'ofis'
    | 'amator'
    | 'dogumGunu'
    | 'yas50plus'
    | 'kurumsal';
  kisiSayisi: number;
  saatAraligi: string;
  slotId: string;
  fiyat: number;
  durum: 'bekliyor' | 'kabul' | 'red';
  sadik?: boolean;
  sahaId?: string;
}

export interface DailyTask {
  id: string;
  aciklama: string;
  hedefTip:
    | 'rezervasyon'
    | 'bakim'
    | 'gelir'
    | 'ogrenciKabul'
    | 'aksamSlot';
  hedef: number;
  ilerleme: number;
  tamamlandi: boolean;
  odul: number;
}

export interface Upgrades {
  // Mevcut yükseltmeler
  bakim?: number;
  haliYenileme?: number;
  aydinlatma?: number;
  dusSoyunma?: number;
  kantin?: number;
  sponsor?: number;

  // Yeni saha yükseltmeleri
  telOrgu?: number;
  tribun?: number;
  otopark?: number;
  kamera?: number;
  isitma?: number;
  skorboard?: number;
  reklam?: number;
  vipLoca?: number;

  // Ek saha geliştirmeleri
  kale?: number;
  topSeti?: number;
  yedekKulubesi?: number;
  sesSistemi?: number;
  wifi?: number;
  turnike?: number;
  ilkYardim?: number;
  soyunmaDolabi?: number;
}

export interface LifeItem {
  id: string;
  owned: boolean;
  level: number;
}

export interface CityData {
  id: string;
  unlocked: boolean;
  sahaKalitesi: number;
  sahaKapasitesi: number;
  upgrades: Upgrades;
  toplamKazanc: number;
}

export interface StaffMember {
  id: string;
  hired: boolean;
  level: number;
}

export interface TurnuvaResult {
  gun: number;
  isim: string;
  sonuc: 'birincilik' | 'ikincilik' | 'ucunculuk' | 'katilim';
  kazanc: number;
  prestijKazanc: number;
}

export type HavaTipi =
  | 'gunesli'
  | 'yagmurlu'
  | 'ruzgarli'
  | 'karli';

// === ÇOKLU SAHA SİSTEMİ ===
// 0 = arsa yok
// 1 = arsa alındı
// 2-4 = inşaat aşamaları
// 5 = saha açık
export type SahaAsama = 0 | 1 | 2 | 3 | 4 | 5;

export type SahaTipi =
  | 'yildiz'
  | 'akademi'
  | 'vip'
  | 'arena'
  | 'cocuk';

export interface PitchState {
  id: string;
  ad?: string;
  sahaTipi?: SahaTipi;

  arsaAlindi: boolean;
  asama: SahaAsama;

  kalite: number;
  kapasite?: number;

  // Her sahanın kendi yükseltmeleri
  upgrades?: Upgrades;

  bakimYapildi: boolean;
  rezervasyonlar: Reservation[];
  kabulEdilenler: Reservation[];
  toplamKazanc: number;

  // Saha ekonomisi
  aktif?: boolean;
  satinAlmaBedeli?: number;
  insaatMaliyeti?: number;
  gunlukGider?: number;
}

// Çoklu saha satın alma seçeneklerinin temel bilgisi
export interface PitchDefinition {
  id: string;
  ad: string;
  sahaTipi: SahaTipi;
  arsaBedeli: number;
  insaatBedeli: number;
  baslangicKalitesi: number;
  kapasite: number;
  gunlukGider: number;
  aciklama: string;
}

export interface GameState {
  isGameStarted: boolean;

  nakit: number;
  enerji: number;
  gun: number;

  sahaAdi: string;
  sehir: string;
  sahaKalitesi: number;
  sahaKapasitesi: number;

  jeton: number;
  toplamKazanc: number;
  prestij: number;

  // Eski ana saha sistemi.
  // Yeni sistem tamamen devreye alınana kadar korunuyor.
  upgrades: Upgrades;

  bugunRezervasyonlar: Reservation[];
  kabulEdilenler: Reservation[];
  gunlukGorevler: DailyTask[];

  bugunGelir: number;
  bugunGider: number;

  consecutiveNegativeDays: number;
  bakimYapildi: boolean;
  isGameOver: boolean;

  lifeItems: Record<string, LifeItem>;

  kizArkadas: boolean;
  kizArkdasSeviye: number;

  cities: Record<string, CityData>;
  activeSehir: string;

  staff: Record<string, StaffMember>;

  memnuniyet: number;
  sadikMusteriler: number;

  turnuvaSonuclari: TurnuvaResult[];
  sonTurnuvaGun: number;

  // Hava ve olay sistemi
  bugunHava: HavaTipi;
  bugunOlayId: string | null;
  olayCozuldu: boolean;
  olayGecmisi: string[];
  olayGelirCarpani: number;

  // Sezon sistemi
  sezonGun: number;
  sezonGelir: number;

  // Yer sahipliği
  yerSahibi: boolean;

  // Eski çoklu saha alanı.
  // Eski kayıtlarla uyumluluk için korunuyor.
  yildizSaha: PitchState;

  // Yeni çoklu saha sistemi.
  // Her saha kendi rezervasyonuna, gelirine ve yükseltmesine sahip olur.
  pitches?: Record<string, PitchState>;

  // O an işletme ekranında seçili olan saha
  activePitchId?: string;
}
