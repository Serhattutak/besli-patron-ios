import { Colors } from '../../constants/colors';
// ============================================
// BEŞLİ PATRON — app/tabs/isletme.tsx (ÇOKLU SAHA + PERSONEL + LİG + OLAY SORUSU KARTTA)
// ============================================
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useGame } from '../../context/GameContext';
import {
  DAILY_KIRA, DAILY_ELEKTRIK_SU, UPGRADE_CONFIG,
  STAFF_CONFIG, OLAY_HAVUZU, type UpgradeType,
} from '../../constants/gameConfig';
import { ISLETME_YERI, SAHA_TIP_BILGI } from '../../constants/pitchConfig';
import {
  sahaGunlukGideri, sahaGunlukPasifGelir,
  KASIYER_ENERJI_INDIRIMI, TEMIZLIKCI_MEMNUNIYET_BONUSU,
  ANTRENOR_TURNUVA_BONUSU, GUVENLIK_TEKLIF_BONUSU,
} from '../../services/gameLogic';
import type { PitchState, StaffMember } from '../../types/game';

function para(n: number): string {
  return `${Math.round(n).toLocaleString('tr-TR')}₺`;
}

function asamaEtiketi(asama: number): string {
  if (asama <= 0) return '🌱 Arsa Yok';
  if (asama === 1) return '🏠 Arsa Alındı';
  if (asama < 5) return '🚧 İnşaat';
  return '✅ Hizmette';
}


// Personel ücret kuralı — GameContext.hireStaff ile BİREBİR aynı:
// ilk alım = L1'in günlük maaşı, terfi = hedef kademenin günlük maaşı (peşin).
// Günlük maaş ayrıca her gün sonunda düşer.
function staffUcreti(cfg: { levels?: any[] }, currentLevel: number): number {
  if (currentLevel <= 0) return (cfg?.levels?.[0]?.maas) ?? 0;
  return (cfg?.levels?.[currentLevel]?.maas) ?? 0;
}

// Günlük personel maaşı: STAFF_CONFIG şemasından (levels[].maas)
function toplamPersonelMaas(staff: Record<string, StaffMember>): number {
  let toplam = 0;
  for (const s of Object.values(staff ?? {})) {
    if (!s?.hired || s.level < 1) continue;
    const cfg = STAFF_CONFIG.find(c => c.id === s.id);
    toplam += cfg?.levels?.[s.level - 1]?.maas ?? 0;
  }
  return toplam;
}

// Personelin oyuna gerçek etkisi — gameLogic'teki seviye tablolarından okunur (birebir aynı değerler):
// temizlikçi → L1: +5 | L2: +8 | L3: +12 memnuniyet
// kasiyer → L1: -2 | L2: -3 | L3: -4 enerji
// antrenör → L1: +5 | L2: +10 | L3: +15 turnuva performansı
// güvenlik → L1: +1 | L2: +2 | L3: +3 ekstra teklif/gün + olay riski -%10/kademe
function personelEtkiYazisi(id: string, level: number): string | null {
  const seviye = Math.max(0, Math.min(3, Math.round(level ?? 0)));
  if (id === 'temizlikci') {
    const bonus = TEMIZLIKCI_MEMNUNIYET_BONUSU[seviye] ?? 0;
    return bonus > 0 ? `gün sonunda +${bonus} memnuniyet` : null;
  }
  if (id === 'kasiyer') {
    const indirim = KASIYER_ENERJI_INDIRIMI[seviye] ?? 0;
    return indirim > 0 ? `rezervasyonlarda -${indirim} enerji` : null;
  }
  if (id === 'antrenor') {
    const bonus = ANTRENOR_TURNUVA_BONUSU[seviye] ?? 0;
    return bonus > 0 ? `turnuvalarda +${bonus} performans` : null;
  }
  if (id === 'guvenlik') {
    const eki = GUVENLIK_TEKLIF_BONUSU[seviye] ?? 0;
    if (eki <= 0) return null;
    return `gün içinde +${eki} ekstra teklif · olay riski -%${10 * seviye}`;
  }
  return null;
}

// NaN güvenli sayı
function sayi(v: any): number {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

// Olay seçeneğinin etki özeti: butonun altında tek satır
function olayEtkiOzeti(etki: any): string {
  if (!etki) return '';
  const p: string[] = [];
  if (etki.sans) p.push(`🎲 %${etki.sans.yuzde} şans`);
  if (etki.nakit) p.push(`💰 ${etki.nakit > 0 ? '+' : ''}${para(etki.nakit)}`);
  if (etki.memnuniyet) p.push(`😊 ${etki.memnuniyet > 0 ? '+' : ''}${etki.memnuniyet}`);
  if (etki.prestij) p.push(`⭐ ${etki.prestij > 0 ? '+' : ''}${etki.prestij}`);
  if (etki.enerji) p.push(`⚡ ${etki.enerji > 0 ? '+' : ''}${etki.enerji}`);
  if (etki.jeton) p.push(`🪙 ${etki.jeton > 0 ? '+' : ''}${etki.jeton}`);
  if (etki.gelirCarpani) p.push(`📈 gelir x${etki.gelirCarpani}`);
  return p.join(' · ');
}

export default function IsletmeScreen() {
  const { state, purchaseUpgrade, hireStaff, buyProperty,
          cozOlay } = useGame();

  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState(false);
  const [confirmUpgrade, setConfirmUpgrade] = useState<UpgradeType | null>(null);
  const [confirmStaff, setConfirmStaff] = useState<string | null>(null);
  const [olaySonucAcik, setOlaySonucAcik] = useState(false);
  const [olayOzet, setOlayOzet] = useState<string>('');

  if (!state) {
    return (
      <View style={is.ekran}>
        <Text style={is.sari}>Yükleniyor…</Text>
      </View>
    );
  }

  const bildir = (sonuc: string | null, basari?: string) => {
    if (sonuc) { setHata(true); setMesaj(sonuc); }
    else if (basari) { setHata(false); setMesaj(basari); }
  };

  // === SAHALAR ===
  const sahaListesi = Object.values(state.pitches ?? {}).filter(Boolean) as PitchState[];
  const acikSahalar = sahaListesi.filter(p => (p.asama ?? 0) >= 5);

  // === KONSOLİDE FİNANS ===
  const bugunGelir = state.bugunGelir ?? 0;
  const personelMaas = toplamPersonelMaas(state.staff ?? {});
  const kiraGideri = state.yerSahibi ? 0 : DAILY_KIRA;

  // === KADRO ===
  const kadroSayisi = Object.values(state.staff ?? {}).filter(s => s?.hired).length;

  const sahaSatirlari = sahaListesi.map(p => {
    const acik = (p.asama ?? 0) >= 5;
    return {
      p,
      acik,
      gider: sahaGunlukGideri(p) ?? 0,
      pasif: acik ? (sahaGunlukPasifGelir(p, state) ?? 0) : 0,
    };
  });
  const toplamSahaGideri = sahaSatirlari.reduce((t, s) => t + s.gider, 0);
  const toplamPasif = sahaSatirlari.reduce((t, s) => t + s.pasif, 0);
  const toplamGider = kiraGideri + DAILY_ELEKTRIK_SU + personelMaas + toplamSahaGideri;
  const net = bugunGelir + toplamPasif - toplamGider;

  // === MEMNUNİYET ===
  const memnuniyet = Math.max(0, Math.min(100, state.memnuniyet ?? 50));
  const memnuniyetRenk = memnuniyet >= 70 ? '#34D399' : memnuniyet >= 40 ? Colors.primary : '#F87171';

  // === SAHİBİNDEN ===
  const yerFiyat = ISLETME_YERI.satinAlmaFiyat;
  const yereNakitYeterli = (state.nakit ?? 0) >= yerFiyat;

  const handleSahibinden = () => {
    const sonuc = buyProperty();
    if (sonuc) bildir(sonuc);
    else bildir(null, `🏠 Yer artık bizim! Günlük kira kalktı, +${ISLETME_YERI.prestijOdul} prestij.`);
  };

  // === OLAY ===
  const bugununOlayi = state.bugunOlayId
    ? (OLAY_HAVUZU.find(o => o.id === state.bugunOlayId) ?? null)
    : null;
  const olaySonucMesaji = (state as any)?.olaySonucMesaji ?? null;
  const olayGecmisListesi = (state.olayGecmisi ?? [])
    .slice(-5)
    .reverse()
    .map(id => OLAY_HAVUZU.find(o => o.id === id))
    .filter(Boolean) as typeof OLAY_HAVUZU;

  // Aktif korumalar: kamera/otopark/kantin yükseltmesi + güvenlik personeli
  // Bu korumalar ilgili olayların hiç çıkmamasını sağlar.
  const mainUp: any = state.upgrades ?? {};
  const korumaListesi: string[] = [];
  const kameraVar = sayi(mainUp.kamera) > 0 || sahaListesi.some(p => sayi((p.upgrades as any)?.kamera) > 0);
  const otoparkVar = sayi(mainUp.otopark) > 0 || sahaListesi.some(p => sayi((p.upgrades as any)?.otopark) > 0);
  const kantinVar = sayi(mainUp.kantin) > 0 || sahaListesi.some(p => sayi((p.upgrades as any)?.kantin) > 0);
  const guvenlikVar = !!state.staff?.guvenlik?.hired;
  if (kameraVar) korumaListesi.push('📹 Kamera: hırsızlık olayı çıkmaz');
  if (otoparkVar) korumaListesi.push('🅿️ Otopark: araç hasarı olayı çıkmaz');
  if (kantinVar) korumaListesi.push('☕ Kantin: gıda denetimi olayı çıkmaz');
  if (guvenlikVar) korumaListesi.push('🛡️ Güvenlik: olay riski düşük, kavga olayı çıkmaz');

  // Olay seçimi: kartın içinden çözülür — ayrı ekran gerekmez.
  // Şanslı seçeneklerde sonuç GameContext'te zar atılıp olaySonucMesaji'na yazılır;
  // sonuç modalı güncel state'ten okur.
  const handleOlaySec = (index: number) => {
    if (!bugununOlayi || state.olayCozuldu) return;
    const secenek = bugununOlayi.secenekler?.[index];
    if (!secenek) return;
    const err = cozOlay(index);
    if (err) { setHata(true); setMesaj(err); return; }
    setOlayOzet(olayEtkiOzeti(secenek.etki));
    setOlaySonucAcik(true);
  };

  // === ONAY MODALI VERİLERİ ===
  const upgradeListe = Object.entries(UPGRADE_CONFIG as Record<string, any>) as [UpgradeType, any][];
  const onayCfg = confirmUpgrade ? ((UPGRADE_CONFIG as Record<string, any>)[confirmUpgrade] as any) : null;
  const onaySeviye = confirmUpgrade ? (state.upgrades?.[confirmUpgrade] ?? 0) : 0;
  const onayCost = onayCfg?.costs?.[onaySeviye] ?? 0;

  const onayStaffCfg = confirmStaff ? STAFF_CONFIG.find(c => c.id === confirmStaff) : null;
  const onayStaffLevel = confirmStaff ? (state.staff?.[confirmStaff]?.level ?? 0) : 0;
  const onayStaffUcret = onayStaffCfg ? staffUcreti(onayStaffCfg, onayStaffLevel) : 0;

  const handleUpgradeOnay = () => {
    if (!confirmUpgrade) return;
    const err = purchaseUpgrade(confirmUpgrade);
    setConfirmUpgrade(null);
    bildir(err, '⬆️ Yükseltme alındı!');
  };

  const handleStaffOnay = () => {
    if (!confirmStaff) return;
    const err = hireStaff(confirmStaff);
    setConfirmStaff(null);
    bildir(err, '👥 Personel kadroya eklendi!');
  };

  return (
    <View style={is.ekran}>
      <ScrollView contentContainerStyle={is.icerik} showsVerticalScrollIndicator={false}>
        <Text style={is.baslik}>🏢 İşletme Merkezi</Text>

        {/* === GÜN DURUMU + MEMNUNİYET === */}
        <View style={is.kart}>
          <View style={is.durumSatir}>
            <Text style={is.durumDeger}>📅 Gün {state.gun ?? 1}</Text>
            <Text style={is.durumDeger}>💰 {para(state.nakit ?? 0)}</Text>
            <Text style={is.durumDeger}>⭐ {state.prestij ?? 0}</Text>
            <Text style={is.durumDeger}>🏟️ {acikSahalar.length}/{sahaListesi.length} açık</Text>
          </View>
          <Text style={is.memEtiket}>😊 Müşteri Memnuniyeti — %{memnuniyet}</Text>
          <View style={is.memBarArka}>
            <View style={[is.memBarOn, { width: `${memnuniyet}%`, backgroundColor: memnuniyetRenk }]} />
          </View>
        </View>

        {/* === GÜNLÜK FİNANS (KONSOLİDE) === */}
        <View style={is.kart}>
          <Text style={is.bolumBaslik}>💰 Günlük Finans</Text>
          <View style={is.finSatir}>
            <Text style={is.finEtiket}>📈 Rezervasyon geliri (bugün)</Text>
            <Text style={is.finYesil}>+{para(bugunGelir)}</Text>
          </View>
          <View style={is.finSatir}>
            <Text style={is.finEtiket}>📺 Saha pasif gelirleri</Text>
            <Text style={is.finYesil}>+{para(toplamPasif)}</Text>
          </View>
          <View style={is.finSatir}>
            <Text style={is.finEtiket}>🏠 Kira</Text>
            {state.yerSahibi
              ? <Text style={is.finYesil}>Yok — yer bizim! 🎉</Text>
              : <Text style={is.finKirmizi}>-{para(DAILY_KIRA)}</Text>}
          </View>
          <View style={is.finSatir}>
            <Text style={is.finEtiket}>💡 Elektrik + Su</Text>
            <Text style={is.finKirmizi}>-{para(DAILY_ELEKTRIK_SU)}</Text>
          </View>
          <View style={is.finSatir}>
            <Text style={is.finEtiket}>👥 Personel maaşları</Text>
            <Text style={is.finKirmizi}>
              -{para(personelMaas)}{kadroSayisi > 0 ? ` (${kadroSayisi} kişi)` : ''}
            </Text>
          </View>
          <View style={is.finSatir}>
            <Text style={is.finEtiket}>🏟️ Saha giderleri ({sahaListesi.length} saha)</Text>
            <Text style={is.finKirmizi}>-{para(toplamSahaGideri)}</Text>
          </View>
          <View style={[is.finSatir, is.finNet]}>
            <Text style={is.netEtiket}>NET (bugün)</Text>
            <Text style={[is.netDeger, { color: net >= 0 ? '#34D399' : '#F87171' }]}>
              {net >= 0 ? '+' : ''}{para(net)}
            </Text>
          </View>
        </View>

        {/* === SAHA BAZLI MALİ TABLO === */}
        <View style={is.kart}>
          <Text style={is.bolumBaslik}>📊 Saha Bazlı Mali Tablo</Text>
          {sahaSatirlari.map(({ p, acik, gider, pasif }) => {
            const tip = SAHA_TIP_BILGI[(p.sahaTipi ?? 'yildiz') as keyof typeof SAHA_TIP_BILGI] ?? SAHA_TIP_BILGI.yildiz;
            return (
              <View key={p.id} style={is.maliSatir}>
                <Text style={is.maliEmoji}>{tip.emoji}</Text>
                <View style={is.maliBilgi}>
                  <Text style={is.maliAd} numberOfLines={1}>{p.ad ?? p.id}</Text>
                  <Text style={is.maliAlt}>{asamaEtiketi(p.asama ?? 0)}</Text>
                </View>
                <View style={is.maliSayilar}>
                  <Text style={is.maliGider}>-{para(gider)}/gün</Text>
                  {acik ? <Text style={is.maliPasif}>+{para(pasif)} pasif</Text> : null}
                </View>
              </View>
            );
          })}
          <View style={[is.maliSatir, is.maliToplam]}>
            <Text style={is.maliToplamYazi}>
              Saha toplamı: -{para(toplamSahaGideri)} gider · +{para(toplamPasif)} pasif gelir
            </Text>
          </View>
        </View>

        {/* === SAHİBDEN SATIN AL === */}
        {state.yerSahibi ? (
          <View style={[is.kart, is.sahibinKart]}>
            <Text style={is.sahibinBaslik}>🏠 Sahamız Artık Bizim!</Text>
            <Text style={is.sahibinAciklama}>
              Günlük {para(DAILY_KIRA)} kira tamamen kalktı — artık sadece {para(DAILY_ELEKTRIK_SU)} elektrik-su
              ödüyoruz. +{ISLETME_YERI.prestijOdul} prestij kazandın, bu rozet kalıcı. 🎉
            </Text>
          </View>
        ) : (
          <View style={is.kart}>
            <Text style={is.bolumBaslik}>🏷️ Sahibinden Satın Al</Text>
            <Text style={is.sahibinAciklama}>{ISLETME_YERI.aciklama}</Text>
            <View style={is.sahibinSatir}>
              <Text style={is.sahibinEtiket}>💵 Fiyat</Text>
              <Text style={is.sahibinDeger}>{para(yerFiyat)}</Text>
            </View>
            <View style={is.sahibinSatir}>
              <Text style={is.sahibinEtiket}>🪙 Ödül</Text>
              <Text style={is.sahibinDeger}>+{ISLETME_YERI.prestijOdul} prestij</Text>
            </View>
            <View style={is.sahibinSatir}>
              <Text style={is.sahibinEtiket}>✂️ Kaldırır</Text>
              <Text style={is.sahibinDeger}>{para(DAILY_KIRA)}/gün kira</Text>
            </View>
            <TouchableOpacity
              style={[is.buton, { backgroundColor: yereNakitYeterli ? Colors.success : Colors.border }]}
              onPress={handleSahibinden}
            >
              <Text style={is.butonYazi}>
                {yereNakitYeterli ? `Yeri Al — ${para(yerFiyat)}` : `Nakit yetersiz (${para(yerFiyat)})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === PERSONEL === */}
        <View style={is.kart}>
          <Text style={is.bolumBaslik}>👥 Personel</Text>
          <Text style={is.personelOzet}>
            {kadroSayisi > 0
              ? `${kadroSayisi} kişi görevde · günlük maaş toplamı ${para(personelMaas)} — maaşlar her gün sonunda otomatik düşer. Etkiler seviyeyle ölçeklenir.`
              : 'Kadro boş: temizlikçi memnuniyeti yükseltir, kasiyer rezervasyonlarda enerji tasarrufu sağlar. Maaşlar gün sonunda düşer.'}
          </Text>
          {STAFF_CONFIG.map(cfg => {
            const m = state.staff?.[cfg.id] ?? { id: cfg.id, hired: false, level: 0 };
            const seviye = m.level ?? 0;
            const maks = cfg.levels?.length ?? 0;
            const makslandi = seviye >= maks;
            const ucret = staffUcreti(cfg, seviye);
            const sonraki = makslandi ? null : cfg.levels?.[seviye];
            const maas = sonraki?.maas ?? 0;
            const etkiYazisi = personelEtkiYazisi(cfg.id, seviye);
            return (
              <View key={cfg.id} style={is.upSatiri}>
                <Text style={is.upEmoji}>{cfg.emoji ?? '🧑‍💼'}</Text>
                <View style={is.upBilgi}>
                  <Text style={is.upAd}>
                    {cfg.ad ?? cfg.id} <Text style={is.upSeviye}>L{seviye}/{maks}</Text>
                  </Text>
                  <Text style={is.upAciklama} numberOfLines={2}>
                    {cfg.aciklama ?? ''}{sonraki ? ` · Sonraki: ${sonraki.label ?? '—'} (${para(maas)}/gün)` : ''}
                  </Text>
                  {seviye > 0 && (
                    <Text style={is.personelEtki}>
                      {etkiYazisi
                        ? `✓ Aktif: ${etkiYazisi}`
                        : `✓ Görevde: ${cfg.levels?.[seviye - 1]?.label ?? 'Aktif'}`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  disabled={makslandi}
                  style={[is.upButon, makslandi && { backgroundColor: Colors.border }]}
                  onPress={() => setConfirmStaff(cfg.id)}
                >
                  <Text style={is.upButonYazi}>
                    {makslandi ? 'MAX' : seviye === 0 ? `Al ${para(ucret)}` : `Terfi ${para(ucret)}`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* === GÜNÜN OLAYI — soru ve seçenekler doğrudan burada === */}
        <View style={is.kart}>
          <Text style={is.bolumBaslik}>🎲 Olay Durumu</Text>
          {bugununOlayi ? (
            <>
              <Text style={is.olayBaslik}>{bugununOlayi.emoji} {bugununOlayi.baslik}</Text>
              <Text style={is.olayYazi}>{bugununOlayi.aciklama}</Text>
              {state.olayCozuldu ? (
                olaySonucMesaji
                  ? <Text style={is.olaySonuc}>📌 {olaySonucMesaji}</Text>
                  : <Text style={is.olaySonuc}>📌 Bugünün olayı çözüldü.</Text>
              ) : (
                <>
                  <Text style={is.olaySoru}>Ne yapıyorsun?</Text>
                  {(bugununOlayi.secenekler ?? []).map((sec, i) => (
                    <TouchableOpacity
                      key={`${bugununOlayi.id}_${i}`}
                      style={is.olaySecenek}
                      onPress={() => handleOlaySec(i)}
                    >
                      <Text style={is.olaySecenekLabel}>{sec.label}</Text>
                      <Text style={is.olaySecenekAciklama}>{sec.aciklama}</Text>
                      {olayEtkiOzeti(sec.etki).length > 0 && (
                        <Text style={is.olaySecenekEtki}>{olayEtkiOzeti(sec.etki)}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text style={is.olayYazi}>☀️ Bugün sakin bir gün — olay yok. (Olay her gün çıkmaz; güvenlik kademesi çıkma şansını düşürür.)</Text>
          )}
          {korumaListesi.length > 0 && (
            <Text style={is.olayKoruma}>{korumaListesi.join(' · ')}</Text>
          )}
          {olayGecmisListesi.length > 0 && (
            <>
              <Text style={is.olayGecmisBaslik}>Son olaylar:</Text>
              {olayGecmisListesi.map((o, i) => (
                <Text key={`${o.id}_${i}`} style={is.olayGecmisSatir}>{o.emoji} {o.baslik}</Text>
              ))}
            </>
          )}
        </View>

        </ScrollView>

      {/* === YÜKSELTME ONAY MODALI === */}
      <Modal visible={confirmUpgrade !== null} transparent animationType="fade" onRequestClose={() => setConfirmUpgrade(null)}>
        <View style={is.modalOverlay}>
          <View style={is.modalKart}>
            <Text style={is.modalBaslik}>{onayCfg?.emoji ?? '🔧'} {onayCfg?.ad ?? onayCfg?.isim ?? 'Yükseltme'}</Text>
            <Text style={is.modalYazi}>
              L{onaySeviye} → L{onaySeviye + 1} yükseltmesi için {para(onayCost)} ödenecek. Onaylıyor musun?
            </Text>
            <View style={is.modalButonlar}>
              <TouchableOpacity style={is.btnIptal} onPress={() => setConfirmUpgrade(null)}>
                <Text style={is.btnIptalYazi}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={is.btnOnay} onPress={handleUpgradeOnay}>
                <Text style={is.btnOnayYazi}>Onayla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === PERSONEL ONAY MODALI === */}
      <Modal visible={confirmStaff !== null} transparent animationType="fade" onRequestClose={() => setConfirmStaff(null)}>
        <View style={is.modalOverlay}>
          <View style={is.modalKart}>
            <Text style={is.modalBaslik}>{onayStaffCfg?.emoji ?? '🧑‍💼'} {onayStaffCfg?.ad ?? 'Personel'}</Text>
            <Text style={is.modalYazi}>
              {onayStaffLevel === 0 ? 'İşe alım' : 'Terfi'} ücreti {para(onayStaffUcret)}. Onaylıyor musun?
            </Text>
            <View style={is.modalButonlar}>
              <TouchableOpacity style={is.btnIptal} onPress={() => setConfirmStaff(null)}>
                <Text style={is.btnIptalYazi}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={is.btnOnay} onPress={handleStaffOnay}>
                <Text style={is.btnOnayYazi}>Onayla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      

      

      {/* === OLAY SONUCU MODALI === */}
      <Modal visible={olaySonucAcik} transparent animationType="fade" onRequestClose={() => setOlaySonucAcik(false)}>
        <View style={is.modalOverlay}>
          <View style={is.modalKart}>
            <Text style={is.modalBaslik}>📌 Olay Sonucu</Text>
            <Text style={is.modalSonuc}>{olaySonucMesaji ?? 'Karar uygulandı.'}</Text>
            {olayOzet.length > 0 && <Text style={is.modalYazi}>{olayOzet}</Text>}
            <View style={is.modalButonlar}>
              <TouchableOpacity style={is.btnOnay} onPress={() => setOlaySonucAcik(false)}>
                <Text style={is.btnOnayYazi}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === BİLDİRİM === */}
      {mesaj != null && (
        <View style={[is.toast, { backgroundColor: hata ? '#7F1D1D' : '#14532D' }]}>
          <Text style={is.toastYazi}>{mesaj}</Text>
          <TouchableOpacity onPress={() => setMesaj(null)}>
            <Text style={is.toastYazi}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================
// === STİLLER ===
// ============================================
const is = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: Colors.background },
  icerik: { padding: 16, paddingBottom: 90 },
  baslik: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  sari: { color: Colors.primary },
  kart: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  durumSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  durumDeger: { color: '#F8FAFC', fontWeight: '800', fontSize: 13 },
  memEtiket: { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  memBarArka: { height: 10, backgroundColor: '#0B1220', borderRadius: 999, overflow: 'hidden' },
  memBarOn: { height: '100%', borderRadius: 999 },
  bolumBaslik: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  finSatir: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#0B1220',
  },
  finEtiket: { color: Colors.textMuted, fontSize: 12, flexShrink: 1 },
  finYesil: { color: '#34D399', fontWeight: '800', fontSize: 13 },
  finKirmizi: { color: '#F87171', fontWeight: '800', fontSize: 13 },
  finNet: { borderBottomWidth: 0, marginTop: 4 },
  netEtiket: { color: '#F8FAFC', fontWeight: '800', fontSize: 14 },
  netDeger: { fontWeight: '800', fontSize: 16 },
  maliSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#0B1220',
  },
  maliEmoji: { fontSize: 20 },
  maliBilgi: { flex: 1 },
  maliAd: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  maliAlt: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  maliSayilar: { alignItems: 'flex-end' },
  maliGider: { color: '#F87171', fontWeight: '700', fontSize: 12 },
  maliPasif: { color: '#34D399', fontWeight: '700', fontSize: 11, marginTop: 2 },
  maliToplam: { borderBottomWidth: 0 },
  maliToplamYazi: { color: Colors.primary, fontWeight: '800', fontSize: 12, flex: 1, textAlign: 'right' },
  sahibinKart: { borderColor: Colors.success, borderWidth: 1.5 },
  sahibinBaslik: { color: '#34D399', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  sahibinAciklama: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  sahibinSatir: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sahibinEtiket: { color: Colors.textMuted, fontSize: 12 },
  sahibinDeger: { color: '#E2E8F0', fontWeight: '800', fontSize: 12 },
  buton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  butonYazi: { color: '#F8FAFC', fontWeight: '800', fontSize: 14 },
  butonKoyu: { color: Colors.background, fontWeight: '800', fontSize: 14 },
  upSatiri: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0B1220',
  },
  upEmoji: { fontSize: 22 },
  upBilgi: { flex: 1 },
  upAd: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  upSeviye: { color: Colors.primary, fontWeight: '800', fontSize: 11 },
  upAciklama: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  personelOzet: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 6 },
  personelEtki: { color: '#34D399', fontSize: 11, fontWeight: '700', marginTop: 3 },
  upButon: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  upButonYazi: { color: Colors.background, fontWeight: '800', fontSize: 12 },
  turnuvaBekle: {
    backgroundColor: '#0B1220', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginTop: 10,
  },
  turnuvaBekleYazi: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  olayBaslik: { color: '#F8FAFC', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  olayYazi: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  olaySoru: { color: '#F8FAFC', fontWeight: '800', fontSize: 12, marginBottom: 6 },
  olaySecenek: {
    backgroundColor: '#0B1220', borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 10, marginBottom: 8,
  },
  olaySecenekLabel: { color: '#F8FAFC', fontWeight: '800', fontSize: 13 },
  olaySecenekAciklama: { color: Colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 16 },
  olaySecenekEtki: { color: Colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 },
  olaySonuc: { color: Colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 4 },
  olayKoruma: { color: '#34D399', fontSize: 11, fontWeight: '600', marginBottom: 6, lineHeight: 16 },
  olayGecmisBaslik: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: 4, marginBottom: 2 },
  olayGecmisSatir: { color: Colors.textMuted, fontSize: 11, paddingVertical: 1 },
  ligBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ligSezonYazi: { color: '#F8FAFC', fontWeight: '800', fontSize: 13 },
  ligSampiyonluk: { color: Colors.primary, fontWeight: '800', fontSize: 11 },
  ligSonMac: { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  ligTabloBaslik: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  ligTh: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  ligThAd: { color: Colors.textMuted, fontSize: 10, fontWeight: '800' },
  ligSatir: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: '#0B1220', borderRadius: 4,
  },
  ligSatirBen: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  ligTd: { color: '#CBD5E1', fontSize: 11, textAlign: 'center' },
  ligTdAd: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  ligTdPuan: { color: '#F8FAFC', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  ligSirada: { color: Colors.primary, fontWeight: '700', fontSize: 12, marginTop: 8 },
  ligCikBtn: { alignSelf: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12 },
  ligCikYazi: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  ligModalSkor: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  ligModalSezon: { color: Colors.primary, fontWeight: '800', fontSize: 12, marginBottom: 6 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalKart: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 18, width: '100%',
  },
  modalBaslik: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  modalSonuc: { color: Colors.primary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalYazi: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  modalButonlar: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btnIptal: {
    backgroundColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  btnIptalYazi: { color: '#E2E8F0', fontWeight: '700', fontSize: 13 },
  btnOnay: {
    backgroundColor: Colors.success, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  btnOnayYazi: { color: '#052E16', fontWeight: '800', fontSize: 13 },
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    borderRadius: 12, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  toastYazi: { color: '#F8FAFC', fontWeight: '700', flexShrink: 1, marginRight: 8 },
});

// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===

