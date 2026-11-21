// Role-based permissions for BizFlow Pro.
// Roles: admin > manager > cashier.
//
// Guidelines:
//  - admin: business administration; subscription billing belongs to MYOPS.
//  - manager: business ops (inventory, purchases, expenses, reports, customers, sales history).
//  - cashier: POS + view current inventory (read only) + view own sales.
//
// Firestore rules should enforce this on the server too.

import { useMemo } from 'react';
import { useAuth, Role } from '@/src/contexts/AuthContext';

export interface Permissions {
  role: Role;
  // Modules
  canPos: boolean;
  canViewInventory: boolean;
  canManageInventory: boolean;   // create/update/delete products, categories, suppliers, stock adjust
  canManagePurchases: boolean;
  canManageExpenses: boolean;
  canManageCustomers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManageCompany: boolean;
  canManageTeam: boolean;
  canManageSubscription: boolean;
  canBackupRestore: boolean;
}

export function usePermissions(): Permissions {
  const { profile } = useAuth();
  const role: Role = (profile?.role as Role) || 'cashier';

  return useMemo<Permissions>(() => {
    const admin = role === 'admin';
    const manager = role === 'manager' || admin;
    return {
      role,
      canPos: true, // all roles can operate POS
      canViewInventory: true,
      canManageInventory: manager,
      canManagePurchases: manager,
      canManageExpenses: manager,
      canManageCustomers: manager,
      canViewReports: manager,
      canExportData: manager,
      canManageCompany: manager,
      canManageTeam: admin,
      canManageSubscription: false, // Managed centrally in MYOPS, never in OpsFlow.
      canBackupRestore: admin,
    };
  }, [role]);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Manage team and all business operations. Subscription billing is managed in MYOPS.',
  manager: 'Manage inventory, purchases, expenses, customers, and view reports',
  cashier: 'Operate POS and process sales only',
};
