// ============================================
// BEŞLİ PATRON — services/leagueLogic.ts (LİG SİSTEMİ)
// ============================================
// Bağımsız modül: gameLogic / GameContext / types'e DOKUNMAZ.
// Tüm ekonomi ve zorluk ayarları LIG_CONFIG'te tek yerde.

export interface LigTakim {
  id: string;
  ad: string;
  guc: number;
  oynanan: number;
  galibiyet: number;
  beraberlik: number;
  yenilgi: number;
  attigi: number;
  yedigi: number;
  puan: number;
}

export interface LigMac {
  hafta: number;
  ev: string;
  dep: string;
  evGol: number | null;
  depGol: number | null;
}

export type LigMacSonucu = 'galibiyet' | 'beraberlik' | 'yenilgi';

export interface LigSonMac {
  hafta: number;
  rakipAd: string;
  senGol: number;
  rakipGol: number;
  sonuc: LigMacSonucu;
}

export interface LigDurum {
  sezon: number;
  hafta: number;            // sıradaki oynanacak hafta (1-7)
  takimlar: LigTakim[];
  fikstur: LigMac[];
  sonMacGunu: number;       // oyundaki gün — günde 1 maç sınırı için
  sampiyonluk: number;      // toplam şampiyonluk sayısı
  toplamKazanc: number;
  sonMac: LigSonMac | null;
}

export interface LigHaftaSonucu {
  hafta: number;
  rakipAd: string;
  senGol: number;
  rakipGol: number;
  sonuc: LigMacSonucu;
  kazanc: number;           // maç kazancı (nakit)
  sezonOdulu: number;       // sezon bittiyse final ödülü (nakit)
  prestij: number;          // maç prestiji
  sezonPrestij: number;     // sezon bittiyse final prestiji
  sezonBitti: boolean;
  siralama: number;         // sezon bittiyse final sıran (1-8)
  puanDurumu: LigTakim[];   // sezon bittiyse FİNAL tablo; değilse güncel
}

export const LIG_CONFIG = {
  takimSayisi: 8,           // 8 takım = 7 hafta tek devre
  macEnerjisi: 15,
  // Maç kazançları (sezon çarpanıyla ölçeklenir) — az/çok gelirse buradan ayarla
  oduller: { galibiyet: 7500, beraberlik: 3000, yenilgi: 1000 },
  prestijler: { galibiyet: 2, beraberlik: 1, yenilgi: 0 },
  // Sezon sonu ödülleri (final sıralamasına göre)
  sezonOdulleri: [
    { siralama: 1, nakit: 60000, prestij: 25 },
    { siralama: 2, nakit: 30000, prestij: 12 },
    { siralama: 3, nakit: 15000, prestij: 6 },
  ],
  rakipTabanGuc: 45,        // sezon 1 rakip ortalaması
  rakipDegisim: 20,         // rakipler arası güç farkı (±10)
  sezonArtis: 6,            // her sezon rakipler +6 güç
  sezonOdulCarpani: 0.25,   // her sezon ödüller +%25
};

const BENIM_ID = 'ben';
const BENIM_AD = 'Beşli Patron SK';

const TAKIM_ADLARI = [
  'Kaleci Yok FK', 'Panzer Takım', 'Gece Maççıları', 'Mahalle Baskısı SK',
  'Ofsayt Neye Yarar', 'Kontra Atak United', 'Vurdumduymaz SK', 'Çim Kaldıranlar',
  'Bira Molası FC', 'Top Bizde Kalır SK', 'Son Dakika Gol', 'Sıfır Km Futbol',
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// === SENİN TAKIMIN GÜCÜ ===
// Saha kalitesi + antrenör (L1:+5, L2:+10, L3:+15 — gameLogic tablosuyla aynı)
// + memnuniyet + prestij besler. Tesis yükseltmeleri ligde de işe yarar.
export function oyuncuGucuHesapla(
  sahaKalitesi: number, antrenorSeviye: number, memnuniyet: number, prestij: number,
): number {
  const ant = [0, 5, 10, 15][clamp(Math.round(antrenorSeviye), 0, 3)] ?? 0;
  return Math.round(clamp(
    36 + 3 * sahaKalitesi + ant + (memnuniyet - 50) * 0.15 + Math.min(50, prestij) * 0.2,
    30, 95,
  ));
}

// === PUAN DURUMU ===
export function puandanSirala(takimlar: LigTakim[]): LigTakim[] {
  return [...takimlar].sort((a, b) =>
    b.puan - a.puan ||
    (b.attigi - b.yedigi) - (a.attigi - a.yedigi) ||
    b.attigi - a.attigi ||
    a.ad.localeCompare(b.ad, 'tr'),
  );
}

// === GOL ÜRETİCİ (Poisson örneklemesi) ===
// Güç farkı beklentiye (xG) çevrilir, oradan gerçekçi skor üretilir.
function golUret(beklenenGol: number): number {
  const L = Math.exp(-Math.max(0.05, beklenenGol));
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(7, k - 1);
}

function macOyna(evGuc: number, depGuc: number): [number, number] {
  const fark = evGuc - depGuc;
  const evXG = clamp(1.35 + fark * 0.035, 0.3, 3.6);   // ev sahibi avantajı
  const depXG = clamp(1.05 - fark * 0.035, 0.25, 3.2);
  return [golUret(evXG), golUret(depXG)];
}

function istatistikEkle(t: LigTakim, attigi: number, yedigi: number): void {
  t.oynanan++;
  t.attigi += attigi;
  t.yedigi += yedigi;
  if (attigi > yedigi) { t.galibiyet++; t.puan += 3; }
  else if (attigi === yedigi) { t.beraberlik++; t.puan += 1; }
  else { t.yenilgi++; }
}

// === FİKSTÜR ===
// Tek devreli daire yöntemi (takimSayisi=8 → 7 hafta × 4 maç).
function fiksturUret(idler: string[]): LigMac[] {
  const sabit = idler[idler.length - 1]!;
  const donen = idler.slice(0, idler.length - 1);
  const n = donen.length;
  const maclar: LigMac[] = [];
  for (let r = 0; r < n; r++) {
    const rot = donen.map((_, i) => donen[(i + r) % n]!);
    const ciftler: Array<[string, string]> = [
      [rot[0]!, rot[6]!],
      [rot[1]!, rot[5]!],
      [rot[2]!, rot[4]!],
      [sabit, rot[3]!],
    ];
    for (const [ev, dep] of ciftler) {
      maclar.push({ hafta: r + 1, ev, dep, evGol: null, depGol: null });
    }
  }
  return maclar;
}

// === LİG KUR ===
export function ligOlustur(
  sezon: number,
  sahaKalitesi: number,
  antrenorSeviye: number,
  memnuniyet: number,
  prestij: number,
  bugun: number,
): LigDurum {
  const adlar = [...TAKIM_ADLARI];
  for (let i = adlar.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [adlar[i], adlar[j]] = [adlar[j], adlar[i]];
  }

  const bosIstatistik = () => ({
    oynanan: 0, galibiyet: 0, beraberlik: 0, yenilgi: 0, attigi: 0, yedigi: 0, puan: 0,
  });

  const takimlar: LigTakim[] = [
    {
      id: BENIM_ID, ad: BENIM_AD,
      guc: oyuncuGucuHesapla(sahaKalitesi, antrenorSeviye, memnuniyet, prestij),
      ...bosIstatistik(),
    },
  ];
  const rakipSayisi = LIG_CONFIG.takimSayisi - 1;
  for (let i = 0; i < rakipSayisi; i++) {
    const guc = clamp(
      LIG_CONFIG.rakipTabanGuc
      + LIG_CONFIG.sezonArtis * (Math.max(1, sezon) - 1)
      + Math.round((Math.random() * 2 - 1) * (LIG_CONFIG.rakipDegisim / 2)),
      30, 95,
    );
    takimlar.push({ id: `t${sezon}_${i}`, ad: adlar[i]!, guc, ...bosIstatistik() });
  }

  return {
    sezon: Math.max(1, Math.round(sezon)),
    hafta: 1,
    takimlar,
    fikstur: fiksturUret(takimlar.map(t => t.id)),
    sonMacGunu: bugun,
    sampiyonluk: 0,
    toplamKazanc: 0,
    sonMac: null,
  };
}

// === HAFTA SİMÜLASYONU ===
// Haftanın TÜM maçları oynanır (senin maçın dahil), tablo güncellenir,
// 7. hafta bittiyse sezon ödülü dağıtılır ve yeni sezon kurulur.
export function ligHaftaSimule(
  lig: LigDurum,
  sahaKalitesi: number,
  antrenorSeviye: number,
  memnuniyet: number,
  prestij: number,
  bugun: number,
): { lig: LigDurum; sonuc: LigHaftaSonucu } {
  const sezonUzunluk = LIG_CONFIG.takimSayisi - 1;
  const oynananHafta = clamp(Math.round(lig.hafta), 1, sezonUzunluk);
  const takimlar = lig.takimlar.map(t => ({ ...t }));
  const fikstur = lig.fikstur.map(m => ({ ...m }));
  const odulCarpani = 1 + LIG_CONFIG.sezonOdulCarpani * (lig.sezon - 1);

  // Takım gücü MAÇ ANINDA yeniden hesaplanır: antrenör terfisi aynı gün etkili.
  const benimTakim = takimlar.find(t => t.id === BENIM_ID);
  if (benimTakim) {
    benimTakim.guc = oyuncuGucuHesapla(sahaKalitesi, antrenorSeviye, memnuniyet, prestij);
  }

  const bul = (id: string): LigTakim => takimlar.find(t => t.id === id)!;
  let benimSonuc: LigHaftaSonucu | null = null;

  for (const mac of fikstur.filter(m => m.hafta === oynananHafta && m.evGol == null)) {
    const ev = bul(mac.ev);
    const dep = bul(mac.dep);
    const [eg, dg] = macOyna(ev.guc, dep.guc);
    mac.evGol = eg;
    mac.depGol = dg;
    istatistikEkle(ev, eg, dg);
    istatistikEkle(dep, dg, eg);

    if (mac.ev === BENIM_ID || mac.dep === BENIM_ID) {
      const benEvde = mac.ev === BENIM_ID;
      const senGol = benEvde ? eg : dg;
      const rakipGol = benEvde ? dg : eg;
      const rakipAd = benEvde ? dep.ad : ev.ad;
      const sonucTipi: LigMacSonucu =
        senGol > rakipGol ? 'galibiyet' : senGol === rakipGol ? 'beraberlik' : 'yenilgi';
      benimSonuc = {
        hafta: oynananHafta,
        rakipAd,
        senGol,
        rakipGol,
        sonuc: sonucTipi,
        kazanc: Math.round(LIG_CONFIG.oduller[sonucTipi] * odulCarpani),
        sezonOdulu: 0,
        prestij: LIG_CONFIG.prestijler[sonucTipi],
        sezonPrestij: 0,
        sezonBitti: false,
        siralama: 0,
        puanDurumu: [],
      };
    }
  }

  const yeniHafta = oynananHafta + 1;
  const macKazanci = benimSonuc?.kazanc ?? 0;

  if (yeniHafta > sezonUzunluk) {
    // === SEZON FİNALİ ===
    const finalTablo = puandanSirala(takimlar);
    const siram = finalTablo.findIndex(t => t.id === BENIM_ID) + 1;
    const odul = LIG_CONFIG.sezonOdulleri.find(o => o.siralama === siram);

    if (benimSonuc) {
      benimSonuc.sezonBitti = true;
      benimSonuc.siralama = siram;
      benimSonuc.sezonOdulu = Math.round((odul?.nakit ?? 0) * odulCarpani);
      benimSonuc.sezonPrestij = odul?.prestij ?? 0;
      benimSonuc.puanDurumu = finalTablo;
    }

    // Yeni sezon: rakipler güçlendi, fikstür taze, kadro istatistikleri sıfır.
    const yeniSezon = ligOlustur(
      lig.sezon + 1, sahaKalitesi, antrenorSeviye, memnuniyet, prestij, bugun,
    );
    yeniSezon.sampiyonluk = lig.sampiyonluk + (siram === 1 ? 1 : 0);
    yeniSezon.toplamKazanc = lig.toplamKazanc + macKazanci + (benimSonuc?.sezonOdulu ?? 0);
    return { lig: yeniSezon, sonuc: benimSonuc! };
  }

  if (benimSonuc) benimSonuc.puanDurumu = puandanSirala(takimlar);
  const yeniLig: LigDurum = {
    ...lig,
    takimlar,
    fikstur,
    hafta: yeniHafta,
    sonMacGunu: bugun,
    toplamKazanc: lig.toplamKazanc + macKazanci,
    sonMac: benimSonuc
      ? {
          hafta: benimSonuc.hafta,
          rakipAd: benimSonuc.rakipAd,
          senGol: benimSonuc.senGol,
          rakipGol: benimSonuc.rakipGol,
          sonuc: benimSonuc.sonuc,
        }
      : lig.sonMac,
  };
  return { lig: yeniLig, sonuc: benimSonuc! };
}

// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===
