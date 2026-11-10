import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth-context';
import { COLORS } from '../components/ui';
export default function RootLayout() {
  return <AuthProvider><Stack screenOptions={{headerStyle:{backgroundColor:COLORS.bg},headerTintColor:COLORS.ink,headerShadowVisible:false,contentStyle:{backgroundColor:COLORS.bg}}}>
    <Stack.Screen name="index" options={{title:'Virtual Stylist',headerShown:false}} />
    <Stack.Screen name="auth" options={{title:'Account'}} />
    <Stack.Screen name="onboarding" options={{title:'Your Style'}} />
    <Stack.Screen name="closet" options={{title:'My Closet'}} />
    <Stack.Screen name="add-item" options={{title:'Add Clothing'}} />
    <Stack.Screen name="item-details" options={{title:'Item Details'}} />
    <Stack.Screen name="recommendations" options={{title:'Recommendations'}} />
    <Stack.Screen name="shopping" options={{title:'Shopping'}} />
  </Stack></AuthProvider>;
}
