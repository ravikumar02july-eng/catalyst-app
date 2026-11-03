import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../auth/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (!configured) {
      Alert.alert('Backend setup needed', 'Add your Supabase URL and anon key to .env, then restart Expo. See README for steps.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signUp') {
        const result = await signUp(normalizedEmail, password);
        if (result.needsEmailConfirmation) {
          Alert.alert('Check your email', 'Confirm your email address, then sign in.');
          setMode('signIn');
        }
      } else {
        await signIn(normalizedEmail, password);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Try again.';
      Alert.alert(mode === 'signIn' ? 'Sign in failed' : 'Sign up failed', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Catalyst</Text>
      <Text style={styles.subtitle}>Market signals, made clear.</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!busy}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
          editable={!busy}
        />
        <TouchableOpacity style={[styles.submitButton, busy && styles.disabled]} onPress={handleSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#02130F" /> : <Text style={styles.submitText}>{mode === 'signIn' ? 'Sign In' : 'Create Account'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          disabled={busy}
        >
          <Text style={styles.switchText}>
            {mode === 'signIn' ? "New to Catalyst? Create account" : 'Already registered? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
      {!configured && <Text style={styles.setupHint}>Connect Supabase to enable account sign-in.</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: colors.text, fontSize: 42, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  formCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20 },
  formTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { color: colors.text, fontSize: 13, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  submitButton: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.65 },
  submitText: { color: '#02130F', fontWeight: '800', fontSize: 16 },
  switchButton: { alignItems: 'center', paddingTop: 18 },
  switchText: { color: colors.blue, fontWeight: '600', fontSize: 13 },
  setupHint: { color: colors.muted, textAlign: 'center', marginTop: 16, fontSize: 12 },
});
