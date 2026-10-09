import { ligSifirla } from '../services/ligManager';
// ============================================
// BEŞLİ PATRON — GameContext.tsx (ÇOKLU SAHA + SPONSORLAR + GÜVENLİK + LİG)
// ============================================
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { GameState, Reservation, DailyTask, PitchState, SahaAsama, Upgrades, TurnuvaResult, HavaTipi } from '../types/game';
import type { DayEndResult } from '../services/gameLogic';
import {
  createInitialState, processEndDay, migrateState,
  generateReservations, generatePitchReservations,
  siradakiAsama, simulateTurnuva, rezervasyonEnerjiMaliyeti,
} from '../services/gameLogic';
import { saveGame, loadGame, deleteSave } from '../services/storage';
import {
  MAX_ENERJI, ENERJI_BAKIM,
  JETON_ENERJI_COST, JETON_ENERJI_GAIN,
  UPGRADE_CONFIG, type UpgradeType,
  LIFE_ITEMS, KIZ_ARKADAS_CONFIG, CITIES,
  STAFF_CONFIG, TURNUVA_CONFIG,
  MEMNUNIYET_CONFIG, OLAY_HAVUZU,
  INITIAL_SAHA_KALITESI,
} from '../constants/gameConfig';
import {
  YILDIZ_SAHA, ISLETME_YERI, PITCH_DEFS,
  PITCH_UPGRADE_CONFIG, pitchUpgradeMaliyeti,
} from '../constants/pitchConfig';
import {
  MAX_SPONSOR, SPONSORLAR, sponsorUygunMu, toplamSponsorGeliri,
} from '../constants/sponsorConfig';
import {
  LIG_CONFIG, ligOlustur, ligHaftaSimule,
  type LigDurum, type LigHaftaSonucu,
} from '../services/leagueLogic';
import { gunSonuReklamKontrol } from '../services/adManager';
import { sfx } from '../services/soundManager';

// NaN koruması: undefined/NaN/null gelen sayıları güvenli hale getirir
function safeNum(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// === GÜNLÜK GÖREV İLERLETİCİ ===
// Rezervasyon kabulü ve bakım görevlerinin ilerlemesini sayar.
// (Bu fonksiyon dosyada eksikti — kabul/bakım anında "not defined" hatası patlıyordu.)
function gorevIlerlet(gorevler: DailyTask[] | undefined, tip: string, detay?: any): DailyTask[] {
  if (!Array.isArray(gorevler)) return [];
  return gorevler.map(g => {
    if (!g || g.tamamlandi || g.hedefTip !== tip) return g;
    const hedef = safeNum(g.hedef, 1);
    const artis = tip === 'rezervasyon' ? Math.max(1, safeNum(detay?.kisiSayisi, 1)) : 1;
    const yeniIlerleme = safeNum(g.ilerleme, 0) + artis;
    return { ...g, ilerleme: Math.min(hedef, yeniIlerleme), tamamlandi: yeniIlerleme >= hedef };
  });
}

// === SABİTLER (yerel) ===
const SABAH_ENERJISI = 70;                    // yeni gün başlangıç enerjisi
const BAKIM_COST = 500;                       // günlük bakım ücreti
export const YER_SAHIBI_FIYAT = ISLETME_YERI.satinAlmaFiyat; // 1.500.000₺ (isletme.tsx bunu import edebilir)

// Saha kalitesi = başlangıç + bakım + halı yenileme kademeleri (maks 10)
// UPGRADE_CONFIG'deki "+1 Saha Kalitesi" açıklaması bu hesaptan gelir.
function sahaKalitesiHesapla(up: Upgrades): number {
  return Math.min(10, INITIAL_SAHA_KALITESI + safeNum(up?.bakim, 0) + safeNum(up?.haliYenileme, 0));
}

// === HAVA ===
// Açık sahaların tekliflerini gameLogic'te etkiler (karlı -2, rüzgarlı -1 teklif).
function rastgeleHava(): HavaTipi {
  const r = Math.random();
  if (r < 0.5) return 'gunesli';
  if (r < 0.68) return 'yagmurlu';
  if (r < 0.9) return 'ruzgarli';
  return 'karli';
}

// === OLAY ===
// Gün olaylı geçme şansı parametreyle gelir (güvenlik kademesi düşürür);
// son 5 olay tekrar gelmez (aynı senaryo sıkıntısı biter).
function rastgeleOlay(gecmis: string[], cikmaSansi: number = 0.65): string | null {
  if (Math.random() > cikmaSansi) return null;
  const sonOlaylar = new Set(gecmis.slice(-5));
  const adaylar = OLAY_HAVUZU.filter(o => !sonOlaylar.has(o.id));
  if (adaylar.length === 0) return null;
  return adaylar[Math.floor(Math.random() * adaylar.length)]!.id;
}

// === SPONSORLAR ===
// İmzalı sponsorlar state içinde string[] olarak tutulur (sponsorlar: string[]).
// Eski kayıtlarda bu alan yoktur — sponsorlarAl() güvenli şekilde [] döner.
type GameStateWithSponsor = GameState & { sponsorlar?: string[] };

function sponsorlarAl(s: GameState): string[] {
  const liste = (s as GameStateWithSponsor).sponsorlar;
  return Array.isArray(liste) ? liste.filter(x => typeof x === 'string') : [];
}

// === LİG ===
// Lig durumu state içinde 'lig' alanında tutulur (LigDurum | null).
// Sponsor alanındaki gibi eski kayıtlarda yoksa undefined kalır — sorun çıkarmaz.
type GameStateWithLig = GameState & { lig?: LigDurum | null };

function ligAl(s: GameState): LigDurum | null {
  const lig = (s as GameStateWithLig).lig;
  return lig ?? null;
}

// === SAHA TEKLİFLERİ KURULUMU ===
// Tüm AÇIK sahalar için günün tekliflerini üretir.
// Yıldız saha klasik üreticiyi kullanır (kamera/memnuniyet bonusları aynı),
// diğer sahalar kendi tipine özel üreticiyi (generatePitchReservations) kullanır.
function teklifleriKur(s: GameState): GameState {
  const pitchesYeni: Record<string, PitchState> = { ...(s.pitches ?? {}) };
  const teklifler: Reservation[] = [];

  for (const p of Object.values(s.pitches ?? {})) {
    if (!p || safeNum(p.asama, 0) < 5) continue;
    let rez: Reservation[];
    if (p.id === 'yildiz') {
      // Sponsor kademesi fiyat primi: her kademe +%5
      const fiyatCarpan = 1 + 0.05 * safeNum(s.upgrades?.sponsor, 0);
      rez = generateReservations(s.sahaKalitesi, s.upgrades, fiyatCarpan, s.staff, s.memnuniyet)
        .map(r => ({ ...r, sahaId: 'yildiz' }));
    } else {
      rez = generatePitchReservations(p, s);
    }
    pitchesYeni[p.id] = { ...p, rezervasyonlar: rez, kabulEdilenler: [] };
    teklifler.push(...rez);
  }

  return { ...s, pitches: pitchesYeni, bugunRezervasyonlar: teklifler };
}

// === YENİ GÜN HAZIRLIĞI ===
// Hava + olay çektikten sonra günün tekliflerini kurar.
function gunuHazirla(s: GameState): GameState {
  const hava = rastgeleHava();
  // GÜVENLİK ETKİSİ: görevdeki güvenlik olay çıkma şansını düşürür
  // Güvensizken %65 → L1: %55 | L2: %45 | L3: %35
  const guvenlikSeviye = s.staff?.guvenlik?.hired
    ? Math.max(0, Math.min(3, Math.floor(Number(s.staff.guvenlik.level) || 0)))
    : 0;
  const olaySansi = Math.max(0.35, 0.65 - 0.1 * guvenlikSeviye);
  const olayId = rastgeleOlay(s.olayGecmisi ?? [], olaySansi);
  const olayGecmisi = olayId
    ? [...(s.olayGecmisi ?? []), olayId].slice(-20)
    : (s.olayGecmisi ?? []);

  const hazir: GameState = {
    ...s,
    bugunHava: hava,
    bugunOlayId: olayId,
    olayCozuldu: false,
    olayGelirCarpani: 1,
    olayGecmisi,
  };
  return teklifleriKur(hazir);
}

// Eski kayıt onarımı: işletmesi devam eden ama yildizSaha aşaması boş görünen
// kayıtlarda ana saha açık onarılır (klasik başlangıç korunur).
function eskiKayitOnar(s: GameState): GameState {
  const y = s.pitches?.yildiz;
  if (y && !y.arsaAlindi && safeNum(s.sahaKalitesi, 0) > 0) {
    const onarilmis: PitchState = {
      ...y,
      arsaAlindi: true,
      asama: 5,
      kalite: safeNum(s.sahaKalitesi, INITIAL_SAHA_KALITESI),
      aktif: true,
    };
    return { ...s, yildizSaha: onarilmis, pitches: { ...(s.pitches ?? {}), yildiz: onarilmis } };
  }
  return s;
}


interface GameContextType {
  state: GameState | null;
  loading: boolean;
  initNewGame: () => Promise<void>;
  loadSavedGame: () => Promise<boolean>;
  acceptReservation: (id: string) => string | null;
  rejectReservation: (id: string) => void;
  endDay: () => DayEndResult | null;
  purchaseUpgrade: (type: UpgradeType) => string | null;
  doMaintenance: (pitchId?: string) => string | null;
  useJeton: () => string | null;
  manualSave: () => Promise<void>;
  resetGame: () => Promise<void>;
  buyLifeItem: (itemId: string) => string | null;
  upgradeKizArkadas: () => string | null;
  unlockCity: (cityId: string) => string | null;
  switchCity: (cityId: string) => string | null;
  hireStaff: (staffId: string) => string | null;
  nakitEkle: (d: number) => void;
  enerjiEkle: (miktar: number) => void; joinTurnuva: () => { error: string } | { result: TurnuvaResult };
  buyProperty: () => string | null;
  devHediye: (nakit?: number, prestij?: number, jeton?: number, enerjiDoldur?: boolean) => void;
  // === ÇOKLU SAHA (yeni) ===
  buyYildizArsa: () => string | null;
  buyPitchArsa: (defId: string) => string | null;
  insaatIlerlet: (pitchId: string) => string | null;
  pitchUpgradeAl: (pitchId: string, upgradeId: string) => string | null;
  setActivePitch: (pitchId: string) => void;
  cozOlay: (secenekIndex: number) => string | null;
  // === SPONSORLAR (yeni) ===
  imzaSponsor: (id: string) => string | null;
  iptalSponsor: (id: string) => string | null;
  // === LİG (yeni) ===
  ligKatil: () => string | null;
  ligHaftaOyna: () => { error: string } | { result: LigHaftaSonucu };
  ligBirak: () => string | null;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  // GUN SONU KILIDI: ayni gunun iki kez islenmesini ve cift dokunmayi engeller (Sardur Technologies)
  const endDayKilitRef = useRef(false);
  const endDayGunRef = useRef(-1);
  const previousStateGunTraceRef = useRef<number | null>(null);

  useEffect(() => {
    if (state?.gun == null) return;
    console.log("[END_DAY_TRACE] STATE_GUN_CHANGED", {
      oldGun: previousStateGunTraceRef.current,
      newGun: state.gun,
    });
    previousStateGunTraceRef.current = state.gun;
  }, [state?.gun]);

  // Otomatik kayıt: state her güncellendiğinde diske yazılır
  const autoSave = useCallback(async (yeni: GameState) => {
    setState(yeni);
    try { await saveGame(yeni); } catch {}
  }, []);

  // Açılışta kayıtlı oyunu yükle
  useEffect(() => {
    (async () => {
      try {
        const yuklenen = await loadGame();
        if (yuklenen) {
          let s = migrateState(yuklenen);
          s = eskiKayitOnar(s);
          // Gün içi kayıt ama teklif yok (eski sürüm kaydı) → teklifleri kur
          if ((s.bugunRezervasyonlar ?? []).length === 0) s = teklifleriKur(s);
          setState(s);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  // === YENİ OYUN ===
  // Klasik başlangıç korunur: Yıldız Saha AÇIK ve çalışır halde başlar.
  // Arsa → inşaat akışı PITCH_DEFS'teki YENİ sahalar için geçerlidir.
  const initNewGame = useCallback(async () => {
    const temel = createInitialState();
    const acikYildiz: PitchState = {
      ...temel.yildizSaha,
      arsaAlindi: true,
      asama: 5,
      kalite: INITIAL_SAHA_KALITESI,
      aktif: true,
    };
    const baslangic: GameState = {
      ...temel,
      yildizSaha: acikYildiz,
      pitches: { yildiz: { ...acikYildiz } },
    };
    endDayKilitRef.current = false;
    endDayGunRef.current = -1;
    const ilkGun = gunuHazirla(baslangic);
    setState(ilkGun);
    try { await saveGame(ilkGun); } catch {}
  }, []);

  // === KAYITLI OYUNU YÜKLE ===
  const loadSavedGame = useCallback(async (): Promise<boolean> => {
    try {
      const yuklenen = await loadGame();
      if (!yuklenen) return false;
      endDayKilitRef.current = false;
      endDayGunRef.current = -1;
      let s = migrateState(yuklenen);
      s = eskiKayitOnar(s);
      if ((s.bugunRezervasyonlar ?? []).length === 0) s = teklifleriKur(s);
      setState(s);
      return true;
    } catch {
      return false;
    }
  }, []);

  // === REZERVASYON KABUL ===
  const acceptReservation = useCallback((id: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (state.isGameOver) return 'Oyun bitti!';
    const rez = (state.bugunRezervasyonlar ?? []).find(r => r?.id === id);
    if (!rez || rez.durum !== 'bekliyor') return 'Rezervasyon bulunamadı!';

    // Saha bazlı enerji maliyeti: turnike indirimi sahanın kendi yükseltmesinden okunur
    const sahaId = rez.sahaId ?? 'yildiz';
    const pitch = state.pitches?.[sahaId];
    const up = pitch
      ? (pitch.upgrades ?? (sahaId === 'yildiz' ? state.upgrades : undefined))
      : state.upgrades;
    const turnikeSeviye = safeNum((up as Record<string, number | undefined> | undefined)?.turnike, 0);
    const kasiyerLevel = state.staff?.kasiyer?.hired ? safeNum(state.staff.kasiyer.level, 1) : 0;
    const maliyet = rezervasyonEnerjiMaliyeti(rez.kisiSayisi, kasiyerLevel, turnikeSeviye);
    if (state.enerji < maliyet) return `Enerjin yetmiyor! (${maliyet} enerji gerekli)`;

    const sadikEsik = safeNum(MEMNUNIYET_CONFIG?.sadikMusteriEsik, 80);
    const kabul: Reservation = { ...rez, durum: 'kabul', sadik: (state.memnuniyet ?? 50) >= sadikEsik };

    const bugunRezervasyonlar = (state.bugunRezervasyonlar ?? []).map(r => (r.id === id ? kabul : r));
    const kabulEdilenler = [...(state.kabulEdilenler ?? []), kabul];

    let pitches = state.pitches;
    if (pitches?.[sahaId]) {
      pitches = {
        ...pitches,
        [sahaId]: { ...pitches[sahaId], kabulEdilenler: [...(pitches[sahaId].kabulEdilenler ?? []), kabul] },
      };
    }

    autoSave({
      ...state,
      enerji: state.enerji - maliyet,
      bugunGelir: safeNum(state.bugunGelir, 0) + safeNum(rez.fiyat, 0),
      bugunRezervasyonlar,
      kabulEdilenler,
      pitches,
      gunlukGorevler: gorevIlerlet(state.gunlukGorevler, 'rezervasyon', rez),
    });
    // iOS DONMA TESTİ: gün sonu ses efekti geçici olarak kapalı
    return null;
  }, [state, autoSave]);

  // === REZERVASYON RED ===
  const rejectReservation = useCallback((id: string) => {
    if (!state) return;
    const rez = (state.bugunRezervasyonlar ?? []).find(r => r?.id === id);
    if (!rez || rez.durum !== 'bekliyor') return;

    const ceza = safeNum((MEMNUNIYET_CONFIG as any)?.redMemnuniyetCezasi, 5);
    autoSave({
      ...state,
      memnuniyet: Math.max(0, safeNum(state.memnuniyet, 50) - ceza),
      bugunRezervasyonlar: (state.bugunRezervasyonlar ?? []).map(r =>
        r.id === id ? { ...r, durum: 'red' as const } : r),
    });
  }, [state, autoSave]);

  // === GÜN SONU ===
  const endDay = useCallback((): DayEndResult | null => {
    console.log("[END_DAY_TRACE] ENTER", {
      gun: state?.gun ?? null,
      isGameOver: state?.isGameOver ?? null,
      endDayKilitRef: endDayKilitRef.current,
    });

if (!state) {
      console.error("[END_DAY_TRACE] STATE_NULL");
      console.error("[END_DAY_TRACE] RETURN_NULL", { reason: "STATE_NULL" });
      console.error("[END_DAY] STATE_NULL");
      return null;
    }

    if (state.isGameOver) {
      console.warn("[END_DAY_TRACE] GAME_OVER", { gun: state.gun });
      console.error("[END_DAY_TRACE] RETURN_NULL", { reason: "GAME_OVER", gun: state.gun });
      console.error("[END_DAY] GAME_OVER", state.gun);
      return null;
    }

    // Aynı anda ikinci gün geçişini engelle.
    if (endDayKilitRef.current) {
      console.warn("[END_DAY_TRACE] LOCK_ACTIVE", { gun: state.gun });
      console.error("[END_DAY_TRACE] RETURN_NULL", { reason: "LOCK_ACTIVE", gun: state.gun });
      console.warn("[END_DAY] LOCK_ACTIVE - ikinci çağrı engellendi");
      return null;
    }

    endDayKilitRef.current = true;

    try {
// Sponsorları güvenli şekilde al.
      const imzali = sponsorlarAl(state);

      // Günlük gelir görevi
      const gorevler = (state.gunlukGorevler ?? []).map(g =>
        (!g?.tamamlandi &&
          g.hedefTip === "gelir" &&
          safeNum(state.bugunGelir, 0) >= safeNum(g.hedef, 1))
          ? {
              ...g,
              ilerleme: g.hedef,
              tamamlandi: true,
            }
          : g
      );
      console.log("[END_DAY_TRACE] BEFORE_PROCESS", {
        gun: state.gun,
        nakit: state.nakit,
        isGameOver: state.isGameOver,
      });
const { newState, result } = processEndDay({
        ...state,
        gunlukGorevler: gorevler,
      });
      console.log("[END_DAY_TRACE] AFTER_PROCESS", {
        oldGun: state.gun,
        newGun: newState.gun,
        nakit: newState.nakit,
        isGameOver: newState.isGameOver,
      });
const sponsorGeliri = toplamSponsorGeliri(imzali);

      const sonraki: GameStateWithSponsor = {
        ...newState,
        nakit: safeNum(newState.nakit, 0) + sponsorGeliri,
        sponsorlar: imzali,
      };
      console.log("[END_DAY_TRACE] BEFORE_PREPARE", { gun: sonraki.gun });
const tomorrow = gunuHazirla(sonraki);
      console.log("[END_DAY_TRACE] AFTER_PREPARE", { gun: tomorrow.gun });

      // YENİ GÜNÜ ÖNCE STATE'E UYGULA.
      // Böylece gün sayısı ve yeni gün verileri ekrana hemen yansır.
      console.log("[END_DAY_TRACE] BEFORE_SET_STATE", {
        oldGun: state.gun,
        newGun: tomorrow.gun,
      });
      setState(tomorrow);
      console.log("[END_DAY_TRACE] AFTER_SET_STATE", { newGun: tomorrow.gun });
// KAYIT: Gün geçişinin kritik UI yolunu bloke etme.
      // saveGame içinde JSON.stringify senkron çalıştığı için
      // kaydı yeni gün ekranı oluşturulduktan sonra başlatıyoruz.
      setTimeout(() => {
        void saveGame(tomorrow).catch(error => {
          console.error("[END_DAY_SAVE_ERROR]", error);
        });
      }, 2500);
return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[END_DAY_TRACE] ERROR", {
        message: errorMessage,
        stack: errorStack,
      });
      console.error("[END_DAY_TRACE] RETURN_NULL", { reason: "ERROR" });
      console.error("[END_DAY_ERROR]", error);

      // Hatanın gerçek sebebini iOS logunda görebilmek için.
      if (error instanceof Error) {
        console.error("[END_DAY_ERROR_MESSAGE]", error.message);
        console.error("[END_DAY_ERROR_STACK]", error.stack);
      }

      return null;

    } finally {
      // Gün geçişi tamamlandıktan sonra kilidi aç.
      setTimeout(() => {
        console.log("[END_DAY_TRACE] LOCK_RESET_START", {
          gun: state?.gun ?? null,
          endDayKilitRef: endDayKilitRef.current,
        });
        endDayKilitRef.current = false;
        console.log("[END_DAY_TRACE] LOCK_RESET_DONE", {
          gun: state?.gun ?? null,
          endDayKilitRef: endDayKilitRef.current,
        });
}, 700);
    }
  }, [state]);
  // === ANA YÜKSELTMELER (kantin, sponsor, aydınlatma vb.) ===
  const purchaseUpgrade = useCallback((type: UpgradeType): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const cfg = (UPGRADE_CONFIG as Record<string, any>)[type];
    if (!cfg) return 'Yükseltme bulunamadı!';
    const seviye = safeNum(state.upgrades?.[type], 0);
    const maks = safeNum(cfg.maxLevel ?? cfg.costs?.length ?? 0, 0);
    if (seviye >= maks) return 'Bu yükseltme maksimum seviyede!';
    const cost = safeNum(cfg.costs?.[seviye], 0);
    const enerji = safeNum(cfg.enerji, ENERJI_BAKIM);
    if (state.nakit < cost) return `Yetersiz nakit! (${cost}₺ gerekli)`;
    if (state.enerji < enerji) return `Enerjin yetmiyor! (${enerji} enerji gerekli)`;

    const yeniUpgrades = { ...state.upgrades, [type]: seviye + 1 };
    // Bakım/halı yenileme saha kalitesini yükseltir
    const yeniKalite = (type === 'bakim' || type === 'haliYenileme')
      ? sahaKalitesiHesapla(yeniUpgrades)
      : state.sahaKalitesi;

    autoSave({
      ...state,
      nakit: state.nakit - cost,
      enerji: state.enerji - enerji,
      upgrades: yeniUpgrades,
      sahaKalitesi: yeniKalite,
    });
    return null;
  }, [state, autoSave]);

  // === BAKIM ===
  // pitchId verilirse o sahanın bakımı, verilmezse ana bakım yapılır.
  const doMaintenance = useCallback((pitchId?: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (state.isGameOver) return 'Oyun bitti!';
    if (!pitchId && state.bakimYapildi) return 'Bakım zaten yapıldı!';
    if (pitchId && state.pitches?.[pitchId]?.bakimYapildi) return 'Bu sahanın bakımı zaten yapıldı!';
    if (state.nakit < BAKIM_COST) return `Yetersiz nakit! (${BAKIM_COST}₺ gerekli)`;
    if (state.enerji < ENERJI_BAKIM) return `Enerjin yetmiyor! (${ENERJI_BAKIM} enerji gerekli)`;

    let pitches = state.pitches;
    if (pitchId && pitches?.[pitchId]) {
      pitches = { ...pitches, [pitchId]: { ...pitches[pitchId], bakimYapildi: true } };
    }

    autoSave({
      ...state,
      nakit: state.nakit - BAKIM_COST,
      enerji: state.enerji - ENERJI_BAKIM,
      bakimYapildi: true, // gün sonu memnuniyet cezasını önler
      pitches,
      gunlukGorevler: gorevIlerlet(state.gunlukGorevler, 'bakim'),
    });
    return null;
  }, [state, autoSave]);

  // === JETON → ENERJİ ===
  const useJeton = useCallback((): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (safeNum(state.jeton, 0) < JETON_ENERJI_COST) return `Yetersiz jeton! (${JETON_ENERJI_COST} jeton gerekli)`;
    if (state.enerji >= MAX_ENERJI) return 'Enerjin zaten dolu!';
    autoSave({
      ...state,
      jeton: state.jeton - JETON_ENERJI_COST,
      enerji: Math.min(MAX_ENERJI, state.enerji + JETON_ENERJI_GAIN),
    });
    return null;
  }, [state, autoSave]);

  // === ÇOKLU SAHA: YILDIZ ARSASI ===
  // Yıldız saha klasik başta açık gelir; bu fonksiyon özel durumlar/dev içindir.
  const buyYildizArsa = useCallback((): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const y = state.pitches?.yildiz ?? state.yildizSaha;
    if (!y) return 'Saha bulunamadı!';
    if (y.arsaAlindi) return 'Arsaya zaten sahibisin!';
    const fiyat = YILDIZ_SAHA.arsaFiyat;
    if (state.nakit < fiyat) return `Yetersiz nakit! (${fiyat}₺ gerekli)`;

    const yeni: PitchState = { ...y, arsaAlindi: true, asama: Math.max(1, y.asama ?? 0) as SahaAsama };
    autoSave({
      ...state,
      nakit: state.nakit - fiyat,
      yildizSaha: yeni,
      pitches: { ...(state.pitches ?? {}), yildiz: yeni },
    });
    return null;
  }, [state, autoSave]);

  // === ÇOKLU SAHA: YENİ SAHA ARSASI ===
  const buyPitchArsa = useCallback((defId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const def = PITCH_DEFS.find(d => d.id === defId);
    if (!def) return 'Saha tipi bulunamadı!';
    if (state.pitches?.[defId]) return 'Bu saha zaten var!';
    if (state.nakit < def.arsaBedeli) return `Yetersiz nakit! (${def.arsaBedeli}₺ gerekli)`;

    const yeni: PitchState = {
      id: def.id,
      ad: def.ad,
      sahaTipi: def.sahaTipi,
      arsaAlindi: true,
      asama: 1,
      kalite: 0, // açılışta (aşama 5) başlangıç kalitesine yükselir
      upgrades: { bakim: 0, haliYenileme: 0, aydinlatma: 0, dusSoyunma: 0, kantin: 0, sponsor: 0 },
      bakimYapildi: false,
      rezervasyonlar: [],
      kabulEdilenler: [],
      toplamKazanc: 0,
      aktif: false,
      gunlukGider: def.gunlukGider,
      satinAlmaBedeli: def.arsaBedeli,
      insaatMaliyeti: def.insaatBedeli,
    };

    autoSave({
      ...state,
      nakit: state.nakit - def.arsaBedeli,
      pitches: { ...(state.pitches ?? {}), [defId]: yeni },
      activePitchId: defId,
    });
    return null;
  }, [state, autoSave]);

  // === ÇOKLU SAHA: İNŞAAT AŞAMASI ===
  const insaatIlerlet = useCallback((pitchId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const pitch = state.pitches?.[pitchId] ?? (pitchId === 'yildiz' ? state.yildizSaha : undefined);
    if (!pitch) return 'Saha bulunamadı!';
    if (!pitch.arsaAlindi) return 'Önce arsayı satın al!';
    const asama = siradakiAsama(pitch);
    if (!asama) return 'İnşaat tamamlanmış!';
    if (state.nakit < asama.cost) return `Yetersiz nakit! (${asama.cost}₺ gerekli)`;
    if (state.enerji < asama.enerji) return `Enerjin yetmiyor! (${asama.enerji} enerji gerekli)`;

    const yeniAsama = Math.min(5, safeNum(pitch.asama, 0) + 1) as SahaAsama;
    const def = PITCH_DEFS.find(d => d.id === pitchId);
    const acilisKalite = pitchId === 'yildiz' ? YILDIZ_SAHA.acilisKalite : safeNum(def?.baslangicKalitesi, 4);
    const guncel: PitchState = {
      ...pitch,
      asama: yeniAsama,
      kalite: yeniAsama >= 5 ? acilisKalite : safeNum(pitch.kalite, 0),
      aktif: yeniAsama >= 5,
    };
    const pitches = { ...(state.pitches ?? {}), [pitchId]: guncel };

    autoSave({
      ...state,
      nakit: state.nakit - asama.cost,
      enerji: state.enerji - asama.enerji,
      pitches,
      // Yıldız için legacy alanları da senkron tut (eski ekranlar bozulmasın)
      ...(pitchId === 'yildiz'
        ? { yildizSaha: guncel, sahaKalitesi: Math.max(safeNum(state.sahaKalitesi, 0), guncel.kalite ?? 0) }
        : {}),
    });
    return null;
  }, [state, autoSave]);

  // === ÇOKLU SAHA: SAHA BAŞI YÜKSELTMELER (16 KALEM) ===
  const pitchUpgradeAl = useCallback((pitchId: string, upgradeId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const def = PITCH_UPGRADE_CONFIG[upgradeId];
    if (!def) return 'Yükseltme bulunamadı!';
    const pitch = state.pitches?.[pitchId];
    if (!pitch) return 'Saha bulunamadı!';
    if (safeNum(pitch.asama, 0) < 5) return 'Bu saha henüz açık değil!';

    // Yıldız sahanın yükseltmeleri legacy state.upgrades'te yaşar,
    // yeni sahalar kendi pitch.upgrades'lerinde.
    const yildiz = pitchId === 'yildiz';
    const mevcutUp = yildiz ? state.upgrades : (pitch.upgrades ?? {});
    const seviye = safeNum((mevcutUp as Record<string, number | undefined> | undefined)?.[upgradeId], 0);
    const maliyet = pitchUpgradeMaliyeti(def, seviye);
    if (maliyet == null) return 'Bu yükseltme maksimum seviyede!';
    if (state.nakit < maliyet) return `Yetersiz nakit! (${maliyet}₺ gerekli)`;
    if (state.enerji < def.enerji) return `Enerjin yetmiyor! (${def.enerji} enerji gerekli)`;

    const yeniSeviye = seviye + 1;
    let pitches = state.pitches;
    let upgrades = state.upgrades;

    if (yildiz) {
      upgrades = { ...state.upgrades, [upgradeId]: yeniSeviye };
    } else {
      pitches = {
        ...state.pitches,
        [pitchId]: { ...pitch, upgrades: { ...(pitch.upgrades ?? {}), [upgradeId]: yeniSeviye } },
      };
    }

    autoSave({
      ...state,
      nakit: state.nakit - maliyet,
      enerji: state.enerji - def.enerji,
      pitches,
      upgrades,
    });
    return null;
  }, [state, autoSave]);

  // === ÇOKLU SAHA: AKTİF SAHA SEÇİMİ ===
  const setActivePitch = useCallback((pitchId: string) => {
    if (!state) return;
    if (!state.pitches?.[pitchId]) return;
    autoSave({ ...state, activePitchId: pitchId });
  }, [state, autoSave]);

  // === OLAY ÇÖZÜMÜ ===
  const cozOlay = useCallback((secenekIndex: number): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (!state.bugunOlayId || state.olayCozuldu) return 'Çözülecek olay yok!';
    const sablon = OLAY_HAVUZU.find(o => o.id === state.bugunOlayId);
    if (!sablon) return 'Olay bulunamadı!';
    const secenek = sablon.secenekler?.[secenekIndex];
    if (!secenek) return 'Geçersiz seçim!';
    const etki = ((secenek as any).etki ?? {}) as {
      nakit?: number; memnuniyet?: number; enerji?: number;
      jeton?: number; prestij?: number; gelirCarpani?: number;
    };

    autoSave({
      ...state,
      nakit: state.nakit + safeNum(etki.nakit, 0),
      jeton: state.jeton + safeNum(etki.jeton, 0),
      prestij: state.prestij + safeNum(etki.prestij, 0),
      memnuniyet: Math.max(0, Math.min(100, safeNum(state.memnuniyet, 50) + safeNum(etki.memnuniyet, 0))),
      enerji: Math.max(0, Math.min(MAX_ENERJI, safeNum(state.enerji, 0) + safeNum(etki.enerji, 0))),
      olayGelirCarpani: etki.gelirCarpani != null ? safeNum(etki.gelirCarpani, 1) : state.olayGelirCarpani,
      olayCozuldu: true,
    });
    return null;
  }, [state, autoSave]);

  // === SPONSOR İMZALA ===
  // Peşin ödeme anında düşer; günlük gelir endDay'de otomatik eklenir.
  // Şartlar ana sahanın (yildiz) aşamasına ve yükseltmelerine bakar.
  const imzaSponsor = useCallback((id: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (state.isGameOver) return 'Oyun bitti!';
    const sp = SPONSORLAR.find(s => s.id === id);
    if (!sp) return 'Sponsor bulunamadı!';
    const imzali = sponsorlarAl(state);
    if (imzali.includes(id)) return 'Bu sponsorla zaten anlaşman var!';
    if (imzali.length >= MAX_SPONSOR) return `Aynı anda en fazla ${MAX_SPONSOR} sponsor!`;
    const yildiz = state.pitches?.yildiz ?? state.yildizSaha;
    if (!sponsorUygunMu(sp, safeNum(yildiz?.asama, 0), (state.upgrades ?? {}) as unknown as Record<string, number>)) {
      return 'Bu sponsorun şartları henüz sağlanmıyor!';
    }
    if (state.nakit < sp.onOdeme) return `Yetersiz nakit! (${sp.onOdeme}₺ peşin gerekli)`;

    autoSave({
      ...state,
      nakit: state.nakit - sp.onOdeme,
      sponsorlar: [...imzali, id],
    } as GameStateWithSponsor);
    return null;
  }, [state, autoSave]);

  // === SPONSOR FESHİ ===
  // Peşin ödeme geri gelmez; günlük gelir aynı gün durur.
  const iptalSponsor = useCallback((id: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const imzali = sponsorlarAl(state);
    if (!imzali.includes(id)) return 'Bu sponsor zaten imzalı değil!';
    autoSave({
      ...state,
      sponsorlar: imzali.filter(x => x !== id),
    } as GameStateWithSponsor);
    return null;
  }, [state, autoSave]);

  // === LİG: KATIL ===
  // Ücretsiz; tek şart yıldız sahanın hizmette olması.
  const ligKatil = useCallback((): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (state.isGameOver) return 'Oyun bitti!';
    const yildiz = state.pitches?.yildiz ?? state.yildizSaha;
    if (safeNum(yildiz?.asama, 0) < 5) return 'Lig için yıldız sahanın hizmette olması gerek!';
    if (ligAl(state)) return 'Zaten ligdesin!';
    const lig = ligOlustur(
      1,
      safeNum(state.sahaKalitesi, 0),
      state.staff?.antrenor?.hired ? safeNum(state.staff.antrenor.level, 0) : 0,
      safeNum(state.memnuniyet, 50),
      safeNum(state.prestij, 0),
      state.gun,
    );
    autoSave({ ...state, lig } as GameStateWithLig);
    return null;
  }, [state, autoSave]);

  // === LİG: HAFTA MAÇI ===
  // Günde en fazla 1 maç (sonMacGunu ile sınırlandı), maç enerji yorar.
  const ligHaftaOyna = useCallback((): { error: string } | { result: LigHaftaSonucu } => {
    if (!state) return { error: 'Oyun bulunamadı!' };
    if (state.isGameOver) return { error: 'Oyun bitti!' };
    const lig = ligAl(state);
    if (!lig) return { error: 'Önce lige katıl!' };
    if (state.gun === lig.sonMacGunu) return { error: 'Bugünün lig maçı oynandı! Yarın yeni hafta maçı.' };
    if (state.enerji < LIG_CONFIG.macEnerjisi) return { error: `Enerjin yetmiyor! (${LIG_CONFIG.macEnerjisi} enerji gerekli)` };

    const { lig: yeniLig, sonuc } = ligHaftaSimule(
      lig,
      safeNum(state.sahaKalitesi, 0),
      state.staff?.antrenor?.hired ? safeNum(state.staff.antrenor.level, 0) : 0,
      safeNum(state.memnuniyet, 50),
      safeNum(state.prestij, 0),
      state.gun,
    );

    autoSave({
      ...state,
      nakit: state.nakit + sonuc.kazanc + sonuc.sezonOdulu,
      prestij: state.prestij + sonuc.prestij + sonuc.sezonPrestij,
      enerji: Math.max(0, state.enerji - LIG_CONFIG.macEnerjisi),
      lig: yeniLig,
    } as GameStateWithLig);
    return { result: sonuc };
  }, [state, autoSave]);

  // === LİG: AYRIL ===
  const ligBirak = useCallback((): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (!ligAl(state)) return 'Zaten ligde değilsin!';
    autoSave({ ...state, lig: null } as GameStateWithLig);
    return null;
  }, [state, autoSave]);

  // === YAŞAM EŞYALARI ===
  const buyLifeItem = useCallback((itemId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const liste: any[] = Array.isArray(LIFE_ITEMS) ? LIFE_ITEMS : Object.values(LIFE_ITEMS as any);
    const cfg = liste.find((i: any) => i?.id === itemId);
    if (!cfg) return 'Ürün bulunamadı!';
    const mevcut = state.lifeItems?.[itemId] ?? { id: itemId, owned: false, level: 0 };
    const levels: any[] = cfg.levels ?? [];
    const sira = mevcut.owned ? safeNum(mevcut.level, 0) : 0;
    if (sira >= levels.length) return 'Bu ürünün tüm seviyeleri elinde!';
    const gerekliPrestij = safeNum(cfg.requiredPrestij, 0);
    if (safeNum(state.prestij, 0) < gerekliPrestij) return `Yetersiz prestij! (${gerekliPrestij} prestij gerekli)`;
    const kademe = levels[sira];
    const cost = safeNum(kademe?.cost, 0);
    if (state.nakit < cost) return `Yetersiz nakit! (${cost}₺ gerekli)`;

    autoSave({
      ...state,
      nakit: state.nakit - cost,
      prestij: state.prestij + safeNum(kademe?.prestij, 0),
      lifeItems: { ...(state.lifeItems ?? {}), [itemId]: { id: itemId, owned: true, level: sira + 1 } },
    });
    return null;
  }, [state, autoSave]);

  // === KIZ ARKADAŞ ===
  const upgradeKizArkadas = useCallback((): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const cfg: any = KIZ_ARKADAS_CONFIG as any;
    const gerekliPrestij = safeNum(cfg?.requiredPrestij, 0);
    if (safeNum(state.prestij, 0) < gerekliPrestij) return `Yetersiz prestij! (${gerekliPrestij} prestij gerekli)`;
    const seviye = safeNum(state.kizArkdasSeviye, 0);
    const levels: any[] = cfg?.levels ?? [];
    if (seviye >= levels.length) return 'İlişkiniz zaten en üst kademede!';
    const kademe = levels[seviye];
    const cost = safeNum(kademe?.cost, 0);
    if (state.nakit < cost) return `Yetersiz nakit! (${cost}₺ gerekli)`;

    autoSave({
      ...state,
      nakit: state.nakit - cost,
      prestij: state.prestij + safeNum(kademe?.prestij, 0),
      kizArkadas: true,
      kizArkdasSeviye: seviye + 1,
    });
    return null;
  }, [state, autoSave]);

  // === ŞEHİRLER ===
  // === ENERJI (odullu reklam odulu) ===
  const enerjiEkle = useCallback((miktar: number): void => {
    if (!state) return;
    const ekle = Math.max(0, Math.round(miktar));
    if (ekle === 0) return;
    autoSave({ ...state, enerji: state.enerji + ekle });
  }, [state, autoSave]);

  const unlockCity = useCallback((cityId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const cfg = CITIES.find(c => c?.id === cityId) as any;
    if (!cfg) return 'Şehir bulunamadı!';
    if (state.cities?.[cityId]?.unlocked) return 'Bu şehir zaten açık!';
    const gerekliPrestij = safeNum(cfg.requiredPrestij, 0);
    if (safeNum(state.prestij, 0) < gerekliPrestij) return `Yetersiz prestij! (${gerekliPrestij} prestij gerekli)`;
    const maliyet = safeNum(cfg.unlockCost ?? cfg.acilisMaliyeti, 0);
    if (state.nakit < maliyet) return `Yetersiz nakit! (${maliyet}₺ gerekli)`;

    autoSave({
      ...state,
      nakit: state.nakit - maliyet,
      cities: {
        ...(state.cities ?? {}),
        [cityId]: {
          id: cityId,
          unlocked: true,
          sahaKalitesi: state.sahaKalitesi,
          sahaKapasitesi: state.sahaKapasitesi,
          upgrades: state.upgrades,
          toplamKazanc: state.toplamKazanc,
        },
      },
    });
    return null;
  }, [state, autoSave]);

  const switchCity = useCallback((cityId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (state.activeSehir === cityId) return null;
    if (!state.cities?.[cityId]?.unlocked) return 'Bu şehir henüz kilitli!';
    const cfg = CITIES.find(c => c?.id === cityId) as any;

    // Mevcut şehrin durumunu kaydet, hedef şehrinkini yükle
    const cities = { ...(state.cities ?? {}) };
    const eski = state.activeSehir;
    if (eski && cities[eski]) {
      cities[eski] = {
        ...cities[eski]!,
        sahaKalitesi: state.sahaKalitesi,
        sahaKapasitesi: state.sahaKapasitesi,
        toplamKazanc: state.toplamKazanc,
      };
    }
    const hedef = cities[cityId]!;

    autoSave({
      ...state,
      activeSehir: cityId,
      sehir: String(cfg?.ad ?? cfg?.isim ?? cityId),
      sahaKalitesi: hedef.sahaKalitesi,
      sahaKapasitesi: hedef.sahaKapasitesi,
      toplamKazanc: hedef.toplamKazanc,
      cities,
    });
    return null;
  }, [state, autoSave]);

  // === PERSONEL ===
  // İşe alım/yükseltme bedeli = hedef kademenin bir günlük maaşı (peşin).
  // Günlük maaş zaten gün sonunda düşülüyor.
  const hireStaff = useCallback((staffId: string): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    const liste: any[] = Array.isArray(STAFF_CONFIG) ? STAFF_CONFIG : Object.values(STAFF_CONFIG as any);
    const cfg = liste.find((s: any) => s?.id === staffId);
    if (!cfg) return 'Personel bulunamadı!';
    const levels: any[] = cfg.levels ?? [];
    const mevcut = state.staff?.[staffId];

    if (!mevcut?.hired) {
      const bedeli = safeNum(levels[0]?.maas, 0);
      if (state.nakit < bedeli) return `Yetersiz nakit! (${bedeli}₺ gerekli)`;
      autoSave({
        ...state,
        nakit: state.nakit - bedeli,
        staff: { ...(state.staff ?? {}), [staffId]: { id: staffId, hired: true, level: 1 } },
      });
      return null;
    }

    const yeniSeviye = safeNum(mevcut.level, 1) + 1;
    if (yeniSeviye > levels.length) return 'Bu personel maksimum seviyede!';
    const bedeli = safeNum(levels[yeniSeviye - 1]?.maas, 0);
    if (state.nakit < bedeli) return `Yetersiz nakit! (${bedeli}₺ gerekli)`;
    autoSave({
      ...state,
      nakit: state.nakit - bedeli,
      staff: { ...(state.staff ?? {}), [staffId]: { ...mevcut, level: yeniSeviye } },
    });
    return null;
  }, [state, autoSave]);

  // === TURNUVA ===
  // Sardur Technologies: Lig/Takim nakit koprusu (mac hasilati, transferler)
  const nakitEkle = useCallback((delta: number) => {
    setState(prev => {
      if (!prev) return prev;
      return { ...prev, nakit: Number(prev.nakit ?? 0) + delta };
    });
  }, []);

  const joinTurnuva = useCallback((): { error: string } | { result: TurnuvaResult } => {
    if (!state) return { error: 'Oyun bulunamadı!' };
    const cfg: any = TURNUVA_CONFIG as any;
    const aralik = Math.max(1, safeNum(cfg?.gunAraligi, 7));
    if (safeNum(state.sonTurnuvaGun, 0) > 0 && state.gun - state.sonTurnuvaGun < aralik) {
      const kalan = aralik - (state.gun - state.sonTurnuvaGun);
      return { error: `Turnuvalar ${aralik} günde bir! (${kalan} gün sonra tekrar dene)` };
    }
    const sonuc = simulateTurnuva(state);
    autoSave({
      ...state,
      nakit: state.nakit + safeNum(sonuc.kazanc, 0),
      prestij: state.prestij + safeNum(sonuc.prestijKazanc, 0),
      turnuvaSonuclari: [...(state.turnuvaSonuclari ?? []).slice(-10), sonuc], // Sardur Technologies: kayit siniri (son 10)
      sonTurnuvaGun: state.gun,
    });
    return { result: sonuc };
  }, [state, autoSave]);

  // === YER SAHİPLİĞİ ===
  const buyProperty = useCallback((): string | null => {
    if (!state) return 'Oyun bulunamadı!';
    if (state.yerSahibi) return 'Yer zaten senin!';
    if (state.nakit < YER_SAHIBI_FIYAT) return `Yetersiz nakit! (${YER_SAHIBI_FIYAT}₺ gerekli)`;
    autoSave({
      ...state,
      nakit: state.nakit - YER_SAHIBI_FIYAT,
      yerSahibi: true,
      prestij: state.prestij + ISLETME_YERI.prestijOdul,
    });
    return null;
  }, [state, autoSave]);

  // === MANUEL KAYIT / SIFIRLAMA ===
  const manualSave = useCallback(async () => {
    if (!state) return;
    try { await saveGame(state); } catch {}
  }, [state]);


  const resetGame = useCallback(async () => {
    try { await deleteSave(); } catch {}
    try { await ligSifirla(); } catch {} // lig kaydini da sil (reset sonrasi lig bastan baslar)
    endDayKilitRef.current = false;
    endDayGunRef.current = -1;
    await initNewGame();
  }, [initNewGame]);

  // === GELİŞTİRİCİ PANELİ HEDİYESİ ===
  const devHediye = useCallback((nakit = 0, prestij = 0, jeton = 0, enerjiDoldur = false) => {
    if (!state) return;
    autoSave({
      ...state,
      nakit: safeNum(state.nakit, 0) + nakit,
      prestij: safeNum(state.prestij, 0) + prestij,
      jeton: safeNum(state.jeton, 0) + jeton,
      enerji: enerjiDoldur ? MAX_ENERJI : state.enerji,
    });
  }, [state, autoSave]);

  const value: GameContextType = {
    state,
    loading,
    initNewGame,
    loadSavedGame,
    acceptReservation,
    rejectReservation,
    endDay,
    purchaseUpgrade,
    doMaintenance,
    useJeton,
    manualSave,
    resetGame,
    buyLifeItem,
    upgradeKizArkadas,
    unlockCity,
    switchCity,
    hireStaff,
    joinTurnuva, nakitEkle, enerjiEkle,
    buyProperty,
    devHediye,
    buyYildizArsa,
    buyPitchArsa,
    insaatIlerlet,
    pitchUpgradeAl,
    setActivePitch,
    cozOlay,
    imzaSponsor,
    iptalSponsor,
    ligKatil,
    ligHaftaOyna,
    ligBirak,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame, GameProvider içinde kullanılmalı!');
  return ctx;
}

// === DOSYA SONU — bu satırı görüyorsan yapıştırma tam demektir ===

