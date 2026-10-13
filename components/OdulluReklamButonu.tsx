// ============================================
// BEŞLİ PATRON — OdulluReklamButonu.tsx (v2)
// Ödül: Jeton veya enerji — yalnızca tamamlanan ödüllü reklamdan
// ============================================
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { odulluReklamIzle } from '../services/adManager';
import { sfx } from '../services/soundManager';

type OdulluReklamButonuProps = {
  odulJeton?: number;
  odulEnerji?: number;
};

export default function OdulluReklamButonu({ odulJeton = 25, odulEnerji }: OdulluReklamButonuProps) {
  const game = useGame();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState('');
  const { width } = useWindowDimensions();
  const k = Math.min(1, width / 420);
  const enerjiOdulu = odulEnerji !== undefined;
  const odulMiktari = enerjiOdulu ? Math.max(0, Math.round(odulEnerji)) : Math.max(0, Math.round(odulJeton));

  const oduluVer = (): boolean => {
    if (enerjiOdulu) {
      if (typeof game.enerjiEkle !== 'function') return false;
      game.enerjiEkle(odulMiktari);
      return true;
    }
    if (typeof game.devHediye !== 'function') return false;
    game.devHediye(0, 0, odulMiktari, false);
    return true;
  };

  const odulAdi = enerjiOdulu ? 'enerji' : 'jeton';

  const basla = async () => {
    if (yukleniyor) return;
    setYukleniyor(true);
    setMesaj('');
    try {
      const odulVerildi = await odulluReklamIzle();
      if (odulVerildi) {
        if (oduluVer()) {
          sfx('alkis');
          setMesaj(`+${odulMiktari} ${odulAdi} kazandın!`);
        } else {
          setMesaj(`Reklam tamamlandı ama ${odulAdi} eklenemedi.`);
        }
      } else {
        setMesaj('Reklam tamamlanmadan ödül verilmez.');
      }
    } catch {
      setMesaj('Bir sorun oluştu, tekrar dene.');
    } finally {
      setYukleniyor(false);
      setTimeout(() => setMesaj(''), 3500);
    }
  };

  return (
    <View style={[st.blok, { padding: 14 * k }]}>
      <Text style={[st.baslik, { fontSize: 15 * k }]}>Ödüllü Reklam</Text>
      <Text style={[st.aciklama, { fontSize: 12.5 * k }]}>
        Kısa bir reklam izle, {odulMiktari} {odulAdi} kazan. Ödül yalnızca reklam tamamlanınca verilir.
      </Text>
      <TouchableOpacity style={[st.buton, { paddingVertical: 12 * k }]} onPress={basla} disabled={yukleniyor}>
        {yukleniyor
          ? <ActivityIndicator color="#132A13" />
          : <Text style={[st.butonYazi, { fontSize: 14 * k }]}>Reklam izle, {odulMiktari} {odulAdi} kazan</Text>}
      </TouchableOpacity>
      {mesaj !== '' && <Text style={[st.mesaj, { fontSize: 12.5 * k }]}>{mesaj}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  blok: { backgroundColor: '#132A13', borderRadius: 14, borderWidth: 1.5, borderColor: '#4A6741', marginVertical: 8 },
  baslik: { color: '#FFD700', fontWeight: '900', marginBottom: 4 },
  aciklama: { color: '#E8F5E9', marginBottom: 10 },
  buton: { backgroundColor: '#FFD700', borderRadius: 10, alignItems: 'center' },
  butonYazi: { color: '#132A13', fontWeight: '900' },
  mesaj: { color: '#9AB973', marginTop: 8, textAlign: 'center', fontWeight: '700' },
});
