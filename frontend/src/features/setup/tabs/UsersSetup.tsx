import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth, Role } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { Badge, Button, Card, DataTable, EmptyState } from '@/src/components/UI';
import { SetupChip } from '@/src/features/setup/components/SetupChip';

export function UsersSetup() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { team, invites, createInvite, deleteInvite, changeMemberRole, removeMember } = useData();

  const [role, setRole] = useState<Role>('cashier');
  const pending = invites.filter((i) => !i.used);

  const generateInvite = async () => {
    const code = await createInvite(role);
    Alert.alert('Invite code generated', code);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Create User Invite</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <SetupChip label="Admin" active={role === 'admin'} onPress={() => setRole('admin')} />
          <SetupChip label="Manager" active={role === 'manager'} onPress={() => setRole('manager')} />
          <SetupChip label="Cashier" active={role === 'cashier'} onPress={() => setRole('cashier')} />
        </View>
        <Button title="Generate Invite Code" onPress={generateInvite} icon="add" fullWidth testID="create-invite-button" />
      </Card>

      {pending.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Pending Invites</Text>
          {pending.map((inv) => (
            <View key={inv.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.text, letterSpacing: 1 }}>{inv.code}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>{inv.role.toUpperCase()}</Text>
              </View>
              <Button title="Delete" variant="danger" size="sm" onPress={() => deleteInvite(inv.id)} />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Users</Text>
        {team.length === 0 ? (
          <EmptyState icon="groups" title="No users" subtitle="Add users with invite code" />
        ) : (
          <DataTable
            rows={team.map((member) => ({ ...member, id: member.uid }))}
            exportFileName="setup-users"
            columns={[
              {
                key: 'user',
                title: 'User',
                sortValue: (row) => row.displayName || row.email,
                render: (row) => (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{row.displayName || row.email}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>{row.email}</Text>
                  </View>
                ),
              },
              {
                key: 'role',
                title: 'Role',
                width: 120,
                sortValue: (row) => row.role,
                render: (row) => <Badge label={row.role.toUpperCase()} tone="primary" />,
              },
              {
                key: 'actions',
                title: 'Actions',
                width: 220,
                render: (row) => {
                  const self = row.uid === profile?.uid;
                  if (self) return <Badge label="YOU" tone="success" />;
                  return (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button title="Admin" size="sm" variant="secondary" onPress={() => changeMemberRole(row.uid, 'admin')} />
                      <Button title="Manager" size="sm" variant="secondary" onPress={() => changeMemberRole(row.uid, 'manager')} />
                      <Button title="Cashier" size="sm" variant="secondary" onPress={() => changeMemberRole(row.uid, 'cashier')} />
                      <Button title="Remove" size="sm" variant="danger" onPress={() => removeMember(row.uid)} />
                    </View>
                  );
                },
              },
            ]}
          />
        )}
      </Card>
    </ScrollView>
  );
}
