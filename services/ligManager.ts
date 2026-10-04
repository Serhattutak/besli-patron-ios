// ============================================
// BEŞLİ PATRON — services/ligManager.ts
// LİG ÇEKİRDEĞİ: fikstür, maç simülasyonu, puan durumu,
// yükselme/düşme, transfer. Nakidi KENDİ YÖNETMEZ —
// nakitDelta döner, uygulaması GameContext'te. (Sardur Technologies)
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { kademeBul, OYUNCU_AD, OYUNCU_SOYAD, oyuncuDeger, type LigKademe } from './ligConfig';

export const BENIM_TAKIM = 'Beşli Patron SK';

export interface Oyuncu {
  id: string;
  ad: string;
  yas: number;
  pozisyon: string;
  guc: number;
  deger: number;
}

export interface TabloSatiri { O: number; A: number; Y: number; AV: number; P: number; }

export interface LigSatiri {
  ad: string; O: number; A: number; Y: number; AV: number; P: number; benim: boolean;
}

export interface MacRaporu {
  hafta: number;
  rakip: string;
  skorumuz: number;
  skorrakip: number;
  hasilat: number;
  sonuc: 'G' | 'B' | 'M';
}

export interface SezonSonu {
  hedefSeviye: number;
  konum: number;
  odul: number;
  mesaj: string;
}

export interface LigState {
  seviye: number;
  sezonNo: number;
  hafta: number;
  rakipler: string[];
  fikstur: number[][][];
  tablo: Record<string, TabloSatiri>;
  kadro: Oyuncu[];
  transferList: Oyuncu[];
  transferHafta: number;
  raporlar: MacRaporu[];
  sezonSonu: SezonSonu | null;
}

const LIG_KEY = '@besli_lig_v1';

const rastgele = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const sec = <T>(dizi: T[]): T => dizi[Math.floor(Math.random() * dizi.length)];

const bosSatir = (): TabloSatiri => ({ O: 0, A: 0, Y: 0, AV: 0, P: 0 });

function hashAd(ad: string): number {
  let h = 7;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) % 100000;
  return h;
}

// Rakip gücü isimden türetilir — sezon boyunca sabit ve tutarlı
export function rakipGuc(kademe: LigKademe, ad: string): number {
  const t = (hashAd(ad) % 1000) / 1000;
  return Math.round(kademe.gucAralik[0] + t * (kademe.gucAralik[1] - kademe.gucAralik[0]));
}

export function takimGucu(kadro: Oyuncu[]): number {
  if (!kadro.length) return 40;
  return Math.round(kadro.reduce((t, o) => t + o.guc, 0) / kadro.length);
}

// 8 takım → 7 hafta tek devreli lig (daire yöntemi). Takım 0 = biz.
function fiksturKur(n: number): number[][][] {
  const donen: number[] = [];
  for (let i = 1; i < n; i++) donen.push(i);
  const turlar: number[][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const sira = [0, ...donen];
    const tur: number[][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = sira[i];
      const b = sira[n - 1 - i];
      if (r % 2 === 0) tur.push([a, b]);
      else tur.push([b, a]);
    }
    turlar.push(tur);
    const son = donen.pop();
    if (son !== undefined) donen.unshift(son);
  }
  return turlar;
}

function golAt(lambda: number): number {
  const L = Math.exp(-Math.max(0.05, lambda));
  let k = 0;
  let p = 1.0;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function macSimet(evGuc: number, depGuc: number): [number, number] {
  const fark = (evGuc - depGuc) / 10;
  return [golAt(1.3 + 0.45 * fark), golAt(1.1 - 0.45 * fark)];
}

function oyuncuUret(kademe: LigKademe, pozisyon: string): Oyuncu {
  const guc = rastgele(kademe.gucAralik[0] - 4, kademe.gucAralik[1] + 2);
  const yas = rastgele(18, 34);
  return {
    id: 'o' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36),
    ad: sec(OYUNCU_AD) + ' ' + sec(OYUNCU_SOYAD),
    yas,
    pozisyon,
    guc,
    deger: oyuncuDeger(guc, yas, kademe),
  };
}

function havuzdanSec(havuz: string[], adet: number): string[] {
  const kopya = [...havuz];
  const cikti: string[] = [];
  while (cikti.length < adet && kopya.length > 0) {
    cikti.push(kopya.splice(Math.floor(Math.random() * kopya.length), 1)[0]);
  }
  return cikti;
}

// Yeni kariyer: 2. Amatör Küme'den başla, 16 kişilik kadro kur
export function yeniLig(): LigState {
  const kademe = kademeBul(8);
  const kadro: Oyuncu[] = [];
  const dagilim: Record<string, number> = { Kaleci: 2, Defans: 5, 'Orta Saha': 5, Forvet: 4 };
  Object.keys(dagilim).forEach(poz => {
    for (let i = 0; i < dagilim[poz]; i++) kadro.push(oyuncuUret(kademe, poz));
  });
  const rakipler = havuzdanSec(kademe.havuz, 7);
  const tablo: Record<string, TabloSatiri> = { [BENIM_TAKIM]: bosSatir() };
  rakipler.forEach(r => { tablo[r] = bosSatir(); });
  const s: LigState = {
    seviye: 8,
    sezonNo: 1,
    hafta: 0,
    rakipler,
    fikstur: fiksturKur(8),
    tablo,
    kadro,
    transferList: [],
    transferHafta: 0,
    raporlar: [],
    sezonSonu: null,
  };
  s.transferList = transferListesiUret(s).transferList;
  return s;
}

export function tablola(s: LigState): LigSatiri[] {
  const satirlar: LigSatiri[] = [];
  const isimler = [BENIM_TAKIM, ...s.rakipler];
  for (const ad of isimler) {
    const t = s.tablo[ad] ?? bosSatir();
    satirlar.push({ ad, O: t.O, A: t.A, Y: t.Y, AV: t.AV, P: t.P, benim: ad === BENIM_TAKIM });
  }
  satirlar.sort((x, y) => (y.P - x.P) || (y.AV - x.AV) || (y.A - x.A));
  return satirlar;
}

// Bir haftayı oynar. Bizim maçtan hasılat kazanılır (evde), diğer maçlar simüle edilir.
export function haftaOyna(s: LigState): { state: LigState; rapor: MacRaporu | null; nakitDelta: number } {
  if (s.sezonSonu) return { state: s, rapor: null, nakitDelta: 0 };
  const kademe = kademeBul(s.seviye);
  const tur = s.fikstur[s.hafta];
  if (!tur) return { state: s, rapor: null, nakitDelta: 0 };
  const guc = takimGucu(s.kadro);
  const tablo: Record<string, TabloSatiri> = {};
  [BENIM_TAKIM, ...s.rakipler].forEach(ad => { tablo[ad] = { ...(s.tablo[ad] ?? bosSatir()) }; });
  let nakitDelta = 0;
  let rapor: MacRaporu | null = null;

  for (const cift of tur) {
    const evIdx = cift[0];
    const depIdx = cift[1];
    const evAd = evIdx === 0 ? BENIM_TAKIM : s.rakipler[evIdx - 1];
    const depAd = depIdx === 0 ? BENIM_TAKIM : s.rakipler[depIdx - 1];
    const evGuc = evIdx === 0 ? guc : rakipGuc(kademe, evAd);
    const depGuc = depIdx === 0 ? guc : rakipGuc(kademe, depAd);
    const skor = macSimet(evGuc, depGuc);
    const ev = tablo[evAd];
    const dep = tablo[depAd];
    ev.O++; dep.O++;
    ev.A += skor[0]; ev.Y += skor[1];
    dep.A += skor[1]; dep.Y += skor[0];
    ev.AV = ev.A - ev.Y;
    dep.AV = dep.A - dep.Y;
    if (skor[0] > skor[1]) ev.P += 3;
    else if (skor[0] < skor[1]) dep.P += 3;
    else { ev.P += 1; dep.P += 1; }

    if (evIdx === 0 || depIdx === 0) {
      const benimEv = evIdx === 0;
      const attigimiz = benimEv ? skor[0] : skor[1];
      const yedigimiz = benimEv ? skor[1] : skor[0];
      let hasilat = 0;
      if (benimEv) {
        hasilat = rastgele(kademe.hasilatAralik[0], kademe.hasilatAralik[1]);
        if (attigimiz > yedigimiz) hasilat = Math.round(hasilat * 1.15); // galibiyet primi
      }
      nakitDelta += hasilat;
      rapor = {
        hafta: s.hafta + 1,
        rakip: benimEv ? depAd : evAd,
        skorumuz: attigimiz,
        skorrakip: yedigimiz,
        hasilat,
        sonuc: attigimiz > yedigimiz ? 'G' : (attigimiz < yedigimiz ? 'M' : 'B'),
      };
    }
  }

  const raporlar = rapor ? [rapor, ...s.raporlar].slice(0, 8) : s.raporlar;
  const yeniHafta = s.hafta + 1;

  // Sezon bitti mi? (7 hafta)
  if (yeniHafta >= s.fikstur.length) {
    const sira = tablola({ ...s, tablo });
    const konum = sira.findIndex(x => x.benim) + 1;
    const odul = konum === 1
      ? kademe.sampiyonlukOdulu
      : Math.round((kademe.sampiyonlukOdulu * 0.3 * (8 - konum)) / 7);
    nakitDelta += odul;
    let hedefSeviye = s.seviye;
    let mesaj = '';
    if (kademe.yukselen > 0 && konum <= kademe.yukselen) {
      hedefSeviye = s.seviye - 1;
      mesaj = 'ŞAMPİYON! ' + kademeBul(hedefSeviye).ad + "'a yükseldin! 🏆 Ödül: " + odul.toLocaleString('tr-TR') + '₺';
    } else if (kademe.dussen > 0 && konum >= 9 - kademe.dussen) {
      hedefSeviye = s.seviye + 1;
      mesaj = 'Küme düştün... ' + kademeBul(hedefSeviye).ad + "'a iniyorsun. Sezon ödülü: " + odul.toLocaleString('tr-TR') + '₺';
    } else {
      mesaj = 'Sezon ' + konum + '. sırada tamamlandı. Sezon ödülü: ' + odul.toLocaleString('tr-TR') + '₺';
    }
    const bitis: LigState = { ...s, tablo, hafta: yeniHafta, raporlar, sezonSonu: { hedefSeviye, konum, odul, mesaj } };
    return { state: bitis, rapor, nakitDelta };
  }

  return { state: { ...s, tablo, hafta: yeniHafta, raporlar }, rapor, nakitDelta };
}

// Sezon sonu ekranından sonra yeni sezona geç (yükselme/düşme burada uygulanır)
function emeklilikSiniri(seviye: number): number {
  return Math.min(50, 37 + 2 * (seviye - 1));
}

function sezonAgetir(kadro: Oyuncu[], seviye: number): { kadro: Oyuncu[]; emekliMesaj: string } {
  const sinir = emeklilikSiniri(seviye);
  const kademe = kademeBul(seviye);
  const kalan: Oyuncu[] = [];
  const gencler: Oyuncu[] = [];
  const gidenler: string[] = [];
  for (const o of kadro) {
    const yas = o.yas + 1;
    if (yas > sinir) {
      gidenler.push(o.ad + ' (' + o.yas + ')');
      const genc = oyuncuUret(kademe, o.pozisyon);
      genc.yas = rastgele(16, 18);
      genc.guc = Math.max(20, rastgele(kademe.gucAralik[0] - 8, kademe.gucAralik[0] + 2));
      genc.deger = oyuncuDeger(genc.guc, genc.yas, kademe);
      gencler.push(genc);
      continue;
    }
    let guc = o.guc;
    if (yas <= 25) guc += rastgele(2, 4);
    else if (yas <= 31) guc += rastgele(-1, 1);
    else guc -= 1 + Math.floor((yas - 32) / 3);
    guc = Math.max(15, Math.min(99, guc));
    kalan.push({ ...o, yas, guc, deger: oyuncuDeger(guc, yas, kademe) });
  }
  const emekliMesaj = gidenler.length
    ? 'Emekli: ' + gidenler.join(', ') + ' - altyapidan ' + gencler.length + ' genc geldi.'
    : '';
  return { kadro: [...kalan, ...gencler], emekliMesaj };
}

export function yeniSezonBaslat(s: LigState): { state: LigState; mesaj: string } {
  const hedef = s.sezonSonu ? s.sezonSonu.hedefSeviye : s.seviye;
  const kademe = kademeBul(hedef);
  const yasSonuc = sezonAgetir(s.kadro, hedef);
  const rakipler = havuzdanSec(kademe.havuz, 7);
  const tablo: Record<string, TabloSatiri> = { [BENIM_TAKIM]: bosSatir() };
  rakipler.forEach(r => { tablo[r] = bosSatir(); });
  const state: LigState = {
    ...s,
    kadro: yasSonuc.kadro,
    seviye: hedef,
    sezonNo: s.sezonNo + 1,
    hafta: 0,
    rakipler,
    fikstur: fiksturKur(8),
    tablo,
    raporlar: [],
    sezonSonu: null,
  };
  state.transferList = transferListesiUret(state).transferList;
  return { state, mesaj: kademe.ad + "'da " + state.sezonNo + '. sezon ba\u015Flad\u0131!' + (yasSonuc.emekliMesaj ? ' ' + yasSonuc.emekliMesaj : '') };
}

// Her hafta yeni transfer listesi (6 oyuncu, kademenin değer bandında)
export function transferListesiUret(s: LigState): LigState {
  const kademe = kademeBul(s.seviye);
  const pozlar = ['Kaleci', 'Defans', 'Defans', 'Orta Saha', 'Orta Saha', 'Forvet'];
  const liste = pozlar.map((p, i) => {
    const o = oyuncuUret(kademe, p);
    if (i < 2) { o.yas = rastgele(16, 20); o.deger = oyuncuDeger(o.guc, o.yas, kademe); } // genc garanti
    let koruma = 40;
    while (o.deger > kademe.bonservisTavan && o.guc > 20 && koruma-- > 0) {
      o.guc -= 2;
      o.deger = oyuncuDeger(o.guc, o.yas, kademe);
    }
    if (o.deger > kademe.bonservisTavan) o.deger = kademe.bonservisTavan; // tavan garantisi
    return o;
  });
  return { ...s, transferList: liste, transferHafta: s.hafta };
}

export function oyuncuAl(s: LigState, id: string): { state: LigState; mesaj: string; nakitDelta: number } {
  const hedef = s.transferList.find(o => o.id === id);
  if (!hedef) return { state: s, mesaj: 'Oyuncu listede yok.', nakitDelta: 0 };
  if (s.kadro.length >= 18) return { state: s, mesaj: 'Kadro dolu (en fazla 18 oyuncu).', nakitDelta: 0 };
  const kademe = kademeBul(s.seviye);
  if (hedef.deger > kademe.bonservisTavan) return { state: s, mesaj: 'Bonservis tavanını aşıyor.', nakitDelta: 0 };
  const state: LigState = {
    ...s,
    kadro: [...s.kadro, hedef],
    transferList: s.transferList.filter(o => o.id !== id),
  };
  return { state, mesaj: hedef.ad + ' kadroya katıldı! (' + hedef.deger.toLocaleString('tr-TR') + '₺)', nakitDelta: -hedef.deger };
}

export function oyuncuSat(s: LigState, id: string): { state: LigState; mesaj: string; nakitDelta: number } {
  if (s.kadro.length <= 11) return { state: s, mesaj: 'En az 11 oyuncu kalmalı.', nakitDelta: 0 };
  const hedef = s.kadro.find(o => o.id === id);
  if (!hedef) return { state: s, mesaj: 'Oyuncu kadroda yok.', nakitDelta: 0 };
  const bedel = Math.max(500, Math.round((hedef.deger * 0.6) / 500) * 500);
  const state: LigState = { ...s, kadro: s.kadro.filter(o => o.id !== id) };
  return { state, mesaj: hedef.ad + ' ' + bedel.toLocaleString('tr-TR') + "₺'ye satıldı.", nakitDelta: bedel };
}

// === KALICILIK ===
export async function ligYukle(): Promise<LigState | null> {
  try {
    const raw = await AsyncStorage.getItem(LIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LigState;
  } catch {
    return null;
  }
}

export async function ligKaydet(s: LigState): Promise<void> {
  try {
    await AsyncStorage.setItem(LIG_KEY, JSON.stringify(s));
  } catch {
    // kurtarma: sessiz geç
  }
}

export async function ligSifirla(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LIG_KEY);
  } catch {
    // yoksay
  }
}
