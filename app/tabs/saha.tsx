// ============================================
// BEÅLÄ° PATRON â€” app/tabs/saha.tsx (2D SAHA GÃ–RSELÄ° + Ã‡OKLU SAHA + SPONSORLAR + GÃœN DÃ–NGÃœSÃœ)
// ============================================
import React, {
  useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, InteractionManager,
} from 'react-native';
import { useGame } from '../../context/GameContext';
import Saha2D from '../../components/Saha2D';
import {
  PITCH_DEFS, PITCH_UPGRADE_CONFIG, SAHA_TIP_BILGI, YILDIZ_SAHA,
  pitchUpgradeMaliyeti, insaatAsamalari,
  type YildizAsama, type PitchUpgradeDef,
} from '../../constants/pitchConfig';
import { UPGRADE_CONFIG, ENERJI_BAKIM, type UpgradeType } from '../../constants/gameConfig';
import {
  MAX_SPONSOR, SPONSORLAR, sponsorUygunMu, toplamSponsorGeliri,
  type SponsorAnlasma,
} from '../../constants/sponsorConfig';
import { RENK, FONT } from '../../constants/theme';
import {
  sahaGunlukGideri, sahaGunlukPasifGelir,
} from '../../services/gameLogic';
import type { PitchState } from '../../types/game';

// GameContext'teki BAKIM_COST ile aynÄ± deÄŸer (orada export edilmediÄŸi iÃ§in burada da tanÄ±mlÄ±)
const BAKIM_UCRETI = 500;

function para(n: number): string {
  return `${Math.round(n).toLocaleString('tr-TR')}â‚º`;
}

function asamaEtiketi(asama: number): string {
  if (asama <= 0) return 'ğŸŒ± Arsa Yok';
  if (asama === 1) return 'ğŸ  Arsa AlÄ±ndÄ±';
  if (asama < 5) return 'ğŸš§ Ä°nÅŸaat';
  return 'âœ… Hizmette';
}

function asamaRengi(asama: number): string {
  if (asama <= 0) return RENK.kilit;
  if (asama === 1) return '#60A5FA';
  if (asama < 5) return RENK.vurgu;
  return RENK.basari;
}

// Sahadaki yÃ¼kseltmelerin toplu etkisi â€” pitchConfig tanÄ±mlarÄ±ndan yerelde hesaplanÄ±r
function etkiHesapla(up: Record<string, number>) {
  let fiyat = 0, memnuniyet = 0, talep = 0, pasifGelir = 0, prestij = 0, enerjiIndirimi = 0, havaKoruma = false;
  Object.entries(up ?? {}).forEach(([id, seviye]) => {
    const d: PitchUpgradeDef | undefined = PITCH_UPGRADE_CONFIG[id];
    if (!d || !seviye) return;
    fiyat += (d.fiyatEki ?? 0) * seviye;
    memnuniyet += (d.memnuniyetEki ?? 0) * seviye;
    talep += (d.talepEki ?? 0) * seviye;
    pasifGelir += (d.gunlukGelirEki ?? 0) * seviye;
    prestij += (d.prestijEki ?? 0) * seviye;
    enerjiIndirimi += (d.enerjiIndirimi ?? 0) * seviye;
    if (d.havaKoruma) havaKoruma = true;
  });
  return { fiyat, memnuniyet, talep, pasifGelir, prestij, enerjiIndirimi, havaKoruma };
}

// Sponsor kartÄ±ndaki ÅŸart satÄ±rlarÄ± â€” saÄŸlananlar âœ…, eksikler â¬œ
function sponsorKosulSatirlari(sp: SponsorAnlasma, anaSahaAsama: number, anaSahaUp: Record<string, number>): string[] {
  const satirlar: string[] = [];
  if (sp.kosul.asama != null) {
    satirlar.push(`${anaSahaAsama >= sp.kosul.asama ? 'âœ…' : 'â¬œ'} Ana saha aÅŸama ${sp.kosul.asama}`);
  }
  if (sp.kosul.upgrade) {
    const d = PITCH_UPGRADE_CONFIG[sp.kosul.upgrade.id];
    const sev = anaSahaUp[sp.kosul.upgrade.id] ?? 0;
    satirlar.push(`${sev >= sp.kosul.upgrade.seviye ? 'âœ…' : 'â¬œ'} ${d?.ad ?? sp.kosul.upgrade.id} Sv.${sp.kosul.upgrade.seviye}`);
  }
  if (satirlar.length === 0) satirlar.push('âœ… Åart yok');
  return satirlar;
}

// Kart Ä±zgarasÄ±nÄ±n satÄ±r verisi
interface SahaKarti {
  id: string;
  ad: string;
  emoji: string;
  sahip: boolean;
  asama: number;
  kalite: number;
  aktifMi: boolean;
  toplamYatirim: number;
  sahaTipi: string;
}

export default function SahaScreen() {
  const {
    state,
    purchaseUpgrade, doMaintenance,
    buyPitchArsa, insaatIlerlet, pitchUpgradeAl, setActivePitch,
    imzaSponsor, iptalSponsor,
    endDay,
  } = useGame();

  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState(false);
  const [canliIzle, setCanliIzle] = useState(false);
  const [gunSonu, setGunSonu] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const panelKonum = useRef(0);
  // === GÃœN DEÄÄ°ÅÄ°NCE CANLI MAÃ‡ DURUMUNU SIFIRLA ===
  useEffect(() => {
    setCanliIzle(false);
  }, [state?.gun]);


  const sahaListesi = Object.values(state?.pitches ?? {}).filter(Boolean) as PitchState[];
  const aktif = state?.pitches?.[state.activePitchId ?? 'yildiz'] ?? sahaListesi[0];

  // === SPONSORLAR (tesis genelinde) ===
  const imzaliSponsorlar = (((state as any)?.sponsorlar ?? []) as string[]).filter(Boolean);
  const anaSahaAsama = state?.pitches?.yildiz?.asama ?? 0;
  const anaSahaUp = ((state?.upgrades ?? {}) as Record<string, number>);

  // === TÃœM SAHALAR (sahip olunanlar + kilitliler) ===
  const yildizPitch = state?.pitches?.['yildiz'];
  const toplamSaha = 1 + PITCH_DEFS.length;
  const tumSahalar: SahaKarti[] = [];

  tumSahalar.push({
    id: 'yildiz',
    ad: YILDIZ_SAHA.ad,
    emoji: SAHA_TIP_BILGI.yildiz.emoji,
    sahip: !!yildizPitch,
    asama: yildizPitch?.asama ?? 0,
    kalite: yildizPitch ? state.sahaKalitesi : 0,
    aktifMi: aktif?.id === 'yildiz',
    toplamYatirim: YILDIZ_SAHA.toplamMaliyet,
    sahaTipi: 'yildiz',
  });

  PITCH_DEFS.forEach(d => {
    const p = state?.pitches?.[d.id];
    const tip = SAHA_TIP_BILGI[d.sahaTipi] ?? SAHA_TIP_BILGI.yildiz;
    tumSahalar.push({
      id: d.id,
      ad: d.ad,
      emoji: tip.emoji,
      sahip: !!p,
      asama: p?.asama ?? 0,
      kalite: p ? (p.kalite ?? d.baslangicKalitesi) : 0,
      aktifMi: aktif?.id === d.id,
      toplamYatirim: d.arsaBedeli + d.insaatBedeli,
      sahaTipi: d.sahaTipi,
    });
  });

  const bildir = (sonuc: string | null, basari?: string) => {
    if (sonuc) { setHata(true); setMesaj(sonuc); }
    else if (basari) { setHata(false); setMesaj(basari); }
  };

  const aktifYap = (id: string) => {
    setActivePitch(id);
    const kart = tumSahalar.find(t => t.id === id);
    setHata(false);
    setMesaj(`Aktif saha: ${kart?.ad ?? id}`);
  };

  const arsaAl = (defId: string) => {
    const d = PITCH_DEFS.find(x => x.id === defId);
    const sonuc = buyPitchArsa(defId);
    if (sonuc) bildir(sonuc);
    else bildir(null, `${d?.ad ?? 'Saha'} arsasÄ± alÄ±ndÄ±! Åimdi inÅŸaatÄ± ilerlet â€” karta dokunup sahayÄ± aktif et.`);
  };

  const insaatAdim = () => {
    if (!aktif) return;
    const siradaki = (aktif.asama ?? 0) + 1;
    const sonuc = insaatIlerlet(aktif.id);
    if (sonuc) bildir(sonuc);
    else bildir(null, siradaki >= 5 ? 'ğŸ‰ Ä°nÅŸaat tamamlandÄ± â€” saha artÄ±k hizmette!' : 'Ä°nÅŸaat bir aÅŸama ilerledi. ğŸš§');
  };

  const yukseltAl = (upgradeId: string) => {
    if (!aktif) return;
    const sonuc = pitchUpgradeAl(aktif.id, upgradeId);
    if (sonuc) bildir(sonuc);
    else bildir(null, 'YÃ¼kseltme tamamlandÄ±! ğŸ’ª');
  };

  const bakimYap = () => {
    const sonuc = doMaintenance();
    if (sonuc) bildir(sonuc);
    else bildir(null, 'Saha bakÄ±mÄ± yapÄ±ldÄ±. âš½');
  };

  const anaYukseltAl = (t: UpgradeType) => {
    const sonuc = purchaseUpgrade(t);
    if (sonuc) bildir(sonuc);
    else bildir(null, 'YÃ¼kseltme tamamlandÄ±! ğŸ’ª');
  };

  const sponsorImzala = (id: string) => {
    const sonuc = imzaSponsor(id);
    if (sonuc) bildir(sonuc);
    else bildir(null, 'Sponsor imzalandÄ±! ğŸ’¼ PeÅŸin Ã¶deme kasaya girdi, gÃ¼nlÃ¼k gelir her gÃ¼n yatacak.');
  };

  const sponsorFesih = (id: string) => {
    const sonuc = iptalSponsor(id);
    if (sonuc) bildir(sonuc);
    else bildir(null, 'AnlaÅŸma feshedildi â€” gÃ¼nlÃ¼k gelir durdu.');
  };

  // === GÃœNÃœ BÄ°TÄ°R â€” gÃ¼n dÃ¶ngÃ¼sÃ¼ buradan dÃ¶ner ===
  const gunuBitir = () => {
        // Gün geçişinden önce canlı saha simülasyonunu durdur.
    setCanliIzle(false);
// Sponsor geliri gÃ¼n kapanmadan hesaplanÄ±r (GameContext de aynÄ± listeyi kullanÄ±r)
    const sponsorGeliri = toplamSponsorGeliri(imzaliSponsorlar);
    const sonuc = endDay();
    if (!sonuc) {
      bildir('GÃ¼n bitirilemedi â€” oyun durumu hazÄ±r deÄŸil.');
      return;
    }
    InteractionManager.runAfterInteractions(() => {
    setGunSonu({ sonuc, sponsorGeliri });
  });
  };

  if (!state) {
    return (
      <View style={s.ekran}>
        <Text style={s.muted}>YÃ¼kleniyorâ€¦</Text>
      </View>
    );
  }

  if (!aktif) {
    return (
      <View style={s.ekran}>
        <Text style={s.muted}>HenÃ¼z sahan yok. AÅŸaÄŸÄ±dan arsa al!</Text>
      </View>
    );
  }

  // === AKTÄ°F SAHA PANELÄ° VERÄ°LERÄ° ===
  const yildiz = aktif.id === 'yildiz';
  const tipBilgi = SAHA_TIP_BILGI[(aktif.sahaTipi ?? 'yildiz') as keyof typeof SAHA_TIP_BILGI] ?? SAHA_TIP_BILGI.yildiz;
  const acik = (aktif.asama ?? 0) >= 5;
  const gosterilenKalite = yildiz ? state.sahaKalitesi : (aktif.kalite ?? 0);
  const up: Record<string, number> = yildiz
    ? ((state.upgrades ?? {}) as unknown as Record<string, number>)
    : ((aktif.upgrades ?? {}) as Record<string, number>);
  const etki = etkiHesapla(up);
  const pasifGelir = acik ? sahaGunlukPasifGelir(aktif, state) : 0;
  const gunlukGider = sahaGunlukGideri(aktif);
  const def = PITCH_DEFS.find(d => d.id === aktif.id);
  const insaatListesi: YildizAsama[] = yildiz
    ? YILDIZ_SAHA.asamalar
    : (def ? insaatAsamalari(def) : []);
  const sonrakiAsama: YildizAsama | null = !acik && (aktif.asama ?? 0) >= 1
    ? (insaatListesi.find(a => a.asama === (aktif.asama ?? 0) + 1) ?? null)
    : null;
  const insaatYuzde = Math.round(((aktif.asama ?? 0) / 5) * 100);

  // HenÃ¼z alÄ±nmamÄ±ÅŸ saha kataloÄŸu
  const katalog = PITCH_DEFS.filter(d => !state.pitches?.[d.id]);

  return (
    <View style={s.ekran}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.icerik} showsVerticalScrollIndicator={false}>

        {/* === MESAJ === */}
        {mesaj ? (
          <View style={hata ? s.mesajHata : s.mesajOk}>
            <Text style={s.mesajYazi}>{mesaj}</Text>
          </View>
        ) : null}

        {/* === GÃœNÃœ BÄ°TÄ°R â€” GÃœN DÃ–NGÃœSÃœ BURADAN DÃ–NER === */}
        <TouchableOpacity style={s.gunBitirButon} onPress={gunuBitir} activeOpacity={0.85}>
          <Text style={s.gunBitirYazi}>ğŸŒ™ GÃœNÃœ BÄ°TÄ°R â€” GÃ¼n {state?.gun ?? 1}</Text>
          <Text style={s.gunBitirAlt}>Gelir/gider hesaplanÄ±r Â· Sponsor gelirleri kasaya yatar</Text>
        </TouchableOpacity>

        {/* === TÃœM SAHALAR â€” HER EKLENEN BURADA GÃ–RÃœNÃœR === */}
        <Text style={s.baslik}>ğŸŸï¸ SahalarÄ±m ({sahaListesi.length}/{toplamSaha})</Text>
        <View style={s.sahaIzgara}>
          {tumSahalar.map(k => (
            <TouchableOpacity
              key={k.id}
              style={[s.sahaKart, k.aktifMi && s.sahaKartAktif, !k.sahip && s.sahaKartKilitli]}
              activeOpacity={0.8}
              onPress={() => {
                if (k.sahip) {
                  aktifYap(k.id);
                  setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, panelKonum.current - 8), animated: true }), 60);
                } else {
                  bildir(null, `${k.ad} henÃ¼z satÄ±n alÄ±nmadÄ± â€” aÅŸaÄŸÄ±daki katalogdan arsa al.`);
                }
              }}
            >
              <View style={s.sahaKartUst}>
                <Text style={s.sahaKartEmoji}>{k.sahip ? k.emoji : 'ğŸ”’'}</Text>
                {k.aktifMi ? (
                  <View style={s.aktifRozet}>
                    <Text style={s.aktifRozetYazi}>AKTÄ°F</Text>
                  </View>
                ) : null}
              </View>

              {/* KartÄ±n iÃ§inde 2D mini saha */}
              <Saha2D
                mini
                asama={k.asama}
                kalite={k.kalite}
                sahaTipi={k.sahaTipi}
                canli={false}
              />

              <Text style={s.sahaKartAd} numberOfLines={1}>{k.ad}</Text>
              <Text style={[s.sahaKartDurum, { color: asamaRengi(k.asama) }]}>
                {k.sahip ? asamaEtiketi(k.asama) : 'Kilitli'}
              </Text>
              {k.sahip && k.asama < 5 ? (
                <View style={s.miniBar}>
                  <View style={[s.miniBarDolgu, { width: `${Math.max(10, (k.asama / 5) * 100)}%` }]} />
                </View>
              ) : null}
              {k.sahip && k.asama >= 5 ? (
                <Text style={s.sahaKartAlt}>â­ {k.kalite}/10 kalite</Text>
              ) : null}
              {!k.sahip ? (
                <Text style={s.sahaKartAlt}>YatÄ±rÄ±m: {para(k.toplamYatirim)}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.ipucu}>Karta dokun â†’ sahayÄ± aktif yap; yÃ¶netim paneli o sahaya dÃ¶ner.</Text>

        {/* === AKTÄ°F SAHA YÃ–NETÄ°M PANELÄ° === */}
        <View style={s.panel} onLayout={e => { panelKonum.current = e.nativeEvent.layout.y; }}>
          <View style={s.panelBaslikSatir}>
            <Text style={s.panelBaslik}>{tipBilgi.emoji} {aktif.ad} â€” YÃ¶netim</Text>
            <View style={[s.durumRozet, { backgroundColor: asamaRengi(aktif.asama ?? 0) }]}>
              <Text style={s.durumRozetYazi}>{asamaEtiketi(aktif.asama ?? 0)}</Text>
            </View>
          </View>

          {/* === 2D BÃœYÃœK SAHA + CANLI MAÃ‡ === */}
          <Saha2D
            asama={aktif.asama ?? 0}
            kalite={gosterilenKalite}
            sahaTipi={aktif.sahaTipi ?? 'yildiz'}
            canli={canliIzle && acik}
              gun={state.gun}
            upgrades={up}
          />
          <View style={s.canliSatir}>
            <TouchableOpacity style={s.canliButon} onPress={() => setCanliIzle(v => !v)} activeOpacity={0.8}>
              <Text style={s.canliButonYazi}>{canliIzle ? 'â¸ Duraklat' : 'â–¶ï¸ MaÃ§Ä± Ä°zle'}</Text>
            </TouchableOpacity>
            <Text style={s.canliBilgi}>
              {acik
                ? (canliIzle ? 'Oyuncular sahada â€” canlÄ± maÃ§!' : 'MaÃ§ duraklatÄ±ldÄ±.')
                : 'MaÃ§, hizmette olan sahalarda oynanÄ±r.'}
            </Text>
          </View>

          {/* === KURULU YAPILAR (gerÃ§ek yÃ¼kseltme verileri) === */}
          {Object.entries(up).some(([, v]) => v > 0) ? (
            <View style={s.rozetSatir}>
              {Object.entries(up).filter(([, v]) => v > 0).map(([id, seviye]) => {
                const yd = PITCH_UPGRADE_CONFIG[id];
                if (!yd) return null;
                return (
                  <View key={id} style={s.rozet}>
                    <Text style={s.rozetYazi}>{yd.emoji} {yd.ad} Â· {seviye}/{yd.maksSeviye}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Ä°statistikler */}
          <View style={s.istatistikSatiri}>
            <View style={s.istatistikKutu}>
              <Text style={s.istatistikDeger}>â­ {gosterilenKalite}/10</Text>
              <Text style={s.istatistikEtiket}>Kalite</Text>
            </View>
            <View style={s.istatistikKutu}>
              <Text style={s.istatistikDeger}>{para(gunlukGider)}</Text>
              <Text style={s.istatistikEtiket}>GÃ¼nlÃ¼k Gider</Text>
            </View>
            <View style={s.istatistikKutu}>
              <Text style={s.istatistikDeger}>{acik ? para(pasifGelir) : 'â€”'}</Text>
              <Text style={s.istatistikEtiket}>Pasif Gelir</Text>
            </View>
          </View>

          {/* Ä°nÅŸaat durumu */}
          {(aktif.asama ?? 0) >= 1 && (aktif.asama ?? 0) < 5 ? (
            <View style={s.kutu}>
              <Text style={s.kutuBaslik}>ğŸš§ Ä°nÅŸaat â€” %{insaatYuzde} tamam</Text>
              <View style={s.bar}>
                <View style={[s.barDolgu, { width: `${Math.max(4, insaatYuzde)}%` }]} />
              </View>
              {sonrakiAsama ? (
                <View>
                  <Text style={s.kutuAltBaslik}>{sonrakiAsama.label}</Text>
                  <Text style={s.muted}>{sonrakiAsama.aciklama}</Text>
                  <TouchableOpacity style={s.butonYesil} onPress={insaatAdim} activeOpacity={0.8}>
                    <Text style={s.butonBeyaz}>
                      {state.nakit >= sonrakiAsama.cost
                        ? `Ä°nÅŸaatÄ± Ä°lerlet â€” ${para(sonrakiAsama.cost)} (âš¡${sonrakiAsama.enerji})`
                        : `Nakit yetersiz (${para(sonrakiAsama.cost)})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* BakÄ±m (YÄ±ldÄ±z) */}
{/* YÃ¼kseltme etkileri Ã¶zeti */}
          <View style={s.etkiKutu}>
            <Text style={s.kutuBaslik}>ğŸ“ˆ YÃ¼kseltme Etkileri</Text>
            <Text style={s.muted}>
              Fiyat +{Math.round(etki.fiyat * 100)}% Â· Memnuniyet +{etki.memnuniyet} Â· Prestij +{etki.prestij}
              {etki.pasifGelir > 0 ? ` Â· Pasif gelir ${para(etki.pasifGelir)}/gÃ¼n` : ''}
              {etki.enerjiIndirimi > 0 ? ` Â· Enerji -${etki.enerjiIndirimi}` : ''}
              {etki.havaKoruma ? ' Â· â„ï¸ Hava korumasÄ±' : ''}
            </Text>
          </View>

          {/* 22 kalemlik saha yÃ¼kseltme Ä±zgarasÄ± */}
          <Text style={s.bolumBaslik}>Aktif Saha YÃ¼kseltmeleri</Text>
          <View style={s.yukseltmeIzgara}>
            {Object.values(PITCH_UPGRADE_CONFIG).map((ud: PitchUpgradeDef) => {
              const seviye = up[ud.id] ?? 0;
              const maliyet = pitchUpgradeMaliyeti(ud, seviye);
              return (
                <View key={ud.id} style={s.yukseltmeKart}>
                  <Text style={s.yukseltmeEmoji}>{ud.emoji}</Text>
                  <Text style={s.yukseltmeAd} numberOfLines={1}>{ud.ad}</Text>
                  <Text style={s.yukseltmeSeviye}>Seviye {seviye}/{ud.maksSeviye}</Text>
                  <Text style={s.yukseltmeEtki}>{ud.etki}</Text>
                  {maliyet != null ? (
                    <TouchableOpacity style={s.butonKucuk} onPress={() => yukseltAl(ud.id)} activeOpacity={0.8}>
                      <Text style={s.butonKucukYazi}>YÃ¼kselt â€” {para(maliyet)}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[s.butonKucuk, s.butonKucukPasif]}>
                      <Text style={s.butonKucukYazi}>Maks. seviye</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* YÄ±ldÄ±z: tesis ana yÃ¼kseltmeleri */}
          {false ? (
            <View style={s.kutu}>
              <Text style={s.kutuBaslik}>ğŸ—ï¸ Tesis YÃ¼kseltmeleri</Text>
              {Object.entries(UPGRADE_CONFIG).map(([anahtar, cfgRaw]) => {
                const cfg = cfgRaw as any;
                const seviye = up[anahtar] ?? 0;
                const maks = Number(cfg?.maxLevel ?? 0);
                const maliyetListe = Array.isArray(cfg?.costs) ? cfg.costs : [];
                const maliyet = seviye < maks ? maliyetListe[seviye] : undefined;
                return (
                  <View key={anahtar} style={s.anaYukseltmeSatir}>
                    <View style={s.anaYukseltmeBilgi}>
                      <Text style={s.anaYukseltmeAd}>
                        {cfg?.emoji ?? 'ğŸ”§'} {cfg?.ad ?? cfg?.baslik ?? anahtar}{' '}
                        <Text style={s.muted}>(Seviye {seviye}/{maks || '?'})</Text>
                      </Text>
                      {cfg?.aciklama ? <Text style={s.muted}>{String(cfg.aciklama)}</Text> : null}
                    </View>
                    {maliyet != null ? (
                      <TouchableOpacity
                        style={s.butonKucuk}
                        onPress={() => anaYukseltAl(anahtar as UpgradeType)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.butonKucukYazi}>{para(Number(maliyet))}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.butonKucuk, s.butonKucukPasif]}>
                        <Text style={s.butonKucukYazi}>MAX</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* === SPONSORLAR (tesis genelinde) â€” HER ZAMAN GÃ–RÃœNÃœR === */}
          <View style={s.kutu}>
            <View style={s.sponsorBaslikSatir}>
              <Text style={s.kutuBaslik}>ğŸ’¼ Sponsorlar ({imzaliSponsorlar.length}/{MAX_SPONSOR})</Text>
              {imzaliSponsorlar.length > 0 ? (
                <Text style={s.sponsorGelir}>+{para(toplamSponsorGeliri(imzaliSponsorlar))}/gÃ¼n</Text>
              ) : null}
            </View>
            <Text style={s.muted}>
              Tesis genelinde anlaÅŸma â€” imzaladÄ±ÄŸÄ±n sponsorlar sahadaki reklam bantlarÄ±na yazÄ±lÄ±r,
              gÃ¼nlÃ¼k geliri gÃ¼n sonunda otomatik yatar. AynÄ± anda en fazla {MAX_SPONSOR} sponsor.
            </Text>
            <View style={s.sponsorIzgara}>
              {SPONSORLAR.map(sp => {
                const imzali = imzaliSponsorlar.includes(sp.id);
                const uygun = sponsorUygunMu(sp, anaSahaAsama, anaSahaUp);
                const nakitYetiyor = state.nakit >= sp.onOdeme;
                return (
                  <View
                    key={sp.id}
                    style={[
                      s.sponsorKart,
                      imzali && { borderColor: sp.renk },
                      !imzali && !uygun && s.sponsorKartKilitli,
                    ]}
                  >
                    <View style={s.sponsorSatir}>
                      <View style={[s.sponsorNokta, { backgroundColor: sp.renk }]} />
                      <Text style={s.sponsorAd} numberOfLines={1}>{sp.ad}</Text>
                    </View>
                    <Text style={s.sponsorAciklama} numberOfLines={2}>{sp.aciklama}</Text>
                    <Text style={s.sponsorPara}>
                      PeÅŸin {para(sp.onOdeme)} Â· GÃ¼nlÃ¼k +{para(sp.gunlukGelir)}
                    </Text>
                    {sponsorKosulSatirlari(sp, anaSahaAsama, anaSahaUp).map((satir, i) => (
                      <Text key={i} style={s.sponsorKosul}>{satir}</Text>
                    ))}
                    {imzali ? (
                      <TouchableOpacity
                        style={[s.sponsorButon, s.sponsorButonKirmizi]}
                        onPress={() => sponsorFesih(sp.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.sponsorButonYazi}>Fesih Et â€” gelir durur</Text>
                      </TouchableOpacity>
                    ) : !uygun ? (
                      <View style={[s.sponsorButon, s.sponsorButonPasif]}>
                        <Text style={s.sponsorButonYazi}>Åartlar saÄŸlanmadÄ±</Text>
                      </View>
                    ) : !nakitYetiyor ? (
                      <View style={[s.sponsorButon, s.sponsorButonPasif]}>
                        <Text style={s.sponsorButonYazi}>Nakit yetersiz (peÅŸin {para(sp.onOdeme)})</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.sponsorButon}
                        onPress={() => sponsorImzala(sp.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.sponsorButonYazi}>Ä°mzala â€” PeÅŸin {para(sp.onOdeme)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* === YATIRIM: YENÄ° SAHA KATALOÄU === */}
        <Text style={s.bolumBaslik}>YatÄ±rÄ±m: Yeni Saha KataloÄŸu</Text>
        {katalog.length === 0 ? (
          <Text style={s.muted}>TÃ¼m sahalar aÃ§Ä±ldÄ± â€” iÅŸletme tam kapasitede! ğŸ†</Text>
        ) : null}
        {katalog.map(d => {
          const tip = SAHA_TIP_BILGI[d.sahaTipi] ?? SAHA_TIP_BILGI.yildiz;
          const nakitYetiyor = state.nakit >= d.arsaBedeli;
          return (
            <View key={d.id} style={[s.katalogKart, { borderColor: `${tip.renk}55` }]}>
              <View style={s.katalogBaslikSatir}>
                <Text style={s.katalogAd}>{tip.emoji} {d.ad}</Text>
                <Text style={s.katalogFiyat}>{para(d.arsaBedeli)}</Text>
              </View>

              {/* Katalogda da 2D Ã¶nizleme: "bunu alÄ±rsan bÃ¶yle gÃ¶rÃ¼necek" */}
              <Saha2D mini asama={0} kalite={d.baslangicKalitesi} sahaTipi={d.sahaTipi} canli={false} />

              <Text style={s.muted}>{d.aciklama}</Text>
              <Text style={s.katalogDetay}>
                â­ BaÅŸlangÄ±Ã§ kalitesi {d.baslangicKalitesi}/10 Â· Kapasite {d.kapasite} kiÅŸi Â· GÃ¼nlÃ¼k gider {para(d.gunlukGider)}
              </Text>
              <Text style={s.katalogDetay}>
                YatÄ±rÄ±m: arsa {para(d.arsaBedeli)} + inÅŸaat {para(d.insaatBedeli)} ={' '}
                <Text style={s.sari}>{para(d.arsaBedeli + d.insaatBedeli)}</Text>
              </Text>
              <TouchableOpacity
                style={nakitYetiyor ? s.butonYesil : s.butonPasif}
                onPress={() => arsaAl(d.id)}
                activeOpacity={0.8}
              >
                <Text style={s.butonBeyaz}>
                  {nakitYetiyor
                    ? `ArsayÄ± Al â€” ${para(d.arsaBedeli)}`
                    : `Nakit yetersiz (${para(d.arsaBedeli)})`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

      </ScrollView>

      {/* === GÃœN SONU Ã–ZETÄ° (MODAL) === */}
      <Modal visible={!!gunSonu} transparent animationType="fade" onRequestClose={() => setGunSonu(null)}>
        <View style={s.modalKaplama}>
          <View style={s.modalKutu}>
            {gunSonu?.sonuc?.isGameOver ? (
              <Text style={s.modalIflos}>ğŸ’€ Ä°FLAS ETTÄ°N!</Text>
            ) : (
              <Text style={s.modalBaslik}>ğŸŒ™ GÃ¼n {gunSonu?.sonuc?.gun ?? '?'} Bitti!</Text>
            )}

            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ’µ Toplam Gelir</Text>
              <Text style={[s.modalDeger, { color: RENK.basari }]}>+{para(gunSonu?.sonuc?.gelir ?? 0)}</Text>
            </View>
            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸŸï¸ Saha Geliri</Text>
              <Text style={s.modalSoluk}>{para(gunSonu?.sonuc?.sahaGelir ?? 0)}</Text>
            </View>
            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ§¾ Toplam Gider (kira, elektrik, bakÄ±m)</Text>
              <Text style={[s.modalDeger, { color: RENK.hata }]}>-{para(gunSonu?.sonuc?.gider ?? 0)}</Text>
            </View>
            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ‘¥ Personel MaaÅŸÄ± (giderin iÃ§inde)</Text>
              <Text style={s.modalSoluk}>{para(gunSonu?.sonuc?.personelMaas ?? 0)}</Text>
            </View>
            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ’¼ Sponsor Geliri (kasaya yattÄ±)</Text>
              <Text style={[s.modalDeger, { color: RENK.basari }]}>+{para(gunSonu?.sponsorGeliri ?? 0)}</Text>
            </View>

            {(gunSonu?.sonuc?.gorevOdul ?? 0) > 0 ? (
              <View style={s.modalSatir}>
                <Text style={s.modalEtiket}>ğŸ GÃ¶rev Ã–dÃ¼lÃ¼</Text>
                <Text style={[s.modalDeger, { color: RENK.basari }]}>+{para(gunSonu.sonuc.gorevOdul)}</Text>
              </View>
            ) : null}
            {(gunSonu?.sonuc?.jetonOdul ?? 0) > 0 ? (
              <View style={s.modalSatir}>
                <Text style={s.modalEtiket}>ğŸŸï¸ Jeton Ã–dÃ¼lÃ¼</Text>
                <Text style={[s.modalDeger, { color: RENK.basari }]}>+{gunSonu.sonuc.jetonOdul} jeton</Text>
              </View>
            ) : null}

            <View style={s.modalAyirici} />

            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ“Š Net KÃ¢r / Zarar</Text>
              <Text style={[s.modalDeger, { color: (gunSonu?.sonuc?.net ?? 0) >= 0 ? RENK.basari : RENK.hata }]}>
                {para(gunSonu?.sonuc?.net ?? 0)}
              </Text>
            </View>
            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ’° Kasadaki Para</Text>
              <Text style={s.modalKasa}>
                {para((gunSonu?.sonuc?.nakit ?? 0) + (gunSonu?.sponsorGeliri ?? 0))}
              </Text>
            </View>
            <View style={s.modalSatir}>
              <Text style={s.modalEtiket}>ğŸ˜Š Memnuniyet</Text>
              <Text style={s.modalSoluk}>%{gunSonu?.sonuc?.yeniMemnuniyet ?? 'â€”'}</Text>
            </View>
            {(gunSonu?.sonuc?.sadikKazanci ?? 0) > 0 ? (
              <View style={s.modalSatir}>
                <Text style={s.modalEtiket}>â¤ï¸ SadÄ±k MÃ¼ÅŸteri</Text>
                <Text style={[s.modalDeger, { color: RENK.basari }]}>+{gunSonu.sonuc.sadikKazanci}</Text>
              </View>
            ) : null}

            {gunSonu?.sonuc?.isGameOver ? (
              <Text style={s.modalIflosNot}>
                Nakit eksiye dÃ¼ÅŸtÃ¼ ve iflas limiti aÅŸÄ±ldÄ±. Ana ekrandan oyunu sÄ±fÄ±rlayÄ±p yeniden baÅŸlayabilirsin.
              </Text>
            ) : null}

            <TouchableOpacity style={s.modalKapat} onPress={() => setGunSonu(null)} activeOpacity={0.85}>
              <Text style={s.modalKapatYazi}>â˜€ï¸ Yeni GÃ¼ne BaÅŸla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STÄ°LLER
// ============================================
const s = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: RENK.arkaPlan },
  icerik: { padding: 14, paddingBottom: 48, gap: 12 },
  sari: { color: RENK.vurgu, fontSize: 14, fontFamily: FONT.vurgu },
  muted: { color: RENK.yaziSoluk, fontSize: 12, lineHeight: 17, fontFamily: FONT.govde },
  baslik: { color: RENK.yazi, fontSize: 20, fontFamily: FONT.baslik, marginTop: 4 },
  bolumBaslik: { color: RENK.yaziAcik, fontSize: 14, fontFamily: FONT.baslik, marginTop: 6 },
  ipucu: { color: RENK.yaziMat, fontSize: 11, fontStyle: 'italic', fontFamily: FONT.govde },

  // GÃ¼nÃ¼ Bitir butonu
  gunBitirButon: {
    backgroundColor: RENK.vurgu, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14,
    alignItems: 'center', borderWidth: 2, borderColor: '#FCD34D',
  },
  gunBitirYazi: { color: RENK.arkaPlan, fontSize: 16, fontFamily: FONT.buyuk },
  gunBitirAlt: { color: RENK.arkaPlan, opacity: 0.8, fontSize: 10, fontFamily: FONT.govde, marginTop: 2 },

  // GÃ¼n sonu modalÄ±
  modalKaplama: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalKutu: {
    width: '100%', maxWidth: 420, backgroundColor: RENK.panel, borderRadius: 16,
    borderWidth: 1.5, borderColor: RENK.vurgu, padding: 16, gap: 6,
  },
  modalBaslik: { color: RENK.yazi, fontSize: 18, fontFamily: FONT.baslik, marginBottom: 6, textAlign: 'center' },
  modalIflos: { color: RENK.hata, fontSize: 18, fontFamily: FONT.baslik, marginBottom: 6, textAlign: 'center' },
  modalIflosNot: { color: RENK.hata, fontSize: 11, lineHeight: 15, fontFamily: FONT.govde, marginTop: 4, textAlign: 'center' },
  modalSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  modalEtiket: { color: RENK.yaziAcik, fontSize: 12, fontFamily: FONT.govde, flex: 1, marginRight: 8 },
  modalDeger: { fontSize: 12, fontFamily: FONT.baslik },
  modalSoluk: { color: RENK.yaziSoluk, fontSize: 11, fontFamily: FONT.govde },
  modalKasa: { color: RENK.yazi, fontSize: 14, fontFamily: FONT.baslik },
  modalAyirici: { height: 1, backgroundColor: RENK.cizgi, marginVertical: 6 },
  modalKapat: { backgroundColor: RENK.basari, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  modalKapatYazi: { color: '#FFFFFF', fontSize: 13, fontFamily: FONT.buyuk },

  // Mesaj
  mesajOk: { backgroundColor: RENK.basariKoyu, borderColor: RENK.basari, borderWidth: 1, borderRadius: 10, padding: 10 },
  mesajHata: { backgroundColor: RENK.hataKoyu, borderColor: RENK.hata, borderWidth: 1, borderRadius: 10, padding: 10 },
  mesajYazi: { color: RENK.yazi, fontSize: 12, fontFamily: FONT.vurgu },

  // Sahalar Ä±zgarasÄ±
  sahaIzgara: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sahaKart: {
    width: '49%', backgroundColor: RENK.kart, borderRadius: 12, padding: 10,
    borderWidth: 2, borderColor: RENK.cizgi, marginBottom: 10,
  },
  sahaKartAktif: { borderColor: RENK.vurgu },
  sahaKartKilitli: { opacity: 0.55 },
  sahaKartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sahaKartEmoji: { fontSize: 22 },
  aktifRozet: { backgroundColor: RENK.vurgu, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  aktifRozetYazi: { color: RENK.arkaPlan, fontSize: 9, fontFamily: FONT.buyuk },
  sahaKartAd: { color: RENK.yazi, fontSize: 13, fontFamily: FONT.baslik, marginTop: 6 },
  sahaKartDurum: { fontSize: 11, fontFamily: FONT.vurgu, marginTop: 2 },
  sahaKartAlt: { color: RENK.yaziSoluk, fontSize: 11, marginTop: 4, fontFamily: FONT.govde },
  miniBar: { height: 6, backgroundColor: RENK.cizgi, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  miniBarDolgu: { height: 6, backgroundColor: RENK.basari, borderRadius: 3 },

  // CanlÄ± maÃ§ satÄ±rÄ±
  canliSatir: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  canliButon: { backgroundColor: RENK.vurgu, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  canliButonYazi: { color: RENK.arkaPlan, fontSize: 12, fontFamily: FONT.buyuk },
  canliBilgi: { color: RENK.yaziSoluk, fontSize: 11, flex: 1, fontFamily: FONT.govde },

  // Kurulu yapÄ±lar rozetleri
  rozetSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rozet: { backgroundColor: RENK.kart, borderColor: RENK.cizgi, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  rozetYazi: { color: RENK.yaziAcik, fontSize: 10, fontFamily: FONT.vurgu },

  // Panel
  panel: { backgroundColor: RENK.panel, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: RENK.cizgi, gap: 10 },
  panelBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelBaslik: { color: RENK.yazi, fontSize: 15, fontFamily: FONT.baslik, flex: 1, marginRight: 8 },
  durumRozet: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  durumRozetYazi: { color: RENK.arkaPlan, fontSize: 10, fontFamily: FONT.buyuk },

  istatistikSatiri: { flexDirection: 'row', gap: 8 },
  istatistikKutu: { flex: 1, backgroundColor: RENK.kart, borderRadius: 10, padding: 8, alignItems: 'center' },
  istatistikDeger: { color: RENK.yazi, fontSize: 12, fontFamily: FONT.baslik },
  istatistikEtiket: { color: RENK.yaziMat, fontSize: 10, marginTop: 2, fontFamily: FONT.govde },

  kutu: { backgroundColor: RENK.kart, borderRadius: 12, padding: 10, gap: 6 },
  kutuBaslik: { color: RENK.yazi, fontSize: 13, fontFamily: FONT.baslik },
  kutuAltBaslik: { color: RENK.vurgu, fontSize: 12, fontFamily: FONT.vurgu },
  etkiKutu: { backgroundColor: RENK.kart, borderRadius: 12, padding: 10, gap: 4 },

  bar: { height: 10, backgroundColor: RENK.cizgi, borderRadius: 5, overflow: 'hidden', marginVertical: 4 },
  barDolgu: { height: 10, backgroundColor: RENK.basari },

  // Butonlar
  butonYesil: { backgroundColor: RENK.basari, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  butonPasif: { backgroundColor: RENK.pasif, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  butonBeyaz: { color: '#FFFFFF', fontSize: 13, fontFamily: FONT.buyuk },
  butonKucuk: { backgroundColor: RENK.vurgu, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', marginTop: 6 },
  butonKucukPasif: { backgroundColor: RENK.pasif },
  butonKucukYazi: { color: RENK.arkaPlan, fontSize: 11, fontFamily: FONT.buyuk },

  // YÃ¼kseltme Ä±zgarasÄ±
  yukseltmeIzgara: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  yukseltmeKart: {
    width: '49%', backgroundColor: RENK.kart, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: RENK.cizgi, marginBottom: 10,
  },
  yukseltmeEmoji: { fontSize: 20 },
  yukseltmeAd: { color: RENK.yazi, fontSize: 12, fontFamily: FONT.vurgu, marginTop: 4 },
  yukseltmeSeviye: { color: RENK.vurgu, fontSize: 11, fontFamily: FONT.vurgu, marginTop: 2 },
  yukseltmeEtki: { color: RENK.yaziSoluk, fontSize: 11, marginTop: 4, minHeight: 30, fontFamily: FONT.govde },

  // Ana yÃ¼kseltmeler
  anaYukseltmeSatir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: RENK.cizgi },
  anaYukseltmeBilgi: { flex: 1, marginRight: 8 },
  anaYukseltmeAd: { color: RENK.yazi, fontSize: 12, fontFamily: FONT.vurgu },

  // Sponsorlar
  sponsorBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sponsorGelir: { color: RENK.basari, fontSize: 12, fontFamily: FONT.baslik },
  sponsorIzgara: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sponsorKart: {
    width: '49%', backgroundColor: RENK.panel, borderRadius: 12, padding: 10,
    borderWidth: 1.5, borderColor: RENK.cizgi, marginBottom: 10,
  },
  sponsorKartKilitli: { opacity: 0.6 },
  sponsorSatir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sponsorNokta: { width: 10, height: 10, borderRadius: 5 },
  sponsorAd: { color: RENK.yazi, fontSize: 12, fontFamily: FONT.baslik, flex: 1, marginRight: 4 },
  sponsorAciklama: { color: RENK.yaziSoluk, fontSize: 10, lineHeight: 14, marginTop: 4, fontFamily: FONT.govde },
  sponsorPara: { color: RENK.vurgu, fontSize: 11, fontFamily: FONT.vurgu, marginTop: 4 },
  sponsorKosul: { color: RENK.yaziSoluk, fontSize: 10, lineHeight: 14, marginTop: 2, fontFamily: FONT.govde },
  sponsorButon: { backgroundColor: RENK.basari, borderRadius: 8, paddingVertical: 7, alignItems: 'center', marginTop: 6 },
  sponsorButonKirmizi: { backgroundColor: RENK.hata },
  sponsorButonPasif: { backgroundColor: RENK.pasif },
  sponsorButonYazi: { color: '#FFFFFF', fontSize: 11, fontFamily: FONT.buyuk },

  // Katalog
  katalogKart: { backgroundColor: RENK.panel, borderRadius: 14, padding: 12, borderWidth: 1, gap: 6 },
  katalogBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  katalogAd: { color: RENK.yazi, fontSize: 15, fontFamily: FONT.baslik, flex: 1, marginRight: 8 },
  katalogFiyat: { color: RENK.vurgu, fontSize: 14, fontFamily: FONT.baslik },
  katalogDetay: { color: RENK.yaziSoluk, fontSize: 11, lineHeight: 16, fontFamily: FONT.govde },
});
// === DOSYA SONU â€” bu satÄ±rÄ± gÃ¶rÃ¼yorsan yapÄ±ÅŸtÄ±rma tam demektir ===


