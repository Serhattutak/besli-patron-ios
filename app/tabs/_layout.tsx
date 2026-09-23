import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

// Palet anahtarları güvenli şekilde okunur; tanımsızsa varsayılana düşer
const palette = Colors as Record<string, string | undefined>;
const accent = palette.primary ?? palette.accent ?? palette.textPrimary ?? '#F5A623';
const surface = palette.surface ?? palette.card ?? palette.background ?? '#14142B';
const muted = palette.textSecondary ?? palette.textMuted ?? '#8E8E93';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
        tabBarStyle: {
          backgroundColor: surface,
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
      }}
    >
      <Tabs.Screen name="saha" options={{ title: 'Saha' }} />
      <Tabs.Screen name="isletme" options={{ title: 'İşletme' }} />
      <Tabs.Screen name="yasam" options={{ title: 'Yaşam' }} />
      <Tabs.Screen name="rezervasyonlar" options={{ title: 'Rezervasyonlar' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
