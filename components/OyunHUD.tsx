// ============================================
// BEŞLİ PATRON — components/OyunHUD.tsx
// Sardur Technologies
// Gün / Enerji / Nakit / Prestij — tüm sekmelerde sabit üst bar
// ============================================
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { MAX_ENERJI } from '../constants/gameConfig';

function gs(v: unknown, yedek = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : yedek;
}

function paraFormat(n: number): string {
  return Math.round(n).toLocaleString('tr-TR');
}

export default function OyunHUD() {
  const { state } = useGame();
  const pathname = usePathname() ?? '';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const k = Math.max(0.85, Math.min(1.4, width / 375));

  // Yalnızca sekme ekranlarında görünür (index/intro/gameover'da gizlenir)
  if (!state || !pathname.startsWith('/tabs')) return null;

  const maxEnerji = gs(MAX_ENERJI, 100);
  const enerji = Math.max(0, Math.min(maxEnerji, gs(state.enerji)));
  const oran = maxEnerji > 0 ? enerji / maxEnerji : 0;
  const nakit = gs(state.nakit);
  const prestij = gs(state.prestij);
  const gun = gs(state.gun, 1);

  return (
    <View
      style={[
        st.dis,
        {
          paddingHorizontal: 12 * k,
          paddingTop: Math.max(6 * k, insets.top + 2),
          paddingBottom: 6 * k,
        },
      ]}
    >
      <View
        style={[
          st.kapsul,
          { borderRadius: 14 * k, paddingVertical: 7 * k, paddingHorizontal: 10 * k },
        ]}
      >
        <View style={st.hucre}>
          <Text style={[st.ikon, { fontSize: 15 * k }]}>📅</Text>
          <Text style={[st.deger, { fontSize: 13 * k }]}>Gün {gun}</Text>
        </View>

        <View style={[st.hucre, { flex: 1 }]}>
          <Text style={[st.ikon, { fontSize: 15 * k }]}>⚡</Text>
          <View style={st.enerjiKutu}>
            <Text style={[st.deger, { fontSize: 13 * k }]}>{enerji}/{maxEnerji}</Text>
            <View style={[st.enerjiIzgi, { height: 5 * k, borderRadius: 3 * k }]}>
              <View
                style={{
                  height: '100%',
                  width: `${Math.round(oran * 100)}%`,
                  borderRadius: 3 * k,
                  backgroundColor: '#4ADE80',
                }}
              />
            </View>
          </View>
        </View>

        <View style={st.hucre}>
          <Text style={[st.ikon, { fontSize: 15 * k }]}>💰</Text>
          <Text style={[st.deger, { fontSize: 13 * k }]}>{paraFormat(nakit)}₺</Text>
        </View>

        <View style={st.hucre}>
          <Text style={[st.ikon, { fontSize: 15 * k }]}>⭐</Text>
          <Text style={[st.deger, { fontSize: 13 * k }]}>{prestij}</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dis: { backgroundColor: 'rgba(10,12,24,0.96)' },
  kapsul: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  hucre: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  ikon: { marginRight: 4 },
  deger: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'SpaceMono' },
  enerjiKutu: { marginLeft: 2, width: 68 },
  enerjiIzgi: { backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 3, overflow: 'hidden' },
});
