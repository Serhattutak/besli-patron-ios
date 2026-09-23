import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { hasSavedGame } from '../services/storage';
import { Colors } from '../constants/colors';
import { useGame } from '../context/GameContext';

export default function Index() {
  const { state, loading } = useGame();
  const [checkDone, setCheckDone] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (state?.isGameStarted) {
        setHasSave(true);
      }
      setCheckDone(true);
    }
  }, [loading, state]);

  if (!checkDone) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (hasSave && state?.isGameOver) {
    return <Redirect href="/gameover" />;
  }

  if (hasSave) {
    return <Redirect href="/tabs/saha" />;
  }

  return <Redirect href="/intro" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
