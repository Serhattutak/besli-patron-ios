// ============================================
// BEŞLİ PATRON — constants/sponsorConfig.ts
// SPONSOR SİSTEMİ — reklam anlaşmaları (pasif gelir)
// ============================================

export interface SponsorKosul {
  asama?: number;                            // saha en az bu aşamada olmalı
  upgrade?: { id: string; seviye: number };  // belirli yükseltme şart
}

export interface SponsorAnlasma {
  id: string;
  ad: string;
  aciklama: string;
  onOdeme: number;       // imza anında cebine giren peşin para
  gunlukGelir: number;   // her gün otomatik gelir
  kosul: SponsorKosul;
  renk: string;          // 2D reklam bandında görünecek renk
  yazi: string;          // 2D reklam bandındaki kısa yazı
}

export const MAX_SPONSOR = 3;

export const SPONSORLAR: SponsorAnlasma[] = [
  {
    id: 'topcuSpor',
    ad: 'Topçu Spor Malzemeleri',
    aciklama: 'Mahallenin eski futbolcusu, mağazasının reklamını formanı giyenlere sattırıyor.',
    onOdeme: 5000,
    gunlukGelir: 250,
    kosul: { asama: 5 },
    renk: '#38BDF8',
    yazi: 'TOPÇU SPOR',
  },
  {
    id: 'kralKahve',
    ad: 'Kral Kahve',
    aciklama: 'Tribünde satılan her kahveden sana pay — taraftar çokça, kahve akıcı.',
    onOdeme: 12000,
    gunlukGelir: 500,
    kosul: { asama: 5, upgrade: { id: 'tribun', seviye: 1 } },
    renk: '#F59E0B',
    yazi: 'KRAL KAHVE',
  },
  {
    id: 'guvenSigorta',
    ad: 'Güven Sigorta',
    aciklama: 'Saha hasarı, oyuncu sakatlığı — güvenin adresi panonda dursun.',
    onOdeme: 30000,
    gunlukGelir: 1100,
    kosul: { asama: 5, upgrade: { id: 'tribun', seviye: 2 } },
    renk: '#34D399',
    yazi: 'GÜVEN SİGORTA',
  },
  {
    id: 'jetTelefon',
    ad: 'Jet Telefon',
    aciklama: 'Gol anı 3 saniyede cebinde. Skorbordun en değerli köşesi onların.',
    onOdeme: 75000,
    gunlukGelir: 2400,
    kosul: { asama: 5, upgrade: { id: 'skorboard', seviye: 2 } },
    renk: '#A78BFA',
    yazi: 'JET TELEFON',
  },
  {
    id: 'aksamEnerji',
    ad: 'Akşam Enerji',
    aciklama: 'Projektörler yandığı her gece onların reklamı parlıyor. Gece maçlarının sponsoru.',
    onOdeme: 150000,
    gunlukGelir: 4200,
    kosul: { asama: 5, upgrade: { id: 'reklam', seviye: 1 } },
    renk: '#EF4444',
    yazi: 'AKŞAM ENERJİ',
  },
];

/** Sponsorun şartları sağlanıyor mu? */
export function sponsorUygunMu(
  s: SponsorAnlasma,
  asama: number,
  upgrades: Record<string, number>,
): boolean {
  if (s.kosul.asama != null && asama < s.kosul.asama) return false;
  if (s.kosul.upgrade) {
    const sev = upgrades?.[s.kosul.upgrade.id] ?? 0;
    if (sev < s.kosul.upgrade.seviye) return false;
  }
  return true;
}

/** İmzalı sponsorların toplam günlük geliri */
export function toplamSponsorGeliri(imzali: string[]): number {
  return imzali.reduce(
    (t, id) => t + (SPONSORLAR.find(s => s.id === id)?.gunlukGelir ?? 0),
    0,
  );
}

/** Bir sponsorun peşin ödemesi */
export function sponsorOnOdemesi(id: string): number {
  return SPONSORLAR.find(s => s.id === id)?.onOdeme ?? 0;
}
// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===
