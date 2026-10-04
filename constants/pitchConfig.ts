// ============================================
// BEŞLİ PATRON — Saha Yapılandırması (ÇOKLU SAHA)
// ============================================
import type { PitchDefinition, SahaTipi } from '../types/game';

// === İNŞAAT AŞAMASI YAPISI ===
export interface YildizAsama {
  asama: number;
  label: string;
  aciklama: string;
  cost: number;
  enerji: number;
}

// === ANA SAHA (YILDIZ) — değerler değişmedi, ekonomi aynı ===
export const YILDIZ_SAHA = {
  id: 'yildiz',
  ad: 'Yıldız Saha',
  arsaFiyat: 75000,
  acilisKalite: 5,
  bakimCost: 1500,
  bakimEnerji: 8,
  gunlukGider: 500,     // açıkken ekstra elektrik/su (kendi projektörleri)
  fiyatPrim: 1.1,       // yeni ve geniş saha primi
  asamalar: [
    { asama: 2, label: 'Zemin Hazırlığı', aciklama: 'Arsa temizlenir, zemin düzlenip silindirlenir', cost: 30000, enerji: 12 },
    { asama: 3, label: 'Zemin, Kale ve Çizgiler', aciklama: 'Halı saha zemini döşenir, kaleler ve çizgiler kurulur', cost: 50000, enerji: 15 },
    { asama: 4, label: 'Tel Örgüler', aciklama: 'Toplar kaçmasın, komşular şikayet etmesin', cost: 25000, enerji: 8 },
    { asama: 5, label: 'Aydınlatma ve Açılış', aciklama: 'Kendi projektörleri kurulur — gece 02:00-03:00 maçına kadar açık', cost: 35000, enerji: 10 },
  ] as YildizAsama[],
  toplamMaliyet: 75000 + 30000 + 50000 + 25000 + 35000, // 215.000₺
};

// === KİRALIK YERİ SATIN ALMA ===
// Emlakçı araya giriyor: işletmenin bulunduğu yeri sahibinden alırsın.
// Alınca günlük kira tamamen kalkar + kalıcı prestij kazanırsın.
export const ISLETME_YERI = {
  satinAlmaFiyat: 1500000,
  prestijOdul: 150,
  aciklama: 'Yıllık kira ~1,27M₺. Yer senin olunca bu para cebinde kalır.',
};

// ============================================
// === YENİ SAHA KATALOĞU (4 YENİ PITCH) ===
// ============================================
// yildiz = ana saha (yukarıda). Bunlar işletmeye EKLENEN sahalar.
// Her sahanın kendi günlük gideri, kalitesi ve uzmanlığı var.

export const PITCH_DEFS: PitchDefinition[] = [
  {
    id: 'cocuk',
    ad: 'Minikler Sahası',
    sahaTipi: 'cocuk',
    arsaBedeli: 150000,
    insaatBedeli: 250000,
    baslangicKalitesi: 4,
    kapasite: 6,
    gunlukGider: 250,
    aciklama: 'Küçük 5\'lik saha. Gündüz aileler, okul grupları ve doğum günü partileri tercih eder.',
  },
  {
    id: 'akademi',
    ad: 'Akademi Saha',
    sahaTipi: 'akademi',
    arsaBedeli: 250000,
    insaatBedeli: 450000,
    baslangicKalitesi: 5,
    kapasite: 10,
    gunlukGider: 400,
    aciklama: 'Genç yetenek sahası. Her gün sabit akademi taksiti gelir + gündüz öğrenci talebi artar.',
  },
  {
    id: 'vip',
    ad: 'VIP Kapalı Saha',
    sahaTipi: 'vip',
    arsaBedeli: 550000,
    insaatBedeli: 1050000,
    baslangicKalitesi: 7,
    kapasite: 6,
    gunlukGider: 800,
    aciklama: 'Kapalı, lüks 5\'lik. Hava şartlarından etkilenmez; kurumsal ve VIP müşteriler daha sık gelir.',
  },
  {
    id: 'arena',
    ad: 'Büyük Arena',
    sahaTipi: 'arena',
    arsaBedeli: 1200000,
    insaatBedeli: 2300000,
    baslangicKalitesi: 8,
    kapasite: 20,
    gunlukGider: 1500,
    aciklama: 'Dev 7\'lik stadyum. Turnuva düzenleme şansı ve prestiji artar; zirve saatlerde en yüksek gelir.',
  },
];

// Saha tipi bilgisi (arayüzde renk/emoji için)
export const SAHA_TIP_BILGI: Record<SahaTipi, { emoji: string; renk: string }> = {
  yildiz: { emoji: '⭐', renk: '#F59E0B' },
  cocuk: { emoji: '🧒', renk: '#34D399' },
  akademi: { emoji: '🎓', renk: '#60A5FA' },
  vip: { emoji: '👑', renk: '#A78BFA' },
  arena: { emoji: '🏟️', renk: '#F87171' },
};

// Yeni saha için inşaat aşamaları (toplam bedeli 4 eşit aşamaya böler)
export function insaatAsamalari(def: PitchDefinition): YildizAsama[] {
  const parca = Math.floor(def.insaatBedeli / 4 / 1000) * 1000;
  const son = def.insaatBedeli - parca * 3;
  return [
    { asama: 2, label: 'Zemin Hazırlığı', aciklama: 'Arsa temizlenir, zemin düzlenip silindirlenir', cost: parca, enerji: 12 },
    { asama: 3, label: 'Kaplama, Kale ve Çizgiler', aciklama: 'Saha zemini döşenir, kaleler ve çizgiler kurulur', cost: parca, enerji: 15 },
    { asama: 4, label: 'Çevre Düzenlemeleri', aciklama: 'Tel örgüler, duvarlar ve çevre güvenliği tamamlanır', cost: parca, enerji: 8 },
    { asama: 5, label: 'Aydınlatma ve Açılış', aciklama: 'Projektörler kurulur, saha hizmete girer', cost: son, enerji: 10 },
  ];
}

// ============================================
// === SAHA BAŞI YÜKSELTMELER (16 KALEM) ===
// ============================================
// Bu katalog HER saha için ayrı ayrı geçerli — Yıldız Sahaya tribün
// alırken VIP sahaya almazsın. Etkiler:
//   fiyatEki       → saha fiyat primi (0.04 = seviye başına +%4)
//   memnuniyetEki  → gün sonu memnuniyet puanı (seviye başına)
//   talepEki       → ek rezervasyon şansı (seviye başına, 1 = +1 teklif)
//   gunlukGelirEki → pasif günlük gelir ₺ (seviye başına)
//   prestijEki     → seviye başına ek prestij (gün sonunda)
//   enerjiIndirimi → rezervasyon enerji indirimi (seviye başına)
//   havaKoruma     → karlı/fırtınalı gün gelir cezasını yarıya indirir

export interface PitchUpgradeDef {
  id: string;
  emoji: string;
  ad: string;
  aciklama: string;
  maksSeviye: number;
  seviyeMaliyetleri: number[]; // seviye 1, 2, 3... maliyetleri
  enerji: number;
  etki: string;
  fiyatEki?: number;
  memnuniyetEki?: number;
  talepEki?: number;
  gunlukGelirEki?: number;
  prestijEki?: number;
  enerjiIndirimi?: number;
  havaKoruma?: boolean;
}

export const PITCH_UPGRADE_CONFIG: Record<string, PitchUpgradeDef> = {
  telOrgu: {
    id: 'telOrgu', emoji: '🕸️', ad: 'Yükseltilmiş Tel Örgü',
    aciklama: 'Çift katlı, 6 metre tel örgü. Top kaçmaz, komşu bahçeler güvende.',
    maksSeviye: 2, seviyeMaliyetleri: [15000, 25000], enerji: 6,
    etki: 'Saha fiyatı +%2 ve memnuniyet +1 (seviye başına)',
    fiyatEki: 0.02, memnuniyetEki: 1,
  },
  tribun: {
    id: 'tribun', emoji: '🏟️', ad: 'Tribün',
    aciklama: '250 kişilik tribün. Taraftar gelirse maç havası bambaşka olur.',
    maksSeviye: 3, seviyeMaliyetleri: [40000, 70000, 120000], enerji: 10,
    etki: 'Fiyat +%4, memnuniyet +2, prestij +2 (seviye başına)',
    fiyatEki: 0.04, memnuniyetEki: 2, prestijEki: 2,
  },
  otopark: {
    id: 'otopark', emoji: '🅿️', ad: 'Otopark',
    aciklama: 'Valeli otopark. Ofis ekipleri ve kurumsal ligler park yeri olmadan gelmez.',
    maksSeviye: 2, seviyeMaliyetleri: [30000, 60000], enerji: 8,
    etki: 'Fiyat +%3 (seviye başına). Tam seviyede +1 rezervasyon teklifi',
    fiyatEki: 0.03, talepEki: 0.5,
  },
  kamera: {
    id: 'kamera', emoji: '📹', ad: 'Güvenlik Kameraları',
    aciklama: '4K kamera sistemi. Araba calınmaz, kavga çıkmaz, herkes rahat.',
    maksSeviye: 2, seviyeMaliyetleri: [12000, 20000], enerji: 4,
    etki: 'Memnuniyet +1 ve fiyat +%1 (seviye başına)',
    memnuniyetEki: 1, fiyatEki: 0.01,
  },
  isitma: {
    id: 'isitma', emoji: '🔥', ad: 'Saha Isıtıcıları',
    aciklama: 'Kızılötesi ısıtıcılar. Karlı günlerde bile saha sıcak, maç iptal olmaz.',
    maksSeviye: 2, seviyeMaliyetleri: [25000, 45000], enerji: 7,
    etki: 'Karlı/fırtınalı gün gelir cezası yarıya iner (tam seviyede tamamen biter)',
    havaKoruma: true, memnuniyetEki: 1,
  },
  skorboard: {
    id: 'skorboard', emoji: '📊', ad: 'Elektronik Skorboard',
    aciklama: 'Skor, dakika ve sponsor reklamı gösteren dev panel.',
    maksSeviye: 2, seviyeMaliyetleri: [35000, 60000], enerji: 8,
    etki: 'Fiyat +%3 ve memnuniyet +2 (seviye başına)',
    fiyatEki: 0.03, memnuniyetEki: 2,
  },
  reklam: {
    id: 'reklam', emoji: '📺', ad: 'Reklam Panoları',
    aciklama: 'Lokantaya, kuaföre, eczacıya pano kirala. Maç olmasa da para girer.',
    maksSeviye: 3, seviyeMaliyetleri: [20000, 40000, 80000], enerji: 5,
    etki: 'Günde +500₺ pasif reklam geliri (seviye başına)',
    gunlukGelirEki: 500,
  },
  vipLoca: {
    id: 'vipLoca', emoji: '🥂', ad: 'VIP Loca',
    aciklama: 'Camdan loca, ikramlı. Patronlar buradan maç izler, burada anlaşma olur.',
    maksSeviye: 2, seviyeMaliyetleri: [100000, 180000], enerji: 12,
    etki: 'Fiyat +%8 ve prestij +3 (seviye başına)',
    fiyatEki: 0.08, prestijEki: 3, memnuniyetEki: 1,
  },
  kale: {
    id: 'kale', emoji: '🥅', ad: 'Profesyonel Kale',
    aciklama: 'FIFA standartlarında, ağlı, dikişli kaleler. Amatör kale darbeleri biter.',
    maksSeviye: 2, seviyeMaliyetleri: [8000, 15000], enerji: 3,
    etki: 'Memnuniyet +1 (seviye başına)',
    memnuniyetEki: 1,
  },
  topSeti: {
    id: 'topSeti', emoji: '⚽', ad: 'Top Seti',
    aciklama: 'Numaralı, şişirilmiş, yedekli top seti. Yarım top maçı keyfini bozar.',
    maksSeviye: 3, seviyeMaliyetleri: [5000, 10000, 18000], enerji: 3,
    etki: 'Memnuniyet +1 (seviye başına)',
    memnuniyetEki: 1,
  },
  yedekKulubesi: {
    id: 'yedekKulubesi', emoji: '🪑', ad: 'Yedek Kulübesi',
    aciklama: 'Kanopili, koltuklu yedek kulübesi. Kaptan ile antrenör artık ayakta beklemiyor.',
    maksSeviye: 2, seviyeMaliyetleri: [12000, 22000], enerji: 4,
    etki: 'Memnuniyet +1 (seviye başına)',
    memnuniyetEki: 1,
  },
  sesSistemi: {
    id: 'sesSistemi', emoji: '🔊', ad: 'Ses Sistemi',
    aciklama: 'Anons ve müzik sistemi. Gol sesi, tebrik sesi — atmosfer değişir.',
    maksSeviye: 2, seviyeMaliyetleri: [18000, 30000], enerji: 5,
    etki: 'Memnuniyet +2 ve fiyat +%2 (seviye başına)',
    memnuniyetEki: 2, fiyatEki: 0.02,
  },
  wifi: {
    id: 'wifi', emoji: '📶', ad: 'Wi-Fi',
    aciklama: 'Hızlı internet. Ofis ekipleri maç sonrası toplantıyı bile burada yapıyor.',
    maksSeviye: 2, seviyeMaliyetleri: [10000, 20000], enerji: 3,
    etki: 'Memnuniyet +1 (seviye başına)',
    memnuniyetEki: 1,
  },
  turnike: {
    id: 'turnike', emoji: '🎫', ad: 'Turnike Sistemi',
    aciklama: 'Kartlı turnike. Kaçak giren olmaz, personel kapıda beklemiyor.',
    maksSeviye: 2, seviyeMaliyetleri: [25000, 40000], enerji: 5,
    etki: 'Her rezervasyonun enerji maliyeti -1 (tam seviyede -2)',
    enerjiIndirimi: 1,
  },
  ilkYardim: {
    id: 'ilkYardim', emoji: '⛑️', ad: 'İlk Yardım İstasyonu',
    aciklama: 'Sedefli dolap, buz paketleri, sargı bezi. Sakatlıkta ilk müdahale senin.',
    maksSeviye: 2, seviyeMaliyetleri: [8000, 14000], enerji: 3,
    etki: 'Memnuniyet +1 (seviye başına)',
    memnuniyetEki: 1,
  },
  soyunmaDolabi: {
    id: 'soyunmaDolabi', emoji: '🔒', ad: 'Kilitli Soyunma Dolapları',
    aciklama: 'Anahtar kartlı dolaplar. Telefon cüzdan kasma derdi biter.',
    maksSeviye: 2, seviyeMaliyetleri: [15000, 28000], enerji: 4,
    etki: 'Memnuniyet +1 ve fiyat +%1 (seviye başına)',
    memnuniyetEki: 1, fiyatEki: 0.01,
  },
  // === TESIS KALEMLERI — artik her saha icin ayri ayri alinir ===
  // (isletmedeki kart kaldirildi; id'ler eski global anahtarlarla ayni:
  //  Yildiz Saha'daki mevcut seviyeleriniz oldugu gibi korunur)
  bakim: {
    id: 'bakim', emoji: '🔧', ad: 'Saha Bakımı',
    aciklama: 'Düzenli bakım: çim, çizgi, kale ağı her zaman uçar.',
    maksSeviye: 3, seviyeMaliyetleri: [20000, 35000, 60000], enerji: 10,
    etki: 'Memnuniyet +2 ve fiyat +%1 (seviye başına)',
    memnuniyetEki: 2, fiyatEki: 0.01,
  },
  haliYenileme: {
    id: 'haliYenileme', emoji: '🟩', ad: 'Halı Yenileme',
    aciklama: 'Yeni halı: top hızlı keser, şikayet biter.',
    maksSeviye: 2, seviyeMaliyetleri: [45000, 80000], enerji: 12,
    etki: 'Memnuniyet +3 ve fiyat +%2 (seviye başına)',
    memnuniyetEki: 3, fiyatEki: 0.02,
  },
  aydinlatma: {
    id: 'aydinlatma', emoji: '💡', ad: 'Aydınlatma',
    aciklama: 'Projektör kademesi artar; gece maçları uzar.',
    maksSeviye: 3, seviyeMaliyetleri: [50000, 90000, 140000], enerji: 10,
    etki: 'Fiyat +%3 ve memnuniyet +1 (seviye başına)',
    fiyatEki: 0.03, memnuniyetEki: 1,
  },
  dusSoyunma: {
    id: 'dusSoyunma', emoji: '🚿', ad: 'Duş ve Soyunma',
    aciklama: 'Sıcak duş + dolaplı soyunma. Takımlar bir daha gitmez başka yere.',
    maksSeviye: 2, seviyeMaliyetleri: [35000, 65000], enerji: 8,
    etki: 'Memnuniyet +2 ve +0.5 rezervasyon teklifi (seviye başına)',
    memnuniyetEki: 2, talepEki: 0.5,
  },
  kantin: {
    id: 'kantin', emoji: '🥤', ad: 'Kantin',
    aciklama: 'Match sonrası tost, ayran, çay. Günde pasif gelir.',
    maksSeviye: 3, seviyeMaliyetleri: [30000, 55000, 90000], enerji: 6,
    etki: 'Günde +800₺ pasif kantin geliri (seviye başına)',
    gunlukGelirEki: 800,
  },
  sponsor: {
    id: 'sponsor', emoji: '🤝', ad: 'Sponsor',
    aciklama: 'Mahallenin esnafı panoya yıllık yatar.',
    maksSeviye: 3, seviyeMaliyetleri: [60000, 110000, 180000], enerji: 6,
    etki: 'Günde +1.200₺ pasif gelir ve +1 prestij (seviye başına)',
    gunlukGelirEki: 1200, prestijEki: 1,
  },
};

// Arayüzde sıralı liste için kolaylık
export const PITCH_UPGRADE_LISTE: PitchUpgradeDef[] = Object.values(PITCH_UPGRADE_CONFIG);

// Sahanın mevcut seviyesinden sonraki seviyenin maliyeti (maks ise null)
export function pitchUpgradeMaliyeti(def: PitchUpgradeDef, mevcutSeviye: number): number | null {
  const seviye = Math.max(0, Math.floor(mevcutSeviye));
  if (seviye >= def.maksSeviye) return null;
  return def.seviyeMaliyetleri[seviye] ?? null;
}

// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===
