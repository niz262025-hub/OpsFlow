import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData } from '@/src/contexts/DataContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button, Input } from '@/src/components/UI';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

export default function CompanySetup() {
  const { theme } = useTheme();
  const router = useRouter();
  const { logout, joinCompanyByCode } = useAuth();
  const { createCompany } = useData();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [ssm, setSsm] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const steps = ['Company', 'Owner', 'Contact'];

  const canNext = () => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return ownerName.trim().length >= 2;
    if (step === 2) return phone.trim().length >= 6;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await createCompany({
        name: name.trim(), ssmNumber: ssm.trim() || undefined, ownerName: ownerName.trim(),
        phone: phone.trim(), email: email.trim() || undefined, address: address.trim() || undefined,
        currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', lowStockThreshold: 10,
      });
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Setup Failed', err?.message || 'Could not create company');
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (inviteCode.trim().length < 4) return Alert.alert('Invalid', 'Enter a valid invite code');
    setSaving(true);
    try {
      await joinCompanyByCode(inviteCode);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Cannot Join', err?.message || 'Invalid or expired invite code');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => logout()} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ width: 30 }} />
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: 20 }]}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 40, fontWeight: '900', color: '#FFF' }}>B</Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.text, textAlign: 'center' }]}>Welcome to BizFlow Pro</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>Let's get you set up in seconds.</Text>
          </View>

          <TouchableOpacity onPress={() => setMode('create')} activeOpacity={0.85} style={[styles.choiceCard, { backgroundColor: theme.colors.primary }]}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="add-business" size={26} color="#FFF" />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>Create a New Business</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>Set up your own company — you become admin</Text>
            </View>
            <MaterialIcons name="chevron-right" size={26} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('join')} activeOpacity={0.85} style={[styles.choiceCard, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="group-add" size={26} color={theme.colors.primary} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Join with an Invite Code</Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>Your admin will provide an 8-character code</Text>
            </View>
            <MaterialIcons name="chevron-right" size={26} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'join') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setMode('choose')} style={styles.logoutBtn}>
              <MaterialIcons name="arrow-back" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={{ width: 30 }} />
            <View style={{ width: 30 }} />
          </View>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="vpn-key" size={34} color={theme.colors.primary} />
              </View>
            </View>
            <Text style={[styles.title, { color: theme.colors.text, textAlign: 'center' }]}>Enter Invite Code</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 24 }]}>Ask your admin for the 8-character code</Text>
            <Input value={inviteCode} onChangeText={(v) => setInviteCode(v.toUpperCase())} placeholder="ABCD1234" icon="vpn-key" autoCapitalize="characters" testID="invite-code-input" />
            <Button title="Join Business" onPress={handleJoin} loading={saving} icon="check" fullWidth size="lg" testID="join-business-button" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setMode('choose')} style={styles.logoutBtn}>
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.stepper}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.stepDot, { backgroundColor: i <= step ? theme.colors.primary : theme.colors.border }]} />
            ))}
          </View>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.stepLabel, { color: theme.colors.primary }]}>Step {step + 1} of {steps.length}</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {step === 0 && 'Tell us about your business'}
            {step === 1 && 'Who owns this business?'}
            {step === 2 && 'How can customers reach you?'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {step === 0 && 'This info appears on your invoices and receipts'}
            {step === 1 && 'The primary contact for this business'}
            {step === 2 && 'Contact details for your business'}
          </Text>

          <Animated.View entering={FadeInRight.duration(300)} key={step} style={{ marginTop: 24 }}>
            {step === 0 && (
              <>
                <Input label="Company Name *" value={name} onChangeText={setName} placeholder="e.g. Kedai Sinar Sdn Bhd" icon="business" testID="setup-company-name-input" />
                <Input label="SSM Registration Number" value={ssm} onChangeText={setSsm} placeholder="Optional (e.g. 202301234567)" icon="badge" testID="setup-ssm-input" />
              </>
            )}
            {step === 1 && (
              <Input label="Owner Full Name *" value={ownerName} onChangeText={setOwnerName} placeholder="e.g. Ahmad bin Abdullah" icon="person" testID="setup-owner-input" />
            )}
            {step === 2 && (
              <>
                <Input label="Phone Number *" value={phone} onChangeText={setPhone} placeholder="e.g. 012-3456789" icon="phone" keyboardType="phone-pad" testID="setup-phone-input" />
                <Input label="Business Email" value={email} onChangeText={setEmail} placeholder="Optional" icon="email" keyboardType="email-address" autoCapitalize="none" testID="setup-email-input" />
                <Input label="Address" value={address} onChangeText={setAddress} placeholder="Full business address" icon="place" multiline testID="setup-address-input" />
                <View style={[styles.infoRow, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons name="info" size={16} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 12, flex: 1, marginLeft: 8 }}>
                    Currency: MYR (Ringgit Malaysia) • Timezone: Asia/Kuala_Lumpur
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          {step > 0 && <Button title="Back" onPress={() => setStep(step - 1)} variant="secondary" icon="arrow-back" />}
          <View style={{ flex: 1 }} />
          {step < steps.length - 1 ? (
            <Button title="Next" onPress={() => canNext() && setStep(step + 1)} disabled={!canNext()} icon="arrow-forward" testID="setup-next-button" />
          ) : (
            <Button title="Finish Setup" onPress={handleFinish} loading={saving} disabled={!canNext()} icon="check" testID="setup-finish-button" />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoutBtn: { padding: 4 },
  stepper: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 32, height: 4, borderRadius: 2 },
  scroll: { padding: 28, paddingTop: 20 },
  stepLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderTopWidth: 1 },
  choiceCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, marginBottom: 14 },
});
