import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform, Easing } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { Colors } from '../constants/colors';

interface StoryScene {
  chapter: string;
  emoji: string;
  lines: string[];
}

const STORY: StoryScene[] = [
  {
    chapter: 'I. BÖLÜM — Beşli',
    emoji: '⚽',
    lines: [
      'On yıl boyunca sahalarda koştun.',
      'Sırtında 5 numaralı formayla. Herkes sana "Beşli" derdi.',
      'Tribünler sana uğuldayordu: "Beşli! Beşli!"',
    ],
  },
  {
    chapter: 'II. BÖLÜM — O Maç',
    emoji: '🩹',
    lines: [
      'Kupa finaliydi. 89. dakika.',
      'Kaydın... ve dizin pes etti.',
      'Sahayı sedyeyle terk ederken tribün ayaktaydı.',
      'Onlar alkışlıyordu. Sen ağlıyordun.',
    ],
  },
  {
    chapter: 'III. BÖLÜM — Nokta',
    emoji: '🏥',
    lines: [
      'Doktor tek cümle kurdu:',
      '"Artık oynayamazsın."',
      'Telefonlar sustu. Kontratlar yırtıldı.',
      'Futbol bitti. Hayat bitmemişti... henüz.',
    ],
  },
  {
    chapter: 'IV. BÖLÜM — Kıvılcım',
    emoji: '💡',
    lines: [
      'Bir akşam pencereden dışarı baktın.',
      'Mahallede çocuklar ceketle kale çizmiş, karlı zeminde oynuyordu.',
      'O an anladın: sahalarla bağın hiç kopmamıştı.',
    ],
  },
  {
    chapter: 'V. BÖLÜM — Beşli Sahası',
    emoji: '🔑',
    lines: [
      'Biriktirdiğin her kuruşu topladın.',
      'İstanbul\'da küçük ama mütevazı bir halısaha kiraladın.',
      'Kapıya tabela astın: "Beşli Sahası".',
    ],
  },
  {
    chapter: 'SON — Asıl Maç',
    emoji: '👑',
    lines: [
      'Amaç sadece kira ödemek değil.',
      'Bu şehrin en iyi sahasını kuracaksın. Turnuvalar kazanacaksın.',
      'Şehir şehir ilerleyip Halısaha Kralı olacaksın.',
      'İşte şimdi asıl maç başlıyor.',
    ],
  },
];

const TYPE_SPEED = 30;

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.Text style={[styles.cursor, { opacity }]}>█</Animated.Text>;
}

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { initNewGame } = useGame();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [sceneDone, setSceneDone] = useState(false);
  const charIndex = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const sceneFade = useRef(new Animated.Value(1)).current;
  const sceneSlide = useRef(new Animated.Value(0)).current;
  const emojiFloat = useRef(new Animated.Value(0)).current;

  const scene = STORY[sceneIndex]!;
  const isLastScene = sceneIndex === STORY.length - 1;
  const fullText = scene.lines.join('\n');
  const showButton = sceneDone && isLastScene;

  useEffect(() => {
    const tick = () => {
      if (charIndex.current < fullText.length) {
        charIndex.current++;
        setDisplayedText(fullText.slice(0, charIndex.current));
        timerRef.current = setTimeout(tick, TYPE_SPEED);
      } else {
        setSceneDone(true);
      }
    };
    timerRef.current = setTimeout(tick, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sceneIndex, fullText]);

  // Emoji süzülmesi
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(emojiFloat, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(emojiFloat, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [emojiFloat]);

  // Düğme nabzı
  useEffect(() => {
    if (!showButton) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [showButton, buttonScale]);

  useEffect(() => {
    if (showButton) {
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [showButton, buttonOpacity]);

  const advance = () => {
    if (!sceneDone) {
      if (timerRef.current) clearTimeout(timerRef.current);
      charIndex.current = fullText.length;
      setDisplayedText(fullText);
      setSceneDone(true);
      return;
    }
    if (!isLastScene) {
      sceneFade.setValue(0);
      sceneSlide.setValue(24);
      Animated.parallel([
        Animated.timing(sceneFade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(sceneSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
      charIndex.current = 0;
      setDisplayedText('');
      setSceneDone(false);
      setSceneIndex(sceneIndex + 1);
    }
  };

  const skipAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const last = STORY.length - 1;
    charIndex.current = STORY[last]!.lines.join('\n').length;
    setSceneIndex(last);
    setDisplayedText(STORY[last]!.lines.join('\n'));
    setSceneDone(true);
  };

  const startGame = async () => {
    await initNewGame();
    router.replace('/tabs/saha');
  };

  const fontFamily = Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', web: 'SpaceMono, monospace' });
  const emojiTranslateY = emojiFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        <Text style={[styles.chapterTag, { fontFamily }]}>{scene.chapter}</Text>
        {!isLastScene ? (
          <Pressable onPress={skipAll} hitSlop={12} accessibilityLabel="Hikayeyi atla" accessibilityRole="button">
            <Text style={[styles.skipText, { fontFamily }]}>Atla ▸</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable style={styles.storyArea} onPress={advance}>
        <Animated.View style={[styles.sceneBox, { opacity: sceneFade, transform: [{ translateY: sceneSlide }] }]}>
          <Animated.Text style={[styles.sceneEmoji, { transform: [{ translateY: emojiTranslateY }] }]}>
            {scene.emoji}
          </Animated.Text>
          <View style={styles.storyCard}>
            <Text style={[styles.storyText, { fontFamily }]}>
              {displayedText}
              {!sceneDone ? <BlinkingCursor /> : null}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.dots}>
          {STORY.map((_, i) => (
            <View key={i} style={[styles.dot, i === sceneIndex && styles.dotActive, i < sceneIndex && styles.dotPast]} />
          ))}
        </View>

        {sceneDone && !isLastScene ? (
          <Text style={[styles.hintText, { fontFamily }]}>devam etmek için dokun ▸</Text>
        ) : null}
      </Pressable>

      <Animated.View
        style={[styles.buttonArea, { opacity: buttonOpacity, transform: [{ scale: buttonScale }] }]}
        pointerEvents={showButton ? 'auto' : 'none'}
      >
        <Pressable
          style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
          onPress={startGame}
          accessibilityLabel="Oyuna Başla"
          accessibilityRole="button"
        >
          <Text style={[styles.startButtonText, { fontFamily }]}>⚽ Oyuna Başla</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, minHeight: 32 },
  chapterTag: { color: Colors.accent, fontSize: 12, fontWeight: 'bold' },
  skipText: { color: Colors.textSecondary, fontSize: 12 },
  storyArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  sceneBox: { alignItems: 'center', width: '100%' },
  sceneEmoji: { fontSize: 56, marginBottom: 20 },
  storyCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 2, padding: 24, width: '100%', maxWidth: 400, minHeight: 170 },
  storyText: { color: Colors.textPrimary, fontSize: 14, lineHeight: 25 },
  cursor: { color: Colors.accent, fontSize: 14 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.accent, width: 18 },
  dotPast: { backgroundColor: Colors.primary },
  hintText: { color: Colors.textSecondary, fontSize: 12, marginTop: 16 },
  buttonArea: { width: '100%', maxWidth: 400, alignSelf: 'center', paddingHorizontal: 24 },
  startButton: { backgroundColor: Colors.accent, borderWidth: 1, borderColor: Colors.primary, borderRadius: 2, paddingVertical: 16, width: '100%', alignItems: 'center' },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  startButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
});
