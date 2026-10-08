import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TaskAlarmHandler from '../src/components/TaskAlarmHandler';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function RootNavigator() {
  const { error, loading, session } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={loading || !session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && Boolean(session) && Boolean(error)}>
        <Stack.Screen name="sync-error" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && Boolean(session) && !error}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TaskAlarmHandler>
          <RootNavigator />
        </TaskAlarmHandler>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
