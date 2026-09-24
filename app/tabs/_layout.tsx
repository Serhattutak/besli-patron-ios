import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// Palet anahtarlarini guvenli oku; tanimsizsa varsayilana dus
const palette = Colors as Record<string, string | undefined>;
const accent = palette.accent ?? palette.primary ?? '#52B788';
const surface = palette.surface ?? palette.card ?? '#14142B';
const muted = palette.textSecondary ?? palette.textMuted ?? '#8E8E93';

const IKONLAR: Record<string, keyof typeof Ionicons.glyphMap> = {
  saha: 'football',
  isletme: 'business',
  yasam: 'home',
  rezervasyonlar: 'call',
  profil: 'person',
};

function ikonVer(ad: keyof typeof IKONLAR) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={IKONLAR[ad]} size={size} color={color} />
  );
}

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
      <Tabs.Screen name="saha" options={{ title: 'Saha', tabBarIcon: ikonVer('saha') }} />
      <Tabs.Screen name="isletme" options={{ title: 'İşletme', tabBarIcon: ikonVer('isletme') }} />
      <Tabs.Screen name="yasam" options={{ title: 'Yaşam', tabBarIcon: ikonVer('yasam') }} />
      <Tabs.Screen name="rezervasyonlar" options={{ title: 'Rezervasyonlar', tabBarIcon: ikonVer('rezervasyonlar') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ikonVer('profil') }} />
    </Tabs>
  );
}