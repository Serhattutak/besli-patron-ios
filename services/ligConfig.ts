// ============================================
// BEŞLİ PATRON — services/ligConfig.ts
// TÜRKİYE LİG PİRAMİDİ — 8 kademe (Sardur Technologies)
// Seviye 8 = 2. Amatör Küme (en alt) → Seviye 1 = Süper Lig (en üst)
// NOT: Tüm kulüp isimleri tek yerde (havuz). Lisans endişesi olursa
// sadece bu dizgileri değiştirmek yeterli.
// ============================================

export interface LigKademe {
  id: string;
  ad: string;
  seviye: number;               // 1 = Süper Lig, 8 = 2. Amatör Küme
  gucAralik: [number, number];  // rakip takım güç aralığı
  hasilatAralik: [number, number]; // ev maçı hasılatı (₺)
  sampiyonlukOdulu: number;     // şampiyon sezon ödülü (₺)
  bonservisTavan: number;       // tek oyuncuya ödenebilecek en yüksek bonservis (₺)
  yukselen: number;             // kaç takım üst lige çıkar
  dussen: number;               // kaç takım alt lige düşer
  havuz: string[];              // ligdeki kulüp isimleri
}

export const LIG_KADEMELER: LigKademe[] = [
  {
    id: 'superlig', ad: 'Süper Lig', seviye: 1,
    gucAralik: [82, 93], hasilatAralik: [60000, 200000],
    sampiyonlukOdulu: 4000000, bonservisTavan: 1200000,
    yukselen: 0, dussen: 3,
    havuz: ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor', 'Başakşehir', 'Samsunspor', 'Kayserispor', 'Alanyaspor', 'Antalyaspor', 'Konyaspor', 'Sivasspor', 'Gaziantep FK'],
  },
  {
    id: 'birinciLig', ad: '1. Lig', seviye: 2,
    gucAralik: [77, 86], hasilatAralik: [35000, 110000],
    sampiyonlukOdulu: 2000000, bonservisTavan: 500000,
    yukselen: 1, dussen: 2,
    havuz: ['Göztepe', 'Kocaelispor', 'Bandırmaspor', 'Sakaryaspor', 'Boluspor', 'Erzurumspor', 'Çorum FK', 'Ümraniyespor', 'Manisa FK', 'Keçiörengücü', 'Adana Demirspor', 'Altay'],
  },
  {
    id: 'ikinciLig', ad: '2. Lig', seviye: 3,
    gucAralik: [72, 80], hasilatAralik: [20000, 60000],
    sampiyonlukOdulu: 1000000, bonservisTavan: 250000,
    yukselen: 1, dussen: 2,
    havuz: ['Pendikspor', 'Şanlıurfaspor', 'Vanspor FK', 'Amedspor', 'Karagümrük', 'Altınordu', 'Tuzlaspor', 'Serikspor', 'İnegölspor', 'Kırşehir FK', 'Nevşehirspor', 'Sarıyer'],
  },
  {
    id: 'ucuncuLig', ad: '3. Lig', seviye: 4,
    gucAralik: [67, 75], hasilatAralik: [12000, 35000],
    sampiyonlukOdulu: 500000, bonservisTavan: 120000,
    yukselen: 1, dussen: 2,
    havuz: ['1461 Trabzon', 'Karşıyaka', 'Yeni Malatyaspor', 'Diyarbakırspor', 'Osmanlıspor', 'Ankara Demirspor', 'Kırıkkalespor', 'Nazilli Belediyespor', 'Düzcespor', 'Muğlaspor', 'Tokatspor', 'Elazığspor'],
  },
  {
    id: 'bolgeselAmator', ad: 'Bölgesel Amatör Lig', seviye: 5,
    gucAralik: [62, 70], hasilatAralik: [7000, 20000],
    sampiyonlukOdulu: 250000, bonservisTavan: 60000,
    yukselen: 1, dussen: 2,
    havuz: ['Beylerbeyi SK', 'Yeşilyurtspor', 'Bakırköyspor', 'Çankayaspor', 'Etimesgutspor', 'Karacabey Birlik', 'Menemen Belediyespor', 'Kemerspor', 'Şilanspor', 'Çeşmespor', 'Foçaspor', 'Urlaspor'],
  },
  {
    id: 'superAmator', ad: 'Süper Amatör Lig', seviye: 6,
    gucAralik: [56, 64], hasilatAralik: [4000, 12000],
    sampiyonlukOdulu: 120000, bonservisTavan: 30000,
    yukselen: 1, dussen: 2,
    havuz: ['Çamlıcaspor', 'Gülbaharspor', 'Denizkentspor', 'Yalıspor', 'Bağcılasspor', 'Taşlıyakaspor', 'Kuzeykentspor', 'Akyakaspor', 'Yeşilovaspor', 'Bostancık SK', 'Dutlukspor', 'Harman Yeri SK'],
  },
  {
    id: 'birinciAmator', ad: '1. Amatör Küme', seviye: 7,
    gucAralik: [50, 58], hasilatAralik: [2500, 7000],
    sampiyonlukOdulu: 60000, bonservisTavan: 15000,
    yukselen: 1, dussen: 2,
    havuz: ['Lokmacıspor', 'Kahveyolu SK', 'Panayırspor', 'Çarıkspor', 'Semtspor', 'Sulaksport', 'Kireçtepespor', 'Tostçuspor', 'Arkaspor', 'Papatyaspor', 'Çınarspor', 'Bayırköyspor'],
  },
  {
    id: 'ikinciAmator', ad: '2. Amatör Küme', seviye: 8,
    gucAralik: [44, 52], hasilatAralik: [1500, 4500],
    sampiyonlukOdulu: 30000, bonservisTavan: 8000,
    yukselen: 1, dussen: 0,
    havuz: ['Kanarya Mahallespor', 'Grevyoluspor', 'Taksi Durağı SK', 'Bakkal Vakıf SK', 'Çamaşırspor', 'Fındıksport', 'Kumrucular SK', 'Yağcılar SK', 'Demiroğluspor', 'Kiremitçispor', 'Oduncular SK', 'Salçapınar'],
  },
];

export function kademeBul(seviye: number): LigKademe {
  const s = Math.max(1, Math.min(8, Math.round(seviye)));
  return LIG_KADEMELER.find(k => k.seviye === s) ?? LIG_KADEMELER[LIG_KADEMELER.length - 1];
}

// === OYUNCU AD HAVUZLARI (tamamı kurgusal) ===
export const OYUNCU_AD = [
  'Emre', 'Burak', 'Volkan', 'Semih', 'Kaan', 'Arda', 'Yusuf', 'Mert',
  'Tolga', 'Hakan', 'Serkan', 'Ozan', 'Berk', 'Cenk', 'Uğur', 'Ferhat',
  'Barış', 'İlkay', 'Tunahan', 'Efe', 'Oğuz', 'Selim', 'Tarık', 'Deniz',
];

export const OYUNCU_SOYAD = [
  'Yılmaz', 'Demir', 'Kaya', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan',
  'Doğan', 'Kurt', 'Koç', 'Yıldız', 'Aksoy', 'Erdoğan', 'Güneş', 'Polat',
  'Ateş', 'Bulut', 'Keskin', 'Tekin', 'Avcı', 'Şen', 'Özdemir', 'Uçar',
];

// Değer = kademenin bonservis tavanına göre güç + yaş katsayısı
export function oyuncuDeger(guc: number, yas: number, kademe: LigKademe): number {
  const [min, max] = kademe.gucAralik;
  const t = Math.max(0, Math.min(1, (guc - min + 5) / (max - min + 10)));
  const yasCarpani = yas <= 22 ? 1.5 : yas <= 27 ? 1.25 : yas <= 30 ? 1.0 : yas <= 32 ? 0.6 : 0.35;
  const deger = kademe.bonservisTavan * (0.15 + 0.85 * t) * yasCarpani;
  return Math.max(1000, Math.round(deger / 500) * 500);
}