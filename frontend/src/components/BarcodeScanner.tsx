import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Button } from '@/src/components/UI';

/**
 * Barcode scanner modal for BizFlow Pro.
 *
 * Wraps expo-camera's CameraView (v17). Handles permissions with a friendly
 * pre-permission explanation, native prompt, and denied/blocked recovery
 * with a link to system settings.
 *
 * Web: expo-camera renders a warning saying it's not supported — we detect
 * that and gracefully fall back to a manual entry prompt so the app works
 * cross-platform.
 */
export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  title = 'Scan Barcode',
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  title?: string;
}) {
  const { theme } = useTheme();
  const [handled, setHandled] = useState(false);
  const [torch, setTorch] = useState(false);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (visible) setHandled(false);
  }, [visible]);

  if (!visible) return null;

  // ---- Web fallback: manual entry (expo-camera doesn't support web) ----
  if (isWeb) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.colors.background, padding: 20, borderRadius: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MaterialIcons name="qr-code-scanner" size={28} color={theme.colors.primary} />
              <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: '800', color: theme.colors.text }}>{title}</Text>
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
              Camera scanning is only available on iOS and Android. On the web preview, type the barcode manually below.
            </Text>
            <ManualEntry onDone={(code) => { setHandled(true); onScanned(code); onClose(); }} onCancel={onClose} />
          </View>
        </View>
      </Modal>
    );
  }

  return <NativeScanner visible={visible} onClose={onClose} onScanned={(c) => { if (handled) return; setHandled(true); onScanned(c); }} title={title} torch={torch} setTorch={setTorch} />;
}

function ManualEntry({ onDone, onCancel }: { onDone: (v: string) => void; onCancel: () => void }) {
  const { theme } = useTheme();
  const { TextInput } = require('react-native');
  const [v, setV] = useState('');
  return (
    <>
      <TextInput
        value={v}
        onChangeText={setV}
        placeholder="Barcode / SKU"
        placeholderTextColor={theme.colors.textMuted}
        autoFocus
        style={{
          borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, padding: 12,
          color: theme.colors.text, fontSize: 15, marginBottom: 12,
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Cancel" variant="secondary" fullWidth onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><Button title="Use Barcode" fullWidth onPress={() => v.trim() && onDone(v.trim())} disabled={!v.trim()} /></View>
      </View>
    </>
  );
}

function NativeScanner({ visible, onClose, onScanned, title, torch, setTorch }: { visible: boolean; onClose: () => void; onScanned: (c: string) => void; title: string; torch: boolean; setTorch: (v: boolean) => void }) {
  const { theme } = useTheme();
  // Lazy-require expo-camera so web bundle doesn't try to include native code.
  const { CameraView, useCameraPermissions } = require('expo-camera');
  const [permission, requestPermission] = useCameraPermissions();

  const openSettings = () => {
    const { Linking } = require('react-native');
    Linking.openSettings().catch(() => Alert.alert('Cannot open settings'));
  };

  if (!permission) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.center}><Text style={{ color: '#FFF' }}>Loading camera…</Text></View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.colors.background, padding: 24, borderRadius: 20 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <MaterialIcons name="qr-code-scanner" size={36} color={theme.colors.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 8 }}>Camera Access Needed</Text>
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              BizFlow Pro uses the camera to quickly scan product barcodes at checkout and in inventory.
            </Text>
            {permission.canAskAgain ? (
              <Button
                title="Allow Camera Access"
                fullWidth size="lg" icon="videocam"
                onPress={async () => { const r = await requestPermission(); if (!r.granted && !r.canAskAgain) Alert.alert('Permission blocked', 'Please enable camera in Settings.'); }}
              />
            ) : (
              <Button title="Open Settings" fullWidth size="lg" icon="settings" onPress={openSettings} />
            )}
            <Button title="Cancel" variant="ghost" fullWidth onPress={onClose} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onBarcodeScanned={(res: any) => res?.data && onScanned(String(res.data))}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'itf14', 'pdf417'],
          }}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <MaterialIcons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>{title}</Text>
            <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
              <MaterialIcons name={torch ? 'flash-on' : 'flash-off'} size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
          {/* Reticle */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={styles.reticle}>
              <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 }]} />
              <View style={[styles.corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 }]} />
            </View>
            <Text style={{ color: '#FFF', marginTop: 20, fontSize: 14, opacity: 0.85 }}>Align a barcode in the frame</Text>
          </View>
          {/* Bottom actions */}
          <View style={styles.bottomBar}>
            <Button title="Enter Manually" variant="ghost" icon="keyboard" onPress={() => {
              const { Alert } = require('react-native');
              // fallback: close and let caller retry via manual — simplest approach: open Alert prompt on iOS
              Alert.prompt?.('Enter Barcode', 'Type the barcode manually', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: (v: string) => v && onScanned(v.trim()) },
              ]) || onClose();
            }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 24, paddingBottom: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 260, height: 260, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#2563EB' },
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, alignItems: 'center' },
});
