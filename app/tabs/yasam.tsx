import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, Modal } from 'react-native';
import { useGame } from '../../context/GameContext';
import { Colors } from '../../constants/colors';
import { LIFE_ITEMS, KIZ_ARKADAS_CONFIG, type LifeItemConfig } from '../../constants/gameConfig';

const KATEGORI_LABELS: Record<string, { emoji: string; label: string }> = {
  ulasim: { emoji: '🚗', label: 'Ulaşım' },
  konut: { emoji: '🏠', label: 'Konut' },
  luks: { emoji: '✨', label: 'Lüks' },
};

export default function YasamScreen() {
  const { state, buyLifeItem, upgradeKizArkadas } = useGame();
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [confirmItem, setConfirmItem] = useState<{ type: 'life'; id: string } | { type: 'kiz' } | null>(null);
  const font = Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', web: 'SpaceMono, monospace' });

  const prestij = state?.prestij ?? 0;

  const kizLevels = (KIZ_ARKADAS_CONFIG?.levels ?? []) as { emoji: string; label: string; cost: number; prestij: number }[];
  const kizRequiredPrestij = KIZ_ARKADAS_CONFIG?.requiredPrestij ?? 0;
  const lifeItems = LIFE_ITEMS ?? [];

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMsgType(type);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleConfirm = () => {
    if (!confirmItem) return;
    if (confirmItem.type === 'life') {
      const err = buyLifeItem(confirmItem.id);
      if (err) showMsg(err, 'error');
      else showMsg('Satın alındı! 🎉');
    } else {
      const err = upgradeKizArkadas();
      if (err) showMsg(err, 'error');
      else showMsg('Ela ilişkiyi ilerletti! ❤️');
    }
    setConfirmItem(null);
  };

  const kategoriler = ['ulasim', 'konut', 'luks'] as const;

  const kaSeviye = state?.kizArkdasSeviye ?? 0;
  const kaMaxed = kaSeviye >= kizLevels.length;
  const kaNextLevel = kaMaxed ? null : kizLevels[kaSeviye];
  const kaCanBuy = !kaMaxed && !!kaNextLevel && (state?.nakit ?? 0) >= (kaNextLevel?.cost ?? 0) && prestij >= kizRequiredPrestij;
  const kaPrestijLocked = prestij < kizRequiredPrestij;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {message ? (
        <View style={[styles.messageBox, msgType === 'error' && styles.messageError]}>
          <Text style={[styles.messageText, { fontFamily: font }, msgType === 'error' && styles.messageTextError]}>{message}</Text>
        </View>
      ) : null}

      {/* Prestij Bar */}
      <View style={styles.prestijBar}>
        <Text style={[styles.prestijLabel, { fontFamily: font }]}>⭐ Prestij Puanı</Text>
        <Text style={[styles.prestijValue, { fontFamily: font }]}>{prestij}</Text>
      </View>

      {/* Kategori sections */}
      {kategoriler.map(kat => {
        const katInfo = KATEGORI_LABELS[kat];
        const items = lifeItems.filter(i => i?.kategori === kat);
        return (
          <View key={kat} style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: font }]}>{katInfo?.emoji} {katInfo?.label}</Text>
            {items.map(item => {
              const owned = state?.lifeItems?.[item.id];
              const currentLevel = owned?.level ?? 0;
              const maxed = currentLevel >= (item.levels?.length ?? 0);
              const nextLevel = maxed ? null : item.levels?.[currentLevel];
              const canAfford = nextLevel ? (state?.nakit ?? 0) >= (nextLevel.cost ?? 0) : false;
              const prestijLocked = prestij < (item.requiredPrestij ?? 0);
              const canBuy = !maxed && canAfford && !prestijLocked;

              return (
                <View key={item.id} style={[styles.itemCard, prestijLocked && styles.itemLocked]}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { fontFamily: font }]}>{item.label}</Text>
                      <Text style={[styles.itemDesc, { fontFamily: font }]}>{item.aciklama}</Text>
                      {currentLevel > 0 && (
                        <Text style={[styles.itemCurrentLevel, { fontFamily: font }]}>
                          ✅ {item.levels?.[currentLevel - 1]?.label ?? ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {prestijLocked ? (
                    <View style={styles.lockedRow}>
                      <Text style={[styles.lockedText, { fontFamily: font }]}>🔒 {item.requiredPrestij ?? 0} Prestij gerekli</Text>
                    </View>
                  ) : maxed ? (
                    <View style={styles.maxedRow}>
                      <Text style={[styles.maxedText, { fontFamily: font }]}>✅ Maksimum</Text>
                    </View>
                  ) : nextLevel ? (
                    <View style={styles.buyRow}>
                      <View>
                        <Text style={[styles.nextLevelLabel, { fontFamily: font }]}>{nextLevel.label}</Text>
                        <Text style={[styles.nextLevelCost, { fontFamily: font }]}>{(nextLevel.cost ?? 0).toLocaleString('tr-TR')} ₺</Text>
                        <Text style={[styles.nextLevelPrestij, { fontFamily: font }]}>+{nextLevel.prestij ?? 0} ⭐</Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [styles.buyBtn, !canBuy && styles.btnDisabled, pressed && canBuy && styles.btnPressed]}
                        onPress={() => setConfirmItem({ type: 'life', id: item.id })}
                        disabled={!canBuy}
                        accessibilityLabel={`${item.label} satın al`}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.buyBtnText, { fontFamily: font }]}>Satın Al</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Ela */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontFamily: font }]}>❤️ İlişki</Text>
        <View style={[styles.itemCard, kaPrestijLocked && styles.itemLocked]}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemEmoji}>👩</Text>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { fontFamily: font }]}>Ela 💕</Text>
              <Text style={[styles.itemDesc, { fontFamily: font }]}>Hayatına Ela'yı kat</Text>
              {kaSeviye > 0 && (
                <Text style={[styles.itemCurrentLevel, { fontFamily: font }]}>
                  {kizLevels[kaSeviye - 1]?.emoji ?? ''} {kizLevels[kaSeviye - 1]?.label ?? ''}
                </Text>
              )}
            </View>
          </View>
          {/* Progress dots */}
          <View style={styles.progressRow}>
            {kizLevels.map((lvl, i) => (
              <View key={i} style={styles.progressStep}>
                <View style={[styles.progressDot, i < kaSeviye && styles.progressDotActive]} />
                <Text style={[styles.progressLabel, { fontFamily: font }]}>{lvl?.emoji ?? ''}</Text>
              </View>
            ))}
          </View>
          {kaPrestijLocked ? (
            <View style={styles.lockedRow}>
              <Text style={[styles.lockedText, { fontFamily: font }]}>🔒 {kizRequiredPrestij} Prestij gerekli</Text>
            </View>
          ) : kaMaxed ? (
            <View style={styles.maxedRow}>
              <Text style={[styles.maxedText, { fontFamily: font }]}>💍 Ciddi İlişki</Text>
            </View>
          ) : kaNextLevel ? (
            <View style={styles.buyRow}>
              <View>
                <Text style={[styles.nextLevelLabel, { fontFamily: font }]}>{kaNextLevel.emoji} {kaNextLevel.label}</Text>
                <Text style={[styles.nextLevelCost, { fontFamily: font }]}>{(kaNextLevel.cost ?? 0).toLocaleString('tr-TR')} ₺</Text>
                <Text style={[styles.nextLevelPrestij, { fontFamily: font }]}>+{kaNextLevel.prestij ?? 0} ⭐</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.buyBtn, !kaCanBuy && styles.btnDisabled, pressed && kaCanBuy && styles.btnPressed]}
                onPress={() => setConfirmItem({ type: 'kiz' })}
                disabled={!kaCanBuy}
                accessibilityLabel="Ela ile ilişkiyi ilerlet"
                accessibilityRole="button"
              >
                <Text style={[styles.buyBtnText, { fontFamily: font }]}>İlerlet</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Confirm Modal */}
      <Modal visible={confirmItem !== null} transparent animationType="fade" onRequestClose={() => setConfirmItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { fontFamily: font }]}>Satın almak istediğine emin misin?</Text>
            {confirmItem && (
              <Text style={[styles.modalDesc, { fontFamily: font }]}>
                {confirmItem.type === 'life'
                  ? (() => {
                      const item = lifeItems.find(i => i?.id === confirmItem.id);
                      const lvl = item?.levels?.[(state?.lifeItems?.[confirmItem.id]?.level ?? 0)];
                      return `${item?.emoji ?? ''} ${lvl?.label ?? ''} - ${(lvl?.cost ?? 0).toLocaleString('tr-TR')} ₺`;
                    })()
                  : (() => {
                      const lvl = kizLevels[state?.kizArkdasSeviye ?? 0];
                      return `${lvl?.emoji ?? ''} ${lvl?.label ?? ''} - ${(lvl?.cost ?? 0).toLocaleString('tr-TR')} ₺`;
                    })()
                }
              </Text>
            )}
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalBtnYes]} onPress={handleConfirm}>
                <Text style={[styles.modalBtnText, { fontFamily: font }]}>Onayla</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnNo]} onPress={() => setConfirmItem(null)}>
                <Text style={[styles.modalBtnText, { fontFamily: font }]}>İptal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  messageBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.accent, borderRadius: 2, padding: 12, marginBottom: 12, alignItems: 'center' },
  messageError: { borderColor: Colors.danger },
  messageText: { color: Colors.accent, fontSize: 12 },
  messageTextError: { color: Colors.danger },
  prestijBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#FFD700' + '60', borderRadius: 2, padding: 14, marginBottom: 16 },
  prestijLabel: { color: Colors.gold, fontSize: 14 },
  prestijValue: { color: Colors.gold, fontSize: 22, fontWeight: 'bold' },
  section: { marginBottom: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  itemCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 2, padding: 14, marginBottom: 10 },
  itemLocked: { opacity: 0.45 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemEmoji: { fontSize: 30, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  itemDesc: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  itemCurrentLevel: { color: Colors.accent, fontSize: 11, marginTop: 3 },
  lockedRow: { alignItems: 'center', paddingVertical: 4 },
  lockedText: { color: Colors.textSecondary, fontSize: 12 },
  maxedRow: { alignItems: 'center', paddingVertical: 4 },
  maxedText: { color: Colors.accent, fontSize: 13 },
  buyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border + '60', paddingTop: 10 },
  nextLevelLabel: { color: Colors.textPrimary, fontSize: 12 },
  nextLevelCost: { color: Colors.gold, fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  nextLevelPrestij: { color: Colors.gold + 'BB', fontSize: 11, marginTop: 1 },
  buyBtn: { backgroundColor: Colors.accent, borderRadius: 2, paddingVertical: 10, paddingHorizontal: 20 },
  buyBtnText: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { transform: [{ scale: 0.97 }] },
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  progressStep: { alignItems: 'center', gap: 4 },
  progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border, borderWidth: 1, borderColor: Colors.textSecondary + '40' },
  progressDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  progressLabel: { color: Colors.textSecondary, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 2, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalDesc: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 2 },
  modalBtnYes: { backgroundColor: Colors.accent },
  modalBtnNo: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  modalBtnText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
});

// === DOSYA SONU — YAŞAM ===
