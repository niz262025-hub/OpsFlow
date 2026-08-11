import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useData } from '@/src/contexts/DataContext';
import { useAuth, Role } from '@/src/contexts/AuthContext';
import { usePermissions, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/src/hooks/usePermissions';
import { AppModal, Badge, Button, Card, DataTable, EmptyState, Header, Screen } from '@/src/components/UI';

export default function TeamPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const { team, invites, createInvite, deleteInvite, changeMemberRole, removeMember, company } = useData();
  const perms = usePermissions();
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<Role>('cashier');
  const [changeModal, setChangeModal] = useState<{ uid: string; email: string; role: Role } | null>(null);
  const pendingInvites = invites.filter((i) => !i.used);
  const teamRows = team.map((member) => ({ ...member, id: member.uid }));

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
          {pendingInvites.length > 0 && (
            <>
              <Text style={styles.section}>Pending Invites ({pendingInvites.length})</Text>
              <DataTable<(typeof pendingInvites)[number]>
                rows={pendingInvites}
                exportFileName="pending-invites"
                columns={[
                  {
                    key: 'code',
                    title: 'Invite Code',
                    sortValue: (row) => row.code,
                    render: (row) => <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.text, letterSpacing: 1.4 }}>{row.code}</Text>,
                  },
                  {
                    key: 'role',
                    title: 'Role',
                    sortValue: (row) => row.role,
                    width: 160,
                    render: (row) => <Badge label={ROLE_LABELS[row.role].toUpperCase()} tone="primary" />,
                  },
                  {
                    key: 'actions',
                    title: 'Actions',
                    width: 140,
                    render: (row) => (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(row.code); Alert.alert('Copied', 'Invite code copied'); }}>
                          <MaterialIcons name="content-copy" size={18} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('Delete Invite?', 'This code will no longer be valid', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteInvite(row.id) }])}>
                          <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    ),
                  },
                ]}
              />
            </>
          )}

          {/* Active members */}
          <Text style={styles.section}>Team Members ({team.length})</Text>
          {team.length === 0 ? (
            <EmptyState icon="people" title="No team members" subtitle="Generate an invite code above to add users" />
          ) : (
            <DataTable<(typeof teamRows)[number]>
              rows={teamRows}
              exportFileName="team-members"
              columns={[
                {
                  key: 'name',
                  title: 'User',
                  sortValue: (row) => row.displayName || row.email,
                  render: (row) => (
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{row.displayName || 'User'}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>{row.email}</Text>
                    </View>
                  ),
                },
                {
                  key: 'role',
                  title: 'Role',
                  sortValue: (row) => row.role,
                  width: 140,
                  render: (row) => <Badge label={ROLE_LABELS[row.role].toUpperCase()} tone={row.role === 'admin' ? 'primary' : row.role === 'manager' ? 'success' : 'default'} />,
                },
                {
                  key: 'actions',
                  title: 'Actions',
                  width: 140,
                  render: (row) => {
                    const isMe = row.uid === profile?.uid;
                    if (isMe) return <Badge label="YOU" tone="success" />;
                    return (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => setChangeModal({ uid: row.uid, email: row.email, role: row.role })}><MaterialIcons name="edit" size={18} color={theme.colors.primary} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('Remove Member?', `${row.email} will lose access to ${company?.name}`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeMember(row.uid).catch((e) => Alert.alert('Error', e.message)) },
                        ])}><MaterialIcons name="person-remove" size={18} color={theme.colors.error} /></TouchableOpacity>
                      </View>
                    );
                  },
                },
              ]}
            />
          )}
        </ScrollView>

        <AppModal
          visible={!!changeModal}
          title="Change Role"
          subtitle={changeModal?.email}
          onClose={() => setChangeModal(null)}
          footer={<Button title="Cancel" variant="secondary" fullWidth onPress={() => setChangeModal(null)} />}
        >
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
        </AppModal>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  roleOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
});
