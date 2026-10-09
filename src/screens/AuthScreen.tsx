import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';

export default function AuthScreen() {
  const { configured, error, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    setMessage('');
    try {
      if (isSignUp) {
        const signedIn = await signUp(email.trim(), password);
        if (!signedIn) setMessage('Check your email to confirm your account, then sign in.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch {
      // The authentication context exposes the actionable error.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Image
            accessibilityLabel="Duper logo"
            source={require('../../assets/images/duper-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>{configured ? (isSignUp ? 'Create your account' : 'Welcome back') : 'Supabase setup needed'}</Text>
          <Text style={styles.subtitle}>
            {configured
              ? 'Sign in to securely sync your Duper data across devices.'
              : 'Add your Supabase URL and publishable key to a local .env file. See .env.example.'}
          </Text>

          {configured && (
            <>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.input}
                value={email}
              />
              <TextInput
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                style={styles.input}
                value={password}
              />
              {(error || message) ? <Text style={styles.message}>{error || message}</Text> : null}
              <TouchableOpacity
                accessibilityRole="button"
                disabled={loading || !email.trim() || password.length < 6}
                onPress={() => void submit()}
                style={[styles.primaryButton, (loading || !email.trim() || password.length < 6) && styles.disabled]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity disabled={loading} onPress={() => { setIsSignUp(!isSignUp); setMessage(''); }}>
                <Text style={styles.toggleText}>
                  {isSignUp ? 'Already have an account? Sign in' : 'New to Duper? Create an account'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: theme.colors.card, borderRadius: 20, padding: 24, gap: 16, alignItems: 'flex-start' },
  logo: { width: 88, height: 88, borderRadius: 18, backgroundColor: '#05080D' },
  title: { color: theme.colors.text, fontSize: 27, fontWeight: '700' },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  message: { color: '#B42318', fontSize: 13, lineHeight: 19 },
  primaryButton: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 12, padding: 15 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  toggleText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600', paddingVertical: 4, textAlign: 'center' }
});
