// components/OlayModal.tsx — Sardur Technologies
// Gün başlarken olay varsa tam ekran kare olarak açılır; seçim yapmadan gün ilerlemez.
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useGame } from '../context/GameContext';
import { OLAY_HAVUZU } from '../constants/gameConfig';

function gs(v: unknown, yedek = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : yedek;
}

export default function OlayModal() {
  const { state, cozOlay, gunSonuRaporuAcik } = useGame();
  const pathname = usePathname() ?? '';
  const { width } = useWindowDimensions();
  const k = Math.max(0.85, Math.min(1.4, width / 375));

  const olayId = state?.bugunOlayId;
  const sablon: any = OLAY_HAVUZU?.find((o: any) => o?.id === olayId) as any;

  if (!state || state.isGameOver || !olayId || state.olayCozuldu || !sablon) return null;
  // Gün sonu raporu önce kapatılmalı; olay modalı rapor düğmesini örtmemeli.
  if (gunSonuRaporuAcik) return null;
  if (!pathname.startsWith('/tabs')) return null;

  const baslik = sablon.ad ?? sablon.baslik ?? sablon.title ?? 'Günün Olayı';
  const aciklama = sablon.aciklama ?? sablon.description ?? sablon.metin ?? '';
  const secenekler: any[] = Array.isArray(sablon.secenekler) ? sablon.secenekler : [];
  if (secenekler.length === 0) return null; // seçeneksiz olay modalda zorlamaz

  const etkiOzeti = (s: any): string => {
    const e = s?.etki ?? {};
    const parcalar: string[] = [];
    const nakit = gs(e.nakit);
    if (nakit !== 0) parcalar.push(`${nakit > 0 ? '+' : ''}${nakit.toLocaleString('tr-TR')}₺`);
    const enerji = gs(e.enerji);
    if (enerji !== 0) parcalar.push(`${enerji > 0 ? '+' : ''}${enerji} enerji`);
    const jeton = gs(e.jeton);
    if (jeton !== 0) parcalar.push(`${jeton > 0 ? '+' : ''}${jeton} jeton`);
    const prestij = gs(e.prestij);
    if (prestij !== 0) parcalar.push(`${prestij > 0 ? '+' : ''}${prestij} prestij`);
    const mem = gs(e.memnuniyet);
    if (mem !== 0) parcalar.push(`${mem > 0 ? '+' : ''}${mem} memnuniyet`);
    return parcalar.join(' · ');
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={st.arka}>
        <View style={[st.kart, { width: Math.min(340 * k, width - 32), borderRadius: 18 * k, padding: 18 * k }]}>
          <Text style={[st.baslik, { fontSize: 19 * k }]}>🎲 {baslik}</Text>
          {aciklama ? <Text style={[st.aciklama, { fontSize: 14 * k }]}>{aciklama}</Text> : null}
          {secenekler.map((s: any, i: number) => {
            const etiket = s?.ad ?? s?.metin ?? s?.etiket ?? s?.label ?? `Seçenek ${i + 1}`;
            const ozet = etkiOzeti(s);
            return (
              <TouchableOpacity
                key={i}
                style={[st.secenek, { paddingVertical: 12 * k, borderRadius: 12 * k, paddingHorizontal: 14 * k }]}
                onPress={() => cozOlay(i)} accessibilityLabel={`Olay seçeneği ${i + 1}`} accessibilityRole="button"
              >
                <Text style={[st.secenekYazi, { fontSize: 14 * k }]}>{etiket}</Text>
                {ozet ? <Text style={[st.secenekOzet, { fontSize: 12 * k }]}>{ozet}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  arka: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kart: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.5)',
  },
  baslik: { color: '#F5A623', fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  aciklama: { color: '#E5E7EB', lineHeight: 20, marginBottom: 12 },
  secenek: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  secenekYazi: { color: '#FFFFFF', fontWeight: '700' },
  secenekOzet: { color: '#9CA3AF', marginTop: 3 },
});
