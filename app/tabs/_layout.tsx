import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RENK, FONT } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          height: 68,
          backgroundColor: RENK.panel,
          borderTopWidth: 1,
          borderTopColor: RENK.cizgi,
          paddingTop: 5,
          paddingBottom: 6,
        },

        tabBarActiveTintColor: RENK.vurgu,
        tabBarInactiveTintColor: '#CBD5E1',

        tabBarLabelStyle: {
          fontFamily: FONT.govde,
          fontSize: 10,
          fontWeight: '400',
          marginTop: 1,
        },

        tabBarItemStyle: {
          paddingVertical: 0,
        },

        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="saha"
        options={{
          title: 'Saha',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="isletme"
        options={{
          title: 'İşletme',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="rezervasyonlar"
        options={{
          title: 'Rezervasyon',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="yasam"
        options={{
          title: 'Yaşam',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="lig"
        options={{
          title: 'Lig',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'trophy' : 'trophy-outline'}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={23}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
