import { Colors } from '../../constants/colors';
// ============================================
// BEŞLİ PATRON — app/tabs/lig.tsx
// LİG / TAKIM — Türkiye lig piramidi, puan tablosu,
// kadro ve transfer. (Sardur Technologies)
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Platform, Alert } from 'react-native';
import { useGame } from '../../context/GameContext';
import {
  BENIM_TAKIM, takimGucu, tablola, yeniLig, haftaOyna, yeniSezonBaslat,
  transferListesiUret, oyuncuAl, oyuncuSat, ligYukle, ligKaydet, ligSifirla,
  type LigState, type Oyuncu, type MacRaporu,
} from '../../services/ligManager';
import { kademeBul } from '../../services/ligConfig';

const font = Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', web: 'SpaceMono, monospace' });
const para = (n: number) => (n || 0).toLocaleString('tr-TR') + ' TL';

const SONUC_RENK: Record<string, string> = { G: '#4ADE80', B: Colors.primary, M: '#F87171' };
const SONUC_AD: Record<string, string> = { G: 'GALİBİYET', B: 'BERABERLİK', M: 'MAĞLUBİYET' };
const POZ_SIRA: Record<string, number> = { Kaleci: 1, Defans: 2, 'Orta Saha': 3, Forvet: 4 };

export default function Lig() {
  const { state } = useGame();
  const nakitEkle = (useGame() as unknown as { nakitEkle?: (d: number) => void }).nakitEkle ?? ((_d: number) => undefined);

  const [lig, setLig] = useState<LigState | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState('');
  const [rapor, setRapor] = useState<MacRaporu | null>(null);
  const [raporModal, setRaporModal] = useState(false);
  const [sezonModal, setSezonModal] = useState(false);
  const [onayTalebi, setOnayTalebi] = useState<{ baslik: string; mesaj: string; onOk: () => void } | null>(null);

  useEffect(() => {
    ligYukle().then(s => { setLig(s); setYukleniyor(false); }).catch(() => setYukleniyor(false));
  }, []);

  const uygula = useCallback((yeni: LigState, delta: number, m: string) => {
    setLig(yeni);
    ligKaydet(yeni);
    if (delta !== 0) nakitEkle(delta);
    if (m) setMesaj(m);
  }, [nakitEkle]);
  // === WEB UYUMLU ONAY — Alert.alert web'de buton callback'lerini calistirmaz! ===
  const onay = (baslik: string, mesaj: string, onOk: () => void) => {
    if (Platform.OS === 'web') {
      const w = globalThis as unknown as { confirm?: (m: string) => boolean };
      if (w.confirm?.(baslik + '\n\n' + mesaj)) onOk();
      return;
    }
    if (Platform.OS === 'ios') {
      setOnayTalebi({ baslik, mesaj, onOk });
      return;
    }
    Alert.alert(baslik, mesaj, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Tamam', style: 'destructive', onPress: onOk },
    ]);
  };

  const kariyerBaslat = () => {
    const s = yeniLig();
    uygula(s, 0, kademeBul(s.seviye).ad + ' kariyeri başladı!');
  };

  const macOyna = () => {
    if (!lig || lig.sezonSonu) return;
    const r = haftaOyna(lig);
    let yeni = r.state;
    if (!yeni.sezonSonu) yeni = transferListesiUret(yeni);
    setRapor(r.rapor);
    setRaporModal(true);
    uygula(yeni, r.nakitDelta, '');
  };

  const raporuKapat = () => {
    setRaporModal(false);
    if (lig?.sezonSonu) setSezonModal(true);
  };

  const sezonDevam = () => {
    if (!lig) return;
    const r = yeniSezonBaslat(lig);
    uygula(r.state, 0, r.mesaj);
    setSezonModal(false);
  };

  const oyuncuAlBas = (o: Oyuncu) => {
    if (!lig) return;
    const r = oyuncuAl(lig, o.id);
    uygula(r.state, r.nakitDelta, r.mesaj);
  };

  const oyuncuSatBas = (o: Oyuncu) => {
    if (!lig) return;
    onay('Oyuncu Satışı', o.ad + ' satılsın mı? (Değerinin %60\'ı)', () => {
      const r = oyuncuSat(lig, o.id);
      uygula(r.state, r.nakitDelta, r.mesaj);
    });
  };

  const kariyeriSifirla = () => {
    onay('Kariyeri Sıfırla', 'Lig ve takım kaydı tamamen silinecek. Bu işlem geri alınamaz!', () => {
      ligSifirla(); setLig(null); setMesaj('');
    });
  };

  if (yukleniyor) {
    return <View style={s.merkez}><Text style={[s.satirMetin, { fontFamily: font }]}>Yükleniyor...</Text></View>;
  }

  // === KARİYER YOK — BAŞLANGIÇ EKRANI ===
  if (!lig) {
    return (
      <View style={[s.merkez, { padding: 24 }]}>
        <Text style={[s.baslik, { fontFamily: font }]}>Takım Kariyeri</Text>
        <Text style={[s.satirMetin, { fontFamily: font, textAlign: 'center', marginTop: 10 }]}>
          2. Amatör Küme'den başlıyorsun. Şampiyon ol, Süper Lig'e kadar çık: {'\n'}
          2. Amatör {'\u2192'} 1. Amatör {'\u2192'} Süper Amatör {'\u2192'} Bölgesel Amatör {'\u2192'} 3. Lig {'\u2192'} 2. Lig {'\u2192'} 1. Lig {'\u2192'} Süper Lig{'\n\n'}
          Ev maçı hasılatı kasaya yazar, transferler kasanı harcar.{'\n'}
          İşletme nakit'in: {para(state?.nakit ?? 0)}
        </Text>
        <TouchableOpacity style={[s.buton, { marginTop: 22 }]} onPress={kariyerBaslat}>
          <Text style={[s.butonMetin, { fontFamily: font }]}>Kariyeri Başlat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const kademe = kademeBul(lig.seviye);
  const sira = tablola(lig);
  const guc = takimGucu(lig.kadro);
  const nakit = state?.nakit ?? 0;

  return (
    <View style={s.sarma}>
      <ScrollView contentContainerStyle={s.icerik}>
        {mesaj !== '' && (
          <View style={s.mesajKutu}><Text style={[s.mesajMetin, { fontFamily: font }]}>{mesaj}</Text></View>
        )}

        {/* === UST KART === */}
        <View style={s.kart}>
          <Text style={[s.kademeAd, { fontFamily: font }]}>{kademe.ad}</Text>
          <Text style={[s.altMetin, { fontFamily: font }]}>
            {BENIM_TAKIM} · Sezon {lig.sezonNo} · Hafta {Math.min(lig.hafta + (lig.sezonSonu ? 0 : 1), 7)}/7
          </Text>
          <View style={s.ucSatir}>
            <View style={s.ucHucre}><Text style={[s.ucSayi, { fontFamily: font }]}>{guc}</Text><Text style={[s.ucEtiket, { fontFamily: font }]}>Takım Gücü</Text></View>
            <View style={s.ucHucre}><Text style={[s.ucSayi, { fontFamily: font }]}>{lig.kadro.length}</Text><Text style={[s.ucEtiket, { fontFamily: font }]}>Oyuncu</Text></View>
            <View style={s.ucHucre}><Text style={[s.ucSayi, { fontFamily: font }]}>{para(nakit)}</Text><Text style={[s.ucEtiket, { fontFamily: font }]}>İşletme Kasası</Text></View>
          </View>
        </View>

        {/* === PUAN DURUMU === */}
        <View style={s.kart}>
          <Text style={[s.bolumBaslik, { fontFamily: font }]}>Puan Durumu</Text>
          <View style={s.tabloBaslik}>
            <Text style={[s.hNo, { fontFamily: font }]}>#</Text>
            <Text style={[s.hAd, { fontFamily: font }]}>TAKIM</Text>
            <Text style={[s.hSayi, { fontFamily: font }]}>O</Text>
            <Text style={[s.hSayi, { fontFamily: font }]}>A</Text>
            <Text style={[s.hSayi, { fontFamily: font }]}>Y</Text>
            <Text style={[s.hSayi, { fontFamily: font }]}>AV</Text>
            <Text style={[s.hSayi, { fontFamily: font }]}>P</Text>
          </View>
          {sira.map((satir, i) => (
            <View key={satir.ad} style={[s.tabloSatir, satir.benim && s.benimSatir]}>
              <Text style={[s.hNo, { fontFamily: font }]}>{i + 1}</Text>
              <Text style={[s.hAd, { fontFamily: font, color: satir.benim ? Colors.primary : Colors.textPrimary, fontWeight: satir.benim ? 'bold' : 'normal' }]}>{satir.ad}</Text>
              <Text style={[s.hSayi, { fontFamily: font }]}>{satir.O}</Text>
              <Text style={[s.hSayi, { fontFamily: font }]}>{satir.A}</Text>
              <Text style={[s.hSayi, { fontFamily: font }]}>{satir.Y}</Text>
              <Text style={[s.hSayi, { fontFamily: font }]}>{satir.AV > 0 ? '+' + satir.AV : satir.AV}</Text>
              <Text style={[s.hSayi, { fontFamily: font, color: '#4ADE80', fontWeight: 'bold' }]}>{satir.P}</Text>
            </View>
          ))}
          {kademe.yukselen > 0 && <Text style={[s.ipucu, { fontFamily: font }]}>Şampiyon üst lige çıkar</Text>}
          {kademe.dussen > 0 && <Text style={[s.ipucu, { fontFamily: font }]}>Son {kademe.dussen} takım küme düşer</Text>}
        </View>

        {/* === MAÇ BUTONU + SON MAÇLAR === */}
        <TouchableOpacity
          style={[s.buton, lig.sezonSonu && s.butonPasif]}
          onPress={macOyna}
          disabled={!!lig.sezonSonu}
        >
          <Text style={[s.butonMetin, { fontFamily: font }]}>
            {lig.sezonSonu ? 'Sezon Bitti' : (lig.hafta + 1) + '. Hafta Maçını Oyna'}
          </Text>
        </TouchableOpacity>

        {lig.raporlar.length > 0 && (
          <View style={s.kart}>
            <Text style={[s.bolumBaslik, { fontFamily: font }]}>Son Maçlar</Text>
            {lig.raporlar.slice(0, 4).map((r, i) => (
              <View key={i} style={s.raporSatir}>
                <Text style={[s.raporSkor, { fontFamily: font, color: SONUC_RENK[r.sonuc] }]}>
                  {r.skorumuz}-{r.skorrakip}
                </Text>
                <Text style={[s.raporMetin, { fontFamily: font }]}>Hafta {r.hafta} · {r.rakip} · {SONUC_AD[r.sonuc]}</Text>
                <Text style={[s.raporHasilat, { fontFamily: font }]}>{r.hasilat > 0 ? '+' + para(r.hasilat) : '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* === KADRO === */}
        <View style={s.kart}>
          <Text style={[s.bolumBaslik, { fontFamily: font }]}>Kadro ({lig.kadro.length}/18)</Text>
          {lig.kadro
            .slice()
            .sort((a, b) => ((POZ_SIRA[a.pozisyon] ?? 9) - (POZ_SIRA[b.pozisyon] ?? 9)) || (b.guc - a.guc))
            .map(o => (
              <View key={o.id} style={s.oyuncuSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.oyuncuAd, { fontFamily: font }]}>{o.ad}</Text>
                  <Text style={[s.oyuncuAlt, { fontFamily: font, color: o.yas >= 35 ? '#F87171' : (o.yas >= 31 ? Colors.primary : (o.yas <= 23 ? '#4ADE80' : undefined)) }]}>{o.yas <= 20 ? '\u2605 ' : ''}{o.pozisyon} {'\u00B7'} {o.yas} {'ya\u015F'} {'\u00B7'} {'G\u00FC\u00E7'} {o.guc}</Text>
                </View>
                <Text style={[s.oyuncuDeger, { fontFamily: font }]}>{para(o.deger)}</Text>
                <TouchableOpacity
                  style={[s.miniButon, s.miniKirmizi, lig.kadro.length <= 11 && s.butonPasif]}
                  onPress={() => oyuncuSatBas(o)}
                  disabled={lig.kadro.length <= 11}
                >
                  <Text style={[s.miniButonMetin, { fontFamily: font }]}>Sat</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

        {/* === TRANSFER === */}
        <View style={s.kart}>
          <Text style={[s.bolumBaslik, { fontFamily: font }]}>Transfer Listesi</Text>
          <Text style={[s.ipucu, { fontFamily: font }]}>Her hafta yenilenir · Bonservis tavanı: {para(kademe.bonservisTavan)}</Text>
          {lig.transferList.map(o => {
            const kadroDolu = lig.kadro.length >= 18;
            const paraYetmiyor = nakit < o.deger;
            const engel = kadroDolu || paraYetmiyor;
            return (
              <View key={o.id} style={s.oyuncuSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.oyuncuAd, { fontFamily: font }]}>{o.ad}</Text>
                  <Text style={[s.oyuncuAlt, { fontFamily: font, color: o.yas >= 35 ? '#F87171' : (o.yas >= 31 ? Colors.primary : (o.yas <= 23 ? '#4ADE80' : undefined)) }]}>{o.yas <= 20 ? '\u2605 ' : ''}{o.pozisyon} {'\u00B7'} {o.yas} {'ya\u015F'} {'\u00B7'} {'G\u00FC\u00E7'} {o.guc}</Text>
                </View>
                <Text style={[s.oyuncuDeger, { fontFamily: font }]}>{para(o.deger)}</Text>
                <TouchableOpacity
                  style={[s.miniButon, s.miniYesil, engel && s.butonPasif]}
                  onPress={() => oyuncuAlBas(o)}
                  disabled={engel}
                >
                  <Text style={[s.miniButonMetin, { fontFamily: font }]}>{kadroDolu ? 'Dolu' : (paraYetmiyor ? 'Para Yok' : 'Al')}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <TouchableOpacity onPress={kariyeriSifirla} style={s.sifirla}>
          <Text style={[s.sifirlaMetin, { fontFamily: font }]}>Kariyeri Sıfırla</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* === MAÇ RAPORU MODALI === */}
      {/* === ONAY MODALI — iOS 26'da Alert.alert cokuyor, iOS Modal kullanir === */}
      <Modal visible={!!onayTalebi} transparent animationType="fade" onRequestClose={() => setOnayTalebi(null)}>
        <View style={s.modalArka}>
          <View style={s.modalKutu}>
            <Text style={[s.modalBaslik, { fontFamily: font }]}>{onayTalebi?.baslik}</Text>
            <Text style={[s.modalMetin, { fontFamily: font }]}>{onayTalebi?.mesaj}</Text>
            <TouchableOpacity style={s.modalButon} onPress={() => { const ok = onayTalebi?.onOk; setOnayTalebi(null); ok?.(); }}>
              <Text style={{ color: Colors.surface, fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>Tamam</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: Colors.card, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 }} onPress={() => setOnayTalebi(null)}>
              <Text style={{ color: Colors.textPrimary, fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={raporModal} transparent animationType="fade" onRequestClose={raporuKapat}>
        <View style={s.modalArka}>
          <View style={s.modalKutu}>
            {rapor && (
              <>
                <Text style={[s.modalBaslik, { fontFamily: font }]}>{SONUC_AD[rapor.sonuc]}</Text>
                <Text style={[s.modalSkor, { fontFamily: font, color: SONUC_RENK[rapor.sonuc] }]}>
                  {BENIM_TAKIM} {rapor.skorumuz} - {rapor.skorrakip} {rapor.rakip}
                </Text>
                {rapor.hasilat > 0 && (
                  <Text style={[s.modalMetin, { fontFamily: font }]}>Ev maçı hasılatı: +{para(rapor.hasilat)}</Text>
                )}
              </>
            )}
            <TouchableOpacity style={s.modalButon} onPress={raporuKapat}>
              <Text style={[s.butonMetin, { fontFamily: font }]}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === SEZON SONU MODALI === */}
      <Modal visible={sezonModal} transparent animationType="fade" onRequestClose={() => setSezonModal(false)}>
        <View style={s.modalArka}>
          <View style={s.modalKutu}>
            <Text style={[s.modalBaslik, { fontFamily: font }]}>Sezon {lig.sezonNo} Bitti</Text>
            <Text style={[s.modalMetin, { fontFamily: font }]}>{lig.sezonSonu?.mesaj ?? ''}</Text>
            <Text style={[s.modalMetin, { fontFamily: font }]}>Sıralama: {lig.sezonSonu?.konum}. · Ödül: {para(lig.sezonSonu?.odul ?? 0)}</Text>
            <TouchableOpacity style={s.modalButon} onPress={sezonDevam}>
              <Text style={[s.butonMetin, { fontFamily: font }]}>Yeni Sezona Geç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  sarma: { flex: 1, backgroundColor: Colors.background },
  icerik: { padding: 14, paddingBottom: 40 },
  merkez: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  baslik: { color: Colors.primary, fontSize: 22, fontWeight: 'bold' },
  kademeAd: { color: Colors.primary, fontSize: 19, fontWeight: 'bold' },
  altMetin: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  satirMetin: { color: Colors.textPrimary, fontSize: 13, lineHeight: 20 },
  mesajKutu: { backgroundColor: '#14532D', borderRadius: 10, padding: 10, marginBottom: 10 },
  mesajMetin: { color: '#4ADE80', fontSize: 12, fontWeight: 'bold' },
  kart: { backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.card },
  bolumBaslik: { color: Colors.textPrimary, fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  ipucu: { color: Colors.textMuted, fontSize: 11, marginTop: 6 },
  ucSatir: { flexDirection: 'row', marginTop: 10 },
  ucHucre: { flex: 1, alignItems: 'center' },
  ucSayi: { color: Colors.textPrimary, fontSize: 13, fontWeight: 'bold' },
  ucEtiket: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  tabloBaslik: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderColor: Colors.card },
  tabloSatir: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderColor: Colors.border },
  benimSatir: { backgroundColor: Colors.surfaceLight },
  hNo: { color: Colors.textMuted, fontSize: 11, width: 22 },
  hAd: { color: Colors.textPrimary, fontSize: 11, flex: 1 },
  hSayi: { color: Colors.textSecondary, fontSize: 11, width: 26, textAlign: 'right' },
  raporSatir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderColor: Colors.border },
  raporSkor: { color: '#4ADE80', fontSize: 13, fontWeight: 'bold', width: 44 },
  raporMetin: { color: Colors.textSecondary, fontSize: 11, flex: 1 },
  raporHasilat: { color: '#4ADE80', fontSize: 11 },
  oyuncuSatir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: Colors.border },
  oyuncuAd: { color: Colors.textPrimary, fontSize: 12, fontWeight: 'bold' },
  oyuncuAlt: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  oyuncuDeger: { color: Colors.primary, fontSize: 11, marginRight: 8 },
  buton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  butonMetin: { color: Colors.background, fontSize: 14, fontWeight: 'bold' },
  butonPasif: { backgroundColor: Colors.border },
  miniButon: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  miniButonMetin: { color: Colors.background, fontSize: 11, fontWeight: 'bold' },
  miniYesil: { backgroundColor: '#4ADE80' },
  miniKirmizi: { backgroundColor: '#F87171' },
  sifirla: { alignItems: 'center', paddingVertical: 10 },
  sifirlaMetin: { color: '#F87171', fontSize: 12 },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalKutu: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, width: '100%', borderWidth: 1, borderColor: Colors.card },
  modalBaslik: { color: Colors.primary, fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalSkor: { color: Colors.textPrimary, fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalMetin: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 6, lineHeight: 19 },
  modalButon: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
});


