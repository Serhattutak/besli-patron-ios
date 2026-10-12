// ============================================
// BEŞLİ PATRON — gameLogic.ts (TAM SÜRÜM + ÇOKLU SAHA + SEVİYELİ PERSONEL + OLAY ETKİLERİ)
// ============================================
import type { Reservation, DailyTask, GameState, LifeItem, CityData, StaffMember, TurnuvaResult, PitchState, SahaAsama, Upgrades } from '../types/game';
import {
  MUSTERI_TIPLERI, TIME_SLOTS, GOREV_HAVUZU,
  ENERJI_REZERVASYON, ENERJI_GUN_SONU, MAX_ENERJI,
  IFLAS_GUN_LIMIT, INITIAL_NAKIT,
  INITIAL_ENERJI, INITIAL_SAHA_KALITESI, INITIAL_GUN,
  LIFE_ITEMS, CITIES, STAFF_CONFIG, TURNUVA_CONFIG, MEMNUNIYET_CONFIG,
  KANTIN_CONFIG, OLAY_HAVUZU,
  type MusteriTipi,
} from '../constants/gameConfig';
import { YILDIZ_SAHA, ISLETME_YERI, PITCH_DEFS, PITCH_UPGRADE_CONFIG, insaatAsamalari, type YildizAsama, type PitchUpgradeDef } from '../constants/pitchConfig';

// NaN koruması: undefined/NaN/null gelen sayıları güvenli hale getirir
function safeNum(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// === SABAH ENERJİSİ ===
// Her sabah enerji bu değere yenilenir (100 değil).
// Günü yüksek enerjiyle bitirirsen enerjin korunur; altındaysa buraya tamamlanır.
// Jetonla (20 jeton = +30 enerji) 100'e kadar takviye yapılabilir.
const SABAH_ENERJISI = 70;

// === TALEP EĞRİSİ ===
// Gerçek hayatta en yoğun halı saha saati 22:00-23:00'tür (zirve = 1.6).
// Aynı eğriten fiyat primi çıkar: zirve saatte kira ~%35 daha pahalı.
const SLOT_TALEP: Record<string, number> = {
  sabah1: 0.4, sabah2: 0.5,
  oglen1: 0.6, oglen2: 0.7,
  ikindi1: 0.7, ikindi2: 0.8, ikindi3: 0.8,
  aksam1: 0.9, aksam2: 1.0, aksam3: 1.1,
  gece1: 1.2, gece2: 1.4, gece3: 1.6, gece4: 1.3,
  gece5: 1.0, gece6: 0.7, gece7: 0.5,
};

// Aydınlatma kademesi kaç saat gece maçı açabileceğini belirler
// Kademe 0: gece yok | 1: 23:00'a kadar | 2: 01:00'a kadar | 3: 02:00-03:00 son maça kadar
function acikGeceSlotlari(aydinlatmaSeviye: number): string[] {
  if (aydinlatmaSeviye >= 3) return ['gece1', 'gece2', 'gece3', 'gece4', 'gece5', 'gece6', 'gece7'];
  if (aydinlatmaSeviye === 2) return ['gece1', 'gece2', 'gece3', 'gece4', 'gece5'];
  if (aydinlatmaSeviye === 1) return ['gece1', 'gece2', 'gece3'];
  return [];
}

// Talep ağırlıklı slot seçimi: yoğun saatler teklifte daha sık görünür
function talepliSec(adaylar: string[]): string | null {
  if (adaylar.length === 0) return null;
  const agirliklar = adaylar.map(id => SLOT_TALEP[id] ?? 1);
  const toplam = agirliklar.reduce((a, b) => a + b, 0);
  let rulman = Math.random() * toplam;
  for (let i = 0; i < adaylar.length; i++) {
    rulman -= agirliklar[i]!;
    if (rulman <= 0) return adaylar[i]!;
  }
  return adaylar[adaylar.length - 1]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffleAndPick<T>(arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

// ============================================
// === PERSONEL SEVİYE ETKİLERİ ===
// ============================================
// Personel etkisi seviyeye göre ölçeklenir.
// Dizinin 0. elemanı "personel yok" demek; 1-3. elemanlar L1-L3 değerleri.

// Kasiyer: rezervasyon başına enerji indirimi → L1: -2 | L2: -3 | L3: -4
export const KASIYER_ENERJI_INDIRIMI = [0, 2, 3, 4];

// Temizlikçi: gün sonu memnuniyet bonusu → L1: +5 | L2: +8 | L3: +12
export const TEMIZLIKCI_MEMNUNIYET_BONUSU = [0, 5, 8, 12];

// Antrenör: turnuva performans bonusu → L1: +5 | L2: +10 | L3: +15
export const ANTRENOR_TURNUVA_BONUSU = [0, 5, 10, 15];

// Güvenlik: gün içi ekstra teklif (müşteri kalabalığı) → L1: +1 | L2: +2 | L3: +3
export const GUVENLIK_TEKLIF_BONUSU = [0, 1, 2, 3];

// Seviyeyi 0-3 aralığına sıkıştırır (NaN/undefined/büyük değerlere dayanıklı)
function seviyeIndeksi(level: number): number {
  return Math.max(0, Math.min(3, safeNum(level, 0)));
}

// Rezervasyonun enerji maliyeti: grup büyüdükçe artar, kasiyer seviyesine göre indirim uygular,
// turnike sistemi ek indirim verir (yeni parametre opsiyonel — eski çağrılar bozulmaz)
export function rezervasyonEnerjiMaliyeti(kisiSayisi: number, kasiyerLevel: number, turnikeSeviye: number = 0): number {
  const BASE = safeNum(ENERJI_REZERVASYON, 5); // config bozuksa 5'e düşer, NaN olmaz
  const kisi = safeNum(kisiSayisi, 0);
  const grupEki = Math.floor(kisi / 7);
  const kasiyerIndirimi = KASIYER_ENERJI_INDIRIMI[seviyeIndeksi(kasiyerLevel)] ?? 0;
  const turnikeIndirimi = safeNum(turnikeSeviye, 0);
  // Tek rezervasyon asla 10 enerjiden fazla yakamaz
  return Math.min(10, Math.max(1, BASE + grupEki - kasiyerIndirimi - turnikeIndirimi));
}

// === ANA SAHA TEKLİFLERİ (1 saatlik slotlar, 17 saatlik program, günde 10'a kadar teklif) ===
// teklifEki: günün olayının teklif sayısına etkisi (viral video +2, olumsuz olay -2 vb.)
export function generateReservations(sahaKalitesi: number, upgrades: GameState['upgrades'], fiyatCarpan: number = 1.0, staff?: GameState['staff'], memnuniyet?: number, teklifEki: number = 0): Reservation[] {
  const baseCount = randomInt(4, 6);
  const qualityBonus = Math.floor(safeNum(sahaKalitesi, 0) / 3);
  const kameraBonus = safeNum(upgrades?.kamera, 0) > 0 ? 1 : 0; // kamera kademesi ekstra teklif
  const guvenlikStaffLevel = staff?.guvenlik?.hired ? seviyeIndeksi(staff.guvenlik.level) : 0;
  const guvenlikEki = GUVENLIK_TEKLIF_BONUSU[guvenlikStaffLevel] ?? 0;
  const memnuniyetBonus = (memnuniyet ?? 50) >= MEMNUNIYET_CONFIG.sadikMusteriEsik ? 1 : 0;
  const count = Math.max(0, Math.min(12, baseCount + qualityBonus + kameraBonus + guvenlikEki + memnuniyetBonus + Math.round(safeNum(teklifEki, 0))));

  // Aydınlatma kademesine göre gece slotları
  const geceAcik = new Set<string>(acikGeceSlotlari(upgrades?.aydinlatma ?? 0));
  const gecerliSlotlar = TIME_SLOTS.map(s => s.id).filter(id => !id.startsWith('gece') || geceAcik.has(id));

  // Kurumsal lig takımları yalnızca iyi sahaların gelir (kalite 6+)
  const typePool: MusteriTipi[] = sahaKalitesi >= 6
    ? ['mahalle', 'mahalle', 'ogrenci', 'ogrenci', 'ofis', 'ofis', 'amator', 'amator', 'dogumGunu', 'yas50plus', 'kurumsal']
    : ['mahalle', 'mahalle', 'ogrenci', 'ogrenci', 'ofis', 'ofis', 'amator', 'amator', 'dogumGunu', 'yas50plus'];

  const reservations: Reservation[] = [];
  const usedSlots = new Set<string>();

  for (let i = 0; i < count; i++) {
    const tip = pickRandom(typePool);
    const config = MUSTERI_TIPLERI[tip];
    const isim = pickRandom(config.isimler);
    const kisiSayisi = randomInt(config.minKisi, config.maxKisi);
    const dusPrimi = (upgrades?.dusSoyunma ?? 0) > 0 ? 1.15 : 1;
    const sadikBonus = (memnuniyet ?? 50) >= MEMNUNIYET_CONFIG.sadikMusteriEsik ? (1 + MEMNUNIYET_CONFIG.sadikMusteriFiyatBonus) : 1;
    // Grup ne kadar kalabalıksa fiyat o kadar yüksek (x0.85 - x1.15)
    const kisiOrani = config.maxKisi > config.minKisi ? (kisiSayisi - config.minKisi) / (config.maxKisi - config.minKisi) : 1;
    const kisiCarpani = 0.85 + 0.3 * kisiOrani;

    // Slot seçimi: önce müşterinin tercih ettiği boş saatler, yoksa tüm boş saatler (talep ağırlıklı)
    const preferred = config.tercihSlotlar.filter(s => gecerliSlotlar.includes(s));
    const availablePreferred = preferred.filter(s => !usedSlots.has(s));
    let slotId: string | null;
    if (availablePreferred.length > 0) {
      slotId = talepliSec(availablePreferred);
    } else {
      const allAvailable = gecerliSlotlar.filter(s => !usedSlots.has(s));
      if (allAvailable.length === 0) break;
      slotId = talepliSec(allAvailable);
    }
    if (!slotId) break;
    usedSlots.add(slotId);

    // Zirve saat primi: talep yüksekse fiyat da yüksek (x0.97 - x1.25)
    const talepPrimi = 0.85 + 0.25 * (SLOT_TALEP[slotId] ?? 1);
    const hamFiyat = randomInt(config.minFiyat, config.maxFiyat) * kisiCarpani * dusPrimi * safeNum(fiyatCarpan, 1) * sadikBonus * talepPrimi;
    const fiyat = Math.min(15000, Math.max(6000, Math.round(hamFiyat / 50) * 50));

    const slot = TIME_SLOTS.find(s => s.id === slotId);
    reservations.push({
      id: `rez_${Date.now()}_${i}`,
      musteriAdi: isim,
      musteriTipi: tip,
      kisiSayisi,
      saatAraligi: slot?.saat ?? '10:00-11:00',
      slotId,
      fiyat,
      durum: 'bekliyor',
    });
  }

  return reservations;
}

// ============================================
// === ÇOKLU SAHA MOTORU ===
// ============================================

function pitchDefBul(pitch: PitchState) {
  return PITCH_DEFS.find(d => d.id === pitch.id);
}

// Sahanın görünen adı
export function sahaAdi(pitch: PitchState, state?: GameState): string {
  if (pitch.ad) return pitch.ad;
  if (pitch.id === 'yildiz') return YILDIZ_SAHA.ad;
  return pitchDefBul(pitch)?.ad ?? 'Saha';
}

// Sahanın günlük işletme gideri (elektrik/su/personel hariç, sahanın kendisine ait)
export function sahaGunlukGideri(pitch: PitchState): number {
  if (pitch.gunlukGider != null) return safeNum(pitch.gunlukGider, 0);
  if (pitch.id === 'yildiz' || pitch.sahaTipi === 'yildiz') return YILDIZ_SAHA.gunlukGider;
  return safeNum(pitchDefBul(pitch)?.gunlukGider, 0);
}

// Sahadaki yükseltmelerin toplu etkisi (fiyat, memnuniyet, talep, pasif gelir, prestij, enerji, hava koruması)
export interface PitchEtkiler {
  fiyatEki: number;
  memnuniyetEki: number;
  talepEki: number;
  gunlukGelirEki: number;
  prestijEki: number;
  enerjiIndirimi: number;
  havaKoruma: number; // 0 = koruma yok, 1 = yarı, 2 = tam
}

export function pitchUpgradeEtkileri(upgrades?: Upgrades): PitchEtkiler {
  const etki: PitchEtkiler = {
    fiyatEki: 0, memnuniyetEki: 0, talepEki: 0,
    gunlukGelirEki: 0, prestijEki: 0, enerjiIndirimi: 0, havaKoruma: 0,
  };
  if (!upgrades) return etki;
  for (const def of Object.values(PITCH_UPGRADE_CONFIG) as PitchUpgradeDef[]) {
    const seviye = safeNum((upgrades as unknown as Record<string, number | undefined>)[def.id], 0);
    if (seviye <= 0) continue;
    etki.fiyatEki += safeNum(def.fiyatEki, 0) * seviye;
    etki.memnuniyetEki += safeNum(def.memnuniyetEki, 0) * seviye;
    etki.talepEki += safeNum(def.talepEki, 0) * seviye;
    etki.gunlukGelirEki += safeNum(def.gunlukGelirEki, 0) * seviye;
    etki.prestijEki += safeNum(def.prestijEki, 0) * seviye;
    etki.enerjiIndirimi += safeNum(def.enerjiIndirimi, 0) * seviye;
    if (def.havaKoruma) etki.havaKoruma = Math.max(etki.havaKoruma, seviye);
  }
  return etki;
}

// Oyundaki tüm sahalar (yeni sistem varsa pitches, yoksa eski yildizSaha)
export function tumSahalar(state: GameState): PitchState[] {
  if (state.pitches && Object.keys(state.pitches).length > 0) {
    return Object.values(state.pitches).filter(Boolean);
  }
  return state.yildizSaha ? [state.yildizSaha] : [];
}

// Hizmette olan sahalar (aşama 5 = açık)
export function acikSahalar(state: GameState): PitchState[] {
  return tumSahalar(state).filter(p => safeNum(p.asama, 0) >= 5);
}

// Sahanın günlük PASİF geliri (reklam panoları + akademi taksiti)
export function sahaGunlukPasifGelir(pitch: PitchState, state: GameState): number {
  const up = pitch.upgrades ?? (pitch.id === 'yildiz' ? state.upgrades : undefined);
  const etki = pitchUpgradeEtkileri(up);
  let gelir = etki.gunlukGelirEki;
  if (pitch.sahaTipi === 'akademi') gelir += 1500; // sabit akademi taksiti
  return Math.round(gelir);
}

// Saha tipine özel müşteri havuzu — her saha kendi uzmanlık kitlesini çeker
function sahaMusteriHavuzu(sahaTipi: string | undefined, kalite: number): MusteriTipi[] {
  switch (sahaTipi) {
    case 'cocuk':
      return ['mahalle', 'mahalle', 'dogumGunu', 'dogumGunu', 'yas50plus', 'ogrenci'];
    case 'akademi':
      return ['ogrenci', 'ogrenci', 'ogrenci', 'amator', 'mahalle'];
    case 'vip':
      return ['kurumsal', 'kurumsal', 'ofis', 'ofis', 'dogumGunu'];
    case 'arena':
      return ['amator', 'amator', 'kurumsal', 'ofis', 'mahalle', 'dogumGunu'];
    default: // yildiz — klasik havuz, kurumsal kalite 6+ ister
      return kalite >= 6
        ? ['mahalle', 'mahalle', 'ogrenci', 'ogrenci', 'ofis', 'ofis', 'amator', 'amator', 'dogumGunu', 'yas50plus', 'kurumsal']
        : ['mahalle', 'mahalle', 'ogrenci', 'ogrenci', 'ofis', 'ofis', 'amator', 'amator', 'dogumGunu', 'yas50plus'];
  }
}

// Belirli bir saha için günün tekliflerini üretir.
// Her teklif sahaId taşır — rezervasyon ekranında "hangi saha" gösterimi bununla yapılır.
// teklifEki: günün olayının teklif sayısına etkisi (opsiyonel, varsayılan 0)
export function generatePitchReservations(pitch: PitchState, state: GameState, teklifEki: number = 0): Reservation[] {
  if (safeNum(pitch.asama, 0) < 5) return [];

  const up = pitch.upgrades ?? (pitch.id === 'yildiz' ? state.upgrades : undefined);
  const etki = pitchUpgradeEtkileri(up);
  const kalite = safeNum(pitch.kalite, state.sahaKalitesi);

  // Hava etkisi: karlı/rüzgarlı gün açık sahalar teklif kaybeder.
  // Isıtma yarıya indirir (sv1) / tamamen bitirir (sv2). VIP kapalı saha etkilenmez.
  let havaKesinti = 0;
  if (state.bugunHava === 'karli') havaKesinti = 2;
  else if (state.bugunHava === 'ruzgarli') havaKesinti = 1;
  if (pitch.sahaTipi === 'vip') havaKesinti = 0;
  if (etki.havaKoruma >= 2) havaKesinti = 0;
  else if (etki.havaKoruma === 1) havaKesinti = Math.ceil(havaKesinti / 2);

  const baseCount = randomInt(2, 4) + Math.floor(kalite / 3);
  const guvenlikStaffLevel = state.staff?.guvenlik?.hired ? seviyeIndeksi(state.staff.guvenlik.level) : 0;
  const guvenlikEki = GUVENLIK_TEKLIF_BONUSU[guvenlikStaffLevel] ?? 0;
  // Olumsuz olay günü saha tamamen boş kalabilir (count 0 olur) — bilinçli tasarım
  const count = Math.max(0, Math.min(8, baseCount + Math.round(etki.talepEki) - havaKesinti + guvenlikEki + Math.round(safeNum(teklifEki, 0))));

  const havuz = sahaMusteriHavuzu(pitch.sahaTipi, kalite);
  const geceAcik = new Set<string>(acikGeceSlotlari(up?.aydinlatma ?? 0));
  const gecerliSlotlar = TIME_SLOTS.map(s => s.id).filter(id => !id.startsWith('gece') || geceAcik.has(id));

  // Saha yükseltmelerinin fiyat primi + VIP/kalite primi
  const kalitePrimi = pitch.sahaTipi === 'vip' ? 1.25 : pitch.sahaTipi === 'arena' ? 1.2 : 1;
  const fiyatCarpan = (1 + etki.fiyatEki) * kalitePrimi;

  const reservations: Reservation[] = [];
  const usedSlots = new Set<string>();

  for (let i = 0; i < count; i++) {
    const tip = pickRandom(havuz);
    const config = MUSTERI_TIPLERI[tip];
    if (!config) continue;
    const isim = pickRandom(config.isimler);
    const kisiSayisi = Math.min(randomInt(config.minKisi, config.maxKisi), safeNum(pitch.kapasite, config.maxKisi) || config.maxKisi);
    const dusPrimi = (up?.dusSoyunma ?? 0) > 0 ? 1.15 : 1;
    const sadikBonus = (state.memnuniyet ?? 50) >= MEMNUNIYET_CONFIG.sadikMusteriEsik ? (1 + MEMNUNIYET_CONFIG.sadikMusteriFiyatBonus) : 1;
    const kisiOrani = config.maxKisi > config.minKisi ? (kisiSayisi - config.minKisi) / (config.maxKisi - config.minKisi) : 1;
    const kisiCarpani = 0.85 + 0.3 * kisiOrani;

    const preferred = config.tercihSlotlar.filter(s => gecerliSlotlar.includes(s));
    const availablePreferred = preferred.filter(s => !usedSlots.has(s));
    let slotId: string | null;
    if (availablePreferred.length > 0) {
      slotId = talepliSec(availablePreferred);
    } else {
      const allAvailable = gecerliSlotlar.filter(s => !usedSlots.has(s));
      if (allAvailable.length === 0) break;
      slotId = talepliSec(allAvailable);
    }
    if (!slotId) break;
    usedSlots.add(slotId);

    const talepPrimi = 0.85 + 0.25 * (SLOT_TALEP[slotId] ?? 1);
    const hamFiyat = randomInt(config.minFiyat, config.maxFiyat) * kisiCarpani * dusPrimi * fiyatCarpan * sadikBonus * talepPrimi;
    const fiyat = Math.min(15000, Math.max(6000, Math.round(hamFiyat / 50) * 50));

    const slot = TIME_SLOTS.find(s => s.id === slotId);
    reservations.push({
      id: `rez_${pitch.id}_${Date.now()}_${i}`,
      musteriAdi: isim,
      musteriTipi: tip,
      kisiSayisi,
      saatAraligi: slot?.saat ?? '10:00-11:00',
      slotId,
      fiyat,
      durum: 'bekliyor',
      sahaId: pitch.id,
    });
  }

  return reservations;
}

// Sahanın sıradaki inşaat aşaması (maliyet + enerji); maks aşamada ya arsa yoksa null
export function siradakiAsama(pitch: PitchState): YildizAsama | null {
  const asama = safeNum(pitch.asama, 0);
  if (asama < 1 || asama >= 5) return null;
  const list: YildizAsama[] = pitch.id === 'yildiz'
    ? YILDIZ_SAHA.asamalar
    : (() => {
        const def = pitchDefBul(pitch);
        return def ? insaatAsamalari(def) : [];
      })();
  return list.find(a => a.asama === asama + 1) ?? null;
}

// ============================================
// === MÜŞTERİ YORUM SİSTEMİ ===
// ============================================
export interface Yorum {
  yildiz: number;
  metin: string;
  isim: string;
  tipLabel: string;
}

const YORUM_POZITIF = [
  'Saha tertemiz, oynamaya bayıldık. Yine geleceğiz!',
  'Gece aydınlatması harika, derbi artık burada oynanır.',
  'Rezervasyon yapmak çok kolaydı, karşılama sıcaktı.',
  'Toplar yeni, saha düz, çay bile iyiydi. Elinize sağlık.',
  'Mahallenin en iyi sahası, sırıtarak oynadık.',
  'Kaptan soyunma odasını çok beğendi, kilitler sağlam.',
  'Otopark sıkıntısı yok, araba kapıya kadar. Rahat bir akşamdı.',
  'Skorboarda skorumuz düştü, çocuklar bayıldı!',
];

const YORUM_NEGATIF = [
  'Saha bakımsız, çim kavruk. Ayakkabım mahvoldu.',
  'Işık boyayıp söndü, maçı orada bitirdik.',
  'Tel örgü gitti top kaçtı, 3 topumuz kayıp.',
  'Duş suyu soğuk, işimize gelen gitmedi.',
  'Rezervasyon karışıktı, sıramızı başkası kaptı.',
  'Kale ağı yırtık, hakemlik tartışması çıkardı.',
];

function yorumUret(memnuniyet: number, kabulEdilenler: Reservation[]): Yorum[] {
  const yorumlar: Yorum[] = [];
  if (kabulEdilenler.length === 0 && Math.random() > 0.3) return yorumlar;
  const adet = kabulEdilenler.length === 0 ? 1 : Math.min(3, 1 + Math.floor(kabulEdilenler.length / 3));
  for (let i = 0; i < adet; i++) {
    const kaynak = kabulEdilenler.length > 0 ? pickRandom(kabulEdilenler) : null;
    const pozitif = Math.random() * 100 < memnuniyet;
    yorumlar.push({
      yildiz: pozitif ? randomInt(4, 5) : randomInt(1, 2),
      metin: pozitif ? pickRandom(YORUM_POZITIF) : pickRandom(YORUM_NEGATIF),
      isim: kaynak?.musteriAdi ?? 'İsimsiz misafir',
      tipLabel: kaynak ? (MUSTERI_TIPLERI[kaynak.musteriTipi]?.label ?? 'Misafir') : 'Misafir',
    });
  }
  return yorumlar;
}

export function generateDailyTasks(): DailyTask[] {
  const selected = shuffleAndPick(GOREV_HAVUZU, 3);
  return selected.map((t, i) => ({
    id: `task_${Date.now()}_${i}`,
    aciklama: (t as any).aciklama,
    hedefTip: (t as any).hedefTip,
    hedef: (t as any).hedef,
    ilerleme: 0,
    tamamlandi: false,
    odul: (t as any).odul,
  }));
}

// === PERSONEL MAAŞI ===
export function calculateStaffMaas(staff?: Record<string, StaffMember>): number {
  if (!staff) return 0;
  const liste: any[] = Array.isArray(STAFF_CONFIG) ? STAFF_CONFIG : Object.values(STAFF_CONFIG as any);
  let toplam = 0;
  for (const st of Object.values(staff)) {
    if (!st?.hired) continue;
    const cfg = liste.find(s => s?.id === st.id);
    const seviye = cfg?.levels?.[Math.max(0, safeNum(st.level, 1) - 1)];
    toplam += safeNum(seviye?.maas, 0);
  }
  return toplam;
}

export function getActiveCityConfig(state: GameState) {
  const cityId = state.activeSehir ?? 'istanbul';
  return CITIES.find(c => c.id === cityId) ?? CITIES[0]!;
}

// === GÜN SONU RAPORU ===
export interface SahaOzet {
  id: string;
  ad: string;
  gelir: number;
  gider: number;
}

export interface DayEndResult {
  gun: number;
  gelir: number;
  gider: number;
  personelMaas: number;
  net: number;
  nakit: number;
  isGameOver: boolean;
  gorevOdul: number;
  jetonOdul: number;
  prestijKazanc: number;
  memnuniyetDegisim: number;
  yeniMemnuniyet: number;
  yorumlar: Yorum[];
  sadikKazanci: number;
  sezonTamamlandi: boolean;
  sahaGelir: number;
  sahaGider: number;
  sahaOzet: SahaOzet[];
}

// Sezon sistemi (30 gün) — gameConfig'deki SEZON_CONFIG ile aynı değerler
const SEZON_UZUNLUK = 30;
const SEZON_HEDEF = 650000;
const SEZON_JETON = 0;
const SEZON_PRESTIJ = 50;

export function processEndDay(state: GameState): { newState: GameState; result: DayEndResult } {
  const cityConfig = getActiveCityConfig(state);

  // === GELİR ===
  const olayCarpan = safeNum(state.olayGelirCarpani, 1);
  const gelirEtkili = Math.round(safeNum(state.bugunGelir, 0) * olayCarpan);

  // Kantin geliri artik saha bazli: her sahan kantin seviyesi
  // sahaGunlukPasifGelir uzerinden gunluk gelire yansir (Yildiz dahil - cifte gelir yok)
  const kabulSayisi = (state.kabulEdilenler ?? []).length;

  // Çoklu saha: açık sahaların pasif geliri (reklam + akademi) ve gideri (elektrik/su/anton)
  const acik = acikSahalar(state);
  let sahaGelir = 0;
  let sahaGider = 0;
  const sahaOzet: SahaOzet[] = [];
  for (const s of acik) {
    const pGelir = sahaGunlukPasifGelir(s, state);
    const pGider = sahaGunlukGideri(s);
    sahaGelir += pGelir;
    sahaGider += pGider;
    sahaOzet.push({ id: s.id, ad: sahaAdi(s, state), gelir: pGelir, gider: pGider });
  }

  const gelirToplam = gelirEtkili + sahaGelir;

  // === GİDER ===
  // Sahibisen kira kalkar, elektrik/su ödenmeye devam eder (ISLETME_YERI kuralı)
  const kira = state.yerSahibi ? 0 : safeNum(cityConfig?.kiraGunluk, 3500);
  const elektrikSu = safeNum(cityConfig?.elektrikSuGunluk, 900);
  const personelMaas = calculateStaffMaas(state.staff);
  const giderToplam = kira + elektrikSu + personelMaas + sahaGider;
  const net = gelirToplam - giderToplam;

  // === GÖREVLER ===
  const completedTasks = (state.gunlukGorevler ?? []).filter(t => t?.tamamlandi);
  const gorevOdul = completedTasks.reduce((toplam, t) => toplam + safeNum(t.odul, 0), 0);
  // Jetonlar artık yalnızca tamamlanan ödüllü reklamlardan kazanılır.
  const jetonOdul = 0;

  // === MEMNUNİYET ===
  const bekleyen = (state.bugunRezervasyonlar ?? []).filter(r => r?.durum === 'bekliyor').length;
  let memnuniyetDegisim = kabulSayisi - bekleyen;
  if (!state.bakimYapildi) memnuniyetDegisim -= 5;
  // Temizlikçi memnuniyet bonusu: seviyeye göre → L1: +5 | L2: +8 | L3: +12
  if (state.staff?.temizlikci?.hired) {
    memnuniyetDegisim += TEMIZLIKCI_MEMNUNIYET_BONUSU[seviyeIndeksi(state.staff.temizlikci.level)] ?? 0;
  }
  // Saha yükseltmelerinin memnuniyet katkısı (her açık saha için)
  for (const s of acik) {
    const up = s.upgrades ?? (s.id === 'yildiz' ? state.upgrades : undefined);
    memnuniyetDegisim += pitchUpgradeEtkileri(up).memnuniyetEki;
  }
  const yeniMemnuniyet = Math.max(0, Math.min(100, Math.round(safeNum(state.memnuniyet, 50) + memnuniyetDegisim)));

  // === SADIK MÜŞTERİ ===
  const sadikEsik = safeNum(MEMNUNIYET_CONFIG?.sadikMusteriEsik, 80);
  const sadikKazanci = yeniMemnuniyet >= sadikEsik && kabulSayisi > 0 ? 1 : 0;

  // === PRESTİJ (tribün, VIP loca vb. saha yükseltmelerinden günlük) ===
  let prestijArtis = 0;
  for (const s of acik) {
    const up = s.upgrades ?? (s.id === 'yildiz' ? state.upgrades : undefined);
    prestijArtis += pitchUpgradeEtkileri(up).prestijEki;
  }

  // === YORUMLAR ===
  const yorumlar = yorumUret(yeniMemnuniyet, state.kabulEdilenler ?? []);

  // === SEZON ===
  let sezonGunYeni = safeNum(state.sezonGun, 1) + 1;
  let sezonGelirYeni = safeNum(state.sezonGelir, 0) + gelirToplam;
  let sezonTamamlandi = false;
  if (sezonGunYeni > SEZON_UZUNLUK) {
    sezonTamamlandi = sezonGelirYeni >= SEZON_HEDEF;
    sezonGunYeni = 1;
    sezonGelirYeni = 0;
  }

  // === NAKİT & İFLAS ===
  const yeniNakit = Math.round(safeNum(state.nakit, 0) + net + gorevOdul);
  let consecutiveNegativeDays = safeNum(state.consecutiveNegativeDays, 0);
  let isGameOver = state.isGameOver ?? false;
  if (yeniNakit < 0) {
    consecutiveNegativeDays += 1;
    if (consecutiveNegativeDays >= safeNum(IFLAS_GUN_LIMIT, 3)) isGameOver = true;
  } else {
    consecutiveNegativeDays = 0;
  }

  // === YENİ GÜN DURUMU ===
  // Sahaların günlük rezervasyon listeleri boşalır, bakım işareti sıfırlanır,
  // pasif gelir saha defterine (toplamKazanc) işlenir.
  const pitchesYeni: Record<string, PitchState> = {};
  for (const [id, p] of Object.entries(state.pitches ?? {})) {
    if (!p) continue;
    const ozet = sahaOzet.find(o => o.id === id);
    pitchesYeni[id] = {
      ...p,
      bakimYapildi: false,
      rezervasyonlar: [],
      kabulEdilenler: [],
      toplamKazanc: safeNum(p.toplamKazanc, 0) + Math.max(0, (ozet?.gelir ?? 0) - (ozet?.gider ?? 0)),
    };
  }

  const yildizEski = state.yildizSaha;
  const yildizYeni: PitchState = {
    ...yildizEski,
    bakimYapildi: false,
    rezervasyonlar: [],
    kabulEdilenler: [],
  };
  // Yıldız saha defteri pitches ile aynı kalsın
  if (pitchesYeni.yildiz) yildizYeni.toplamKazanc = pitchesYeni.yildiz.toplamKazanc;

  const yeniSezonJeton = sezonTamamlandi ? SEZON_JETON : 0;
  const yeniSezonPrestij = sezonTamamlandi ? SEZON_PRESTIJ : 0;

  const newState: GameState = {
    ...state,
    nakit: yeniNakit,
    gun: state.gun + 1,
    enerji: Math.min(MAX_ENERJI, Math.max(SABAH_ENERJISI, safeNum(state.enerji, 0) + safeNum(ENERJI_GUN_SONU, 40))),
    toplamKazanc: safeNum(state.toplamKazanc, 0) + Math.max(0, gelirToplam),
    jeton: safeNum(state.jeton, 0) + jetonOdul + yeniSezonJeton,
    prestij: safeNum(state.prestij, 0) + prestijArtis + yeniSezonPrestij,
    bugunGelir: 0,
    bugunGider: 0,
    bugunRezervasyonlar: [],
    kabulEdilenler: [],
    gunlukGorevler: generateDailyTasks(),
    memnuniyet: yeniMemnuniyet,
    sadikMusteriler: safeNum(state.sadikMusteriler, 0) + sadikKazanci,
    consecutiveNegativeDays,
    isGameOver,
    bakimYapildi: false,
    sezonGun: sezonGunYeni,
    sezonGelir: sezonGelirYeni,
    yildizSaha: yildizYeni,
    pitches: pitchesYeni,
  };

  const result: DayEndResult = {
    gun: state.gun,
    gelir: gelirToplam,
    gider: giderToplam,
    personelMaas,
    net,
    nakit: yeniNakit,
    isGameOver,
    gorevOdul,
    jetonOdul,
    prestijKazanc: prestijArtis + yeniSezonPrestij,
    memnuniyetDegisim,
    yeniMemnuniyet,
    yorumlar,
    sadikKazanci,
    sezonTamamlandi,
    sahaGelir,
    sahaGider,
    sahaOzet,
  };

  return { newState, result };
}

function bosUpgrades(): Upgrades {
  return {
    bakim: 0, haliYenileme: 0, aydinlatma: 0, dusSoyunma: 0, kantin: 0, sponsor: 0,
    telOrgu: 0, tribun: 0, otopark: 0, kamera: 0, isitma: 0, skorboard: 0, reklam: 0, vipLoca: 0,
    kale: 0, topSeti: 0, yedekKulubesi: 0, sesSistemi: 0, wifi: 0, turnike: 0, ilkYardim: 0, soyunmaDolabi: 0,
  };
}

export function createInitialState(): GameState {
  // Ana ek saha: Yıldız Saha — başta arsa yok, oyuncu 75.000₺ ile arsayı alır
  const yildizSaha: PitchState = {
    id: 'yildiz',
    ad: YILDIZ_SAHA.ad,
    sahaTipi: 'yildiz',
    arsaAlindi: false,
    asama: 0,
    kalite: 0,
    upgrades: undefined, // yıldız saha yükseltmeleri eski state.upgrades'ten okunur
    bakimYapildi: false,
    rezervasyonlar: [],
    kabulEdilenler: [],
    toplamKazanc: 0,
    aktif: false,
    gunlukGider: YILDIZ_SAHA.gunlukGider,
    satinAlmaBedeli: YILDIZ_SAHA.arsaFiyat,
    insaatMaliyeti: YILDIZ_SAHA.toplamMaliyet - YILDIZ_SAHA.arsaFiyat,
  };

  // Yaşam eşyaları
  const lifeItems: Record<string, LifeItem> = {};
  const lifeKaynak: any[] = Array.isArray(LIFE_ITEMS) ? LIFE_ITEMS : Object.values(LIFE_ITEMS as any);
  for (const item of lifeKaynak) {
    if (item?.id) lifeItems[item.id] = { id: item.id, owned: false, level: 0 };
  }

  // Personel
  const staff: Record<string, StaffMember> = {};
  const staffKaynak: any[] = Array.isArray(STAFF_CONFIG) ? STAFF_CONFIG : Object.values(STAFF_CONFIG as any);
  for (const st of staffKaynak) {
    if (st?.id) staff[st.id] = { id: st.id, hired: false, level: 0 };
  }

  // Şehirler
  const cities: Record<string, CityData> = {};
  const cityKaynak: any[] = Array.isArray(CITIES) ? CITIES : Object.values(CITIES as any);
  for (const c of cityKaynak) {
    if (!c?.id) continue;
    cities[c.id] = {
      id: c.id,
      unlocked: c.id === 'istanbul',
      sahaKalitesi: INITIAL_SAHA_KALITESI,
      sahaKapasitesi: 10,
      upgrades: bosUpgrades(),
      toplamKazanc: 0,
    };
  }

  return {
    isGameStarted: true,
    nakit: INITIAL_NAKIT,
    enerji: INITIAL_ENERJI,
    gun: INITIAL_GUN,
    sahaAdi: 'Yıldız Halı Saha',
    sehir: 'İstanbul',
    sahaKalitesi: INITIAL_SAHA_KALITESI,
    sahaKapasitesi: 10,
    jeton: 0,
    toplamKazanc: 0,
    prestij: 0,
    upgrades: bosUpgrades(),
    bugunRezervasyonlar: [],
    kabulEdilenler: [],
    gunlukGorevler: generateDailyTasks(),
    bugunGelir: 0,
    bugunGider: 0,
    consecutiveNegativeDays: 0,
    bakimYapildi: false,
    isGameOver: false,
    lifeItems,
    kizArkadas: false,
    kizArkdasSeviye: 0,
    cities,
    activeSehir: 'istanbul',
    staff,
    memnuniyet: 50,
    sadikMusteriler: 0,
    turnuvaSonuclari: [],
    sonTurnuvaGun: 0,
    bugunHava: 'gunesli',
    bugunOlayId: null,
    olayCozuldu: false,
    olayGecmisi: [],
    olayGelirCarpani: 1,
    sezonGun: 1,
    sezonGelir: 0,
    yerSahibi: false,
    yildizSaha,
    pitches: { yildiz: { ...yildizSaha, rezervasyonlar: [], kabulEdilenler: [] } },
    activePitchId: 'yildiz',
  };
}

// Eski/bozuk kayıtları yeni yapıya taşır:
// - sayısal alanlar onarılır, eksik sistem alanları kurulur
// - yildizSaha <-> pitches.yildiz senkronize edilir
// - eski kayıtlara pitches kurulumu yapılır (geriye dönük uyumluluk)
export function migrateState(raw: GameState): GameState {
  if (!raw || typeof raw !== 'object') return createInitialState();
  const s = { ...raw } as GameState;

  // Sayısal onarım
  s.nakit = safeNum(s.nakit, INITIAL_NAKIT);
  s.enerji = safeNum(s.enerji, INITIAL_ENERJI);
  s.gun = safeNum(s.gun, INITIAL_GUN);
  s.jeton = safeNum(s.jeton, 0);
  s.toplamKazanc = safeNum(s.toplamKazanc, 0);
  s.prestij = safeNum(s.prestij, 0);
  s.sahaKalitesi = safeNum(s.sahaKalitesi, INITIAL_SAHA_KALITESI);
  s.sahaKapasitesi = safeNum(s.sahaKapasitesi, 10);
  s.memnuniyet = safeNum(s.memnuniyet, 50);
  s.sadikMusteriler = safeNum(s.sadikMusteriler, 0);
  s.bugunGelir = safeNum(s.bugunGelir, 0);
  s.bugunGider = safeNum(s.bugunGider, 0);
  s.consecutiveNegativeDays = safeNum(s.consecutiveNegativeDays, 0);
  s.sezonGun = safeNum(s.sezonGun, 1);
  s.sezonGelir = safeNum(s.sezonGelir, 0);
  s.sonTurnuvaGun = safeNum(s.sonTurnuvaGun, 0);
  s.olayGelirCarpani = safeNum(s.olayGelirCarpani, 1);
  s.kizArkdasSeviye = safeNum(s.kizArkdasSeviye, 0);

  // Yükseltmeler (kantin/sponsor sonradan geldi — eksikler 0'a tamamlanır)
  const eskiUp = s.upgrades ?? ({} as Partial<Upgrades>);
  s.upgrades = {
    ...eskiUp,
    bakim: safeNum(eskiUp.bakim, 0),
    haliYenileme: safeNum(eskiUp.haliYenileme, 0),
    aydinlatma: safeNum(eskiUp.aydinlatma, 0),
    dusSoyunma: safeNum(eskiUp.dusSoyunma, 0),
    kantin: safeNum(eskiUp.kantin, 0),
    sponsor: safeNum(eskiUp.sponsor, 0),
  } as Upgrades;

  // Yıldız saha onarımı
  const eskiYildiz = s.yildizSaha;
  const yildizAsama = Math.min(5, Math.max(0, safeNum(eskiYildiz?.asama, 0))) as SahaAsama;
  const yildizOnarim: PitchState = {
    id: 'yildiz',
    ad: YILDIZ_SAHA.ad,
    sahaTipi: 'yildiz',
    arsaAlindi: eskiYildiz?.arsaAlindi ?? yildizAsama > 0,
    asama: yildizAsama,
    kalite: safeNum(eskiYildiz?.kalite, 0),
    upgrades: undefined, // yıldız saha yükseltmeleri state.upgrades'ten okunur
    bakimYapildi: eskiYildiz?.bakimYapildi ?? false,
    rezervasyonlar: Array.isArray(eskiYildiz?.rezervasyonlar) ? eskiYildiz.rezervasyonlar : [],
    kabulEdilenler: Array.isArray(eskiYildiz?.kabulEdilenler) ? eskiYildiz.kabulEdilenler : [],
    toplamKazanc: safeNum(eskiYildiz?.toplamKazanc, 0),
    aktif: yildizAsama >= 5,
    gunlukGider: YILDIZ_SAHA.gunlukGider,
    satinAlmaBedeli: YILDIZ_SAHA.arsaFiyat,
    insaatMaliyeti: YILDIZ_SAHA.toplamMaliyet - YILDIZ_SAHA.arsaFiyat,
  };
  s.yildizSaha = yildizOnarim;

  // Pitches kurulumu: eski kayıt tamamen pitches'sizse yıldızdan türet
  const mevcut = s.pitches ?? {};
  const onarilmis: Record<string, PitchState> = {};
  const girişler = Object.entries(mevcut);
  if (girişler.length === 0) {
    onarilmis.yildiz = yildizOnarim;
  } else {
    for (const [id, p] of girişler) {
      if (!p || typeof p !== 'object') continue;
      const def = PITCH_DEFS.find(d => d.id === id);
      const asama = Math.min(5, Math.max(0, safeNum(p.asama, 0))) as SahaAsama;
      onarilmis[id] = {
        ...p,
        id,
        ad: p.ad ?? (id === 'yildiz' ? YILDIZ_SAHA.ad : def?.ad ?? 'Saha'),
        sahaTipi: p.sahaTipi ?? (id === 'yildiz' ? 'yildiz' : def?.sahaTipi ?? 'yildiz'),
        arsaAlindi: p.arsaAlindi ?? asama > 0,
        asama,
        kalite: safeNum(p.kalite, id === 'yildiz' ? 0 : def?.baslangicKalitesi ?? 4),
        bakimYapildi: p.bakimYapildi ?? false,
        rezervasyonlar: Array.isArray(p.rezervasyonlar) ? p.rezervasyonlar : [],
        kabulEdilenler: Array.isArray(p.kabulEdilenler) ? p.kabulEdilenler : [],
        toplamKazanc: safeNum(p.toplamKazanc, 0),
        aktif: asama >= 5,
        gunlukGider: p.gunlukGider ?? (id === 'yildiz' ? YILDIZ_SAHA.gunlukGider : def?.gunlukGider),
        satinAlmaBedeli: p.satinAlmaBedeli ?? (id === 'yildiz' ? YILDIZ_SAHA.arsaFiyat : def?.arsaBedeli),
        insaatMaliyeti: p.insaatMaliyeti ?? def?.insaatBedeli,
      };
    }
    if (!onarilmis.yildiz) onarilmis.yildiz = yildizOnarim;
  }
  s.pitches = onarilmis;
  s.activePitchId = s.activePitchId ?? 'yildiz';

  // Diğer sistem alanları (eski kayıtlarda eksik olabilir)
  s.isGameStarted = s.isGameStarted ?? false;
  s.bakimYapildi = s.bakimYapildi ?? false;
  s.isGameOver = s.isGameOver ?? false;
  s.bugunRezervasyonlar = Array.isArray(s.bugunRezervasyonlar) ? s.bugunRezervasyonlar : [];
  s.kabulEdilenler = Array.isArray(s.kabulEdilenler) ? s.kabulEdilenler : [];
  s.gunlukGorevler = Array.isArray(s.gunlukGorevler) ? s.gunlukGorevler : [];
  s.turnuvaSonuclari = Array.isArray(s.turnuvaSonuclari) ? s.turnuvaSonuclari : [];
  s.olayGecmisi = Array.isArray(s.olayGecmisi) ? s.olayGecmisi : [];
  s.lifeItems = s.lifeItems ?? {};
  s.cities = s.cities ?? {};
  s.staff = s.staff ?? {};
  s.kizArkadas = s.kizArkadas ?? false;
  s.yerSahibi = s.yerSahibi ?? false;
  s.sahaAdi = s.sahaAdi ?? 'Yıldız Halı Saha';
  s.sehir = s.sehir ?? 'İstanbul';
  s.activeSehir = s.activeSehir ?? 'istanbul';
  s.bugunHava = s.bugunHava ?? 'gunesli';
  s.bugunOlayId = s.bugunOlayId ?? null;
  s.olayCozuldu = s.olayCozuldu ?? false;

  return s;
}

// === TURNUVA SİMÜLASYONU ===
// Arena açıksa +10, antrenör seviyesine göre bonus; saha kalitesi ve memnuniyet sıralamayı belirler.
// Günün çözülmemiş olayı da performansa etki eder (macEtkisi: tribün gerginliği -, denetim motivasyonu +).
export function simulateTurnuva(state: GameState): TurnuvaResult {
  const cfg: any = TURNUVA_CONFIG as any;
  const arenaAcik = Object.values(state.pitches ?? {}).some(p => p?.sahaTipi === 'arena' && safeNum(p.asama, 0) >= 5);
  const antrenorLevel = state.staff?.antrenor?.hired ? seviyeIndeksi(state.staff.antrenor.level) : 0;

  // Olay etkisi: bugünün olayı çözülmemişse maç/turnuva performansını etkiler
  const aktifOlay = state.bugunOlayId && !state.olayCozuldu
    ? OLAY_HAVUZU.find(o => o.id === state.bugunOlayId)
    : null;
  const olayMacEtkisi = safeNum((aktifOlay as any)?.macEtkisi, 0);

  const performans = safeNum(state.sahaKalitesi, 0) * 8
    + safeNum(state.memnuniyet, 50) * 0.2
    + (arenaAcik ? 10 : 0)
    + (ANTRENOR_TURNUVA_BONUSU[antrenorLevel] ?? 0)
    + olayMacEtkisi
    + Math.random() * 40;

  let sonuc: TurnuvaResult['sonuc'] = 'katilim';
  if (performans >= 90) sonuc = 'birincilik';
  else if (performans >= 70) sonuc = 'ikincilik';
  else if (performans >= 50) sonuc = 'ucunculuk';

  const isimHavuz: string[] = Array.isArray(cfg?.isimler) && cfg.isimler.length > 0
    ? cfg.isimler
    : ['Mahalle Turnuvası', 'Bölgesel Kupa', 'Kurumsal Lig', 'Amatör Ligi'];
  const isim = pickRandom(isimHavuz);

  const sonucConfig = cfg?.sonuclar?.[sonuc] ?? {};
  return {
    gun: safeNum(state.gun, 0),
    isim,
    sonuc,
    kazanc: safeNum(sonucConfig.kazanc, 0),
    prestijKazanc: safeNum(sonucConfig.prestij, 0),
  };
}

// === OLAYIN LİG MAÇINA ETKİSİ ===
// Çözülmemiş gün olayının lig takım gücüne katkısı. Lig simülasyonu güç formülünde
// (memnuniyet-50)*0.15 kullanır → 1 güç puanı ≈ +6.67 memnuniyet eşdeğeri.
// GameContext bu eki ligHaftaSimule'ye memnuniyet üzerinden yansıtır; kalıcı state'e dokunmaz.
export function olayLigMemnuniyetEki(state: GameState): number {
  const aktifOlay = state.bugunOlayId && !state.olayCozuldu
    ? OLAY_HAVUZU.find(o => o.id === state.bugunOlayId)
    : null;
  const gucEki = safeNum((aktifOlay as any)?.macEtkisi, 0);
  return gucEki === 0 ? 0 : Math.round(gucEki / 0.15);
}

// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===
