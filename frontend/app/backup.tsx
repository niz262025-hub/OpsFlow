import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData } from '@/src/contexts/DataContext';
import { usePermissions } from '@/src/hooks/usePermissions';
import { Button, Card, Header, Screen } from '@/src/components/UI';

export default function BackupPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { company, exportBackup, restoreBackup, products, sales, purchases, expenses, customers, suppliers, categories } = useData();
  const perms = usePermissions();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [lastExport, setLastExport] = useState<{ path: string; count: number } | null>(null);

  if (!perms.canBackupRestore) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Header title="Backup" onBack={() => router.back()} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <MaterialIcons name="lock" size={48} color={theme.colors.textMuted} />
            <Text style={{ marginTop: 12, fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' }}>Only administrators can manage backups</Text>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  const totalRecords = products.length + sales.length + purchases.length + expenses.length + customers.length + suppliers.length + categories.length;

  const handleExport = async () => {
    setBusy('export');
    try {
      const dump = await exportBackup();
      const json = JSON.stringify(dump, null, 2);
      const filename = `bizflow-backup-${(company?.name || 'company').replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        // Browser download
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        setLastExport({ path: filename, count: totalRecords });
      } else {
        const FS: any = await import('expo-file-system/legacy');
        const dir = FS.documentDirectory || FS.cacheDirectory;
        const uri = `${dir}${filename}`;
        await FS.writeAsStringAsync(uri, json, { encoding: FS.EncodingType.UTF8 });
        setLastExport({ path: uri, count: totalRecords });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'BizFlow Backup', UTI: 'public.json' });
        }
      }
      Alert.alert('Backup Exported', `${totalRecords} records exported successfully`);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not create backup');
    } finally { setBusy(null); }
  };

  const handleImport = async () => {
    Alert.alert(
      'Restore Backup',
      'WARNING: This will REPLACE all your existing business data with the backup. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              const DP: any = await import('expo-document-picker').catch(() => null);
              if (!DP?.getDocumentAsync) {
                Alert.alert('Not available', 'File picker is not installed. Please install expo-document-picker or restore via desktop.');
                return;
              }
              const result = await DP.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
              if (result.canceled) return;
              const asset = result.assets?.[0] || result;
              const uri = asset.uri;

              setBusy('import');
              let text: string;
              if (Platform.OS === 'web') {
                const r = await fetch(uri);
                text = await r.text();
              } else {
                const FS: any = await import('expo-file-system/legacy');
                text = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.UTF8 });
              }
              const data = JSON.parse(text);
              if (!data.version) throw new Error('Not a valid BizFlow backup file');
              await restoreBackup(data);
              Alert.alert('Restored', 'Backup restored successfully. All data has been replaced.');
            } catch (e: any) {
              Alert.alert('Restore Failed', e?.message || 'Could not restore backup');
            } finally { setBusy(null); }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Backup & Restore" subtitle="Protect your business data" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Overview */}
          <Card style={{ marginBottom: 12, backgroundColor: theme.colors.primary }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Total Records</Text>
            <Text style={{ color: '#FFF', fontSize: 40, fontWeight: '900', marginTop: 4 }}>{totalRecords}</Text>
            <View style={{ marginTop: 12, gap: 4 }}>
              <RowMini label="Products" value={products.length} />
              <RowMini label="Sales" value={sales.length} />
              <RowMini label="Purchases" value={purchases.length} />
              <RowMini label="Expenses" value={expenses.length} />
              <RowMini label="Customers" value={customers.length} />
              <RowMini label="Suppliers" value={suppliers.length} />
              <RowMini label="Categories" value={categories.length} />
            </View>
          </Card>

          {/* Export */}
          <Text style={styles.section}>Export Backup</Text>
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="cloud-download" size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text }}>Download Backup</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>Saves all your business data as a JSON file</Text>
              </View>
            </View>
            <Button title="Export Backup" onPress={handleExport} loading={busy === 'export'} icon="download" fullWidth testID="export-backup-button" />
            {lastExport && (
              <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: theme.colors.successLight }}>
                <Text style={{ fontSize: 12, color: theme.colors.success, fontWeight: '700' }}>✓ Last export: {lastExport.count} records</Text>
              </View>
            )}
          </Card>

          {/* Restore */}
          <Text style={styles.section}>Restore from Backup</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="restore" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text }}>Restore Backup</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>Replace ALL current data with a backup file</Text>
              </View>
            </View>
            <View style={{ backgroundColor: theme.colors.errorLight, padding: 12, borderRadius: 10, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
              <MaterialIcons name="warning" size={18} color={theme.colors.error} />
              <Text style={{ flex: 1, fontSize: 12, color: theme.colors.error }}>This will DELETE all current products, sales, purchases, expenses, and other records before restoring.</Text>
            </View>
            <Button title="Import Backup File" onPress={handleImport} loading={busy === 'import'} variant="danger" icon="upload" fullWidth testID="import-backup-button" />
          </Card>

          <Text style={{ textAlign: 'center', color: theme.colors.textMuted, fontSize: 11, marginTop: 24 }}>Backups are portable JSON files{'\n'}Store them safely in cloud storage or email</Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function RowMini({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8, paddingHorizontal: 4 },
});
