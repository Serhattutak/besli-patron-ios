import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useGame } from '../../context/GameContext';
import { taniOku, islemKaydet } from '../../services/tani';
import { Colors } from '../../constants/colors';
import { gizlilikTercihleriniAc } from '../../services/adManager';
import {
  JETON_ENERJI_COST,
  JETON_ENERJI_GAIN,
  MAX_ENERJI,
  CITIES,
} from '../../constants/gameConfig';

export default function ProfilScreen() {
  const {
    state,
    useJeton,
    manualSave,
    resetGame,
    unlockCity,
    switchCity,
    devHediye,
  } = useGame();

  const [message, setMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmCity, setConfirmCity] = useState<string | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [futbolcuTik, setFutbolcuTik] = useState(0);
  const [taniMetni, setTaniMetni] = useState('');

  const font = Platform.select({
    ios: 'SpaceMono',
    android: 'SpaceMono',
    web: 'SpaceMono, monospace',
  });

  const jeton = state?.jeton ?? 0;
  const enerji = state?.enerji ?? 0;
  const prestij = state?.prestij ?? 0;
  const nakit = state?.nakit ?? 0;

  const canUseJeton =
    jeton >= (JETON_ENERJI_COST ?? 20) &&
    enerji < (MAX_ENERJI ?? 100);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleFutbolcuTik = () => {
    const yeniTik = futbolcuTik + 1;

    if (yeniTik >= 5) {
      setShowDevPanel(true);
      setFutbolcuTik(0);
      showMsg('Geliştirici paneli açıldı! 🧪');
    } else {
      setFutbolcuTik(yeniTik);
    }
  };

  const handleUseJeton = () => {
    const err = useJeton();

    if (err) {
      showMsg(err);
    } else {
      showMsg(`+${JETON_ENERJI_GAIN ?? 30} Enerji yüklendi!`);
    }
  };

  const handleTani = async () => {
    const rapor = await taniOku();
    setTaniMetni(rapor);
  };

  const handleSave = async () => {
    await manualSave();
    showMsg('Oyun kaydedildi!');
  };

  const handlePrivacyOptions = async () => {
    showMsg('Gizlilik tercihleri kontrol ediliyor...');
    const canRequestAds = await gizlilikTercihleriniAc();
    showMsg(canRequestAds
      ? 'Reklam izin durumu yeniden kontrol edildi.'
      : 'Reklam izni verilmedi veya gizlilik formu şu anda kullanılamıyor.');
  };

  const handleReset = async () => {
    islemKaydet('KULLANICI: oyunu sifirladi');
    setShowResetConfirm(false);
    await resetGame();
    router.replace('/intro');
  };

  const handleCityAction = (cityId: string) => {
    const cityData = state?.cities?.[cityId];

    if (cityData?.unlocked) {
      const err = switchCity(cityId);

      if (err) {
        showMsg(err);
      } else {
        showMsg('Şehir değiştirildi! 🏙️');
      }
    } else {
      setConfirmCity(cityId);
    }
  };

  const handleUnlockConfirm = () => {
    if (!confirmCity) return;

    const err = unlockCity(confirmCity);

    if (err) {
      showMsg(err);
    } else {
      showMsg('Şehir açıldı! 🎉');
    }

    setConfirmCity(null);
  };

  const handleGiftMoney = () => {
    devHediye(1000000, 0, 0, false);
    showMsg('+1.000.000₺ eklendi! 💰');
  };

  const handleGiftPrestige = () => {
    devHediye(0, 100, 0, false);
    showMsg('+100 prestij eklendi! ⭐');
  };

  const handleGiftJeton = () => {
    devHediye(0, 0, 50, false);
    showMsg('+50 jeton eklendi! 🔵');
  };

  const handleFillEnergy = () => {
    devHediye(0, 0, 0, true);
    showMsg('Enerji tamamen dolduruldu! ⚡');
  };

  const cityList = CITIES ?? [];
  const confirmCityConfig = confirmCity
    ? cityList.find((city: any) => city?.id === confirmCity)
    : null;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {message ? (
          <View style={styles.messageBox}>
            <Text style={[styles.messageText, { fontFamily: font }]}>
              {message}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <View style={styles.avatarHead} />
              <View style={styles.avatarBody} />
            </View>

            <View style={styles.charInfo}>
              <Pressable onPress={__DEV__ ? handleFutbolcuTik : undefined}>
                <Text style={[styles.charName, { fontFamily: font }]}>
                  Eski Futbolcu
                </Text>
              </Pressable>

              <Text style={[styles.charTitle, { fontFamily: font }]}>
                Halısaha Patronu
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: font }]}>
            📊 İstatistikler
          </Text>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              📅 Toplam Gün
            </Text>
            <Text style={[styles.statValue, { fontFamily: font }]}>
              {state?.gun ?? 1}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              💰 Nakit
            </Text>
            <Text style={[styles.statValueGold, { fontFamily: font }]}>
              {nakit.toLocaleString('tr-TR')} ₺
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              💵 Toplam Kazanç
            </Text>
            <Text style={[styles.statValueGold, { fontFamily: font }]}>
              {(state?.toplamKazanc ?? 0).toLocaleString('tr-TR')} ₺
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              🏟️ Saha Kalitesi
            </Text>
            <Text style={[styles.statValue, { fontFamily: font }]}>
              {state?.sahaKalitesi ?? 4}/10
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              ⚡ Enerji
            </Text>
            <Text style={[styles.statValue, { fontFamily: font }]}>
              {enerji}/{MAX_ENERJI ?? 100}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              ⭐ Prestij
            </Text>
            <Text style={[styles.statValuePrestige, { fontFamily: font }]}>
              {prestij}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontFamily: font }]}>
              🔵 Jeton
            </Text>
            <Text style={[styles.statValue, { fontFamily: font }]}>
              {jeton}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: font }]}>
            ⚡ Enerji ve Kayıt
          </Text>

          <Pressable
            style={[
              styles.actionButton,
              !canUseJeton && styles.disabledButton,
            ]}
            onPress={handleUseJeton}
            disabled={!canUseJeton}
          >
            <Text style={[styles.buttonText, { fontFamily: font }]}>
              🔵 Jeton Kullan — +{JETON_ENERJI_GAIN ?? 30} Enerji
            </Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleSave}>
            <Text style={[styles.buttonText, { fontFamily: font }]}>
              💾 Oyunu Kaydet
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: font }]}> 
            🔐 Gizlilik ve Reklam Tercihleri
          </Text>
          <Text style={[styles.statLabel, { fontFamily: font, marginBottom: 10 }]}>Bölgen için gizlilik seçenekleri gerekiyorsa burada açılır; ayrıca reklam izin durumu yeniden kontrol edilir.</Text>
          <Pressable style={styles.actionButton} onPress={handlePrivacyOptions}>
            <Text style={[styles.buttonText, { fontFamily: font }]}>Gizlilik Tercihlerini Yönet</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: font }]}>
            🏙️ Şehirler
          </Text>

          {cityList.map((city: any) => {
            const cityData = state?.cities?.[city?.id];
            const unlocked = cityData?.unlocked === true;
            const active = state?.activeSehir === city?.id;
            const unlockCost = Number(city?.unlockCost ?? 0);
            const requiredPrestij = Number(
              city?.requiredPrestij ?? city?.prestijCost ?? 0,
            );

            return (
              <View key={city?.id} style={styles.cityRow}>
                <View style={styles.cityInfo}>
                  <Text style={[styles.cityName, { fontFamily: font }]}>
                    {city?.emoji ?? '🏙️'} {city?.label ?? city?.id}
                  </Text>

                  {unlocked ? (
                    <Text style={[styles.cityStatus, { fontFamily: font }]}>
                      {active ? '✅ Aktif şehir' : '🔓 Açık'}
                    </Text>
                  ) : (
                    <Text style={[styles.cityLocked, { fontFamily: font }]}>
                      🔒 {unlockCost.toLocaleString('tr-TR')}₺ / ⭐{requiredPrestij}
                    </Text>
                  )}
                </View>

                <Pressable
                  style={[
                    styles.smallButton,
                    active && styles.disabledButton,
                  ]}
                  onPress={() => handleCityAction(city?.id)}
                  disabled={active}
                >
                  <Text style={[styles.smallButtonText, { fontFamily: font }]}>
                    {active ? 'Aktif' : unlocked ? 'Geç' : 'Aç'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Pressable
          style={styles.resetButton}
          onPress={() => setShowResetConfirm(true)}
        >
          <Text style={[styles.resetButtonText, { fontFamily: font }]}>
            🗑️ Oyunu Sıfırla
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={__DEV__ && showDevPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDevPanel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.devPanel}>
            <Text style={[styles.devTitle, { fontFamily: font }]}>
              🧪 Geliştirici Test Paneli
            </Text>

            <Text style={[styles.devDescription, { fontFamily: font }]}>
              Kilitli özellikleri test etmek için kullanılır.
            </Text>

            <Pressable style={styles.devButton} onPress={handleGiftMoney}>
              <Text style={[styles.devButtonText, { fontFamily: font }]}>
                💰 +1.000.000₺
              </Text>
            </Pressable>

            <Pressable style={styles.devButton} onPress={handleGiftPrestige}>
              <Text style={[styles.devButtonText, { fontFamily: font }]}>
                ⭐ +100 Prestij
              </Text>
            </Pressable>

            <Pressable style={styles.devButton} onPress={handleGiftJeton}>
              <Text style={[styles.devButtonText, { fontFamily: font }]}>
                🔵 +50 Jeton
              </Text>
            </Pressable>

            <Pressable style={styles.devButton} onPress={handleFillEnergy}>
              <Text style={[styles.devButtonText, { fontFamily: font }]}>
                ⚡ Enerjiyi Doldur
              </Text>
            </Pressable>

            <Pressable style={styles.devButton} onPress={handleTani}>
              <Text style={[styles.devButtonText, { fontFamily: font }]}>
                🩺 Tanı Raporu
              </Text>
            </Pressable>

            <Pressable
              style={styles.closeButton}
              onPress={() => setShowDevPanel(false)}
            >
              <Text style={[styles.closeButtonText, { fontFamily: font }]}>
                Kapat
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={taniMetni !== ''} transparent animationType="fade" onRequestClose={() => setTaniMetni('')}>
        <View style={styles.modalOverlay}>
          <View style={styles.devPanel}>
            <Text style={[styles.devTitle, { fontFamily: font }]}>🩺 Tanı Raporu</Text>
            <ScrollView style={{ maxHeight: 380, marginBottom: 10 }}>
              <Text selectable style={{ color: '#E5E7EB', fontFamily: font, fontSize: 11, lineHeight: 16 }}>
                {taniMetni}
              </Text>
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setTaniMetni('')}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmPanel}>
            <Text style={[styles.confirmTitle, { fontFamily: font }]}>
              Oyunu sıfırlamak istiyor musun?
            </Text>

            <Text style={[styles.confirmText, { fontFamily: font }]}>
              Tüm ilerleme silinecek. Bu işlem geri alınamaz.
            </Text>

            <View style={styles.confirmButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowResetConfirm(false)}
              >
                <Text style={[styles.buttonText, { fontFamily: font }]}>
                  Vazgeç
                </Text>
              </Pressable>

              <Pressable style={styles.dangerButton} onPress={handleReset}>
                <Text style={[styles.buttonText, { fontFamily: font }]}>
                  Sıfırla
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmCity !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCity(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmPanel}>
            <Text style={[styles.confirmTitle, { fontFamily: font }]}>
              Şehir kilidi açılsın mı?
            </Text>

            <Text style={[styles.confirmText, { fontFamily: font }]}>
              {confirmCityConfig?.ad ?? 'Bu şehir'} için{' '}
              {Number((confirmCityConfig as any)?.unlockCost ?? 0).toLocaleString(
                'tr-TR',
              )}{' '}
              ₺ ve ⭐
              {Number(
                confirmCityConfig?.requiredPrestij ??
                  (confirmCityConfig as any)?.prestijCost ??
                  0,
              )}{' '}
              prestij gereklidir.
            </Text>

            <View style={styles.confirmButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setConfirmCity(null)}
              >
                <Text style={[styles.buttonText, { fontFamily: font }]}>
                  Vazgeç
                </Text>
              </Pressable>

              <Pressable
                style={styles.confirmButton}
                onPress={handleUnlockConfirm}
              >
                <Text style={[styles.buttonText, { fontFamily: font }]}>
                  Şehri Aç
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageBox: {
    backgroundColor: '#173F2A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  messageText: {
    color: Colors.white,
    textAlign: 'center',
    fontSize: 13,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#26364D',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginRight: 14,
  },
  avatarHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3A878',
    marginBottom: 4,
  },
  avatarBody: {
    width: 42,
    height: 25,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#D89B32',
  },
  charInfo: {
    flex: 1,
  },
  charName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  charTitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 5,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  statValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statValueGold: {
    color: '#F2C14E',
    fontSize: 14,
    fontWeight: '700',
  },
  statValuePrestige: {
    color: '#B88CFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityInfo: {
    flex: 1,
    paddingRight: 8,
  },
  cityName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cityStatus: {
    color: '#65D391',
    fontSize: 11,
    marginTop: 3,
  },
  cityLocked: {
    color: '#E6A04B',
    fontSize: 11,
    marginTop: 3,
  },
  smallButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#642D35',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  resetButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  devPanel: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5A93D',
  },
  devTitle: {
    color: '#E5A93D',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  devDescription: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  devButton: {
    backgroundColor: '#2A3950',
    borderRadius: 10,
    padding: 14,
    marginTop: 9,
    alignItems: 'center',
  },
  devButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: '#642D35',
    borderRadius: 10,
    padding: 13,
    marginTop: 18,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmPanel: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
  },
  confirmTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#536174',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#A33A45',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
});
