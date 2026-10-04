// ============================================
// BEŞLİ PATRON — Oyun Yapılandırması
// ============================================

// === TEMEL EKONOMİ ===
export const INITIAL_NAKIT = 25000;
export const INITIAL_ENERJI = 80;
export const MAX_ENERJI = 100;
export const INITIAL_SAHA_KALITESI = 4;
export const INITIAL_GUN = 1;
export const DAILY_KIRA = 3500;
export const DAILY_ELEKTRIK_SU = 900;
export const DAILY_GIDER = DAILY_KIRA + DAILY_ELEKTRIK_SU;
export const ENERJI_REZERVASYON = 5;
export const ENERJI_BAKIM = 10;
export const ENERJI_UPGRADE = 15;
export const ENERJI_GUN_SONU = 40;
export const JETON_GOREV_ODUL = 50;
export const JETON_ENERJI_COST = 20;
export const JETON_ENERJI_GAIN = 30;
export const IFLAS_GUN_LIMIT = 3;

// === SAAT SLOTLARI (1 saatlik, 10:00 açılış — 02:00-03:00 son maç) ===
// Zirve talep: 22:00-23:00. Talep eğrisi gameLogic.ts'te SLOT_TALEP ile eşleşir.
export const TIME_SLOTS = [
  { id: 'sabah1', label: 'Sabah', saat: '10:00-11:00' },
  { id: 'sabah2', label: 'Sabah', saat: '11:00-12:00' },
  { id: 'oglen1', label: 'Öğlen', saat: '12:00-13:00' },
  { id: 'oglen2', label: 'Öğlen', saat: '13:00-14:00' },
  { id: 'ikindi1', label: 'İkindi', saat: '14:00-15:00' },
  { id: 'ikindi2', label: 'İkindi', saat: '15:00-16:00' },
  { id: 'ikindi3', label: 'İkindi', saat: '16:00-17:00' },
  { id: 'aksam1', label: 'Akşam', saat: '17:00-18:00' },
  { id: 'aksam2', label: 'Akşam', saat: '18:00-19:00' },
  { id: 'aksam3', label: 'Akşam', saat: '19:00-20:00' },
  { id: 'gece1', label: 'Gece', saat: '20:00-21:00' },
  { id: 'gece2', label: 'Gece', saat: '21:00-22:00' },
  { id: 'gece3', label: 'Gece ★Zirve', saat: '22:00-23:00' },
  { id: 'gece4', label: 'Gece', saat: '23:00-00:00' },
  { id: 'gece5', label: 'Gece', saat: '00:00-01:00' },
  { id: 'gece6', label: 'Gece', saat: '01:00-02:00' },
  { id: 'gece7', label: 'Gece', saat: '02:00-03:00' },
] as const;

// === MÜŞTERİ TİPLERİ (saatlik fiyat bandı: 3.000₺ - 10.000₺) ===
export const MUSTERI_TIPLERI = {
  mahalle: {
    emoji: '🏘️',
    label: 'Mahalle Takımı',
    isimler: ['Tuncay', 'Hasan Bey', 'Sefa', 'Kerem', 'Emre', 'Yusuf Abi', 'Mert'],
    minFiyat: 3800,
    maxFiyat: 5200,
    minKisi: 6,
    maxKisi: 12,
    tercihSlotlar: ['aksam2', 'aksam3', 'gece1', 'gece2'],
  },
  ogrenci: {
    emoji: '🎓',
    label: 'Öğrenci Grubu',
    isimler: ['Berk', 'Doruk', 'Emirhan', 'Yağız', 'Arda', 'Burak', 'Can'],
    minFiyat: 3000,
    maxFiyat: 4200,
    minKisi: 4,
    maxKisi: 10,
    tercihSlotlar: ['oglen1', 'oglen2', 'ikindi1'],
  },
  ofis: {
    emoji: '👔',
    label: 'Ofis Ekibi',
    isimler: ['Serdar Bey', 'Murat Bey', 'Tolga', 'Cem Bey', 'Ali Bey', 'Okan Bey', 'Hakan Bey'],
    minFiyat: 5000,
    maxFiyat: 7200,
    minKisi: 5,
    maxKisi: 10,
    tercihSlotlar: ['oglen1', 'oglen2', 'aksam1'],
  },
  amator: {
    emoji: '⚽',
    label: 'Amatör Takım',
    isimler: ['Beylikspor U21', 'Çekmeköy Gençlik', 'Sarıyer Atletik', 'Pendik Stars', 'Bağcılar FK', 'Üsküdar 1903', 'Kadıköy United'],
    minFiyat: 5500,
    maxFiyat: 8200,
    minKisi: 10,
    maxKisi: 20,
    tercihSlotlar: ['aksam1', 'aksam2', 'aksam3', 'gece1', 'gece2', 'gece3'],
  },
  dogumGunu: {
    emoji: '🎂',
    label: 'Doğum Günü Grubu',
    isimler: ['Cansu', 'Onur', 'Elif', 'Barış', 'Pınar', 'Ege', 'Derin'],
    minFiyat: 4500,
    maxFiyat: 6500,
    minKisi: 3,
    maxKisi: 8,
    tercihSlotlar: ['aksam1', 'aksam2', 'gece1'],
  },
  yas50plus: {
    emoji: '🧔',
    label: '50+ Yaş Takımı',
    isimler: ['Mehmet Bey', 'Ali Usta', 'İsmail Bey', 'Rıza Bey', 'Nurettin Bey', 'Şükrü Bey', 'Hüseyin Bey'],
    minFiyat: 3200,
    maxFiyat: 4500,
    minKisi: 6,
    maxKisi: 14,
    tercihSlotlar: ['sabah1', 'sabah2', 'oglen1'],
  },
  kurumsal: {
    emoji: '🏆',
    label: 'Kurumsal Lig Takımı',
    isimler: ['Vadi FC', 'Plaza United', 'Lojistikspor', 'Bankalar SK', 'Teknopark FK', 'Holdingspor', 'Startup United'],
    minFiyat: 7500,
    maxFiyat: 10000,
    minKisi: 12,
    maxKisi: 20,
    tercihSlotlar: ['gece2', 'gece3', 'gece4'],
  },
} as const;

export type MusteriTipi = keyof typeof MUSTERI_TIPLERI;

// === YÜKSELTMELER ===
export const UPGRADE_CONFIG = {
  bakim: {
    emoji: '🔧',
    label: 'Saha Bakımı',
    aciklama: '+1 Saha Kalitesi',
    maxLevel: 3,
    costs: [5000, 10000, 15000],
    enerji: 10,
    kaliteArtis: 1,
  },
  haliYenileme: {
    emoji: '🟩',
    label: 'Halı Yenileme',
    aciklama: '+2 Saha Kalitesi',
    maxLevel: 3,
    costs: [40000, 60000, 80000],
    enerji: 15,
    kaliteArtis: 2,
  },
  aydinlatma: {
    emoji: '💡',
    label: 'Aydınlatma',
    aciklama: 'Gece slotu açılır',
    maxLevel: 3,
    costs: [25000, 37500, 50000],
    enerji: 15,
    kaliteArtis: 0,
  },
  dusSoyunma: {
    emoji: '🚿',
    label: 'Duş/Soyunma',
    aciklama: '+%15 fiyat primi',
    maxLevel: 3,
    costs: [30000, 45000, 60000],
    enerji: 15,
    kaliteArtis: 0,
  },
} as const;

export type UpgradeType = keyof typeof UPGRADE_CONFIG;

// === GÜNLÜK GÖREV HAVUZU ===
export const GOREV_HAVUZU = [
  { id: 'rez2', aciklama: '2 rezervasyon kabul et', hedefTip: 'rezervasyon' as const, hedef: 2 },
  { id: 'rez3', aciklama: '3 rezervasyon kabul et', hedefTip: 'rezervasyon' as const, hedef: 3 },
  { id: 'bakim', aciklama: 'Saha bakımı yap', hedefTip: 'bakim' as const, hedef: 1 },
  { id: 'gelir20000', aciklama: 'Günlük gelirin 20.000₺\'yi geçsin', hedefTip: 'gelir' as const, hedef: 20000 },
  { id: 'ogrenci', aciklama: 'Bir öğrenci grubunu kabul et', hedefTip: 'ogrenciKabul' as const, hedef: 1 },
  { id: 'aksam', aciklama: 'Tüm akşam slotlarını doldur', hedefTip: 'aksamSlot' as const, hedef: 2 },
] as const;

// === HAVA DURUMU ===
export const HAVA_TIPLERI = {
  gunesli: { emoji: '☀️', label: 'Güneşli', rezEtki: 0, fiyatEtki: 1.0 },
  yagmurlu: { emoji: '🌧️', label: 'Yağmurlu', rezEtki: -1, fiyatEtki: 1.05 },
  ruzgarli: { emoji: '🌬️', label: 'Rüzgarlı', rezEtki: 0, fiyatEtki: 0.95 },
  karli: { emoji: '❄️', label: 'Karlı', rezEtki: -2, fiyatEtki: 1.2 },
} as const;

// === KANTİN SİSTEMİ (7 kademe) ===
export interface KantinLevel {
  label: string;
  cost: number;
  musteriBasi: number;
  menu: string[];
  prestij: number;
}

export const KANTIN_CONFIG = {
  label: 'Kantin',
  emoji: '☕',
  levels: [
    { label: 'Su Tezgahı', cost: 4000, musteriBasi: 40, menu: ['Su (0.5 LT)'], prestij: 0 },
    { label: 'Çay Ocağı', cost: 9000, musteriBasi: 80, menu: ['Su (0.5 LT)', 'Tavşan Kanı Çay'], prestij: 0 },
    { label: 'Simit Tezgahı', cost: 16000, musteriBasi: 130, menu: ['Su (0.5 LT)', 'Tavşan Kanı Çay', 'Simit', 'Poğaça'], prestij: 5 },
    { label: 'Tost Makinesi', cost: 25000, musteriBasi: 190, menu: ['Su', 'Çay', 'Simit', 'Karışık Tost', 'Kaşarlı Tost'], prestij: 10 },
    { label: 'Türk Kahvesi Köşesi', cost: 40000, musteriBasi: 260, menu: ['Su', 'Çay', 'Tost', 'Türk Kahvesi (orta)', 'Menengiç Kahvesi'], prestij: 20 },
    { label: 'Buzdolabı & Ayran', cost: 60000, musteriBasi: 340, menu: ['Su', 'Çay', 'Tost', 'Türk Kahvesi', 'Ayran', 'Limonata', 'Kola'], prestij: 30 },
    { label: 'Tam Teşekküllü Kantin', cost: 90000, musteriBasi: 450, menu: ['Su', 'Çay', 'Tost', 'Türk Kahvesi', 'Ayran', 'Sucuklu Kaşarlı Tost', 'Çiğ Börek', 'Kum Fincanı'], prestij: 45 },
  ] as KantinLevel[],
};

// === SPONSOR SİSTEMİ (6 kademe) ===
export interface SponsorLevel {
  label: string;
  cost: number;
  gunlukGelir: number;
  prestij: number;
  not: string;
}

export const SPONSOR_CONFIG = {
  label: 'Sponsorlar',
  emoji: '📢',
  levels: [
    { label: 'Çetin Börek', cost: 3000, gunlukGelir: 200, prestij: 8, not: 'Pano asar, maç sonrası börek ikram eder' },
    { label: 'Demir Oto Lastik', cost: 8000, gunlukGelir: 500, prestij: 15, not: 'Forma yakalarına lastik firması logosu' },
    { label: 'Akman Emlak', cost: 20000, gunlukGelir: 1200, prestij: 25, not: 'Saha kenarına "Kiralık Daire" tabelası' },
    { label: 'Kervan Pide', cost: 45000, gunlukGelir: 2500, prestij: 40, not: 'Maç günü pide servisi, tribün dolar' },
    { label: 'Yıldız Sigorta', cost: 90000, gunlukGelir: 5000, prestij: 60, not: 'Sakatlanan oyuncuya sigorta, mahallede efsane' },
    { label: 'Mega Holding', cost: 200000, gunlukGelir: 12000, prestij: 90, not: 'Sahanın adı "Mega Arena" olur, TV kamerası gelir' },
  ] as SponsorLevel[],
};

// === GÜNÜN OLAYI (20 olay havuzu) ===
export interface OlaySans {
  yuzde: number;
  nakit?: number;
  memnuniyet?: number;
  prestij?: number;
  basariliMesaj: string;
  basarisizMesaj: string;
}

export interface OlayEtki {
  nakit?: number;
  memnuniyet?: number;
  prestij?: number;
  enerji?: number;
  gelirCarpani?: number;
  sans?: OlaySans;
}

export interface OlaySablon {
  id: string;
  emoji: string;
  baslik: string;
  aciklama: string;
  secenekler: { label: string; aciklama: string; etki: OlayEtki }[];
}

export const OLAY_HAVUZU: OlaySablon[] = [
  {
    id: 'komsu_gurultu', emoji: '🏢', baslik: 'Komşu Apartman Şikayeti',
    aciklama: 'Gece maçındaki tezahuratlar yukarıdaki daireleri sarsıyor. Apartman yöneticisi kapıda, kollarını kavuşturmuş.',
    secenekler: [
      { label: "Maçları 21:00'de bitir", aciklama: 'Bugünkü gelirin %20si gider, komşular memnun kalır', etki: { gelirCarpani: 0.8, memnuniyet: 6 } },
      { label: 'Görmezden gel', aciklama: 'Kimse kanıt gösteremez... gösteremez mi?', etki: { sans: { yuzde: 50, nakit: -2000, memnuniyet: -4, basariliMesaj: 'Hiçbir şey olmamış gibi devam etti.', basarisizMesaj: 'Apartman dilekçe verdi: 2.000₺ ceza!' } } },
    ],
  },
  {
    id: 'top_yenile', emoji: '⚽', baslik: 'Toplar Kalsiyumlandı',
    aciklama: 'Toplardan üçü yumurta gibi şişmiş, biri de görünmez olmuş. Kaleci arkadaşı şikayetçi.',
    secenekler: [
      { label: 'Yeni top takımı al (3.000₺)', aciklama: 'Müşteriler fark eder, memnuniyet artar', etki: { nakit: -3000, memnuniyet: 8, prestij: 2 } },
      { label: 'Havasını şiş, idare et', aciklama: 'Top top değil, pepsi kutusu gibi', etki: { memnuniyet: -5 } },
    ],
  },
  {
    id: 'fenomen_vlogs', emoji: '📱', baslik: 'Krampon Vlogs Gelmiş',
    aciklama: "Yerel fenomen 'sahanda son saniye' videosu çekmek istiyor. 40 bin takipçisi var.",
    secenekler: [
      { label: 'Ücretsiz davet et', aciklama: 'Adın duyulur, prestij kazanırsın', etki: { memnuniyet: 5, prestij: 6 } },
      { label: 'Çekim ücreti iste (1.500₺)', aciklama: 'Para para para... ama fenomen kırılabilir', etki: { nakit: 1500, sans: { yuzde: 50, prestij: 4, basariliMesaj: 'Video tık rekoru kırdı, sahanın adı duyuldu!', basarisizMesaj: "Fenomen 'ben ücretsiz çekerim' deyip gitti." } } },
    ],
  },
  {
    id: 'boru_patladi', emoji: '🚿', baslik: 'Soyunma Odasında Sel',
    aciklama: 'Sıcak su borusu patladı, soyunma odası mini su parkına döndü.',
    secenekler: [
      { label: 'Tesisatçıyı çağır (4.500₺)', aciklama: 'Usta yarın gelir, sıcak su geri döner', etki: { nakit: -4500, memnuniyet: 6 } },
      { label: 'Kova koy, geç', aciklama: 'Müşteriler ıslak ayakla maç izler', etki: { nakit: -200, memnuniyet: -7 } },
    ],
  },
  {
    id: 'sigorta_atti', emoji: '💡', baslik: 'Gece Maçında Karanlık',
    aciklama: 'Sigorta attı, 20:00 maçı karanlıkta kaldı. Top nerede, ayak nerede belli değil.',
    secenekler: [
      { label: 'Acil elektrikçi çağır (2.500₺)', aciklama: 'Işıklar açılır, herkes mutlu', etki: { nakit: -2500, memnuniyet: 5 } },
      { label: 'Mum ışığında oynasınlar', aciklama: 'Atmosferik diye geçiştir', etki: { memnuniyet: -8, gelirCarpani: 0.85 } },
    ],
  },
  {
    id: 'mahalle_kupasi', emoji: '🏆', baslik: 'Mahalle Kupası Teklifi',
    aciklama: 'Muhtar finali senin sahana almak istiyor. Tribün dolar, kasa da dolar.',
    secenekler: [
      { label: 'Kupayı düzenle', aciklama: 'Yorucusun ama gelir ve prestij artar', etki: { enerji: -12, memnuniyet: 7, prestij: 3, gelirCarpani: 1.3 } },
      { label: 'Yoğunum, reddet', aciklama: 'Muhtar yüzünü buruşturup gider', etki: { memnuniyet: -3 } },
    ],
  },
  {
    id: 'hali_yikama_zam', emoji: '🧼', baslik: 'Halı Yıkamacı Zam İstiyor',
    aciklama: 'Halı yıkama şirketi ekonomi bahaneyle zam peşinde.',
    secenekler: [
      { label: 'Zamı kabul et (1.800₺)', aciklama: 'Halı parlar, müşteri memnun', etki: { nakit: -1800, memnuniyet: 5 } },
      { label: 'Bu yıl kendim yıkarım', aciklama: 'Sırtın ağırır ama kese ağrımaz', etki: { memnuniyet: -6, enerji: -5 } },
    ],
  },
  {
    id: 'sahaya_kopek', emoji: '🐕', baslik: 'Sahaya Misafir',
    aciklama: "Komşunun köpeği Köpe, sahaya girip orta yuvarlağa yattı. Kalkmıyor.",
    secenekler: [
      { label: 'Mamayı kap, müşteri ol', aciklama: 'Köpe maskot olur, hikaye sosyal medyada döner', etki: { nakit: -300, memnuniyet: 4, prestij: 1 } },
      { label: 'Kovacıyı ara', aciklama: 'Köpe alınır, birkaç müşteri üzülür', etki: { memnuniyet: -3 } },
    ],
  },
  {
    id: 'fatura_bombasi', emoji: '⚡', baslik: 'Fatura Bombası',
    aciklama: 'Elektrik faturası tahmininin çok üstünde çıktı. Zarfı açmaya korkuyorsun.',
    secenekler: [
      { label: 'Anında öde (2.500₺)', aciklama: 'Kese ağrır, vicdan rahat kalır', etki: { nakit: -2500, memnuniyet: 2 } },
      { label: 'Ertele', aciklama: 'Belki bu ay yırtarsın?', etki: { sans: { yuzde: 40, nakit: -4000, basariliMesaj: 'Ödeme kolaylığı tanındı, bu kez yırttın.', basarisizMesaj: 'Erteleme faizi geldi: 4.000₺ ödedin!' } } },
    ],
  },
  {
    id: 'yeni_rakip', emoji: '🆚', baslik: 'Karşı Sokakta Yeni Saha',
    aciklama: 'LED ışıklı, kafeteryalı, tuvaleti bile parlayan bir saha açıldı. Müşteriler konuşuyor.',
    secenekler: [
      { label: 'Fiyat indirimi yap', aciklama: 'Bugünkü gelir %10 düşer, kalabalık sadık kalır', etki: { gelirCarpani: 0.9, memnuniyet: 6 } },
      { label: 'Hiç umursama', aciklama: 'Biz buradayken onlar daha yoktu', etki: { sans: { yuzde: 40, memnuniyet: -6, basariliMesaj: 'Müşteriler sadık çıktı, kimse gitmedi.', basarisizMesaj: 'Üç eski müşteri rakip sahaya geçti!' } } },
    ],
  },
  {
    id: 'cocuk_akademisi', emoji: '🧒', baslik: 'Cumartesi Akademisi',
    aciklama: 'Bir grup veli, çocuklar için haftalık futbol okulu istiyor. Geleceğin yıldızları belki buradan çıkar.',
    secenekler: [
      { label: 'Kur, sabahları onlara ayır', aciklama: 'Yatırım ve iyi duyulma', etki: { nakit: -2000, memnuniyet: 6, prestij: 5 } },
      { label: 'Bize çocuk lazım değil', aciklama: 'Veliler başka kapılara yöneldi', etki: { memnuniyet: -2 } },
    ],
  },
  {
    id: 'elektrik_kesintisi', emoji: '🔌', baslik: 'Bölgede Kesinti',
    aciklama: 'Belediye bakım için elektrikleri kesecek. Akşam saatleri tehlikede.',
    secenekler: [
      { label: 'Jeneratör kirala (3.500₺)', aciklama: 'Maçlar kesintisiz, herkes hayran', etki: { nakit: -3500, memnuniyet: 4 } },
      { label: 'Gün ışığında oynayın', aciklama: 'Akşam gelirinin %20si gider', etki: { gelirCarpani: 0.8, memnuniyet: -4 } },
    ],
  },
  {
    id: 'pano_reklam', emoji: '🎨', baslik: 'Esnaf Reklam Panosu İstiyor',
    aciklama: "Karşıdaki esnaf sahaya 'Çetin Börek' panosu asmak istiyor. Para öneriyor.",
    secenekler: [
      { label: 'Panoyu sat (2.000₺)', aciklama: 'Kazanç hızlı ama görüntü kirlenir', etki: { nakit: 2000, memnuniyet: -2 } },
      { label: 'Saham temiz kalsın', aciklama: 'Estetik anlayışın takdir edilir', etki: { memnuniyet: 3, prestij: 1 } },
    ],
  },
  {
    id: 'sicak_dalgasi', emoji: '🔥', baslik: 'Kavurucu Sıcak',
    aciklama: 'Termometre 38 dereceyi gösteriyor, saha tencere gibi. Oyuncular buharlaşıyor.',
    secenekler: [
      { label: 'Şemsiye + su ikramı (1.200₺)', aciklama: 'Müşteri serinler, memnuniyet artar', etki: { nakit: -1200, memnuniyet: 6 } },
      { label: 'Sıcaksa içsinler', aciklama: 'Riskli ama bedava', etki: { sans: { yuzde: 50, memnuniyet: -5, basariliMesaj: 'Müşteriler dayandı, kimse kızmazdan gelmedi.', basarisizMesaj: 'İki maç yarıda kaldı, müşteri küfretti!' } } },
    ],
  },
  {
    id: 'ses_sistemi', emoji: '🔊', baslik: 'Tezahurat Sistemi Bozuldu',
    aciklama: 'Hoparlörden yalnızca cızırtı çıkıyor. Gol atınca dili dolanıyor.',
    secenekler: [
      { label: 'Tamirat yaptır (1.500₺)', aciklama: 'Anonslar tekrar net', etki: { nakit: -1500, memnuniyet: 4 } },
      { label: 'Cızırtı da atmosferdir', aciklama: 'Retro saha konsepti', etki: { memnuniyet: -3 } },
    ],
  },
  {
    id: 'hali_kopuk', emoji: '🟩', baslik: 'Halının Köşesi Koptu',
    aciklama: "Kale önünde halı koptu, top oraya gidince 'öfff' diyor. Bilenler bilir.",
    secenekler: [
      { label: 'Usta + yapıştırıcı (2.200₺)', aciklama: 'Saha pürüzsüz olur', etki: { nakit: -2200, memnuniyet: 5 } },
      { label: 'Koni koy, oradan oynamayın', aciklama: 'Müşteri kurallara alışmak zorunda', etki: { memnuniyet: -5 } },
    ],
  },
  {
    id: 'gazoz_sponsor', emoji: '🥤', baslik: 'Gazoz Firması Kapıda',
    aciklama: "'Torpil Gazozu' bir günlük saha reklamı için teklif getirdi. Şişeler soğuk, teklif sıcak.",
    secenekler: [
      { label: 'Anlaşmayı imzala', aciklama: 'Nakit ve gazoz hediyesi', etki: { nakit: 2500, memnuniyet: 1, prestij: 2 } },
      { label: 'Marka bizi küçük düşürür', aciklama: 'İlkeli duruş, saygınlık', etki: { memnuniyet: 2, prestij: 3 } },
    ],
  },
  {
    id: 'belediye_duzenleme', emoji: '🌳', baslik: 'Belediye Çevre Düzenlemesi',
    aciklama: 'Belediye sahanın çevresine yasemin dikip boyalı yol çizmek istiyor. Personel istiyorlar.',
    secenekler: [
      { label: 'Destekle, elini taşın altına koy', aciklama: 'Saha çevresi güzellenir', etki: { enerji: -8, memnuniyet: 5, prestij: 3 } },
      { label: 'Sahama dokunma', aciklama: 'Belediye ekibi başka sokağa döner', etki: { sans: { yuzde: 30, nakit: -1500, basariliMesaj: 'Belediye başka sokağa yöneldi, sorun yok.', basarisizMesaj: 'Kaldırım ihlali cezası: 1.500₺!' } } },
    ],
  },
  {
    id: 'akilli_kilit', emoji: '🔐', baslik: 'Akıllı Kilit Satıcısı',
    aciklama: "Kapıya şifreli kilit takıyorlar: 'artık kasiyer tatile çıkar' diyorlar.",
    secenekler: [
      { label: 'Tak (4.000₺)', aciklama: 'Modernleşme, memnuniyet ve prestij', etki: { nakit: -4000, memnuniyet: 3, prestij: 2 } },
      { label: 'Anahtarımız kâğıda yeter', aciklama: 'Geleneksel yöntem devam', etki: {} },
    ],
  },
  {
    id: 'viral_video', emoji: '🌠', baslik: 'Sosyal Medyada Viral',
    aciklama: 'Sahadan bir gol videosu fenomen oldu. Hafta sonu akını bekleniyor, kapı kırılabilir.',
    secenekler: [
      { label: 'Ekstra gece seansı aç', aciklama: 'Enerji yakar ama gelir %35 artar', etki: { enerji: -10, memnuniyet: 3, gelirCarpani: 1.35 } },
      { label: 'Sakin kalmaya devam', aciklama: 'Kontrollü büyüme', etki: { memnuniyet: 1 } },
    ],
  },
];

// === SEZON SİSTEMİ (30 gün) — yeni ekonomiye göre güncellendi ===
export const SEZON_CONFIG = {
  uzunluk: 30,
  hedefTaban: 650000,
  hedefArtis: 450000,
  odulJeton: 200,
  odulPrestij: 50,
};

// === SADIK MÜŞTERİ SİSTEMİ ===
export const SADIK_CONFIG = {
  sans: 0.5,
  memnuniyetEsigi: 60,
  fiyatPrim: 1.15,
  redMemnuniyetCezasi: 5,
};

// === YAŞAM SİSTEMİ ===
export interface LifeItemConfig {
  id: string;
  emoji: string;
  label: string;
  aciklama: string;
  kategori: 'ulasim' | 'konut' | 'luks';
  levels: { label: string; cost: number; prestij: number }[];
  requiredPrestij: number;
}

export const LIFE_ITEMS: LifeItemConfig[] = [
  {
    id: 'bisiklet',
    emoji: '🚲',
    label: 'Bisiklet',
    aciklama: 'Sahaya ulaşım kolaylaşır',
    kategori: 'ulasim',
    levels: [{ label: 'Bisiklet', cost: 15000, prestij: 5 }],
    requiredPrestij: 0,
  },
  {
    id: 'motosiklet',
    emoji: '🏍️',
    label: 'Motosiklet',
    aciklama: 'Daha hızlı ulaşım',
    kategori: 'ulasim',
    levels: [
      { label: 'Mondo 125', cost: 85000, prestij: 10 },
      { label: 'Yamasa R1 (Sıfır, Kaçtı Abi!)', cost: 195000, prestij: 20 },
    ],
    requiredPrestij: 10,
  },
  {
    id: 'araba',
    emoji: '🚗',
    label: 'Araba',
    aciklama: 'Prestijli ulaşım',
    kategori: 'ulasim',
    levels: [
      { label: 'Murat 131 (İkinci El)', cost: 120000, prestij: 15 },
      { label: 'Şahin 1.6 (Boyasız, Değişensiz)', cost: 300000, prestij: 25 },
      { label: 'Anka S4 (Sıfır Sedan)', cost: 750000, prestij: 40 },
      { label: 'Renkot Megano GT', cost: 1200000, prestij: 50 },
      { label: 'BMV 520i (Cam Tavan)', cost: 2200000, prestij: 60 },
      { label: 'Merçedes E200 Klas', cost: 3500000, prestij: 72 },
      { label: 'Porş Kayen Turbo', cost: 7000000, prestij: 85 },
      { label: 'Rols Röys Fantom', cost: 20000000, prestij: 100 },
    ],
    requiredPrestij: 30,
  },
  {
    id: 'ev_kira',
    emoji: '🛚️',
    label: 'Kiralık Daire',
    aciklama: 'Kendi evin olsun',
    kategori: 'konut',
    levels: [
      { label: '1+1 Kiralık (Asansörsüz)', cost: 60000, prestij: 5 },
      { label: '2+1 Kiralık (Balkonlu)', cost: 120000, prestij: 8 },
    ],
    requiredPrestij: 0,
  },
  {
    id: 'ev',
    emoji: '🏠',
    label: 'Evin',
    aciklama: 'Evlilik taşının altına imza at',
    kategori: 'konut',
    levels: [
      { label: '2+1 Satılık Daire (Krediyle)', cost: 1200000, prestij: 20 },
      { label: '3+2 Satılık Daire (Site İçi)', cost: 2900000, prestij: 35 },
      { label: 'Villa (Bahçeli, Havuzlu)', cost: 7500000, prestij: 55 },
    ],
    requiredPrestij: 25,
  },
  {
    id: 'telefon',
    emoji: '📱',
    label: 'Telefon',
    aciklama: 'Rezervasyonlar artık şık bir telefondan yönetiliyor',
    kategori: 'luks',
    levels: [
      { label: 'Kelepir Telefon', cost: 12000, prestij: 2 },
      { label: 'Bay Yenilik 12', cost: 38000, prestij: 6 },
      { label: 'Elma Pro Max (256 GB)', cost: 115000, prestij: 12 },
    ],
    requiredPrestij: 5,
  },
  {
    id: 'saat',
    emoji: '⌚',
    label: 'Kol Saati',
    aciklama: 'Maç saati mi? Patron saati mi?',
    kategori: 'luks',
    levels: [
      { label: 'Koleksiyon Saat', cost: 18000, prestij: 8 },
      { label: 'Altın Kaplama Saat', cost: 220000, prestij: 20 },
      { label: 'Rols Röys Kol Saati', cost: 2400000, prestij: 40 },
    ],
    requiredPrestij: 20,
  },
];

// === KIZ ARKADAŞ SİSTEMİ ===
export const KIZ_ARKADAS_CONFIG = {
  baslangicSeviye: 0,
  maxSeviye: 10,
  bulusmaCost: 2000,
  bulusmaEnerji: 8,
  bulusmaSeviyeArtis: 1,
  hediyeCost: 7500,
  hediyeSeviyeArtis: 2,
  seviyeBasinaPrestij: 5,
  evlilikSeviye: 10,
  evlilikPrestij: 150,
  requiredPrestij: 50,
  // 10 kademe: yasam.tsx bu listeyi okur (emoji, label, cost, prestij)
        levels: [
    { emoji: '☕', label: 'Kahve İçtik', cost: 10000, prestij: 5 },
    { emoji: '🎬', label: 'Sinema Randevusu', cost: 18000, prestij: 8 },
    { emoji: '🍴', label: 'Akşam Yemeği', cost: 30000, prestij: 10 },
    { emoji: '🎁', label: 'İlk Hediye', cost: 45000, prestij: 12 },
    { emoji: '💑', label: 'Sevgili Olduk', cost: 65000, prestij: 15 },
    { emoji: '🌴', label: 'Tatil Kaçamağı', cost: 90000, prestij: 18 },
    { emoji: '💍', label: 'Nişanlandık', cost: 125000, prestij: 25 },
    { emoji: '🏡', label: 'Ev Kiraladık', cost: 170000, prestij: 30 },
    { emoji: '👶', label: 'Çocuk Sahibi Olduk', cost: 230000, prestij: 40 },
    { emoji: '💒', label: 'Evlendik', cost: 300000, prestij: 60 },
  ],
};

// === ŞEHİRLER ===
export interface CityConfig {
  id: string;
  ad: string;
  emoji: string;
  aciklama: string;
  kiraGunluk: number;
  elektrikSuGunluk: number;
  fiyatCarpan: number;
  requiredPrestij: number;
}

export const CITIES: CityConfig[] = [
  { id: 'istanbul', ad: 'İstanbul', emoji: '🌉', aciklama: 'Her şeyin başladığı şehir. Kira yüksek, rekabet de yüksek.', kiraGunluk: 3500, elektrikSuGunluk: 900, fiyatCarpan: 1.0, requiredPrestij: 0 },
  { id: 'ankara', ad: 'Ankara', emoji: '🏛️', aciklama: 'İşler burada yürür, kira bir tık hafifler.', kiraGunluk: 2800, elektrikSuGunluk: 750, fiyatCarpan: 0.9, requiredPrestij: 150 },
  { id: 'izmir', ad: 'İzmir', emoji: '🌊', aciklama: 'Ege teridir ama sahayı deniz götürür.', kiraGunluk: 3000, elektrikSuGunluk: 800, fiyatCarpan: 0.95, requiredPrestij: 400 },
  { id: 'antalya', ad: 'Antalya', emoji: '🌴', aciklama: 'Turist akını var, zirve saatler yaz kış dolu.', kiraGunluk: 3200, elektrikSuGunluk: 850, fiyatCarpan: 1.05, requiredPrestij: 800 },
  { id: 'bursa', ad: 'Bursa', emoji: '🏔️', aciklama: 'İskender bahanesiyle maç sonrası ekip kaynamaz mı?', kiraGunluk: 2600, elektrikSuGunluk: 700, fiyatCarpan: 0.88, requiredPrestij: 1400 },
];

// === PERSONEL SİSTEMİ ===
export interface StaffLevelConfig {
  label: string;
  maas: number;
  etki: string;
}

export interface StaffConfig {
  id: string;
  ad: string;
  emoji: string;
  aciklama: string;
  iseAlimUcreti: number;
  levels: StaffLevelConfig[];
}

export const STAFF_CONFIG: StaffConfig[] = [
  {
    id: 'kasiyer',
    ad: 'Kasiyer',
    emoji: '🧾',
    aciklama: 'Rezervasyon başına enerji maliyetini düşürür',
    iseAlimUcreti: 3000,
    levels: [
      { label: 'Stajyer Kasiyer', maas: 500, etki: 'Rezervasyon enerjisi -2⚡' },
      { label: 'Kıdemli Kasiyer', maas: 1200, etki: 'Rezervasyon enerjisi -2⚡, hızlı kayıt' },
    ],
  },
  {
    id: 'guvenlik',
    ad: 'Güvenlik',
    emoji: '🦺',
    aciklama: 'Günü kazasız geçirir, müşteri kalabalığını artırır',
    iseAlimUcreti: 4000,
    levels: [
      { label: 'Gece Güvenliği', maas: 800, etki: '+1 rezervasyon teklifi' },
      { label: 'Koruma Ekibi', maas: 1800, etki: '+1 rezervasyon teklifi, kavgasız gece' },
    ],
  },
  {
    id: 'temizlikci',
    ad: 'Temizlik Görevlisi',
    emoji: '🧹',
    aciklama: 'Sahayı tertemiz tutar, memnuniyeti yükseltir',
    iseAlimUcreti: 2500,
    levels: [
      { label: 'Temizlik Görevlisi', maas: 450, etki: 'Günlük memnuniyet +2' },
      { label: 'Ekip Şefi', maas: 1000, etki: 'Günlük memnuniyet +2, saha daha uzun dayanır' },
    ],
  },
  {
    id: 'antrenor',
    ad: 'Antrenör',
    emoji: '📣',
    aciklama: 'Turnuvalarda şansını artırır',
    iseAlimUcreti: 6000,
    levels: [
      { label: 'Gençlik Antrenörü', maas: 1500, etki: 'Turnuva şansı +10%' },
      { label: 'Teknik Direktör', maas: 3200, etki: 'Turnuva şansı +10%, kupada kazanç artışı' },
    ],
  },
];

// === TURNUVA SİSTEMİ ===
export const TURNUVA_CONFIG = {
  aralikGun: 7,
  minKalite: 5,
  katilimBedeli: 5000,
  turnuvaIsimleri: [
    'Mahalle Kupası', 'Esnaf Turnuvası', 'Ramazan Kupası', 'Çim vs Halı Kupası',
    'Bölge Şampiyonası', 'Kurumsal Lig Finali', 'Yıldızlar Turnuvası', 'Kış Kupası',
  ],
  sonuclar: {
    birincilik: { kazanc: 60000, prestij: 30 },
    ikincilik: { kazanc: 30000, prestij: 18 },
    ucunculuk: { kazanc: 12000, prestij: 10 },
    katilim: { kazanc: 0, prestij: 2 },
  },
} as const;

// === MEMNUNİYET SİSTEMİ ===
export const MEMNUNIYET_CONFIG = {
  baslangic: 50,
  minMemnuniyet: 10,
  maxMemnuniyet: 100,
  gunlukDusus: 3,
  bakimBonus: 4,
  temizlikciBonus: 2,
  sadikMusteriEsik: 60,
  sadikMusteriFiyatBonus: 0.15,
  sahaKaliteBonus: (kalite: number): number => Math.max(0, kalite - 4),
};

// === DOSYA SONU — bu satırı görüyorsan dosya tam demektir ===
