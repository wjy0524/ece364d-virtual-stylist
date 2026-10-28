import React from 'react';
import { Stack, ThemeProvider, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="onboarding"
          options={{
            title: 'Your Style',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />

        <Stack.Screen
          name="explore"
          options={{
            title: 'Explore',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}