import { Tabs } from 'expo-router';
import React from 'react';
import { useRouter } from 'expo-router';
import { TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Salir',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2d5a8c',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#f0f4fa',
          borderTopColor: '#e0ecf8',
        },
      }}>
      <Tabs.Screen
        name="incidents"
        options={{
          title: 'Incidentes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="exclamationmark.circle.fill" color={color} />,
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                marginRight: 16,
                padding: 8,
              }}
            >
              <IconSymbol size={24} name="power" color="#2d5a8c" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#f0f4fa',
            borderBottomColor: '#e0ecf8',
            borderBottomWidth: 1,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#1f2937',
          },
        }}
      />
    </Tabs>
  );
}
