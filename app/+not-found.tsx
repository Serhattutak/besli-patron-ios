import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sayfa bulunamadı</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Ana Sayfaya Dön</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  text: { color: Colors.textPrimary, fontSize: 18, marginBottom: 24 },
  button: { backgroundColor: Colors.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 2 },
  buttonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
});
