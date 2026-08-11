import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BizFlowBadge, BizFlowButton, BizFlowSectionCard } from '@/src/components/designSystem';

const features = [
  { title: 'POS', body: 'Fast checkout for retail counters, boutiques, and kiosks.' },
  { title: 'Purchase', body: 'Track orders, suppliers, and restocks in one place.' },
  { title: 'Inventory', body: 'Stay on top of stock movement in real time.' },
  { title: 'Finance', body: 'Monitor cash, bank, and payment activity with clarity.' },
  { title: 'Reports', body: 'See profit, sales, and performance without manual work.' },
  { title: 'Setup', body: 'Onboard quickly with guided setup and simple defaults.' },
];

const benefits = [
  'Real-time stock updates',
  'Purchase tracking',
  'Supplier management',
  'Cash & bank tracking',
  'Profit & Loss reporting',
  'Web and Android access',
  'Cloud synchronization',
  'Fast onboarding',
];

const steps = [
  'Register your business',
  'Set up products and suppliers',
  'Start selling with POS',
  'Track growth with reports',
];

export default function Index() {
  const router = useRouter();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.contentContainer}>
      <View style={styles.navbar}>
        <Text style={styles.brand}>BizFlow</Text>
        <View style={styles.navLinks}>
          <Text style={styles.navLink}>Features</Text>
          <Text style={styles.navLink}>Pricing</Text>
          <Text style={styles.navLink}>How It Works</Text>
          <Text style={styles.navLink}>Contact</Text>
          <BizFlowButton title="Login" variant="secondary" onPress={() => router.push('/login')} />
          <BizFlowButton title="Start Free Trial" onPress={() => router.push('/register')} />
        </View>
      </View>

      <BizFlowSectionCard style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.eyebrow}>All-in-one business operations for Malaysian SMEs</Text>
          <Text style={styles.heroTitle}>Run Your Business Smarter with BizFlow</Text>
          <Text style={styles.heroSubtitle}>
            POS, Purchase, Inventory, Finance & Reports in one cloud-based system built for boutiques, kiosks, and growing small businesses.
          </Text>
          <View style={styles.heroActions}>
            <BizFlowButton title="Start 7-Day Free Trial" onPress={() => router.push('/register')} />
            <BizFlowButton title="View Live Demo" variant="secondary" onPress={() => router.push('/demo')} />
          </View>
          <View style={styles.badgesRow}>
            <BizFlowBadge label="Web & Android" tone="primary" />
            <BizFlowBadge label="Cloud Sync" tone="secondary" />
            <BizFlowBadge label="No Credit Card Required" tone="success" />
          </View>
        </View>
      </BizFlowSectionCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Everything you need to run daily operations</Text>
        <View style={styles.grid}>
          {features.map((item) => (
            <BizFlowSectionCard key={item.title} title={item.title} subtitle={item.body} style={styles.card} />
          ))}
        </View>
      </View>

      <View style={styles.sectionAlt}>
        <Text style={styles.sectionTitle}>Why businesses choose BizFlow</Text>
        <View style={styles.benefitList}>
          {benefits.map((item) => (
            <View key={item} style={styles.benefitItem}>
              <Text style={styles.bullet}>✓</Text>
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simple pricing, built for launch</Text>
        <View style={styles.pricingCard}>
          <Text style={styles.planName}>Basic Plan</Text>
          <Text style={styles.price}>RM49/month</Text>
          <Text style={styles.trialNote}>7-Day Free Trial</Text>
          <Text style={styles.planFeatures}>• 1 business account</Text>
          <Text style={styles.planFeatures}>• 1 user</Text>
          <Text style={styles.planFeatures}>• Web & Android included</Text>
          <Text style={styles.planFeatures}>• POS, Purchase, Inventory, Finance, Reports, Setup</Text>
          <Text style={styles.planFeatures}>• PDF export</Text>
          <Text style={styles.foundingOffer}>Founding Customer Offer: first 100 customers get RM39/month for life</Text>
          <BizFlowButton title="Start 7-Day Free Trial" onPress={() => router.push('/register')} />
        </View>
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>Pro & Advance</Text>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      </View>

      <View style={styles.sectionAlt}>
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.stepsRow}>
          {steps.map((step, index) => (
            <View key={step} style={styles.stepCard}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaBanner}>
        <Text style={styles.ctaTitle}>Ready to simplify your business?</Text>
        <Text style={styles.ctaSubtitle}>Start your 7-Day Free Trial today. No credit card required.</Text>
        <BizFlowButton title="Get Started" onPress={() => router.push('/register')} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>BizFlow</Text>
        <View style={styles.footerLinks}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Contact</Text>
          <Text style={styles.footerLink}>WhatsApp Support</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { paddingBottom: 40 },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
  },
  brand: { fontSize: 24, fontWeight: '800', color: '#0F172A', fontFamily: 'Inter' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  navLink: { color: '#334155', fontSize: 14, fontWeight: '600', fontFamily: 'Inter' },
  heroCard: {
    marginHorizontal: 24,
    borderRadius: 28,
    padding: 24,
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 24,
  },
  heroTextWrap: { maxWidth: 680 },
  eyebrow: { fontSize: 13, fontWeight: '700', color: '#2563EB', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Inter' },
  heroTitle: { fontSize: 42, fontWeight: '800', color: '#0F172A', marginBottom: 14, fontFamily: 'Inter' },
  heroSubtitle: { fontSize: 18, color: '#475569', lineHeight: 28, marginBottom: 20, fontFamily: 'Inter' },
  heroActions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  badgesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  section: { maxWidth: 1180, alignSelf: 'center', width: '100%', paddingHorizontal: 24, marginTop: 24 },
  sectionAlt: { maxWidth: 1180, alignSelf: 'center', width: '100%', paddingHorizontal: 24, marginTop: 24, backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 24 },
  sectionTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 16, fontFamily: 'Inter' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flexBasis: '31%', minWidth: 220 },
  benefitList: { gap: 10 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet: { color: '#2563EB', fontSize: 16, fontWeight: '800', fontFamily: 'Inter' },
  benefitText: { color: '#334155', fontSize: 15, fontFamily: 'Inter' },
  pricingCard: { backgroundColor: '#1E3A8A', borderRadius: 24, padding: 24, maxWidth: 480 },
  planName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter' },
  price: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginTop: 8, fontFamily: 'Inter' },
  trialNote: { color: '#BFDBFE', fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 12, fontFamily: 'Inter' },
  planFeatures: { color: '#E2E8F0', fontSize: 14, marginBottom: 6, fontFamily: 'Inter' },
  foundingOffer: { color: '#FEF3C7', fontSize: 14, marginTop: 12, marginBottom: 16, fontFamily: 'Inter' },
  comingSoonCard: { marginTop: 16, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: 320 },
  comingSoonTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter' },
  comingSoonText: { color: '#64748B', fontSize: 14, marginTop: 4, fontFamily: 'Inter' },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stepCard: { flexBasis: '23%', minWidth: 200, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  stepNumber: { fontSize: 28, fontWeight: '800', color: '#2563EB', marginBottom: 8, fontFamily: 'Inter' },
  stepText: { color: '#334155', fontSize: 15, fontFamily: 'Inter' },
  ctaBanner: { maxWidth: 1180, alignSelf: 'center', width: '100%', marginTop: 24, marginHorizontal: 24, backgroundColor: '#2563EB', borderRadius: 24, padding: 24 },
  ctaTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, fontFamily: 'Inter' },
  ctaSubtitle: { fontSize: 16, color: '#DBEAFE', marginBottom: 16, fontFamily: 'Inter' },
  footer: { maxWidth: 1180, alignSelf: 'center', width: '100%', paddingHorizontal: 24, paddingTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  footerBrand: { fontSize: 18, fontWeight: '800', color: '#0F172A', fontFamily: 'Inter' },
  footerLinks: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  footerLink: { color: '#64748B', fontSize: 13, fontFamily: 'Inter' },
});
