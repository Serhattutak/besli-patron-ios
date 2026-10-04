import { enableScreens } from 'react-native-screens';
enableScreens(false);
import '../utils/hataYakala';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import {
  useFonts,
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../context/GameContext';
import { Colors } from '../constants/colors';
import Ogretici from '../components/Ogretici';
import OyunHUD from '../components/OyunHUD';
import OlayModal from '../components/OlayModal';
import { sesBaslat } from '../services/soundManager';
import { reklamlariBaslat } from '../services/adManager';

SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error: error?.message ?? 'Bilinmeyen hata',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Hata Olustu</Text>
          <Text style={ebStyles.message}>{this.state.error}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  title: {
    fontSize: 22,
    color: Colors.danger,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: SpaceMono_400Regular,
    SpaceMonoBold: SpaceMono_700Bold,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 3000);

    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  // Ses ve reklam sistemini bir kez baslat
  useEffect(() => {
    sesBaslat();
    reklamlariBaslat();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GameProvider>
          <StatusBar style="light" />

          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            {/* HUD en ustte yer kaplar - tum sekmeler otomatik altindan baslar */}
            <OyunHUD />

            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: Colors.background,
                },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="intro" />
              <Stack.Screen name="tabs" />
              <Stack.Screen name="gameover" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </View>

          <OlayModal />
          <Ogretici />
        </GameProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}