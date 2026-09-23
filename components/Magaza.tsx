// ============================================
// BEŞLİ PATRON — Magaza.tsx
// Gerçek para ile satın alma paketleri (expo-iap / App Store)
// Sardur Technologies
// ============================================
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useIAP } from 'expo-iap';
import { useGame } from '@/context/GameContext';
import { sfx } from '@/services/soundManager';

// BU ID'LER App Store Connect'te oluşturacağın ürünlerle HARFİ HARFİNE aynı olmalı.
const PAKETLER = [
  { sku: 'com.sardurtechnologies.beslipatron.enerji10', baslik: '10 Enerji', emoji: '⚡', para: 0, enerji: 10 },
  { sku: 'com.sardurtechnologies.beslipatron.enerji60', baslik: '60 Enerji', emoji: '⚡', para: 0, enerji: 60 },
  { sku: 'com.sardurtechnologies.beslipatron.nakit50k', baslik: '50.000 TL', emoji: '💰', para: 50000, enerji: 0 },
  { sku: 'com.sardurtechnologies.beslipatron.nakit500k', baslik: '500.000 TL', emoji: '💎', para: 500000, enerji: 0 },
];

export default function Magaza() {
  const game = useGame() as any;
  const { width } = useWindowDimensions();
  const k = Math.min(1, width / 420);
  const [mesaj, setMesaj] = useState('');

  // Ödülü GameContext'e yazan yardımcı (para ve/veya enerji)
  const odulVer = (para: number, enerji: number): boolean => {
    if (typeof game?.devHediye === 'function') { game.devHediye(para, enerji, 0, false); return true; }
    let tamam = true;
    if (para > 0) {
      if (typeof game?.nakitEkle === 'function') game.nakitEkle(para);
      else if (typeof game?.paraEkle === 'function') game.paraEkle(para);
      else tamam = false;
    }
    if (enerji > 0) {
      if (typeof game?.enerjiEkle === 'function') game.enerjiEkle(enerji);
      else if (typeof game?.enerjiArttir === 'function') game.enerjiArttir(enerji);
      else tamam = false;
    }
    return tamam;
  };

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase: any) => {
      try {
        const pid = String(purchase?.productId ?? purchase?.id ?? '');
        const paket = PAKETLER.find((p) => p.sku === pid);
        if (paket && odulVer(paket.para, paket.enerji)) {
          sfx('alkis');
          setMesaj('Tamamdir! ' + paket.baslik + ' hesabina eklendi.');
        } else {
          setMesaj('Satin alma alindi ama odul eklenemedi.');
        }
        await finishTransaction({ purchase, isConsumable: true } as any);
      } catch (e) {
        console.warn('Odul/finish hatasi:', e);
      }
      setTimeout(() => setMesaj(''), 4500);
    },
    onPurchaseError: (error: any) => {
      const kod = String(error?.code ?? '').toUpperCase();
      if (kod.includes('CANCEL') || kod.includes('CLOSED')) return;
      setMesaj('Satin alinamadi: ' + (error?.message ?? 'bilinmeyen hata'));
      setTimeout(() => setMesaj(''), 4500);
    },
  });

  useEffect(() => {
    if (!connected) return;
    (async () => {
      try {
        await fetchProducts({ skus: PAKETLER.map((p) => p.sku), type: 'in-app' } as any);
      } catch (e) {
        console.warn('Urun listesi alinamadi:', e);
      }
    })();
  }, [connected]);

  const liste = ((products as any[]) ?? []) as any[];

  const satinAl = async (sku: string) => {
    if (!connected) {
      setMesaj('Magazaya baglanilamadi, tekrar dene.');
      setTimeout(() => setMesaj(''), 3000);
      return;
    }
    try {
      await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } } } as any);
    } catch (error: any) {
      const kod = String(error?.code ?? '').toUpperCase();
      if (kod.includes('CANCEL')) return;
      setMesaj('Satin alma baslatilamadi. Not: Gercek satin alma App Store kaydi + TestFlight ile calisir.');
      setTimeout(() => setMesaj(''), 4500);
    }
  };

  return (
    <View style={[st.blok, { padding: 14 * k }]}>
      <View style={st.baslikSatir}>
        <Text style={[st.baslik, { fontSize: 15 * k }]}>Mağaza</Text>
        {!connected && <ActivityIndicator size="small" color="#9AB973" />}
      </View>
      <Text style={[st.aciklama, { fontSize: 12.5 * k }]}>
        Gerçek para ile enerji ve nakit paketleri. Ödeme App Store üzerinden yapılır.
      </Text>
      {connected && liste.length === 0 && (
        <Text style={[st.not, { fontSize: 12 * k }]}>
          Ürünler hazırlanıyor — App Store kaydı tamamlanınca burada görünecekler.
        </Text>
      )}
      {PAKETLER.map((p) => {
        const urun = liste.find((u: any) => (u?.id ?? u?.productId) === p.sku);
        const fiyat = urun?.displayPrice ?? '';
        return (
          <View key={p.sku} style={[st.sira, { paddingVertical: 8 * k }]}>
            <Text style={[st.siraYazi, { fontSize: 13.5 * k }]}>{p.emoji} {p.baslik}</Text>
            <TouchableOpacity
              style={[st.buton, !urun && st.butonPasif, { paddingVertical: 8 * k, paddingHorizontal: 14 * k }]}
              disabled={!urun}
              onPress={() => satinAl(p.sku)}
            >
              <Text style={[st.butonYazi, { fontSize: 13 * k }]}>{urun ? fiyat : 'Yakında'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      {mesaj !== '' && <Text style={[st.mesaj, { fontSize: 12.5 * k }]}>{mesaj}</Text>}
      <Text style={[st.marka, { fontSize: 10.5 * k }]}>Sardur Technologies</Text>
    </View>
  );
}

const st = StyleSheet.create({
  blok: { backgroundColor: '#132A13', borderRadius: 14, borderWidth: 1.5, borderColor: '#4A6741', marginVertical: 8 },
  baslikSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  baslik: { color: '#FFD700', fontWeight: '900' },
  aciklama: { color: '#E8F5E9', marginTop: 4, marginBottom: 8 },
  not: { color: '#9AB973', marginBottom: 6, fontStyle: 'italic' },
  sira: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#4A6741' },
  siraYazi: { color: '#FFFFFF', fontWeight: '700', flexShrink: 1 },
  buton: { backgroundColor: '#FFD700', borderRadius: 9 },
  butonPasif: { backgroundColor: '#5A6B52' },
  butonYazi: { color: '#132A13', fontWeight: '900' },
  mesaj: { color: '#9AB973', marginTop: 8, textAlign: 'center', fontWeight: '700' },
  marka: { color: '#4A6741', textAlign: 'center', marginTop: 10, fontWeight: '700' },
});