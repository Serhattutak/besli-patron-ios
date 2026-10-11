import { useIsFocused } from '@react-navigation/native'; // Sardur Technologies
// ============================================
// BEŞLİ PATRON — components/Saha2D.tsx
// 2D TESİS SAHNESİ — ölçeklenen stadyum çerçevesi + küçük adam fiziği + sponsor panoları
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RENK, FONT } from '../constants/theme';
import { SPONSORLAR } from '../constants/sponsorConfig';

/* ---------- tipler ---------- */
interface SimOyuncu {
  id: number; takim: 0 | 1; gk: boolean;
  x: number; y: number;
  hx: number; hy: number;
  kosuyor: boolean; bek: number;
}
interface SimTop { x: number; y: number; vx: number; vy: number; z: number; vz: number }
interface Efekt { id: number; x: number; y: number; t0: number; renk: string }
interface Sim {
  oyuncular: SimOyuncu[]; top: SimTop;
  topSahibi: SimOyuncu | null; sonVurus: number;
  bekleme: number; efektler: Efekt[]; efId: number;
}

interface Props {
  asama: number;
  kalite?: number;
  sahaTipi?: string;
  canli?: boolean;
  mini?: boolean;
  oyuncuSayisi?: number;
  upgrades?: Record<string, number>;
  sponsorlar?: string[];
}

/* ---------- sabitler ---------- */
const TAKIM_RENK = ['#38BDF8', '#F87171'];
const TAKIM_KENAR = ['#075985', '#991B1B'];
const CIZGI = 'rgba(255,255,255,0.85)';

const ZEMIN = '#0D1524';
const ZEMIN_KAPA = '#0B1424';
const BETON = '#1C2A42';
const BETON_KOYU = '#141F33';
const CATI = '#8FA3BF';

const TOPRAK = '#7A6039';
const TOPRAK_KOYU = '#6A5330';
const CAKIL = '#263340';

const REKLAM_RENK = ['#F59E0B', '#E2E8F0', '#38BDF8', '#EF4444', '#22C55E'];
const ARAC_RENK = ['#EF4444', '#38BDF8', '#FBBF24', '#E2E8F0', '#34D399'];

const TIP_VURGU: Record<string, string> = {
  yildiz: '#F59E0B', cocuk: '#34D399', akademi: '#60A5FA', vip: '#A78BFA', arena: '#F87171',
};

const TICK_MS = 100; // Sardur Technologies: render yuku azaltildi (55 -> 100)
const MAC_TIK = 1600;
const ALAN = {
  minX: 2, maxX: 98, minY: 6, maxY: 94,
  kaleSol: 1.5, kaleSag: 98.5, kaleUst: 38, kaleAlt: 62,
};

const SOL_KADRO: { x: number; y: number }[] = [
  { x: 8, y: 50 }, { x: 24, y: 22 }, { x: 24, y: 78 }, { x: 35, y: 42 }, { x: 35, y: 58 },
];

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

/* ---------- maç simülasyonu ---------- */
function simKur(takimBuyuklugu: number): Sim {
  const adet = Math.min(5, Math.max(2, takimBuyuklugu));
  const oyuncular: SimOyuncu[] = [];
  let id = 0;
  ([0, 1] as const).forEach(takim => {
    SOL_KADRO.slice(0, adet).forEach((d, i) => {
      const hx = takim === 0 ? d.x : 100 - d.x;
      oyuncular.push({ id: id++, takim, gk: i === 0, x: hx, y: d.y, hx, hy: d.y, kosuyor: false, bek: 0 });
    });
  });
  return {
    oyuncular,
    top: { x: 50, y: 50, vx: 0, vy: 0, z: 0, vz: 0 },
    topSahibi: null, sonVurus: 0, bekleme: 24, efektler: [], efId: 0,
  };
}

function efektEkle(s: Sim, x: number, y: number, renk: string) {
  s.efektler.push({ id: s.efId++, x, y, t0: Date.now(), renk });
  if (s.efektler.length > 12) s.efektler.shift();
}

function vurus(s: Sim, o: SimOyuncu, tur: 'pas' | 'sut' | 'temizle', now: number) {
  const top = s.top;
  s.topSahibi = null; s.sonVurus = now; o.bek = 0; o.kosuyor = true;

  if (tur === 'sut') {
    const hedefY = ALAN.kaleUst + 6 + Math.random() * (ALAN.kaleAlt - ALAN.kaleUst - 12);
    const hedefX = o.takim === 0 ? ALAN.kaleSag + 1 : ALAN.kaleSol - 1;
    const dx = hedefX - o.x, dy = hedefY - o.y;
    const d = Math.hypot(dx, dy) || 1;
    const guc = 3.1 + Math.random() * 0.5;
    top.vx = (dx / d) * guc; top.vy = (dy / d) * guc;
    top.z = 0.2; top.vz = 0.16 + Math.random() * 0.12;
    efektEkle(s, o.x, o.y, '#FCD34D');
    return;
  }

  const adaylar = s.oyuncular.filter(p => p.takim === o.takim && p.id !== o.id && !p.gk);
  let hedef: SimOyuncu | undefined;
  if (adaylar.length > 0) {
    if (tur === 'pas') {
      const sirali = adaylar
        .map(p => ({ p, sk: (o.takim === 0 ? p.x - o.x : o.x - p.x) - Math.abs(p.y - o.y) * 0.35 }))
        .sort((a, b) => b.sk - a.sk);
      hedef = Math.random() < 0.75 ? sirali[0].p : sirali[Math.floor(Math.random() * sirali.length)].p;
    } else {
      hedef = adaylar.find(p => Math.abs(p.x - 50) < 30) ?? adaylar[0];
    }
  }
  const hx = hedef ? hedef.x : 50 + (Math.random() * 20 - 10);
  const hy = hedef ? hedef.y : 50 + (Math.random() * 20 - 10);
  const dx = hx - o.x, dy = hy - o.y;
  const d = Math.hypot(dx, dy) || 1;
  const guc = tur === 'temizle' ? 3.0 : Math.min(3.2, d * 0.085 + 0.7);
  top.vx = (dx / d) * guc; top.vy = (dy / d) * guc;
  if (d > 22 || tur === 'temizle') { top.z = 0.1; top.vz = 0.14 + Math.random() * 0.1; }
  efektEkle(s, o.x, o.y, tur === 'temizle' ? '#38BDF8' : '#FFFFFF');
}

function simAdim(s: Sim, now: number): 0 | 1 | null {
  s.efektler = s.efektler.filter(e => now - e.t0 < 350);

  if (s.bekleme > 0) {
    s.bekleme--;
    s.oyuncular.forEach(o => {
      o.x += (o.hx - o.x) * 0.12;
      o.y += (o.hy - o.y) * 0.12;
      o.kosuyor = Math.hypot(o.hx - o.x, o.hy - o.y) > 3;
    });
    const t = s.top;
    t.x = 50; t.y = 50; t.vx = 0; t.vy = 0; t.z = 0; t.vz = 0;
    s.topSahibi = null;
    return null;
  }

  const top = s.top;
  const hava = top.z > 0.05;
  if (hava) {
    top.vz -= 0.045;
    top.z += top.vz;
    if (top.z <= 0) { top.z = 0; top.vz = 0; }
  }
  top.x += top.vx; top.y += top.vy;
  const surtunme = top.z > 0.05 ? 0.985 : 0.925;
  top.vx *= surtunme; top.vy *= surtunme;
  if (Math.abs(top.vx) < 0.02) top.vx = 0;
  if (Math.abs(top.vy) < 0.02) top.vy = 0;

  let golTakim: 0 | 1 | null = null;
  if (top.x <= ALAN.kaleSol) {
    if (top.y >= ALAN.kaleUst && top.y <= ALAN.kaleAlt) golTakim = 1;
    else { top.x = ALAN.kaleSol; top.vx = Math.abs(top.vx) * 0.55; }
  } else if (top.x >= ALAN.kaleSag) {
    if (top.y >= ALAN.kaleUst && top.y <= ALAN.kaleAlt) golTakim = 0;
    else { top.x = ALAN.kaleSag; top.vx = -Math.abs(top.vx) * 0.55; }
  }
  if (top.y <= ALAN.minY) { top.y = ALAN.minY; top.vy = Math.abs(top.vy) * 0.6; }
  else if (top.y >= ALAN.maxY) { top.y = ALAN.maxY; top.vy = -Math.abs(top.vy) * 0.6; }

  if (golTakim != null) {
    efektEkle(s, golTakim === 1 ? 4 : 96, 50, '#FCD34D');
    s.bekleme = 26;
    return golTakim;
  }

  if (s.topSahibi == null && now - s.sonVurus > 380) {
    let enYakin: SimOyuncu | null = null;
    let dMin = 99;
    for (const o of s.oyuncular) {
      const d = Math.hypot(o.x - top.x, o.y - top.y);
      if (d < dMin) { dMin = d; enYakin = o; }
    }
    if (enYakin && dMin < 4.2) {
      if (enYakin.gk && dMin > 2.2 && Math.random() < 0.35) {
        // kaleci kurtaramadı
      } else {
        s.topSahibi = enYakin;
      }
    }
  }

  if (s.topSahibi) {
    const o = s.topSahibi;
    const yon = o.takim === 0 ? 1 : -1;
    top.x = clamp(o.x + yon * 2.0, 2, 98);
    top.y = clamp(o.y + 1.2, 4, 96);
    top.vx = 0; top.vy = 0; top.z = 0; top.vz = 0;
    o.bek++;
    const kaleUzak = o.takim === 0 ? ALAN.kaleSag - o.x : o.x - ALAN.kaleSol;
    if (o.gk) {
      if (o.bek > 4) vurus(s, o, 'temizle', now);
    } else if (kaleUzak < 26 && Math.random() < 0.22) {
      vurus(s, o, 'sut', now);
    } else if (o.bek > 9 || Math.random() < 0.13) {
      vurus(s, o, 'pas', now);
    }
  }

  const kovala = new Set<number>();
  for (const t of [0, 1] as const) {
    const takimOy = s.oyuncular.filter(o => o.takim === t && !o.gk && o !== s.topSahibi);
    takimOy.sort((a, b) =>
      Math.hypot(a.x - top.x, a.y - top.y) - Math.hypot(b.x - top.x, b.y - top.y));
    if (takimOy[0]) kovala.add(takimOy[0].id);
    const topYarida = t === 0 ? top.x < 52 : top.x > 48;
    if (takimOy[1] && topYarida) kovala.add(takimOy[1].id);
  }

  for (const o of s.oyuncular) {
    let tx: number, ty: number, hizMax: number;
    if (o.gk) {
      tx = o.takim === 0 ? 6 : 94;
      ty = clamp(top.y, ALAN.kaleUst + 4, ALAN.kaleAlt - 4);
      hizMax = 1.25;
    } else if (s.topSahibi === o) {
      tx = o.takim === 0 ? 90 : 10;
      ty = o.hy + (top.y - o.hy) * 0.3;
      hizMax = 1.15;
    } else if (kovala.has(o.id)) {
      tx = top.x; ty = top.y; hizMax = 1.5;
    } else {
      tx = clamp(o.hx + (top.x - 50) * 0.3, ALAN.minX, ALAN.maxX);
      ty = clamp(o.hy + (top.y - 50) * 0.22, ALAN.minY, ALAN.maxY);
      hizMax = 0.95;
    }
    const dx = tx - o.x, dy = ty - o.y;
    const d = Math.hypot(dx, dy);
    o.kosuyor = d > 2.5;
    if (d > 0.6) {
      const adim = Math.min(hizMax, d * 0.2);
      o.x = clamp(o.x + (dx / d) * adim, 1, 99);
      o.y = clamp(o.y + (dy / d) * adim, 5, 95);
    }
  }
  return null;
}

/* ---------- yardımcılar ---------- */
function koltukRengi(i: number): string {
  if (i % 9 === 8) return '#475569';
  if (i % 13 === 5) return '#3B82F6';
  if (i % 17 === 7) return '#EF4444';
  return '#F59E0B';
}

function cimRenk(kalite: number): [string, string] {
  if (kalite >= 8) return ['#2F9E44', '#28913C'];
  if (kalite >= 6) return ['#3FA34D', '#379246'];
  if (kalite >= 4) return ['#4C9A55', '#448A4D'];
  return ['#5C9460', '#548A58'];
}

/* ---------- KÜÇÜK ADAM ---------- */
function Adam({ forma, koyu, kosuyor, faz, k }: { forma: string; koyu: string; kosuyor: boolean; faz: number; k: number }) {
  const p = (v: number) => v * k;
  const aci = kosuyor ? (faz % 2 === 0 ? 18 : -18) : 0;
  return (
    <View style={{ width: p(10), alignItems: 'center' }}>
      <View style={{ width: p(5), height: p(5), borderRadius: 999, backgroundColor: '#F1C27D', borderWidth: Math.max(0.5, p(0.6)), borderColor: 'rgba(0,0,0,0.35)', zIndex: 2 }} />
      <View style={{ width: p(6), height: p(7), borderRadius: p(2), backgroundColor: forma, borderWidth: Math.max(0.5, p(0.6)), borderColor: koyu, marginTop: -p(0.8), zIndex: 1 }} />
      <View style={{ flexDirection: 'row', gap: p(1.4), marginTop: -p(1.4) }}>
        <View style={{ width: p(2), height: p(6), borderRadius: p(1), backgroundColor: '#F1C27D', transform: [{ rotate: `${aci}deg` }] }} />
        <View style={{ width: p(2), height: p(6), borderRadius: p(1), backgroundColor: '#F1C27D', transform: [{ rotate: `${-aci}deg` }] }} />
      </View>
    </View>
  );
}

/* ---------- TRİBÜN (basamaklı, çatılı) ---------- */
const Tribun = React.memo(function Tribun({ seviye, mini, vip, heyecan, k }:
  { seviye: number; mini: boolean; vip: number; heyecan: boolean; k: number }) {
  const p = (v: number) => v * k;
  const sira = mini ? 3 : seviye >= 3 ? 6 : seviye === 2 ? 5 : 4;
  const koltuk = mini ? 14 : seviye >= 3 ? 26 : seviye === 2 ? 24 : 20;
  const seat = p(mini ? 3.5 : 6);
  return (
    <View style={{ width: '100%', height: '100%', backgroundColor: '#26344E', borderRadius: p(6), borderWidth: Math.max(1, p(1)), borderColor: ZEMIN_KAPA, overflow: 'hidden' }}>
      {/* çatı + destekler */}
      <View style={{ height: p(mini ? 5 : 9), backgroundColor: CATI, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: p(10) }}>
        <View style={{ width: p(2), height: '55%', backgroundColor: '#5B6B85' }} />
        <View style={{ width: p(2), height: '55%', backgroundColor: '#5B6B85' }} />
        <View style={{ width: p(2), height: '55%', backgroundColor: '#5B6B85' }} />
      </View>
      <View style={{ height: p(1.4), backgroundColor: 'rgba(0,0,0,0.35)' }} />
      {/* arka duvar */}
      <View style={{ height: p(mini ? 3 : 5), backgroundColor: '#16233B', justifyContent: 'center', paddingLeft: p(7) }}>
        {!mini && seviye >= 2 ? (
          <Text style={{ fontSize: Math.max(4, p(5)), color: '#64748B', fontFamily: FONT.vurgu, letterSpacing: 0.5 }}>BP TRİBÜN</Text>
        ) : null}
      </View>
      {/* koltuk sıraları */}
      <View style={{ flex: 1, justifyContent: 'space-evenly' }}>
        {Array.from({ length: sira }).map((_, r) => (
          <View key={r} style={{
            flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
            backgroundColor: r % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.03)',
            paddingVertical: p(1),
            transform: [{ translateY: heyecan ? -p(1.5) : 0 }],
          }}>
            {Array.from({ length: koltuk }).map((_, i) => (
              <View key={i} style={{ width: seat, height: seat, borderRadius: seat * 0.3, backgroundColor: koltukRengi(r * 7 + i) }} />
            ))}
          </View>
        ))}
      </View>
      {/* merdiven geçitleri */}
      {['16%', '38%', '60%', '82%'].map(g => (
        <View key={g} style={{ position: 'absolute', top: '22%', bottom: 0, left: g as any, width: p(4), backgroundColor: BETON_KOYU, opacity: 0.9 }} />
      ))}
      {/* VIP loca */}
      {vip > 0 ? (
        <View style={{ position: 'absolute', right: p(6), top: '24%', width: '17%', height: '60%', backgroundColor: 'rgba(96,165,250,0.22)', borderWidth: Math.max(1, p(1)), borderColor: vip >= 2 ? '#FCD34D' : 'rgba(167,139,250,0.8)', borderRadius: p(3) }}>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: p(2), padding: p(2) }}>
            {Array.from({ length: mini ? 6 : 12 }).map((_, i) => (
              <View key={i} style={{ width: p(2.5), height: p(2.5), borderRadius: 999, backgroundColor: '#FCD34D' }} />
            ))}
          </View>
          {vip >= 2 ? <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', backgroundColor: 'rgba(220,38,38,0.65)' }} /> : null}
        </View>
      ) : null}
    </View>
  );
});

/* ---------- SKORBOARD (LED pano) ---------- */
const Skorboard = React.memo(function Skorboard({ seviye, mini, canli, skorA, skorB, dakika, gol, macSonu, macNo, yanip, sponsorYazi, k }:
  { seviye: number; mini: boolean; canli: boolean; skorA: number; skorB: number; dakika: number; gol: boolean; macSonu: boolean; macNo: number; yanip: number; sponsorYazi?: string; k: number }) {
  const p = (v: number) => v * k;
  return (
    <View style={{ position: 'absolute', top: '2.5%', right: '2%', width: mini ? '22%' : seviye >= 3 ? '21%' : '18%' }}>
      <View style={{
        backgroundColor: '#0B1220', borderRadius: p(5), borderWidth: Math.max(1, p(1.5)),
        borderColor: gol ? '#FCD34D' : 'rgba(245,158,11,0.5)',
        padding: p(5), alignItems: 'center', gap: p(2),
      }}>
        {seviye >= 2 && !mini ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: p(4) }}>
            <View style={{ width: p(4.5), height: p(4.5), borderRadius: 999, backgroundColor: '#38BDF8' }} />
            <Text style={{ fontSize: Math.max(4, p(6.5)), color: '#94A3B8', fontFamily: FONT.vurgu, letterSpacing: 1 }}>BP ARENA</Text>
            <View style={{ width: p(4.5), height: p(4.5), borderRadius: 999, backgroundColor: '#F87171' }} />
          </View>
        ) : null}
        <Text style={{ fontSize: Math.max(7, p(17)), color: '#FCD34D', fontFamily: FONT.buyuk, letterSpacing: 1 }}>{skorA} - {skorB}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: p(3) }}>
          <View style={{ width: p(3.5), height: p(3.5), borderRadius: 999, backgroundColor: macSonu ? '#64748B' : canli && yanip % 2 === 0 ? '#EF4444' : '#7F1D1D' }} />
          <Text style={{ fontSize: Math.max(4, p(8.5)), color: macSonu ? '#FCD34D' : canli ? '#F87171' : '#64748B', fontFamily: FONT.vurgu }}>
            {macSonu ? 'MAÇ SONU' : `${dakika}'`}
          </Text>
        </View>
        {seviye >= 3 && !mini ? (
          <Text style={{ fontSize: Math.max(4, p(6)), color: '#64748B', fontFamily: FONT.vurgu }}>{macNo}. MAÇ</Text>
        ) : null}
        {/* Skorboard sponsoru: Jet Telefon imzalıysa en değerli köşe onların */}
        {!mini && sponsorYazi ? (
          <Text numberOfLines={1} style={{ fontSize: Math.max(4, p(6)), color: '#A78BFA', fontFamily: FONT.vurgu, letterSpacing: 0.5 }}>{sponsorYazi}</Text>
        ) : null}
      </View>
      <View style={{ alignSelf: 'center', width: p(3), height: p(7), backgroundColor: '#1E293B' }} />
      <View style={{ height: p(2.5), backgroundColor: '#334155', borderRadius: p(1.5) }} />
    </View>
  );
});

/* ---------- KALE ---------- */
function Kale({ seviye, mini, taraf, k }: { seviye: number; mini: boolean; taraf: 'sol' | 'sag'; k: number }) {
  const p = (v: number) => v * k;
  return (
    <View style={{ position: 'absolute', top: '40%', height: '20%', width: mini ? '4%' : '4.8%', ...(taraf === 'sol' ? { left: '0.4%' } : { right: '0.4%' }) }}>
      <View style={{ flex: 1, borderWidth: Math.max(1, p(2)), borderColor: '#FAFAFA', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        {seviye >= 1 ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {['25%', '50%', '75%'].map(t => (
              <View key={`h${t}`} style={{ position: 'absolute', top: t as any, left: 0, right: 0, height: Math.max(0.5, p(0.7)), backgroundColor: 'rgba(255,255,255,0.55)' }} />
            ))}
            {['20%', '40%', '60%', '80%'].map(l => (
              <View key={`v${l}`} style={{ position: 'absolute', left: l as any, top: 0, bottom: 0, width: Math.max(0.5, p(0.7)), backgroundColor: 'rgba(255,255,255,0.55)' }} />
            ))}
          </View>
        ) : null}
      </View>
      {seviye >= 3 ? <View style={{ position: 'absolute', top: -p(3), left: p(2), right: p(2), height: p(2), backgroundColor: '#FAFAFA', borderRadius: p(1) }} /> : null}
    </View>
  );
}

/* ---------- REKLAM BANDI (imzalı sponsorlar gerçek yazıyla görünür) ---------- */
function ReklamBandi({ mini, parlak, sponsorlar, k }: { mini: boolean; parlak: number; sponsorlar: string[]; k: number }) {
  const p = (v: number) => v * k;
  const adet = mini ? 8 : 12;
  const imzali = mini ? [] : SPONSORLAR.filter(s => sponsorlar.includes(s.id));
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'stretch', gap: p(1.5), height: p(mini ? 3 : 5) }}>
      {Array.from({ length: adet }).map((_, i) => {
        const sp = imzali.length > 0 ? imzali[i % imzali.length] : undefined;
        return (
          <View
            key={i}
            style={{
              flex: 1, borderRadius: p(1.5),
              backgroundColor: sp ? sp.renk : REKLAM_RENK[i % REKLAM_RENK.length],
              opacity: parlak >= 3 ? 1 : 0.85,
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            {sp ? (
              <Text numberOfLines={1} style={{ fontSize: Math.max(3.5, p(3.8)), color: 'rgba(11,18,32,0.92)', fontFamily: FONT.buyuk }}>
                {sp.yazi}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* ---------- OTOPARK ---------- */
const Otopark = React.memo(function Otopark({ seviye, mini, canli, k }: { seviye: number; mini: boolean; canli: boolean; k: number }) {
  const p = (v: number) => v * k;
  const sira = mini ? 1 : seviye >= 3 ? 3 : seviye === 2 ? 2 : 1;
  return (
    <View style={{ position: 'absolute', right: '1%', top: '21%', bottom: '14%', width: '11.5%', backgroundColor: '#0F172A', borderRadius: p(6), borderWidth: Math.max(1, p(1)), borderColor: ZEMIN_KAPA }}>
      {/* lamba direği */}
      {canli ? (
        <View style={{ position: 'absolute', top: p(3), left: p(5), alignItems: 'center' }}>
          <View style={{ width: p(4), height: p(4), borderRadius: 999, backgroundColor: '#FEF3C7' }} />
          <View style={{ width: p(1.2), height: p(6), backgroundColor: '#334155' }} />
        </View>
      ) : null}
      {seviye >= 3 ? (
        <View style={{ position: 'absolute', top: p(5), right: p(5), width: p(13), height: p(11), backgroundColor: BETON, borderRadius: p(2), borderWidth: Math.max(0.5, p(1)), borderColor: 'rgba(226,232,240,0.3)' }}>
          <View style={{ margin: p(2), flex: 1, backgroundColor: 'rgba(56,189,248,0.35)', borderRadius: p(1) }} />
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: '8%', right: '8%', top: '18%', bottom: '6%', justifyContent: 'space-evenly' }}>
        {Array.from({ length: sira }).map((_, r) => (
          <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {[0, 1].map(c => (
              <View key={c} style={{ width: '38%', aspectRatio: 2.1, borderRadius: p(2.5), borderWidth: Math.max(0.5, p(0.8)), borderColor: 'rgba(226,232,240,0.35)', backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                <View style={{ position: 'absolute', left: '8%', right: '8%', top: '10%', bottom: '10%', borderRadius: p(2), backgroundColor: ARAC_RENK[(r * 2 + c + seviye) % ARAC_RENK.length] }}>
                  <View style={{ marginTop: '20%', marginHorizontal: '16%', height: '26%', borderRadius: p(1), backgroundColor: 'rgba(11,20,36,0.6)' }} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

/* ---------- KULÜBE / TOP SETİ / KABİN ---------- */
function Kulube({ mini, seviye, k }: { mini: boolean; seviye: number; k: number }) {
  const p = (v: number) => v * k;
  const adet = seviye >= 2 ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', gap: p(7), alignItems: 'flex-end' }}>
      {Array.from({ length: adet }).map((_, i) => (
        <View key={i} style={{ width: p(36), height: p(16) }}>
          <View style={{ height: p(2.5), backgroundColor: seviye >= 3 ? RENK.vurgu : CATI, borderRadius: p(1.5) }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(148,163,184,0.25)', borderWidth: Math.max(0.5, p(1)), borderColor: 'rgba(148,163,184,0.5)', borderRadius: p(2), flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end', paddingBottom: p(1.5) }}>
            {Array.from({ length: mini ? 3 : 5 }).map((_, s) => (
              <View key={s} style={{ width: p(3.5), height: p(3.5), borderRadius: 999, backgroundColor: koltukRengi(s + i * 3) }} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function TopSeti({ seviye, k }: { seviye: number; k: number }) {
  const p = (v: number) => v * k;
  const adet = Math.min(6, 2 + seviye);
  return (
    <View style={{ width: p(26), alignItems: 'center' }}>
      <View style={{ width: '100%', height: p(2.5), backgroundColor: '#334155', borderRadius: p(1.5) }} />
      <View style={{ flexDirection: 'row', gap: p(2), marginTop: p(1.5) }}>
        {Array.from({ length: adet }).map((_, i) => (
          <View key={i} style={{ width: p(4.5), height: p(4.5), borderRadius: 999, backgroundColor: '#FAFAFA', borderWidth: 0.5, borderColor: ZEMIN_KAPA }} />
        ))}
      </View>
    </View>
  );
}

function Kabin({ tur, k }: { tur: 'soyunma' | 'ilkYardim' | 'kamera' | 'kazan'; k: number }) {
  const p = (v: number) => v * k;
  const w = p(24); const h = p(18);
  if (tur === 'soyunma') {
    return (
      <View style={{ width: w, height: h, backgroundColor: BETON, borderRadius: p(3), borderWidth: Math.max(0.5, p(1)), borderColor: ZEMIN_KAPA, overflow: 'hidden' }}>
        <View style={{ height: p(2.5), backgroundColor: CATI, opacity: 0.85 }} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ width: p(2.5), height: '55%', backgroundColor: 'rgba(226,232,240,0.35)', borderRadius: p(1) }} />
          ))}
        </View>
      </View>
    );
  }
  if (tur === 'ilkYardim') {
    return (
      <View style={{ width: w, height: h * 0.8, backgroundColor: '#F8FAFC', borderRadius: p(3), borderWidth: Math.max(0.5, p(1)), borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: p(12), height: p(2.5), backgroundColor: '#EF4444', borderRadius: p(1) }} />
        <View style={{ position: 'absolute', height: p(12), width: p(2.5), backgroundColor: '#EF4444', borderRadius: p(1) }} />
      </View>
    );
  }
  if (tur === 'kamera') {
    return (
      <View style={{ width: w, height: h, backgroundColor: BETON_KOYU, borderRadius: p(3), borderWidth: Math.max(0.5, p(1)), borderColor: '#334155', padding: p(3), gap: p(2) }}>
        <View style={{ height: p(2.5), backgroundColor: 'rgba(56,189,248,0.5)', borderRadius: p(1) }} />
        <View style={{ height: p(2.5), backgroundColor: 'rgba(56,189,248,0.3)', borderRadius: p(1) }} />
        <View style={{ position: 'absolute', top: p(3), right: p(3), width: p(3), height: p(3), borderRadius: 999, backgroundColor: '#EF4444' }} />
      </View>
    );
  }
  return (
    <View style={{ width: w, height: h * 0.9, backgroundColor: '#334155', borderRadius: p(3), borderWidth: Math.max(0.5, p(1)), borderColor: ZEMIN_KAPA, alignItems: 'center', justifyContent: 'center', gap: p(2) }}>
      <View style={{ width: '55%', height: p(2.5), backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: p(1) }} />
      <View style={{ width: '55%', height: p(2.5), backgroundColor: 'rgba(245,158,11,0.5)', borderRadius: p(1) }} />
    </View>
  );
}

function Turnike({ seviye, k }: { seviye: number; k: number }) {
  const p = (v: number) => v * k;
  const adet = seviye >= 3 ? 4 : seviye === 2 ? 3 : 2;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: p(6) }}>
      {Array.from({ length: adet }).map((_, i) => (
        <View key={i} style={{ alignItems: 'center', gap: p(1.5) }}>
          <View style={{ width: p(11), height: p(16), backgroundColor: BETON, borderRadius: p(2), borderWidth: Math.max(0.5, p(1)), borderColor: ZEMIN_KAPA, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: p(2.5), height: p(2.5), borderRadius: 999, backgroundColor: '#FCD34D' }} />
          </View>
          <View style={{ width: p(13), height: p(2), backgroundColor: 'rgba(226,232,240,0.5)', borderRadius: p(1), transform: [{ rotate: '-20deg' }] }} />
        </View>
      ))}
    </View>
  );
}

function Agac({ k }: { k: number }) {
  const p = (v: number) => v * k;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: p(13), height: p(13), borderRadius: 999, backgroundColor: '#2F9E44', borderWidth: Math.max(0.5, p(1)), borderColor: '#1E6B30' }} />
      <View style={{ width: p(2.5), height: p(5), backgroundColor: '#7A5230' }} />
    </View>
  );
}

function ProjektorKulesi({ canli, k }: { canli: boolean; k: number }) {
  const p = (v: number) => v * k;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: p(1.5) }}>
        {[0, 1].map(i => (
          <View key={i} style={{ width: p(4.5), height: p(4.5), borderRadius: p(1.5), backgroundColor: canli ? '#FEF3C7' : '#CBD5E1' }} />
        ))}
      </View>
      <View style={{ width: p(2.5), height: p(10), backgroundColor: '#334155' }} />
    </View>
  );
}

function KameraDiregi({ canli, k, don }: { canli: boolean; k: number; don: number }) {
  const p = (v: number) => v * k;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: p(10), height: p(6), backgroundColor: BETON_KOYU, borderRadius: p(2), borderWidth: Math.max(0.5, p(1)), borderColor: '#334155', transform: [{ rotate: `${don}deg` }], alignItems: 'flex-end', justifyContent: 'center', paddingRight: p(1.5) }}>
        <View style={{ width: p(2), height: p(2), borderRadius: 999, backgroundColor: canli ? '#EF4444' : '#94A3B8' }} />
      </View>
      <View style={{ width: p(2), height: p(10), backgroundColor: '#334155' }} />
    </View>
  );
}

function SesDiregi({ k }: { k: number }) {
  const p = (v: number) => v * k;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: p(1.5) }}>
      <View style={{ width: p(6), height: p(9), backgroundColor: BETON_KOYU, borderRadius: p(2), borderWidth: Math.max(0.5, p(1)), borderColor: '#334155' }} />
      <View style={{ width: p(2), height: p(7), backgroundColor: '#334155' }} />
      <View style={{ width: p(2.5), height: p(2.5), borderRadius: 999, backgroundColor: 'rgba(226,232,240,0.6)' }} />
    </View>
  );
}

/* ---------- SAHA BİLGİ PANELİ ---------- */
function BilgiPanel({ kalite, canli, oyuncuSayisi, sahaTipi, k }: {
  kalite: number; canli: boolean; oyuncuSayisi: number; sahaTipi: string; k: number;
}) {
  const p = (v: number) => v * k;
  const ad = sahaTipi === 'yildiz' ? 'YILDIZ SAHA' : sahaTipi.toUpperCase();
  const kaliteYuzde = clamp(kalite * 10, 0, 100);
  return (
    <View style={{
      position: 'absolute', right: '2%', top: '28%', width: '13%',
      backgroundColor: 'rgba(11,18,32,0.94)', borderRadius: p(5),
      borderWidth: Math.max(1, p(1)), borderColor: 'rgba(56,189,248,0.42)',
      padding: p(5), gap: p(3), zIndex: 20,
    }}>
      <Text numberOfLines={1} style={{ color: '#FCD34D', fontSize: Math.max(5, p(7)), fontFamily: FONT.buyuk }}>{ad}</Text>
      <View style={{ height: Math.max(1, p(1)), backgroundColor: 'rgba(148,163,184,0.25)' }} />
      <Text style={{ color: canli ? '#4ADE80' : '#94A3B8', fontSize: Math.max(5, p(7)), fontFamily: FONT.vurgu }}>
        {canli ? '● AKTİF' : '○ BEKLEMEDE'}
      </Text>
      <Text style={{ color: '#CBD5E1', fontSize: Math.max(4, p(6.5)), fontFamily: FONT.govde }}>
        {oyuncuSayisi}v{oyuncuSayisi} MAÇ
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: Math.max(4, p(6.5)), fontFamily: FONT.govde }}>
        Kalite {Math.round(kalite)}/10
      </Text>
      <View style={{ height: p(3), borderRadius: p(2), backgroundColor: '#1E293B', overflow: 'hidden' }}>
        <View style={{ width: `${kaliteYuzde}%`, height: '100%', backgroundColor: kalite >= 7 ? '#22C55E' : '#F59E0B' }} />
      </View>
    </View>
  );
}

/* ---------- ANA BİLEŞEN ---------- */
function Saha2D({
  asama,
  kalite = 0,
  sahaTipi = 'yildiz',
  canli = false,
  mini = false,
  oyuncuSayisi = 5,
  upgrades = {},
  sponsorlar = [],
}: Props) {
  const sev = (id: string): number => upgrades?.[id] ?? 0;

  const telSeviye = sev('telOrgu');
  const tribunSeviye = sev('tribun');
  const otoSeviye = sev('otopark');
  const kameraSeviye = sev('kamera');
  const isitmaSeviye = sev('isitma');
  const skorSeviye = sev('skorboard');
  const reklamSeviye = sev('reklam');
  const vipSeviye = sev('vipLoca');
  const kaleSeviye = sev('kale');
  const topSeviye = sev('topSeti');
  const kulubeSeviye = sev('yedekKulubesi');
  const sesSeviye = sev('sesSistemi');
  const turnikeSeviye = sev('turnike');
  const yardimSeviye = sev('ilkYardim');
  const dolapSeviye = sev('soyunmaDolabi');

  // === SPONSORLAR ===
  const imzaliSponsorlar = (sponsorlar ?? []).filter(x => typeof x === 'string');
  const skorSponsorYazisi = SPONSORLAR.find(
    s => s.id === 'jetTelefon' && imzaliSponsorlar.includes(s.id),
  )?.yazi;

  // === ÖLÇEK: sahne genişliğine göre her yapı büyür/küçülür ===
  const [genislik, setGenislik] = useState(0);
  const k = genislik > 0 ? genislik / 680 : 1;
  const p = (v: number) => v * k;

  const asamaNo = asama ?? 0;
  const hizmette = asamaNo >= 5;
  const yapiGoster = hizmette;
  const tipVurgu = TIP_VURGU[sahaTipi] ?? TIP_VURGU.yildiz;
  const [cim1, cim2] = cimRenk(kalite);
  const seritAdet = kalite >= 8 ? 10 : 8;

  const simRef = useRef<Sim | null>(null);
  if (!simRef.current) simRef.current = simKur(oyuncuSayisi);
  const tikRef = useRef(0);
  const [tik, setTik] = useState(0);
  const [skor, setSkor] = useState({ a: 0, b: 0 });
  const [golAni, setGolAni] = useState<{ takim: 0 | 1; t: number } | null>(null);
  const [macSonu, setMacSonu] = useState(false);
  const [macNo, setMacNo] = useState(1);
  const macZamRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Sardur Technologies
  const odakli = useIsFocused(); // Sardur Technologies: sekme arkadayken animasyon durur

  useEffect(() => {
    simRef.current = simKur(oyuncuSayisi);
    tikRef.current = 0;
    setTik(0);
    setSkor({ a: 0, b: 0 });
    setGolAni(null);
    setMacSonu(false);
    setMacNo(1);

    if (macZamRef.current) {
      clearTimeout(macZamRef.current);
      macZamRef.current = null;
    }
  }, [oyuncuSayisi]);

  // Sardur Technologies: ekran kapanirken bekleyen mac sonu zamanlayicisi temizlenir
  useEffect(() => {
    return () => {
      if (macZamRef.current) clearTimeout(macZamRef.current);
    };
  }, []);

  useEffect(() => {
    if (!canli || mini || !odakli) return; // Sardur Technologies: mini + arka planda animasyon yok
    const id = setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      const now = Date.now();
      const gol = simAdim(sim, now);
      const yeniTik = ++tikRef.current;
      setTik(yeniTik);
      if (gol != null) {
        setSkor(s => (gol === 0 ? { ...s, a: s.a + 1 } : { ...s, b: s.b + 1 }));
        setGolAni({ takim: gol, t: now });
      }
      if (yeniTik % MAC_TIK === 0) {
        setMacSonu(true);
        sim.bekleme = 48;
        if (macZamRef.current) clearTimeout(macZamRef.current);
        macZamRef.current = setTimeout(() => {
          setSkor({ a: 0, b: 0 });
          setMacNo(m => m + 1);
          setMacSonu(false);
        }, 2600);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [canli, mini, odakli]);

  const sim = simRef.current;
  const dakika = Math.min(90, Math.floor((tik % MAC_TIK) / (MAC_TIK / 90)));
  const golVar = !!golAni && Date.now() - golAni.t < 1600;
  const faz = Math.floor(tik / 2);

  // hakem topu takip eder
  const hakemX = clamp(sim.top.x + 6, 15, 85);
  const hakemY = clamp(sim.top.y + 9, 12, 88);

  const sahaZemini = asamaNo <= 1 ? '#2E2A20' : asamaNo === 2 ? CAKIL : asamaNo <= 4 ? '#202B38' : ZEMIN;
  const altTribunVar = yapiGoster && tribunSeviye >= 2;

  return (
    <View
      style={[st.sahne, mini && st.sahneMini, { backgroundColor: sahaZemini }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (Math.abs(w - genislik) > 2) setGenislik(w);
      }}
    >

      {/* ================= ÜST TRİBÜN ================= */}
      {yapiGoster && tribunSeviye > 0 ? (
        <View style={{ position: 'absolute', top: '2%', left: '3%', width: mini ? '60%' : tribunSeviye >= 3 ? '74%' : tribunSeviye === 2 ? '66%' : '58%', height: mini ? '17%' : '17.5%' }}>
          <Tribun seviye={tribunSeviye} mini={mini} vip={vipSeviye} heyecan={golVar} k={k} />
        </View>
      ) : null}

      {/* ================= SKORBOARD ================= */}
      {yapiGoster && skorSeviye > 0 ? (
        <Skorboard
          seviye={skorSeviye} mini={mini} canli={canli}
          skorA={skor.a} skorB={skor.b} dakika={dakika}
          gol={golVar} macSonu={macSonu} macNo={macNo} yanip={tik}
          sponsorYazi={skorSponsorYazisi} k={k}
        />
      ) : null}
      {/* ================= BİLGİ PANELİ ================= */}
      {yapiGoster && !mini ? (
        <BilgiPanel
          kalite={kalite}
          canli={canli}
          oyuncuSayisi={oyuncuSayisi}
          sahaTipi={sahaTipi}
          k={k}
        />
      ) : null}

      {/* ================= SOL KOLON: TESİS BİNALARI ================= */}
      {yapiGoster && !mini ? (
        <View style={{ position: 'absolute', left: '1%', top: '22%', gap: p(9), alignItems: 'center' }}>
          {kameraSeviye > 0 ? <KameraDiregi canli={canli} k={k} don={18} /> : null}
          {Array.from({ length: dolapSeviye }).map((_, i) => (<Kabin key={i} tur="soyunma" k={k} />))}
          {yardimSeviye > 0 ? <Kabin tur="ilkYardim" k={k} /> : null}
          {isitmaSeviye >= 2 ? <Kabin tur="kazan" k={k} /> : null}
          {kameraSeviye >= 3 ? <Kabin tur="kamera" k={k} /> : null}
        </View>
      ) : null}

      {/* ================= SAĞ KOLON: OTOPARK ================= */}
      {yapiGoster && otoSeviye > 0 ? <Otopark seviye={otoSeviye} mini={mini} canli={canli} k={k} /> : null}

      {/* ================= ALT TRİBÜN (kale arkası) ================= */}
      {altTribunVar ? (
        <View style={{ position: 'absolute', bottom: '1.5%', left: '9%', width: '52%', height: mini ? '11%' : '10%' }}>
          <Tribun seviye={tribunSeviye - 1} mini={mini} vip={0} heyecan={golVar} k={k} />
        </View>
      ) : null}

      {/* ================= ALT BANT: AĞAÇLAR + TURNİKE ================= */}
      {yapiGoster && !mini && !altTribunVar ? (
        <View style={{ position: 'absolute', left: '2%', bottom: '2.5%', flexDirection: 'row', gap: p(10), alignItems: 'flex-end' }}>
          <Agac k={k} />
          <Agac k={k} />
          {kameraSeviye >= 2 ? <KameraDiregi canli={canli} k={k} don={-18} /> : null}
        </View>
      ) : null}
      {yapiGoster && turnikeSeviye > 0 && !altTribunVar ? (
        <View style={{ position: 'absolute', right: '2%', bottom: '2%' }}>
          <Turnike seviye={turnikeSeviye} k={k} />
        </View>
      ) : null}

      {/* ================= BP ARENA PLAKETİ ================= */}
      {yapiGoster && !mini ? (
        <View style={{ position: 'absolute', left: '2%', bottom: '2.5%', backgroundColor: '#0B1220', borderRadius: p(3), borderWidth: Math.max(0.5, p(1)), borderColor: 'rgba(245,158,11,0.4)', paddingHorizontal: p(7), paddingVertical: p(2.5) }}>
          <Text style={{ fontSize: Math.max(4, p(7)), color: '#FCD34D', fontFamily: FONT.buyuk, letterSpacing: 1 }}>BP ARENA</Text>
        </View>
      ) : null}

      {/* ================= SAHA ALANI ================= */}
      <View style={st.pitchWrap}>

        {/* --- ZEMİN --- */}
        {asamaNo >= 3 ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: p(5), overflow: 'hidden' }}>
            {/* dışrunoff: kenar koyu çim */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: kalite >= 6 ? '#24753290' : '#2A5F3590' }} />
            {/* biçim şeritleri */}
            <View style={{ flexDirection: 'row', position: 'absolute', top: '4%', left: '3%', right: '3%', bottom: '4%' }}>
              {Array.from({ length: seritAdet }).map((_, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? cim1 : cim2 }} />
              ))}
            </View>
            {/* köşe yayları */}
            {[
              { left: -p(9), top: -p(9) }, { right: -p(9), top: -p(9) },
              { left: -p(9), bottom: -p(9) }, { right: -p(9), bottom: -p(9) },
            ].map((pos, i) => (
              <View key={`ka${i}`} style={{ position: 'absolute', ...pos, width: p(18), height: p(18), borderRadius: 999, borderWidth: Math.max(0.5, p(1.4)), borderColor: CIZGI }} />
            ))}
          </View>
        ) : (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: p(5), backgroundColor: TOPRAK, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' }}>
            <View style={{ position: 'absolute', left: '15%', top: '55%', width: '22%', height: '20%', borderRadius: 999, backgroundColor: TOPRAK_KOYU, opacity: 0.7 }} />
            <View style={{ position: 'absolute', left: '60%', top: '20%', width: '18%', height: '16%', borderRadius: 999, backgroundColor: TOPRAK_KOYU, opacity: 0.6 }} />
            {asamaNo >= 2 ? (
              <>
                <View style={{ position: 'absolute', left: '8%', right: '8%', top: '34%', height: 2, backgroundColor: 'rgba(0,0,0,0.22)' }} />
                <View style={{ position: 'absolute', left: '8%', right: '8%', top: '66%', height: 2, backgroundColor: 'rgba(0,0,0,0.22)' }} />
                <View style={{ position: 'absolute', left: '26%', top: '72%', width: p(16), height: p(11), borderRadius: 999, backgroundColor: '#9CA3AF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' }} />
                <View style={{ position: 'absolute', left: '64%', top: '74%', width: p(13), height: p(9), borderRadius: 999, backgroundColor: '#8B6F47', borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' }} />
              </>
            ) : null}
            {asamaNo === 0 ? (
              <View style={{ position: 'absolute', left: '6%', top: '10%', alignItems: 'center' }}>
                <View style={{ width: p(40), height: p(16), backgroundColor: '#F8FAFC', borderRadius: p(2), borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: Math.max(5, p(7.5)), color: '#DC2626', fontFamily: FONT.buyuk }}>SATILIK</Text>
                </View>
                <View style={{ width: p(2.5), height: p(6), backgroundColor: '#94A3B8' }} />
              </View>
            ) : null}
            {asamaNo === 1 ? (
              <View style={{ position: 'absolute', right: '8%', top: '12%' }}>
                <Kabin tur="soyunma" k={k} />
              </View>
            ) : null}
          </View>
        )}

        {/* --- YIPRANMA --- */}
        {asamaNo >= 3 && kalite <= 4 ? (
          <>
            <View style={{ position: 'absolute', left: '11%', top: '40%', width: '9%', height: '16%', borderRadius: 999, backgroundColor: 'rgba(122,96,57,0.4)' }} />
            <View style={{ position: 'absolute', right: '11%', top: '40%', width: '9%', height: '16%', borderRadius: 999, backgroundColor: 'rgba(122,96,57,0.4)' }} />
          </>
        ) : null}

        {/* --- SAHA ÇİZGİLERİ --- */}
        {asamaNo >= 3 ? (
          <>
            <View style={{ position: 'absolute', left: '5%', right: '5%', top: '10%', bottom: '9%', borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI }} />
            <View style={{ position: 'absolute', left: '50%', top: '10%', bottom: '9%', width: Math.max(0.5, p(1.6)), backgroundColor: CIZGI }} />
            <View style={{ position: 'absolute', left: '50%', top: '50%', height: '26%', aspectRatio: 1, borderRadius: 999, borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, transform: [{ translateX: '-50%' }, { translateY: '-50%' }] }} />
            <View style={{ position: 'absolute', left: '50%', top: '50%', width: p(4), height: p(4), borderRadius: 999, backgroundColor: tipVurgu, marginLeft: -p(2), marginTop: -p(2) }} />
            {/* ceza sahaları */}
            <View style={{ position: 'absolute', left: '5%', top: '26%', bottom: '25%', width: '12%', borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, opacity: 0.85 }} />
            <View style={{ position: 'absolute', right: '5%', top: '26%', bottom: '25%', width: '12%', borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, opacity: 0.85 }} />
            <View style={{ position: 'absolute', left: '5%', top: '36%', bottom: '35%', width: '5.5%', borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, opacity: 0.85 }} />
            <View style={{ position: 'absolute', right: '5%', top: '36%', bottom: '35%', width: '5.5%', borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, opacity: 0.85 }} />
            {/* ceza yayları */}
            <View style={{ position: 'absolute', left: '17%', top: '20%', bottom: '20%', width: '13%', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: -p(24), top: '50%', width: p(48), height: p(48), borderRadius: 999, borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, transform: [{ translateY: '-50%' }] }} />
            </View>
            <View style={{ position: 'absolute', right: '17%', top: '20%', bottom: '20%', width: '13%', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -p(24), top: '50%', width: p(48), height: p(48), borderRadius: 999, borderWidth: Math.max(0.5, p(1.6)), borderColor: CIZGI, transform: [{ translateY: '-50%' }] }} />
            </View>
            {/* köşe bayrakları */}
            {[
              { top: '10%', left: '5%' }, { top: '10%', right: '5%' },
              { bottom: '9%', left: '5%' }, { bottom: '9%', right: '5%' },
            ].map((pos, i) => (
              <View key={`cf${i}`} style={{ position: 'absolute', ...(pos as any), alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: Math.max(0.5, p(1.2)), height: p(7), backgroundColor: CIZGI }} />
                  <View style={{ width: p(5), height: p(3.5), backgroundColor: tipVurgu, borderRadius: p(1) }} />
                </View>
              </View>
            ))}
            {/* antrenman konları (alt çizgi boyunca) */}
            {yapiGoster ? (
              <View style={{ position: 'absolute', left: '20%', right: '20%', bottom: '4.5%', flexDirection: 'row', justifyContent: 'space-between' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={{ width: p(4), height: p(4), backgroundColor: '#F97316', borderRadius: p(1), transform: [{ rotate: '45deg' }] }} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {/* --- ISITMA --- */}
        {yapiGoster && isitmaSeviye > 0 ? (
          <>
            <View style={{ position: 'absolute', bottom: '5.5%', left: '8%', right: '8%', borderBottomWidth: Math.max(0.5, p(1.6)), borderBottomColor: 'rgba(245,158,11,0.55)', borderStyle: 'dashed' }} />
            {isitmaSeviye >= 3 ? (
              <View style={{ position: 'absolute', bottom: '1%', left: '3%', right: '3%', height: '6%', backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 999 }} />
            ) : null}
          </>
        ) : null}

        {/* --- REKLAM PANOLARI (sponsor yazılarıyla) --- */}
        {yapiGoster && reklamSeviye > 0 ? (
          <>
            <View style={{ position: 'absolute', top: '1.5%', left: '2%', right: '2%' }}>
              <ReklamBandi mini={mini} parlak={reklamSeviye} sponsorlar={imzaliSponsorlar} k={k} />
            </View>
            <View style={{ position: 'absolute', bottom: '1.5%', left: '2%', right: '2%' }}>
              <ReklamBandi mini={mini} parlak={reklamSeviye} sponsorlar={imzaliSponsorlar} k={k} />
            </View>
          </>
        ) : null}

        {/* --- YEDEK KULÜBESİ + TOP SETİ --- */}
        {yapiGoster && !mini && kulubeSeviye > 0 ? (
          <View style={{ position: 'absolute', top: '4%', left: '30%', flexDirection: 'row', alignItems: 'flex-end', gap: p(12) }}>
            <Kulube mini={mini} seviye={kulubeSeviye} k={k} />
            {topSeviye > 0 ? <TopSeti seviye={topSeviye} k={k} /> : null}
          </View>
        ) : null}

        {/* --- VIP KIRMIZI HALISI --- */}
        {yapiGoster && vipSeviye >= 2 ? (
          <View style={{ position: 'absolute', left: '27%', top: '3%', width: '4%', height: '8%', backgroundColor: 'rgba(245,158,11,0.4)', borderRadius: p(2) }} />
        ) : null}

        {/* --- HOPARLÖRLER --- */}
        {yapiGoster && sesSeviye > 0 && !mini ? (
          <>
            <View style={{ position: 'absolute', left: '2%', bottom: '3%' }}><SesDiregi k={k} /></View>
            <View style={{ position: 'absolute', right: '2%', bottom: '3%' }}><SesDiregi k={k} /></View>
          </>
        ) : null}

        {/* --- TEL ÖRGÜ --- */}
        {(asamaNo >= 4 || (yapiGoster && telSeviye > 0)) ? (
          <>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: Math.max(0.5, p(1.6)), borderStyle: 'dashed', borderColor: 'rgba(203,213,225,0.4)', borderRadius: p(6) }} />
            {yapiGoster && telSeviye >= 2 ? (
              ['0%', '25%', '50%', '75%', '100%'].map(pp => (
                <View key={pp} style={{ position: 'absolute', top: -p(2.5), left: pp as any, width: p(3), height: p(3), borderRadius: p(1), backgroundColor: '#94A3B8' }} />
              ))
            ) : null}
            {yapiGoster && telSeviye >= 3 ? (
              <View style={{ position: 'absolute', top: p(3), left: p(3), right: p(3), bottom: p(3), borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(203,213,225,0.22)', borderRadius: p(4) }} />
            ) : null}
          </>
        ) : null}

        {/* --- KALELER --- */}
        {asamaNo >= 3 ? (
          <>
            <Kale seviye={yapiGoster ? kaleSeviye : 1} mini={mini} taraf="sol" k={k} />
            <Kale seviye={yapiGoster ? kaleSeviye : 1} mini={mini} taraf="sag" k={k} />
          </>
        ) : null}

        {/* --- PROJEKTÖR KULELERİ + IŞIK HAVUZLARI --- */}
        {hizmette && !mini ? (
          <>
            {[
              { top: -p(11), left: -p(11) }, { top: -p(11), right: -p(11) },
              { bottom: -p(11), left: -p(11) }, { bottom: -p(11), right: -p(11) },
            ].map((pos, i) => (
              <View key={i} style={{ position: 'absolute', ...pos }}>
                <ProjektorKulesi canli={canli} k={k} />
              </View>
            ))}
            {[
              { top: -p(42), left: -p(36) }, { top: -p(42), right: -p(36) },
              { bottom: -p(42), left: -p(36) }, { bottom: -p(42), right: -p(36) },
            ].map((pos, i) => (
              <View key={`g${i}`} style={{ position: 'absolute', ...pos, width: p(86), height: p(86), borderRadius: 999, backgroundColor: canli ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.07)' }} />
            ))}
          </>
        ) : null}

        {/* ================= MAÇ SAHNESİ ================= */}
        {asamaNo >= 3 ? (
          <>
            {/* hakem */}
            {canli ? (
              <View style={{ position: 'absolute', left: `${hakemX}%`, top: `${hakemY}%`, transform: [{ translateX: -p(5) }, { translateY: -p(18) }] }}>
                <Adam forma="#1F2937" koyu="#0B1220" kosuyor={sim.top.vx !== 0 || sim.top.vy !== 0} faz={faz + 1} k={k} />
              </View>
            ) : null}

            {/* küçük adamlar */}
            {canli ? (
              sim.oyuncular.map(o => (
              <View
                key={o.id}
                style={{
                  position: 'absolute', left: `${o.x}%`, top: `${o.y}%`,
                  transform: [{ translateX: -p(5) }, { translateY: -p(18) }],
                }}
              >
                <Adam
                  forma={o.gk ? '#FACC15' : TAKIM_RENK[o.takim]}
                  koyu={o.gk ? '#B45309' : TAKIM_KENAR[o.takim]}
                  kosuyor={o.kosuyor}
                  faz={faz}
                  k={k}
                />
              </View>
              ))
            ) : null}

            {/* vuruş efektleri */}
            {canli ? (
              sim.efektler.map(e => {
              const t = clamp((Date.now() - e.t0) / 350, 0, 1);
              const boy = p(18) * t + p(5);
              return (
                <View key={e.id} style={{
                  position: 'absolute', left: `${e.x}%`, top: `${e.y}%`, width: boy, height: boy,
                  borderRadius: 999, borderWidth: Math.max(1, p(2)), borderColor: e.renk, opacity: 1 - t,
                  transform: [{ translateX: -(boy / 2) }, { translateY: -(boy / 2) }],
                }} />
              );
              })
            ) : null}

            {/* top */}
            {canli ? (
              <View style={{ position: 'absolute', left: `${sim.top.x}%`, top: `${sim.top.y}%` }}>
              <View style={{ position: 'absolute', left: -p(3), top: p(2), width: p(6), height: p(3), borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)' }} />
              {(() => {
                const sc = 1 + sim.top.z * 0.8;
                const boy = p(7) * sc;
                return (
                  <View style={{
                    position: 'absolute', left: -boy / 2, top: -boy / 2 - sim.top.z * p(6),
                    width: boy, height: boy, borderRadius: 999, backgroundColor: '#FAFAFA',
                    borderWidth: 1, borderColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <View style={{ width: p(2), height: p(2), borderRadius: 999, backgroundColor: '#111827' }} />
                  </View>
                );
              })()}
              </View>
            ) : null}

            {/* GOL pankartı + kale halkası */}
            {golVar && golAni ? (
              <>
                <View style={{ position: 'absolute', top: '40%', height: '20%', width: '9%', ...(golAni.takim === 1 ? { left: '-1%' } : { right: '-1%' }), borderWidth: Math.max(1.5, p(3.5)), borderColor: '#FCD34D', borderRadius: p(12), opacity: 0.9 }} />
                <View pointerEvents="none" style={{ position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center' }}>
                  <View style={{ backgroundColor: 'rgba(11,18,32,0.9)', borderRadius: p(12), borderWidth: Math.max(1, p(2.5)), borderColor: '#FCD34D', paddingHorizontal: p(20), paddingVertical: p(7), alignItems: 'center', gap: p(3) }}>
                    <Text style={{ color: '#FCD34D', fontSize: Math.max(10, p(22)), fontFamily: FONT.buyuk }}>GOL! ⚽</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: p(5) }}>
                      <View style={{ width: p(8), height: p(8), borderRadius: 999, backgroundColor: TAKIM_RENK[golAni.takim] }} />
                      <Text style={{ color: '#CBD5E1', fontSize: Math.max(5, p(10)), fontFamily: FONT.vurgu }}>
                        {golAni.takim === 0 ? 'MAVİ TAKIM' : 'KIRMIZI TAKIM'}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {/* MAÇ SONU pankartı */}
            {macSonu ? (
              <View pointerEvents="none" style={{ position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(11,18,32,0.9)', borderRadius: p(12), borderWidth: Math.max(1, p(2.5)), borderColor: '#FCD34D', paddingHorizontal: p(20), paddingVertical: p(7), alignItems: 'center', gap: p(3) }}>
                  <Text style={{ color: '#FCD34D', fontSize: Math.max(9, p(18)), fontFamily: FONT.buyuk }}>MAÇ SONU</Text>
                  <Text style={{ color: '#E2E8F0', fontSize: Math.max(7, p(13)), fontFamily: FONT.vurgu }}>{skor.a} - {skor.b}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {/* ================= VİNYET (gece stadyumu hissi) ================= */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: p(16), borderColor: 'rgba(0,0,0,0.30)', borderRadius: p(14) }} />
    </View>
  );
}

/* ---------- stiller ---------- */
const st = StyleSheet.create({
  sahne: {
    width: '100%',
    aspectRatio: 2.2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ZEMIN_KAPA,
    overflow: 'hidden',
  },
  sahneMini: {
    aspectRatio: 1.85,
    borderRadius: 8,
  },
  pitchWrap: {
    position: 'absolute',
    left: '9%',
    right: '15%',
    top: '21%',
    bottom: '13%',
  },
});
// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===

export default React.memo(Saha2D);
