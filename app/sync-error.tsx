import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { theme } from '../src/theme/theme';

export default function SyncErrorScreen() {
  const { error, retrySync, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={42} color={theme.colors.danger} />
      <Text style={styles.title}>Could not sync your Duper data</Text>
      <Text style={styles.message}>{error}</Text>
      <TouchableOpacity
        onPress={() => void retrySync().catch((syncError) => console.error('Could not sync user data:', syncError))}
        style={styles.retryButton}
      >
        <Text style={styles.retryText}>Retry sync</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => void signOut().catch((signOutError) => console.error('Could not sign out:', signOutError))}
        style={styles.signOutButton}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '700', marginTop: 16 },
  message: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: theme.colors.primary, borderRadius: 10, marginTop: 20, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
  signOutButton: { marginTop: 16, padding: 8 },
  signOutText: { color: theme.colors.textSecondary, fontWeight: '600' }
});
