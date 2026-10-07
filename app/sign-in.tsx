import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthScreen from '../src/screens/AuthScreen';
import { useAuth } from '../src/context/AuthContext';
import { theme } from '../src/theme/theme';

export default function SignInScreen() {
  const { loading } = useAuth();
  if (!loading) return <AuthScreen />;

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background
  }
});
