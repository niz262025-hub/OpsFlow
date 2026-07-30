import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, StyleSheet, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData } from '@/src/contexts/DataContext';
import { useAuth, Role } from '@/src/contexts/AuthContext';
import { usePermissions, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/src/hooks/usePermissions';
import { Badge, Button, Card, EmptyState, Header, Screen } from '@/src/components/UI';

export default function TeamPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const { team, invites, createInvite, deleteInvite, changeMemberRole, removeMember, company } = useData();
  const perms = usePermissions();
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<Role>('cashier');
  const [changeModal, setChangeModal] = useState<{ uid: string; email: string; role: Role } | null>(null);

  if (!perms.canManageTeam) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Header title="Team" onBack={() => router.back()} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <MaterialIcons name="lock" size={48} color={theme.colors.textMuted} />
            <Text style={{ marginTop: 12, fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' }}>Only administrators can manage team members</Text>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const code = await createInvite(newRole);
      Alert.alert('Invite Created', `Share this 8-character code with your team member:\n\n${code}`, [
        { text: 'Copy', onPress: async () => { await Clipboard.setStringAsync(code); } },
        {
          text: 'Share',
          onPress: async () => {
            const msg = `You're invited to join ${company?.name || 'our team'} on BizFlow Pro.\n\nInvite Code: ${code}\nRole: ${ROLE_LABELS[newRole]}\n\n1. Download BizFlow Pro\n2. Create an account\n3. Enter this code when prompted`;
            if (Platform.OS === 'web') { await Clipboard.setStringAsync(msg); Alert.alert('Copied', 'Invite message copied'); }
            else await Share.share({ message: msg });
          },
        },
        { text: 'OK', style: 'default' },
      ]);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed to create invite'); }
    finally { setCreating(false); }
  };

  const roleOptions: Role[] = ['admin', 'manager', 'cashier'];

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header title="Team" subtitle={`${team.length} member${team.length !== 1 ? 's' : ''}`} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Create invite section */}
          <Text style={styles.section}>Invite New Member</Text>
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Choose Role</Text>
            {roleOptions.map((r) => (
              <TouchableOpacity key={r} onPress={() => setNewRole(r)} style={[styles.roleOption, { borderColor: newRole === r ? theme.colors.primary : theme.colors.border, backgroundColor: newRole === r ? theme.colors.primaryLight : 'transparent' }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{ROLE_LABELS[r]}</Text>
                    {r === 'admin' && <Badge label="FULL ACCESS" tone="primary" />}
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{ROLE_DESCRIPTIONS[r]}</Text>
                </View>
                <MaterialIcons name={newRole === r ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={newRole === r ? theme.colors.primary : theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
            <Button title="Generate Invite Code" onPress={handleCreate} loading={creating} icon="add" fullWidth style={{ marginTop: 12 }} testID="create-invite-button" />
          </Card>

          {/* Pending invites */}
          {invites.filter((i) => !i.used).length > 0 && (
            <>
              <Text style={styles.section}>Pending Invites ({invites.filter((i) => !i.used).length})</Text>
              <Card style={{ marginBottom: 16 }}>
                {invites.filter((i) => !i.used).map((inv, idx, arr) => (
                  <View key={inv.id} style={[styles.row, { borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }]}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="vpn-key" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text, letterSpacing: 2 }}>{inv.code}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>Role: {ROLE_LABELS[inv.role]}</Text>
                    </View>
                    <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(inv.code); Alert.alert('Copied', 'Invite code copied'); }} style={{ padding: 6 }}>
                      <MaterialIcons name="content-copy" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert('Delete Invite?', 'This code will no longer be valid', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteInvite(inv.id) }])} style={{ padding: 6 }}>
                      <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Active members */}
          <Text style={styles.section}>Team Members ({team.length})</Text>
          {team.length === 0 ? (
            <EmptyState icon="people" title="No team members" subtitle="Generate an invite code above to add users" />
          ) : team.map((m) => {
            const isMe = m.uid === profile?.uid;
            return (
              <Card key={m.uid} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18 }}>{(m.displayName || m.email || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>{m.displayName || 'User'}</Text>
                      {isMe && <Badge label="YOU" tone="success" />}
                    </View>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{m.email}</Text>
                    <View style={{ marginTop: 6 }}><Badge label={ROLE_LABELS[m.role].toUpperCase()} tone={m.role === 'admin' ? 'primary' : m.role === 'manager' ? 'success' : 'default'} /></View>
                  </View>
                  {!isMe && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => setChangeModal({ uid: m.uid, email: m.email, role: m.role })} style={{ padding: 6 }}>
                        <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => Alert.alert('Remove Member?', `${m.email} will lose access to ${company?.name}`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeMember(m.uid).catch((e) => Alert.alert('Error', e.message)) },
                      ])} style={{ padding: 6 }}>
                        <MaterialIcons name="person-remove" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </ScrollView>

        <Modal visible={!!changeModal} transparent animationType="fade" onRequestClose={() => setChangeModal(null)}>
          <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 24 }}>
            <Card style={{ padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 4 }}>Change Role</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 }}>{changeModal?.email}</Text>
              {roleOptions.map((r) => (
                <TouchableOpacity key={r} onPress={async () => {
                  try {
                    if (changeModal) await changeMemberRole(changeModal.uid, r);
                    setChangeModal(null);
                  } catch (e: any) { Alert.alert('Error', e?.message); }
                }} style={[styles.roleOption, { borderColor: changeModal?.role === r ? theme.colors.primary : theme.colors.border, backgroundColor: changeModal?.role === r ? theme.colors.primaryLight : 'transparent' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{ROLE_LABELS[r]}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{ROLE_DESCRIPTIONS[r]}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <Button title="Cancel" variant="secondary" fullWidth onPress={() => setChangeModal(null)} style={{ marginTop: 8 }} />
            </Card>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  roleOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
});
