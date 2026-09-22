// ============================================
// BEŞLİ PATRON — app/tabs/rezervasyonlar.tsx (ÇOKLU SAHA)
// ============================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useGame } from '@/context/GameContext';
import { MAX_ENERJI } from '@/constants/gameConfig';
import { SAHA_TIP_BILGI } from '@/constants/pitchConfig';
import { rezervasyonEnerjiMaliyeti } from '@/services/gameLogic';
import type { Reservation, PitchState } from '@/types/game';

function para(n: number): string {
  return `${Math.round(n).toLocaleString('tr-TR')}₺`;
}

// Müşteri tipi → gösterim (sadece ekran süsü, config'e bağımlı değil)
const MUSTERI_BILGI: Record<string, { emoji: string; ad: string }> = {
  mahalle: { emoji: '🏘️', ad: 'Mahalle Takımı' },
  ogrenci: { emoji: '🎓', ad: 'Öğrenci Grubu' },
  ofis: { emoji: '💼', ad: 'Ofis Ekibi' },
  amator: { emoji: '⚽', ad: 'Amatör Lig' },
  dogumGunu: { emoji: '🎂', ad: 'Doğum Günü' },
  yas50plus: { emoji: '👴', ad: '50+ Kafalar' },
  kurumsal: { emoji: '🏢', ad: 'Kurumsal Takım' },
};

export default function RezervasyonScreen() {
  const { state, acceptReservation, rejectReservation } = useGame();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState(false);
  const [filtre, setFiltre] = useState<string>('hepsi'); // 'hepsi' | sahaId

  if (!state) {
    return (
      <View style={st.ekran}>
        <Text style={st.sari}>Yükleniyor…</Text>
      </View>
    );
  }

  // === SAHALAR ===
  const sahaListesi = Object.values(state.pitches ?? {}).filter(Boolean) as PitchState[];
  const acikSahalar = sahaListesi.filter(p => (p.asama ?? 0) >= 5);

  // === TEKLİFLER ===
  const tumTeklifler = (state.bugunRezervasyonlar ?? []).filter(r => r?.durum === 'bekliyor');
  const gosterilen = filtre === 'hepsi'
    ? tumTeklifler
    : tumTeklifler.filter(r => (r.sahaId ?? 'yildiz') === filtre);
  const kabulEdilenler = state.kabulEdilenler ?? [];
  const bugunGelir = state.bugunGelir ?? 0;

  const bildir = (sonuc: string | null, basari?: string) => {
    if (sonuc) { setHata(true); setMesaj(sonuc); }
    else if (basari) { setHata(false); setMesaj(basari); }
  };

  // Tek teklifin sahasının rozet bilgisi (eski kayıtlarda sahaId yoksa Yıldız)
  const sahaBilgi = (sahaId?: string) => {
    const id = sahaId ?? 'yildiz';
    const p = state.pitches?.[id];
    const tip = SAHA_TIP_BILGI[p?.sahaTipi ?? 'yildiz'] ?? SAHA_TIP_BILGI.yildiz;
    return { id, ad: p?.ad ?? 'Yıldız Saha', emoji: tip.emoji, renk: tip.renk };
  };

  // Kartta gösterilen enerji maliyeti — Context'in kabul anında yaktığı formülle aynı:
  // grup büyüklüğü + kasiyer indirimi + sahanın kendi turnike indirim (Yıldız'ın yükseltmesi state.upgrades'te)
  const enerjiMaliyeti = (rez: Reservation): number => {
    const id = rez.sahaId ?? 'yildiz';
    const p = state.pitches?.[id];
    const up: Record<string, number> = id === 'yildiz'
      ? ((state.upgrades ?? {}) as Record<string, number>)
      : ((p?.upgrades ?? {}) as Record<string, number>);
    return rezervasyonEnerjiMaliyeti(
      rez.kisiSayisi ?? 0,
      state.staff?.kasiyer?.level ?? 0,
      up?.turnike ?? 0,
    );
  };

  const kabulEt = (rez: Reservation) => {
    const maliyet = enerjiMaliyeti(rez);
    const sonuc = acceptReservation(rez.id);
    if (sonuc) bildir(sonuc);
    else bildir(null, `🤝 ${rez.musteriAdi} kabul edildi — ${sahaBilgi(rez.sahaId).ad}, ${maliyet} enerji.`);
  };

  const reddet = (rez: Reservation) => {
    rejectReservation(rez.id);
    bildir(null, `🚫 ${rez.musteriAdi} reddedildi.`);
  };

  const enerjiYuzde = Math.max(0, Math.min(100, ((state.enerji ?? 0) / MAX_ENERJI) * 100));

  // Hiç açık saha yoksa defter yerine uyarı
  if (acikSahalar.length === 0) {
    return (
      <View style={st.ekran}>
        <ScrollView contentContainerStyle={st.icerik} showsVerticalScrollIndicator={false}>
          <Text style={st.baslik}>📞 Rezervasyon Defteri</Text>
          <View style={st.kart}>
            <Text style={st.bolumBaslik}>🚧 Açık sahan yok</Text>
            <Text style={st.aciklama}>
              Teklif alabilmen için en az bir sahanın inşaatı bitmiş olmalı.
              Saha sekmesinden inşaatı ilerlet — açılan saha için burada teklifler akmaya başlar.
            </Text>
          </View>
        </ScrollView>
        {mesaj != null && (
          <View style={[st.toast, { backgroundColor: hata ? '#7F1D1D' : '#14532D' }]}>
            <Text style={st.toastYazi}>{mesaj}</Text>
            <TouchableOpacity onPress={() => setMesaj(null)}>
              <Text style={st.toastYazi}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={st.ekran}>
      <ScrollView contentContainerStyle={st.icerik} showsVerticalScrollIndicator={false}>
        <Text style={st.baslik}>📞 Rezervasyon Defteri</Text>

        {/* === GÜN DURUMU === */}
        <View style={st.kart}>
          <View style={st.durumSatir}>
            <Text style={st.durumDeger}>📅 Gün {state.gun ?? 1}</Text>
            <Text style={st.durumDeger}>⚡ {state.enerji ?? 0}/{MAX_ENERJI}</Text>
            <Text style={st.durumDeger}>💰 {para(state.nakit ?? 0)}</Text>
            <Text style={st.durumDeger}>📈 {para(bugunGelir)}</Text>
          </View>
          <View style={st.barArka}>
            <View style={[st.barOn, { width: `${enerjiYuzde}%` }]} />
          </View>
          <Text style={st.durumNot}>
            Her kabul ettiğin teklif enerji yakar — grup büyüdükçe maliyet artar;
            kasiyerin ve sahanın turnike sistemi indirim yapar.
          </Text>
        </View>

        {/* === SAHA FİLTRESİ === */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.seri}>
          <TouchableOpacity
            style={[st.cip, filtre === 'hepsi' && st.cipSecili]}
            onPress={() => { setFiltre('hepsi'); setMesaj(null); }}
          >
            <Text style={st.cipEmoji}>🗂️</Text>
            <Text style={st.cipAd}>Tümü ({tumTeklifler.length})</Text>
          </TouchableOpacity>
          {acikSahalar.map(p => {
            const b = sahaBilgi(p.id);
            const adet = tumTeklifler.filter(r => (r.sahaId ?? 'yildiz') === p.id).length;
            const secili = filtre === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[st.cip, secili && { borderColor: b.renk, backgroundColor: '#1E293B' }]}
                onPress={() => { setFiltre(p.id); setMesaj(null); }}
              >
                <Text style={st.cipEmoji}>{b.emoji}</Text>
                <Text style={st.cipAd}>{p.ad ?? 'Saha'}</Text>
                <Text style={st.cipAdet}>{adet}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* === TEKLİF LİSTESİ === */}
        {gosterilen.length === 0 ? (
          <View style={st.kart}>
            <Text style={st.bos}>
              {tumTeklifler.length === 0
                ? '😴 Bugünlük başka teklif yok. Günü bitir, yarın yeni müşteriler gelir.'
                : '📭 Bu saha için bekleyen teklif yok — başka sahayı da kontrol et.'}
            </Text>
          </View>
        ) : (
          gosterilen.map(rez => {
            const sB = sahaBilgi(rez.sahaId);
            const mb = MUSTERI_BILGI[rez.musteriTipi] ?? { emoji: '🙂', ad: 'Müşteri' };
            const maliyet = enerjiMaliyeti(rez);
            const enerjiYetiyor = (state.enerji ?? 0) >= maliyet;
            return (
              <View key={rez.id} style={st.kart}>
                {/* Kart başı: müşteri + saha rozeti */}
                <View style={st.kartBas}>
                  <Text style={st.musteriEmoji}>{mb.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.musteriAd}>{rez.musteriAdi}</Text>
                    <Text style={st.musteriTur}>{mb.ad}</Text>
                  </View>
                  <View style={[st.sahaRozet, { borderColor: sB.renk }]}>
                    <Text style={st.sahaRozetYazi}>{sB.emoji} {sB.ad}</Text>
                  </View>
                </View>

                {/* Saat + enerji maliyeti */}
                <View style={st.bilgiSatiri}>
                  <Text style={st.bilgiCip}>⏰ {rez.saatAraligi}</Text>
                  <Text style={[st.bilgiCip, !enerjiYetiyor && { color: '#F87171' }]}>⚡ {maliyet} enerji</Text>
                  {rez.sadik ? <Text style={[st.bilgiCip, { color: '#F9A8D4' }]}>❤️ Sadık müşteri</Text> : null}
                </View>

                {/* Fiyat + aksiyonlar */}
                <View style={st.aksiyonSatiri}>
                  <Text style={st.fiyat}>{para(rez.fiyat ?? 0)}</Text>
                  <View style={st.butonGrup}>
                    <TouchableOpacity
                      style={st.btnRed}
                      onPress={() => reddet(rez)}
                      accessibilityRole="button"
                      accessibilityLabel={`${rez.musteriAdi ?? ''} reddet`}
                    >
                      <Text style={st.btnRedYazi}>❌ Reddet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[st.btnYesil, !enerjiYetiyor && { backgroundColor: '#334155' }]}
                      disabled={!enerjiYetiyor}
                      onPress={() => kabulEt(rez)}
                      accessibilityRole="button"
                      accessibilityLabel={`${rez.musteriAdi ?? ''} kabul et`}
                    >
                      <Text style={st.btnYesilYazi}>
                        {enerjiYetiyor ? '✅ Kabul Et' : '⚡ Enerji Az'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* === BUGÜN KABUL EDİLENLER === */}
        {kabulEdilenler.length > 0 && (
          <View style={st.kart}>
            <Text style={st.bolumBaslik}>✅ Bugün Kabul Edilenler ({kabulEdilenler.length})</Text>
            {kabulEdilenler.map(r => {
              const sB = sahaBilgi(r.sahaId);
              return (
                <View key={r.id} style={st.kabulSatiri}>
                  <Text style={st.kabulSaha}>{sB.emoji}</Text>
                  <Text style={st.kabulAd} numberOfLines={1}>{r.musteriAdi}</Text>
                  <Text style={st.kabulSaat}>{r.saatAraligi}</Text>
                  <Text style={st.kabulFiyat}>{para(r.fiyat ?? 0)}</Text>
                </View>
              );
            })}
            <Text style={st.kabulToplam}>Toplam {para(bugunGelir)} — gün sonunda kasaya girer.</Text>
          </View>
        )}
      </ScrollView>

      {/* === BİLDİRİM === */}
      {mesaj != null && (
        <View style={[st.toast, { backgroundColor: hata ? '#7F1D1D' : '#14532D' }]}>
          <Text style={st.toastYazi}>{mesaj}</Text>
          <TouchableOpacity onPress={() => setMesaj(null)}>
            <Text style={st.toastYazi}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================
// === STİLLER ===
// ============================================
const st = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#0F172A' },
  icerik: { padding: 16, paddingBottom: 90 },
  baslik: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  sari: { color: '#F59E0B' },
  muted: { color: '#94A3B8', fontSize: 12 },
  kart: {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  durumSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  durumDeger: { color: '#F8FAFC', fontWeight: '800', fontSize: 13 },
  durumNot: { color: '#64748B', fontSize: 11, marginTop: 8, lineHeight: 16 },
  barArka: { height: 8, backgroundColor: '#0B1220', borderRadius: 999, overflow: 'hidden' },
  barOn: { height: '100%', backgroundColor: '#22C55E' },
  seri: { marginBottom: 12 },
  cip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#334155', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, backgroundColor: '#0B1220',
  },
  cipSecili: { borderColor: '#F59E0B', backgroundColor: '#1E293B' },
  cipEmoji: { fontSize: 18 },
  cipAd: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  cipAdet: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  kartBas: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  musteriEmoji: { fontSize: 28 },
  musteriAd: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  musteriTur: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  sahaRozet: {
    borderWidth: 1.5, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#0B1220',
  },
  sahaRozetYazi: { color: '#E2E8F0', fontSize: 11, fontWeight: '800' },
  bilgiSatiri: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  bilgiCip: {
    color: '#E2E8F0', backgroundColor: '#0B1220', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, overflow: 'hidden',
  },
  aksiyonSatiri: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 12, borderTopWidth: 1, borderTopColor: '#0B1220', paddingTop: 10,
  },
  fiyat: { color: '#34D399', fontWeight: '800', fontSize: 18, flex: 1 },
  butonGrup: { flexDirection: 'row', gap: 8 },
  btnRed: {
    backgroundColor: '#7F1D1D', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  btnRedYazi: { color: '#FCA5A5', fontWeight: '800', fontSize: 13 },
  btnYesil: {
    backgroundColor: '#22C55E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  btnYesilYazi: { color: '#052E16', fontWeight: '800', fontSize: 13 },
  kabulSatiri: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0B1220',
  },
  kabulSaha: { fontSize: 16 },
  kabulAd: { color: '#F8FAFC', fontWeight: '700', fontSize: 13, flex: 1 },
  kabulSaat: { color: '#64748B', fontSize: 11 },
  kabulFiyat: { color: '#34D399', fontWeight: '800', fontSize: 13 },
  kabulToplam: { color: '#F59E0B', fontWeight: '800', fontSize: 12, marginTop: 8 },
  bolumBaslik: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  aciklama: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  bos: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    borderRadius: 12, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  toastYazi: { color: '#F8FAFC', fontWeight: '700', flexShrink: 1, marginRight: 8 },
});

// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===
