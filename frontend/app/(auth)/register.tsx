import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    companyName?: string;
  }>({});
  const { register } = useAuth();
  const router = useRouter();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; companyName?: string } = {};

    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    } else if (companyName.trim().length < 2) {
      newErrors.companyName = 'Company name too short';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(email.trim(), password, companyName.trim());
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.appName}>BizFlow Lite</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your 14-day free trial today</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Company Name</Text>
            <View style={[styles.inputContainer, errors.companyName && styles.inputError]}>
              <MaterialIcons name="business" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Your Company"
                value={companyName}
                onChangeText={(text) => {
                  setCompanyName(text);
                  if (errors.companyName) setErrors({ ...errors, companyName: undefined });
                }}
                placeholderTextColor={theme.colors.textSecondary}
                testID="register-company-input"
              />
            </View>
            {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <MaterialIcons name="email" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.textSecondary}
                testID="register-email-input"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <MaterialIcons name="lock" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                secureTextEntry={!showPassword}
                placeholderTextColor={theme.colors.textSecondary}
                testID="register-password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Trial Info Card */}
          <View style={styles.trialCard}>
            <MaterialIcons name="card-giftcard" size={24} color={theme.colors.primary} />
            <View style={styles.trialInfo}>
              <Text style={styles.trialTitle}>14-Day Free Trial</Text>
              <Text style={styles.trialSubtitle}>No credit card required</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Create Account</Text>
                <MaterialIcons name="arrow-forward" size={20} color={theme.colors.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
            testID="go-to-login-button"
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  appName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  trialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: 14,
    borderRadius: 14,
    marginVertical: 12,
    gap: 12,
  },
  trialInfo: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  trialSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  loginLinkBold: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
