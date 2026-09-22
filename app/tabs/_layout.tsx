import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';

function HUDBar() {
  const { state } = useGame();
  const insets = useSafeAreaInsets();
  const fontFamily = Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', web: 'SpaceMono, monospace' });

  const nakit = state?.nakit ?? 0;
  const enerji = state?.enerji ?? 0;
  const gun = state?.gun ?? 1;
  const sahaAdi = state?.sahaAdi ?? 'Beşli Sahası';
  const prestij = state?.prestij ?? 0;
  const sehir = state?.sehir ?? 'İstanbul';
  const memnuniyet = state?.memnuniyet ?? 50;

  const formatMoney = (n: number) => n.toLocaleString('tr-TR');

  return (
    <View style={[styles.hud, { paddingTop: insets.top + 4 }]}>
      <View style={styles.hudRow}>
        <Text style={[styles.hudItem, { fontFamily }]}>
          💰 <Text style={styles.hudGold}>{formatMoney(nakit)} ₺</Text>
        </Text>
        <Text style={[styles.hudItem, { fontFamily }]}>
          ⚡ <Text style={[styles.hudGreen, enerji < 20 && styles.hudRed]}>{enerji}/100</Text>
        </Text>
        <Text style={[styles.hudItem, { fontFamily }]}>
          📅 <Text style={styles.hudSecondary}>Gün {gun}</Text>
        </Text>
      </View>
      <View style={styles.hudRow2}>
        <Text style={[styles.hudSmall, { fontFamily }]}>🏟️ {sahaAdi}</Text>
        <Text style={[styles.hudSmall, { fontFamily }]}>⭐ {prestij}</Text>
        <Text style={[styles.hudSmall, { fontFamily, color: memnuniyet >= 70 ? Colors.accent : memnuniyet >= 40 ? Colors.gold : Colors.danger }]}>😊 {memnuniyet}</Text>
        <Text style={[styles.hudSmall, { fontFamily }]}>📍 {sehir}</Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        header: () => <HUDBar />,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary + '80',
        tabBarLabelStyle: {
          fontFamily: Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', web: 'SpaceMono, monospace' }),
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen name="saha" options={{ title: 'Saha', tabBarIcon: () => <Text style={styles.tabIcon}>🏟️</Text>, tabBarButtonTestID: 'tab-saha' }} />
      <Tabs.Screen name="rezervasyonlar" options={{ title: 'Rezervasyon', tabBarIcon: () => <Text style={styles.tabIcon}>📋</Text>, tabBarButtonTestID: 'tab-rez' }} />
      <Tabs.Screen name="isletme" options={{ title: 'İşletme', tabBarIcon: () => <Text style={styles.tabIcon}>📊</Text>, tabBarButtonTestID: 'tab-isletme' }} />
      <Tabs.Screen name="yasam" options={{ title: 'Yaşam', tabBarIcon: () => <Text style={styles.tabIcon}>🏠</Text>, tabBarButtonTestID: 'tab-yasam' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: () => <Text style={styles.tabIcon}>👤</Text>, tabBarButtonTestID: 'tab-profil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hud: { backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 12, paddingBottom: 6 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  hudItem: { color: Colors.textPrimary, fontSize: 11 },
  hudGold: { color: Colors.gold },
  hudGreen: { color: Colors.accent },
  hudRed: { color: Colors.danger },
  hudSecondary: { color: Colors.textSecondary },
  hudSmall: { color: Colors.textSecondary, fontSize: 10 },
  tabIcon: { fontSize: 20 },
});
