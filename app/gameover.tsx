import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { Colors } from '../constants/colors';

export default function GameOverScreen() {
  const insets = useSafeAreaInsets();
  const { resetGame } = useGame();
  const fontFamily = Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', web: 'SpaceMono, monospace' });

  const handleRestart = async () => {
    await resetGame();
    router.replace('/intro');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <Text style={[styles.emoji]}>💸</Text>
      <Text style={[styles.title, { fontFamily }]}>İflas Ettin!</Text>
      <Text style={[styles.subtitle, { fontFamily }]}>3 gün üst üste borcunu ödeyemedin.{"\n"}Saha kapandı...</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.97 }] }]}
        onPress={handleRestart}
        accessibilityLabel="Yeniden Başla"
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { fontFamily }]}>🔄 Yeniden Başla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, color: Colors.danger, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 48, lineHeight: 24 },
  button: { backgroundColor: Colors.danger, borderRadius: 2, paddingVertical: 16, paddingHorizontal: 32, width: '100%', maxWidth: 300, alignItems: 'center' },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});
