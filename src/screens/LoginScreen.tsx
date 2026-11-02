import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catalyst</Text>
      <Text style={styles.subtitle}>Trade smarter with live market signals</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          secureTextEntry
        />

        <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signInText: {
    color: '#02130F',
    fontWeight: '800',
    fontSize: 16,
  },
});
