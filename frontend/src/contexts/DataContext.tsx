import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/src/firebase/config';
import { useAuth } from './AuthContext';

// ---------- Types ----------
export interface Company {
  id: string;
  ownerUid?: string;
  name: string;
  ssmNumber?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  receiptLogoUrl?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptShowTaxNumber?: boolean;
  receiptShowCashier?: boolean;
  receiptShowCustomer?: boolean;
  currency: string;
  timezone: string;
  taxRate?: number;
  taxLabel?: string;
  taxRegistrationNumber?: string;
  unitOptions?: string[];
  paymentMethods?: string[];
  barcodePrefix?: string;
  barcodeDigits?: number;
  barcodeAutoGenerate?: boolean;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  costPrice: number;
  avgCost?: number;
  lastPurchaseCost?: number;
  sellingPrice: number;
  stock: number;
  reservedStock?: number;
  minStock: number;
  unit: string;
  status: 'active' | 'archived';
  imageUrl?: string;
  createdAt?: any;
}

export interface Category { id: string; companyId: string; name: string; description?: string; }
export interface Supplier { id: string; companyId: string; name: string; pic?: string; phone?: string; email?: string; address?: string; }
export interface Customer { id: string; companyId: string; name: string; phone?: string; email?: string; address?: string; membership?: 'regular' | 'silver' | 'gold'; }
export interface SaleItem { productId: string; productName: string; sku: string; quantity: number; unitPrice: number; costPrice: number; total: number; }
export type SalePaymentMethod = 'Cash' | 'QR' | 'Bank Transfer' | 'Transfer';
export interface Sale {
  id: string; companyId: string; saleNumber: string; customerId?: string; customerName?: string;
  items: SaleItem[]; subtotal: number; discount: number; tax: number; total: number;
  paymentMethod: SalePaymentMethod;
  paymentReference?: string;
  cashier?: string; cashierId?: string; createdAt?: any;
}
export interface PurchaseItem { productId: string; productName: string; sku: string; quantity: number; costPrice: number; total: number; }
export interface Purchase {
  id: string; companyId: string; purchaseNumber: string; supplierId?: string; supplierName?: string;
  items: PurchaseItem[]; subtotal: number; discount: number; tax: number; total: number;
  createdAt?: any;
}
export interface PurchaseOrderItem {
  productId: string; productName: string; sku: string; quantity: number; unitCost: number; total: number; receivedQuantity: number;
}
export interface PurchaseOrder {
  id: string; companyId: string; orderNumber: string; supplierId?: string; supplierName?: string;
  status: 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Closed';
  expectedDeliveryDate?: string; items: PurchaseOrderItem[]; subtotal: number; tax: number; total: number;
  notes?: string; createdAt?: any;
}
export interface GoodsReceiptItem {
  productId: string; productName: string; sku: string; orderedQuantity: number; receivedQuantity: number; unitCost: number; total: number;
}
export interface GoodsReceipt {
  id: string; companyId: string; receiptNumber: string; purchaseOrderId?: string; supplierId?: string; supplierName?: string;
  supplierInvoiceNumber?: string; deliveryOrderNumber?: string; items: GoodsReceiptItem[]; totalAmount: number; notes?: string; createdAt?: any;
}
export interface SupplierInvoiceItem {
  productId?: string; productName?: string; sku?: string; quantity?: number; unitCost?: number; total?: number;
}
export interface SupplierInvoice {
  id: string; companyId: string; invoiceNumber: string; purchaseOrderId?: string; goodsReceiptId?: string; supplierId?: string; supplierName?: string;
  invoiceDate?: any; dueDate?: any; subtotal: number; tax: number; total: number; outstandingBalance: number; status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue'; items: SupplierInvoiceItem[]; notes?: string; createdAt?: any;
}
export interface PaymentTransaction {
  id: string; companyId: string; invoiceId: string; amount: number; paymentMethod: 'cash' | 'bank'; bankAccountId?: string; reference?: string; notes?: string; createdAt?: any;
}
export interface Expense {
  id: string;
  companyId: string;
  category: string;
  amount: number;
  description?: string;
  paymentSource?: 'cash' | 'bank';
  bankAccountId?: string;
  ledgerCollection?: 'cash_ledger' | 'bank_ledger';
  ledgerEntryId?: string;
  date: any;
  createdAt?: any;
}
export interface CashEntry {
  id: string;
  companyId: string;
  type: 'opening' | 'in' | 'out' | 'transfer_in' | 'transfer_out' | 'expense' | 'capital';
  amount: number;
  reference?: string;
  note?: string;
  date: any;
  createdAt?: any;
}
export interface BankAccount {
  id: string;
  companyId: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  createdAt?: any;
}
export interface BankEntry {
  id: string;
  companyId: string;
  bankAccountId: string;
  type: 'opening' | 'deposit' | 'withdrawal' | 'transfer_to_cash' | 'expense' | 'capital';
  amount: number;
  reference?: string;
  note?: string;
  date: any;
  createdAt?: any;
}
export interface CapitalEntry {
  id: string;
  companyId: string;
  amount: number;
  reference?: string;
  destination: 'cash' | 'bank';
  bankAccountId?: string;
  date: any;
  createdAt?: any;
}
export interface StockMovement {
  id: string; companyId: string; productId: string; productName: string;
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'OPENING';
  quantity: number; stockAfter: number; referenceId?: string; note?: string; createdAt?: any;
}
export interface Invite {
  id: string; companyId: string; code: string; role: 'admin' | 'manager' | 'cashier';
  createdBy: string; used?: boolean; usedBy?: string; createdAt?: any;
}
export interface TeamMember {
  uid: string; email: string; displayName?: string; role: 'admin' | 'manager' | 'cashier'; companyId?: string;
}

// ---------- Context ----------
interface DataCtx {
  company: Company | null;
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  supplierInvoices: SupplierInvoice[];
  payments: PaymentTransaction[];
  expenses: Expense[];
  cashEntries: CashEntry[];
  bankAccounts: BankAccount[];
  bankEntries: BankEntry[];
  capitalEntries: CapitalEntry[];
  stockMovements: StockMovement[];
  loading: boolean;

  // Company
  createCompany: (data: Omit<Company, 'id'>) => Promise<string>;
  updateCompany: (data: Partial<Company>) => Promise<void>;

  // CRUD
  createProduct: (p: Omit<Product, 'id' | 'companyId' | 'createdAt'>) => Promise<string>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  archiveProduct: (id: string) => Promise<void>;

  createCategory: (c: Omit<Category, 'id' | 'companyId'>) => Promise<string>;
  updateCategory: (id: string, c: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  createSupplier: (s: Omit<Supplier, 'id' | 'companyId'>) => Promise<string>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  createCustomer: (c: Omit<Customer, 'id' | 'companyId'>) => Promise<string>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Business ops (atomic)
  createSale: (input: { items: SaleItem[]; customerId?: string; customerName?: string; discount: number; tax: number; paymentMethod: SalePaymentMethod; paymentReference?: string; }) => Promise<Sale>;
  createPurchase: (input: { items: PurchaseItem[]; supplierId?: string; supplierName?: string; discount: number; tax: number; }) => Promise<Purchase>;
  createPurchaseOrder: (input: { supplierId?: string; supplierName?: string; status: 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Closed'; expectedDeliveryDate?: string; notes?: string; items: Array<{ productId: string; productName: string; sku: string; quantity: number; unitCost: number; total: number; }> }) => Promise<PurchaseOrder>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  receiveGoods: (input: { purchaseOrderId: string; supplierInvoiceNumber?: string; deliveryOrderNumber?: string; notes?: string; items: Array<{ productId: string; productName: string; sku: string; orderedQuantity: number; receivedQuantity: number; unitCost: number; total: number; }> }) => Promise<GoodsReceipt>;
  createSupplierInvoice: (input: { purchaseOrderId?: string; goodsReceiptId?: string; supplierId?: string; supplierName?: string; invoiceNumber: string; invoiceDate?: Date; dueDate?: Date; subtotal: number; tax: number; total: number; items?: SupplierInvoiceItem[]; notes?: string; }) => Promise<SupplierInvoice>;
  createPayment: (input: { invoiceId: string; amount: number; paymentMethod: 'cash' | 'bank'; bankAccountId?: string; reference?: string; notes?: string; }) => Promise<PaymentTransaction>;
  adjustStock: (productId: string, newQty: number, note: string) => Promise<void>;

  createExpense: (e: Omit<Expense, 'id' | 'companyId' | 'createdAt'> & { paymentSource?: 'cash' | 'bank'; bankAccountId?: string }) => Promise<string>;
  updateExpense: (id: string, e: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Finance
  createCashEntry: (entry: Omit<CashEntry, 'id' | 'companyId' | 'createdAt'>) => Promise<string>;
  createBankAccount: (account: Omit<BankAccount, 'id' | 'companyId' | 'createdAt'>) => Promise<string>;
  createBankEntry: (entry: Omit<BankEntry, 'id' | 'companyId' | 'createdAt'>) => Promise<string>;
  transferBankToCash: (input: { bankAccountId: string; amount: number; reference?: string; note?: string; date?: Date }) => Promise<void>;
  createCapitalEntry: (entry: Omit<CapitalEntry, 'id' | 'companyId' | 'createdAt'>) => Promise<string>;

  // Team & Invites
  invites: Invite[];
  team: TeamMember[];
  createInvite: (role: 'admin' | 'manager' | 'cashier') => Promise<string>;
  deleteInvite: (id: string) => Promise<void>;
  changeMemberRole: (uid: string, role: 'admin' | 'manager' | 'cashier') => Promise<void>;
  removeMember: (uid: string) => Promise<void>;

  // Backup / restore
  exportBackup: () => Promise<any>;
  restoreBackup: (data: any) => Promise<void>;
}

const DataContext = createContext<DataCtx | undefined>(undefined);

function useCollectionListener<T>(collectionName: string, companyId: string | null | undefined, setState: (v: T[]) => void, orderField?: string) {
  useEffect(() => {
    if (!companyId) { setState([]); return; }

    let db: ReturnType<typeof getFirebaseDb> | null = null;
    try {
      db = getFirebaseDb();
    } catch (error) {
      setState([]);
      return;
    }

    const q = query(collection(db, collectionName), where('companyId', '==', companyId));

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
      if (!orderField) {
        setState(rows);
        return;
      }

      const sorted = [...rows].sort((a: any, b: any) => {
        const av = a?.[orderField];
        const bv = b?.[orderField];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;

        const toComparable = (value: any) => {
          if (value instanceof Timestamp) return value.toDate().getTime();
          if (typeof value?.toDate === 'function') return value.toDate().getTime();
          if (value instanceof Date) return value.getTime();
          if (typeof value === 'number') return value;
          if (typeof value === 'string') return value;
          return String(value);
        };

        const avc = toComparable(av);
        const bvc = toComparable(bv);
        if (avc < bvc) return 1;
        if (avc > bvc) return -1;
        return 0;
      });

      setState(sorted);
    }, (error) => {
      setState([]);
    });

    return () => unsub();
  }, [collectionName, companyId, orderField, setState]);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const companyId = profile?.companyId || null;

  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [capitalEntries, setCapitalEntries] = useState<CapitalEntry[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Company doc listener
  useEffect(() => {
    if (!profile?.uid || !companyId) {
      setCompany(null);
      setProducts([]);
      setCategories([]);
      setSuppliers([]);
      setCustomers([]);
      setSales([]);
      setPurchases([]);
      setPurchaseOrders([]);
      setGoodsReceipts([]);
      setSupplierInvoices([]);
      setPayments([]);
      setExpenses([]);
      setCashEntries([]);
      setBankAccounts([]);
      setBankEntries([]);
      setCapitalEntries([]);
      setStockMovements([]);
      setInvites([]);
      setTeam([]);
      setLoading(false);
      return;
    }

    let db: ReturnType<typeof getFirebaseDb> | null = null;
    try {
      db = getFirebaseDb();
    } catch (error) {
      setCompany(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'companies', companyId), (snap) => {
      if (snap.exists()) {
        setCompany({
          id: snap.id,
          ...(snap.data() as any),
        });
      } else {
        setCompany(null);
      }

      setLoading(false);
    }, (error) => {
      setCompany(null);
      setLoading(false);
    });

    return () => unsub();
  }, [companyId, profile?.uid]);

  useCollectionListener<Product>('products', companyId, setProducts, 'createdAt');
  useCollectionListener<Category>('categories', companyId, setCategories);
  useCollectionListener<Supplier>('suppliers', companyId, setSuppliers);
  useCollectionListener<Customer>('customers', companyId, setCustomers);
  useCollectionListener<Sale>('sales', companyId, setSales, 'createdAt');
  useCollectionListener<Purchase>('purchases', companyId, setPurchases, 'createdAt');
  useCollectionListener<PurchaseOrder>('purchase_orders', companyId, setPurchaseOrders, 'createdAt');
  useCollectionListener<GoodsReceipt>('goods_receipts', companyId, setGoodsReceipts, 'createdAt');
  useCollectionListener<SupplierInvoice>('supplier_invoices', companyId, setSupplierInvoices, 'createdAt');
  useCollectionListener<PaymentTransaction>('payments', companyId, setPayments, 'createdAt');
  useCollectionListener<Expense>('expenses', companyId, setExpenses, 'date');
  useCollectionListener<CashEntry>('cash_ledger', companyId, setCashEntries, 'date');
  useCollectionListener<BankAccount>('bank_accounts', companyId, setBankAccounts, 'createdAt');
  useCollectionListener<BankEntry>('bank_ledger', companyId, setBankEntries, 'date');
  useCollectionListener<CapitalEntry>('capital_entries', companyId, setCapitalEntries, 'date');
  useCollectionListener<StockMovement>('stock_movements', companyId, setStockMovements, 'createdAt');

  // Invite listener
  useEffect(() => {
    if (!companyId) { setInvites([]); return; }
    let db: ReturnType<typeof getFirebaseDb> | null = null;
    try {
      db = getFirebaseDb();
    } catch (error) {
      setInvites([]);
      return;
    }

    const q = query(collection(db, 'invite_codes'), where('companyId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list: Invite[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setInvites(list);
    }, () => setInvites([]));
    return () => unsub();
  }, [companyId]);

  // Team members listener
  useEffect(() => {
    if (!companyId) { setTeam([]); return; }
    let db: ReturnType<typeof getFirebaseDb> | null = null;
    try {
      db = getFirebaseDb();
    } catch (error) {
      setTeam([]);
      return;
    }

    const q = query(collection(db, 'users'), where('companyId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list: TeamMember[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...(d.data() as any) }));
      setTeam(list);
    }, () => setTeam([]));
    return () => unsub();
  }, [companyId]);

  // ---------- Company ----------
  const createCompany = async (data: Omit<Company, 'id'>) => {
    const db = getFirebaseDb();
    const ref = await addDoc(collection(db, 'companies'), {
      ...data,
      ownerUid: profile?.uid || null,
      createdAt: serverTimestamp(),
    });
    if (profile?.uid) {
      await setDoc(doc(db, 'users', profile.uid), {
        email: profile.email,
        displayName: profile.displayName || null,
        companyId: ref.id,
        role: profile.role || 'admin',
      }, { merge: true });
      await refreshProfile();
    }
    return ref.id;
  };
  const updateCompany = async (data: Partial<Company>) => {
    if (!companyId) return;
    await updateDoc(doc(getFirebaseDb(), 'companies', companyId), data as any);
  };

  const requireCompany = () => {
    if (!companyId) throw new Error('Company not initialized. Complete setup first.');
    return companyId;
  };

  // ---------- Products ----------
  
  const createProduct = async (
  p: Omit<Product, 'id' | 'companyId' | 'createdAt'>
) => {
  const cId = requireCompany();

  const db = getFirebaseDb();

  const dup = products.find(
    (x) => x.sku.toLowerCase() === p.sku.toLowerCase()
  );

  if (dup) {
    throw new Error(`SKU "${p.sku}" already exists`);
  }

  try {
    const ref = await addDoc(collection(db, "products"), {
      ...p,
      avgCost: p.costPrice || 0,
      lastPurchaseCost: p.costPrice || 0,
      reservedStock: p.reservedStock || 0,
      companyId: cId,
      status: "active",
      createdAt: serverTimestamp(),
    });

    setProducts((prev) => [{
      id: ref.id,
      ...p,
      avgCost: p.costPrice || 0,
      lastPurchaseCost: p.costPrice || 0,
      reservedStock: p.reservedStock || 0,
      companyId: cId,
      status: 'active' as const,
      createdAt: new Date(),
    }, ...prev.filter((item) => item.id !== ref.id)]);

    if (p.stock > 0) {
      await addDoc(collection(db, "stock_movements"), {
        companyId: cId,
        productId: ref.id,
        productName: p.name,
        type: "OPENING",
        quantity: p.stock,
        stockAfter: p.stock,
        createdAt: serverTimestamp(),
      });

    }

    return ref.id;
  } catch (err) {
    throw err;
  }
};
  const updateProduct = async (id: string, p: Partial<Product>) => {
    if (p.sku) {
      const dup = products.find((x) => x.id !== id && x.sku.toLowerCase() === p.sku!.toLowerCase());
      if (dup) throw new Error(`SKU "${p.sku}" already exists`);
    }
    await updateDoc(doc(getFirebaseDb(), 'products', id), p as any);
  };
  const deleteProduct = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'products', id));
  };
  const archiveProduct = async (id: string) => {
    await updateDoc(doc(getFirebaseDb(), 'products', id), { status: 'archived' });
  };

  // ---------- Categories ----------
  const createCategory = async (c: Omit<Category, 'id' | 'companyId'>) => {
    const cId = requireCompany();
    const normalizedName = c.name.trim();
    const duplicate = categories.find((x) => x.name.trim().toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) throw new Error(`Category "${normalizedName}" already exists`);
    const ref = await addDoc(collection(getFirebaseDb(), 'categories'), { ...c, name: normalizedName, companyId: cId, createdAt: serverTimestamp() });
    setCategories((prev) => [{ id: ref.id, companyId: cId, name: normalizedName, description: c.description, createdAt: new Date() } as Category, ...prev.filter((item) => item.id !== ref.id)]);
    return ref.id;
  };
  const updateCategory = async (id: string, c: Partial<Category>) => {
    await updateDoc(doc(getFirebaseDb(), 'categories', id), c as any);
    setCategories((prev) => prev.map((item) => (item.id === id ? { ...item, ...c } : item)));
  };
  const deleteCategory = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'categories', id));
    setCategories((prev) => prev.filter((item) => item.id !== id));
  };

  // ---------- Suppliers ----------
  const createSupplier = async (s: Omit<Supplier, 'id' | 'companyId'>) => {
    const cId = requireCompany();
    const normalizedName = s.name.trim();
    const duplicate = suppliers.find((x) => x.name.trim().toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) throw new Error(`Supplier "${normalizedName}" already exists`);
    const ref = await addDoc(collection(getFirebaseDb(), 'suppliers'), { ...s, name: normalizedName, companyId: cId, createdAt: serverTimestamp() });
    setSuppliers((prev) => [{ id: ref.id, companyId: cId, name: normalizedName, pic: s.pic, phone: s.phone, email: s.email, address: s.address, createdAt: new Date() } as Supplier, ...prev.filter((item) => item.id !== ref.id)]);
    return ref.id;
  };
  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
    await updateDoc(doc(getFirebaseDb(), 'suppliers', id), s as any);
    setSuppliers((prev) => prev.map((item) => (item.id === id ? { ...item, ...s } : item)));
  };
  const deleteSupplier = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'suppliers', id));
    setSuppliers((prev) => prev.filter((item) => item.id !== id));
  };

  // ---------- Customers ----------
  const createCustomer = async (c: Omit<Customer, 'id' | 'companyId'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'customers'), { ...c, companyId: cId });
    setCustomers((prev) => [{ id: ref.id, companyId: cId, ...c } as Customer, ...prev.filter((item) => item.id !== ref.id)]);
    return ref.id;
  };
  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    await updateDoc(doc(getFirebaseDb(), 'customers', id), c as any);
    setCustomers((prev) => prev.map((item) => (item.id === id ? { ...item, ...c } : item)));
  };
  const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'customers', id));
    setCustomers((prev) => prev.filter((item) => item.id !== id));
  };

  // ---------- Sale (atomic tx) ----------
  const createSale = async (input: { items: SaleItem[]; customerId?: string; customerName?: string; discount: number; tax: number; paymentMethod: SalePaymentMethod; paymentReference?: string; }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    if (!input.items.length) throw new Error('Cart is empty');

    const normalizedPaymentMethod = input.paymentMethod === 'QR' ? 'QR' : input.paymentMethod === 'Bank Transfer' || input.paymentMethod === 'Transfer' ? 'Bank Transfer' : 'Cash';
    const subtotal = input.items.reduce((s, i) => s + i.total, 0);
    const total = Math.max(0, subtotal - input.discount + input.tax);
    const saleNumber = `S${Date.now().toString().slice(-8)}`;
    let defaultBankAccountId = bankAccounts[0]?.id || null;

    const saleRef = doc(collection(db, 'sales'));
    const groupedItems = Array.from(input.items.reduce((map, item) => {
      const current = map.get(item.productId);
      if (current) {
        current.quantity += item.quantity;
        current.total += item.total;
      } else {
        map.set(item.productId, { ...item });
      }
      return map;
    }, new Map<string, SaleItem>()).values());

    await runTransaction(db, async (tx) => {
      const productRefs = groupedItems.map((item) => doc(db, 'products', item.productId));
      const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));
      const stockAfterMap: Record<string, number> = {};
      for (let idx = 0; idx < groupedItems.length; idx++) {
        const item = groupedItems[idx];
        const snap = productSnaps[idx];
        if (!snap.exists()) throw new Error(`Product not found: ${item.productName}`);
        const currentStock = (snap.data() as any).stock as number;
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${currentStock}`);
        }
        stockAfterMap[item.productId] = currentStock - item.quantity;
      }

      if (normalizedPaymentMethod !== 'Cash' && !defaultBankAccountId) {
        const fallbackBankRef = doc(collection(db, 'bank_accounts'));
        tx.set(fallbackBankRef, {
          companyId: cId,
          bankName: 'Default Bank',
          accountNumber: 'AUTO-01',
          openingBalance: 0,
          createdAt: serverTimestamp(),
        });
        defaultBankAccountId = fallbackBankRef.id;
      }

      tx.set(saleRef, {
        companyId: cId, saleNumber,
        customerId: input.customerId || null,
        customerName: input.customerName || null,
        items: groupedItems,
        subtotal, discount: input.discount, tax: input.tax, total,
        paymentMethod: normalizedPaymentMethod,
        paymentReference: input.paymentReference?.trim() || null,
        cashierId: profile?.uid || null,
        cashier: profile?.displayName || profile?.email || null,
        createdAt: serverTimestamp(),
      });
      for (const item of groupedItems) {
        const pRef = doc(db, 'products', item.productId);
        tx.update(pRef, { stock: stockAfterMap[item.productId] });
        const mRef = doc(collection(db, 'stock_movements'));
        tx.set(mRef, {
          companyId: cId, productId: item.productId, productName: item.productName,
          type: 'SALE', quantity: item.quantity, stockAfter: stockAfterMap[item.productId],
          referenceId: saleRef.id, createdAt: serverTimestamp(),
        });
      }

      if (normalizedPaymentMethod === 'Cash') {
        const cashRef = doc(collection(db, 'cash_ledger'));
        tx.set(cashRef, {
          companyId: cId,
          type: 'in',
          amount: total,
          reference: saleNumber,
          note: `POS sale via ${normalizedPaymentMethod}`,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else if (defaultBankAccountId) {
        const bankRef = doc(collection(db, 'bank_ledger'));
        tx.set(bankRef, {
          companyId: cId,
          bankAccountId: defaultBankAccountId,
          type: 'deposit',
          amount: total,
          reference: saleNumber,
          note: `POS sale via ${normalizedPaymentMethod}`,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
    });

    return {
      id: saleRef.id, companyId: cId, saleNumber,
      customerId: input.customerId, customerName: input.customerName,
      items: input.items, subtotal, discount: input.discount, tax: input.tax, total,
      paymentMethod: normalizedPaymentMethod,
      paymentReference: input.paymentReference?.trim() || undefined,
    } as Sale;
  };

  const createPurchaseOrder = async (input: { supplierId?: string; supplierName?: string; status: 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Closed'; expectedDeliveryDate?: string; notes?: string; items: Array<{ productId: string; productName: string; sku: string; quantity: number; unitCost: number; total: number; }> }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    if (!input.items.length) throw new Error('Add at least one item to the purchase order');
    const subtotal = input.items.reduce((sum, item) => sum + item.total, 0);
    const orderNumber = `PO${Date.now().toString().slice(-8)}`;
    const orderRef = doc(collection(db, 'purchase_orders'));
    const payload: PurchaseOrder = {
      id: orderRef.id,
      companyId: cId,
      orderNumber,
      supplierId: input.supplierId || undefined,
      supplierName: input.supplierName || undefined,
      status: input.status || 'Draft',
      expectedDeliveryDate: input.expectedDeliveryDate || undefined,
      items: input.items.map((item) => ({ ...item, receivedQuantity: 0 })),
      subtotal,
      tax: 0,
      total: subtotal,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date(),
    };
    await setDoc(orderRef, { ...payload, createdAt: serverTimestamp() });
    setPurchaseOrders((prev) => [payload, ...prev.filter((item) => item.id !== orderRef.id)]);
    return payload;
  };

  const refreshPurchaseOrdersFromFirestore = async (companyIdValue: string) => {
    const db = getFirebaseDb();
    const q = query(collection(db, 'purchase_orders'), where('companyId', '==', companyIdValue));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PurchaseOrder[];
    const sorted = [...rows].sort((a: any, b: any) => {
      const av = a?.createdAt;
      const bv = b?.createdAt;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const toComparable = (value: any) => {
        if (value instanceof Timestamp) return value.toDate().getTime();
        if (typeof value?.toDate === 'function') return value.toDate().getTime();
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return value;
        return String(value);
      };
      const avc = toComparable(av);
      const bvc = toComparable(bv);
      if (avc < bvc) return 1;
      if (avc > bvc) return -1;
      return 0;
    });
    setPurchaseOrders(sorted);
    return sorted;
  };

  const deletePurchaseOrder = async (id: string) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const order = purchaseOrders.find((item) => item.id === id);
    if (!order) throw new Error('Purchase order not found');

    if (!['Draft', 'Sent'].includes(order.status)) {
      throw new Error('Only Draft or Sent purchase orders can be deleted.');
    }

    const linkedReceipts = goodsReceipts.filter((item) => item.purchaseOrderId === id);
    const linkedInvoices = supplierInvoices.filter((item) => item.purchaseOrderId === id);
    const linkedInvoiceIds = new Set(linkedInvoices.map((item) => item.id));
    const linkedPayments = payments.filter((item) => linkedInvoiceIds.has(item.invoiceId));

    if (linkedReceipts.length > 0 || linkedInvoices.length > 0 || linkedPayments.length > 0) {
      throw new Error('Cannot delete this purchase order because it already has linked goods receipts, supplier invoices, or payments.');
    }

    const purchaseOrderCollectionPath = 'purchase_orders';
    const orderRef = doc(db, purchaseOrderCollectionPath, id);

    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      await refreshPurchaseOrdersFromFirestore(cId);
      return;
    }

    try {
      await deleteDoc(orderRef);
      setPurchaseOrders((prev) => prev.filter((item) => item.id !== id));

      const itemQueries = [
        query(collection(db, purchaseOrderCollectionPath, id, 'items')),
        query(collection(db, 'purchase_order_items'), where('companyId', '==', cId), where('purchaseOrderId', '==', id)),
      ];
      const pendingQueries = [
        query(collection(db, purchaseOrderCollectionPath, id, 'pending_references')),
        query(collection(db, 'pending_references'), where('companyId', '==', cId), where('purchaseOrderId', '==', id)),
      ];

      const [itemSnapshots, pendingSnapshots] = await Promise.all([
        Promise.all(itemQueries.map((q) => getDocs(q))),
        Promise.all(pendingQueries.map((q) => getDocs(q))),
      ]);

      const docsToDelete = new Set<string>();
      for (const snap of [...itemSnapshots.flat(), ...pendingSnapshots.flat()]) {
        snap.docs.forEach((docSnap) => docsToDelete.add(docSnap.ref.path));
      }

      if (docsToDelete.size > 0) {
        const batch = writeBatch(db);
        for (const docPath of docsToDelete) {
          batch.delete(doc(db, docPath));
        }
        await batch.commit();
      }

      const refreshedOrders = await refreshPurchaseOrdersFromFirestore(cId);
      const orderStillPresent = refreshedOrders.some((item) => item.id === id);
      if (orderStillPresent) {
        throw new Error(`Purchase order still exists after delete: ${orderRef.path}`);
      }
    } catch (error: any) {
      throw error;
      throw new Error(error?.message || `Could not delete purchase order from Firestore at ${orderRef.path}`);
    }
  };

  const receiveGoods = async (input: { purchaseOrderId: string; supplierInvoiceNumber?: string; deliveryOrderNumber?: string; notes?: string; items: Array<{ productId: string; productName: string; sku: string; orderedQuantity: number; receivedQuantity: number; unitCost: number; total: number; }> }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    if (!input.purchaseOrderId) throw new Error('Select a purchase order before saving.');
    if (!input.items.length) throw new Error('Add at least one received item before saving.');

    const poRef = doc(db, 'purchase_orders', input.purchaseOrderId);
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) throw new Error('Purchase order not found');
    const poData = poSnap.data() as any;
    const poItems = (poData.items || []) as PurchaseOrderItem[];

    const normalizedInvoiceNumber = input.supplierInvoiceNumber?.trim();
    const hasPositiveQty = input.items.some((item) => Number(item.receivedQuantity || 0) > 0);
    if (!hasPositiveQty) throw new Error('Enter at least one received quantity greater than zero.');

    const invalidItem = input.items.find((item) => Number(item.receivedQuantity || 0) > item.orderedQuantity);
    if (invalidItem) throw new Error(`Received quantity cannot exceed the ordered quantity for ${invalidItem.productName}.`);

    const totalAmount = input.items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const receiptNumber = `GR${Date.now().toString().slice(-8)}`;
    const receiptRef = doc(collection(db, 'goods_receipts'));
    const nextItems = poItems.map((item) => {
      const match = input.items.find((row) => row.productId === item.productId);
      if (!match) return item;
      const received = (item.receivedQuantity || 0) + (match.receivedQuantity || 0);
      const capped = Math.min(received, item.quantity);
      return { ...item, receivedQuantity: capped };
    });
    const allReceived = nextItems.every((item) => (item.receivedQuantity || 0) >= item.quantity);
    const nextStatus = allReceived ? 'Fully Received' : 'Partially Received';
    const receiptPayload: GoodsReceipt = {
      id: receiptRef.id,
      companyId: cId,
      receiptNumber,
      purchaseOrderId: input.purchaseOrderId,
      supplierId: poData.supplierId || undefined,
      supplierName: poData.supplierName || undefined,
      supplierInvoiceNumber: normalizedInvoiceNumber || undefined,
      deliveryOrderNumber: input.deliveryOrderNumber?.trim() || undefined,
      items: input.items,
      totalAmount,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date(),
    };

    let invoiceDocId: string | undefined;
    let invoiceRef: DocumentReference | undefined;
    if (normalizedInvoiceNumber) {
      const invoiceSnap = await getDocs(query(collection(db, 'supplier_invoices'), where('companyId', '==', cId), where('invoiceNumber', '==', normalizedInvoiceNumber)));
      const existingInvoice = invoiceSnap.docs[0];
      if (existingInvoice) {
        invoiceDocId = existingInvoice.id;
        invoiceRef = doc(db, 'supplier_invoices', invoiceDocId);
      } else {
        invoiceRef = doc(collection(db, 'supplier_invoices'));
        invoiceDocId = invoiceRef.id;
      }
    }

    await runTransaction(db, async (tx) => {
      const productUpdates: Array<{
        productRef: any;
        nextStock: number;
        costPrice: number;
        weightedAvg: number;
        item: typeof input.items[number];
      }> = [];

      for (const item of input.items) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists()) continue;
        const productData = productSnap.data() as any;
        const currentStock = Number(productData.stock || 0);
        const nextStock = currentStock + Number(item.receivedQuantity || 0);
        const costPrice = Number(item.unitCost || 0);
        const totalCost = (currentStock * Number(productData.costPrice || 0)) + (Number(item.receivedQuantity || 0) * costPrice);
        const weightedAvg = nextStock > 0 ? totalCost / nextStock : costPrice;
        productUpdates.push({ productRef, nextStock, costPrice, weightedAvg, item });
      }

      let invoiceExists = false;
      if (invoiceRef) {
        const invoiceSnapshot = await tx.get(invoiceRef);
        invoiceExists = invoiceSnapshot.exists();
      }

      tx.update(poRef, { items: nextItems, status: nextStatus, updatedAt: serverTimestamp() });

      for (const update of productUpdates) {
        tx.update(update.productRef, { stock: update.nextStock, costPrice: update.weightedAvg, avgCost: update.weightedAvg, lastPurchaseCost: update.costPrice });
        const movementRef = doc(collection(db, 'stock_movements'));
        tx.set(movementRef, {
          companyId: cId,
          productId: update.item.productId,
          productName: update.item.productName,
          type: 'PURCHASE',
          quantity: update.item.receivedQuantity,
          stockAfter: update.nextStock,
          referenceId: receiptRef.id,
          note: `Goods received from ${poData.orderNumber || 'PO'}`,
          createdAt: serverTimestamp(),
        });
      }

      tx.set(receiptRef, { ...receiptPayload, createdAt: serverTimestamp() });

      if (normalizedInvoiceNumber && invoiceRef) {
        const invoicePayload = {
          companyId: cId,
          invoiceNumber: normalizedInvoiceNumber,
          purchaseOrderId: input.purchaseOrderId,
          goodsReceiptId: receiptRef.id,
          supplierId: poData.supplierId || undefined,
          supplierName: poData.supplierName || undefined,
          invoiceDate: serverTimestamp(),
          dueDate: serverTimestamp(),
          subtotal: totalAmount,
          tax: 0,
          total: totalAmount,
          outstandingBalance: totalAmount,
          status: 'Unpaid',
          items: input.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.receivedQuantity,
            unitCost: item.unitCost,
            total: item.total,
          })),
          notes: input.notes?.trim() || undefined,
          createdAt: serverTimestamp(),
        };

        if (invoiceExists) {
          tx.update(invoiceRef, invoicePayload);
        } else {
          tx.set(invoiceRef, { id: invoiceRef.id, ...invoicePayload, createdAt: serverTimestamp() });
        }
      }
    });

    setGoodsReceipts((prev) => [receiptPayload, ...prev.filter((item) => item.id !== receiptRef.id)]);
    setPurchaseOrders((prev) => prev.map((order) => (order.id === input.purchaseOrderId ? { ...order, items: nextItems, status: nextStatus } : order)));

    if (normalizedInvoiceNumber) {
      const invoicePayload: SupplierInvoice = {
        id: invoiceDocId || receiptRef.id,
        companyId: cId,
        invoiceNumber: normalizedInvoiceNumber,
        purchaseOrderId: input.purchaseOrderId,
        goodsReceiptId: receiptRef.id,
        supplierId: poData.supplierId || undefined,
        supplierName: poData.supplierName || undefined,
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        outstandingBalance: totalAmount,
        status: 'Unpaid',
        items: input.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.receivedQuantity,
          unitCost: item.unitCost,
          total: item.total,
        })),
        notes: input.notes?.trim() || undefined,
        createdAt: new Date(),
      };
      setSupplierInvoices((prev) => [invoicePayload, ...prev.filter((item) => item.invoiceNumber !== normalizedInvoiceNumber)]);
    }

    return receiptPayload;
  };

  const createSupplierInvoice = async (input: { purchaseOrderId?: string; goodsReceiptId?: string; supplierId?: string; supplierName?: string; invoiceNumber: string; invoiceDate?: Date; dueDate?: Date; subtotal: number; tax: number; total: number; items?: SupplierInvoiceItem[]; notes?: string; }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const invoiceRef = doc(collection(db, 'supplier_invoices'));
    const normalizedDueDate = input.dueDate ? Timestamp.fromDate(input.dueDate) : undefined;
    const today = new Date();
    const dueDateValue = input.dueDate ? new Date(input.dueDate) : undefined;
    const isOverdue = Boolean(dueDateValue && dueDateValue.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0));
    const invoicePayload: SupplierInvoice = {
      id: invoiceRef.id,
      companyId: cId,
      invoiceNumber: input.invoiceNumber.trim(),
      purchaseOrderId: input.purchaseOrderId || undefined,
      goodsReceiptId: input.goodsReceiptId || undefined,
      supplierId: input.supplierId || undefined,
      supplierName: input.supplierName || undefined,
      invoiceDate: input.invoiceDate ? Timestamp.fromDate(input.invoiceDate) : undefined,
      dueDate: normalizedDueDate,
      subtotal: input.subtotal,
      tax: input.tax,
      total: input.total,
      outstandingBalance: input.total,
      status: isOverdue ? 'Overdue' : 'Unpaid',
      items: input.items || [],
      notes: input.notes?.trim() || undefined,
      createdAt: new Date(),
    };
    await setDoc(invoiceRef, { ...invoicePayload, createdAt: serverTimestamp(), invoiceDate: invoicePayload.invoiceDate || serverTimestamp(), dueDate: invoicePayload.dueDate || serverTimestamp() });
    setSupplierInvoices((prev) => [invoicePayload, ...prev.filter((item) => item.id !== invoiceRef.id)]);
    return invoicePayload;
  };

  const createPayment = async (input: { invoiceId: string; amount: number; paymentMethod: 'cash' | 'bank'; bankAccountId?: string; reference?: string; notes?: string; }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const invoiceRef = doc(db, 'supplier_invoices', input.invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error('Supplier invoice not found');
    const invoiceData = invoiceSnap.data() as SupplierInvoice;
    const nextOutstanding = Math.max(0, (invoiceData.outstandingBalance || 0) - input.amount);
    const dueDateValue = invoiceData.dueDate ? new Date(invoiceData.dueDate.toDate ? invoiceData.dueDate.toDate() : invoiceData.dueDate) : undefined;
    const today = new Date();
    const isOverdue = Boolean(dueDateValue && dueDateValue.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0));
    const nextStatus = nextOutstanding <= 0 ? 'Paid' : isOverdue ? 'Overdue' : (invoiceData.outstandingBalance > 0 && nextOutstanding < invoiceData.total ? 'Partially Paid' : 'Unpaid');
    const paymentRef = doc(collection(db, 'payments'));
    const paymentPayload: PaymentTransaction = {
      id: paymentRef.id,
      companyId: cId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      bankAccountId: input.bankAccountId || undefined,
      reference: input.reference?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date(),
    };
    await runTransaction(db, async (tx) => {
      tx.update(invoiceRef, {
        outstandingBalance: nextOutstanding,
        status: nextStatus,
      });
      if (input.paymentMethod === 'bank') {
        if (!input.bankAccountId) throw new Error('Select a bank account for bank payment');
        const ledgerRef = doc(collection(db, 'bank_ledger'));
        tx.set(ledgerRef, {
          companyId: cId,
          bankAccountId: input.bankAccountId,
          type: 'withdrawal',
          amount: input.amount,
          reference: input.reference || 'Supplier payment',
          note: input.notes || null,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        const ledgerRef = doc(collection(db, 'cash_ledger'));
        tx.set(ledgerRef, {
          companyId: cId,
          type: 'out',
          amount: input.amount,
          reference: input.reference || 'Supplier payment',
          note: input.notes || null,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      tx.set(paymentRef, { ...paymentPayload, createdAt: serverTimestamp() });
    });
    setSupplierInvoices((prev) => prev.map((invoice) => invoice.id === input.invoiceId ? { ...invoice, outstandingBalance: nextOutstanding, status: nextStatus } : invoice));
    setPayments((prev) => [paymentPayload, ...prev.filter((item) => item.id !== paymentRef.id)]);
    return paymentPayload;
  };

  // ---------- Purchase (atomic tx, stock +) ----------
  const createPurchase = async (input: { items: PurchaseItem[]; supplierId?: string; supplierName?: string; discount: number; tax: number; }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    if (!input.items.length) throw new Error('No items in purchase');

    const subtotal = input.items.reduce((s, i) => s + i.total, 0);
    const total = Math.max(0, subtotal - input.discount + input.tax);
    const purchaseNumber = `P${Date.now().toString().slice(-8)}`;
    const purchaseRef = doc(collection(db, 'purchases'));
    const groupedItems = Array.from(input.items.reduce((map, item) => {
      const current = map.get(item.productId);
      if (current) {
        current.quantity += item.quantity;
        current.total += item.total;
      } else {
        map.set(item.productId, { ...item });
      }
      return map;
    }, new Map<string, PurchaseItem>()).values());

    await runTransaction(db, async (tx) => {
      const productRefs = groupedItems.map((item) => doc(db, 'products', item.productId));
      const snaps = await Promise.all(productRefs.map((r) => tx.get(r)));
      const stockAfterMap: Record<string, number> = {};
      for (let idx = 0; idx < groupedItems.length; idx++) {
        const item = groupedItems[idx];
        const s = snaps[idx];
        if (!s.exists()) throw new Error(`Product not found: ${item.productName}`);
        const currentStock = (s.data() as any).stock as number;
        stockAfterMap[item.productId] = currentStock + item.quantity;
      }
      tx.set(purchaseRef, {
        companyId: cId, purchaseNumber,
        supplierId: input.supplierId || null,
        supplierName: input.supplierName || null,
        items: groupedItems, subtotal, discount: input.discount, tax: input.tax, total,
        createdAt: serverTimestamp(),
      });
      for (const item of groupedItems) {
        const pRef = doc(db, 'products', item.productId);
        const snap = snaps[groupedItems.findIndex((x) => x.productId === item.productId)];
        const current = snap.data() as any;
        const oldStock = current.stock || 0;
        const oldAvg = current.avgCost ?? current.costPrice ?? 0;
        const newStock = stockAfterMap[item.productId];
        const totalCost = (oldStock * oldAvg) + (item.quantity * item.costPrice);
        const weightedAvg = newStock > 0 ? totalCost / newStock : item.costPrice;
        tx.update(pRef, {
          stock: newStock,
          costPrice: weightedAvg,
          avgCost: weightedAvg,
          lastPurchaseCost: item.costPrice,
        });
        const mRef = doc(collection(db, 'stock_movements'));
        tx.set(mRef, {
          companyId: cId, productId: item.productId, productName: item.productName,
          type: 'PURCHASE', quantity: item.quantity, stockAfter: stockAfterMap[item.productId],
          referenceId: purchaseRef.id, createdAt: serverTimestamp(),
        });
      }

      const cashRef = doc(collection(db, 'cash_ledger'));
      tx.set(cashRef, {
        companyId: cId,
        type: 'out',
        amount: total,
        reference: purchaseNumber,
        note: 'Purchase order stock receipt',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    });

    setPurchases((prev) => [{
      id: purchaseRef.id,
      companyId: cId,
      purchaseNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      items: input.items,
      subtotal,
      discount: input.discount,
      tax: input.tax,
      total,
      createdAt: new Date(),
    } as Purchase, ...prev.filter((item) => item.id !== purchaseRef.id)]);
    setProducts((prev) => prev.map((product) => {
      const match = groupedItems.find((item) => item.productId === product.id);
      if (!match) return product;
      const oldStock = product.stock || 0;
      const oldAvg = product.avgCost ?? product.costPrice ?? 0;
      const newStock = oldStock + match.quantity;
      const totalCost = (oldStock * oldAvg) + (match.quantity * match.costPrice);
      const weightedAvg = newStock > 0 ? totalCost / newStock : match.costPrice;
      return {
        ...product,
        stock: newStock,
        costPrice: weightedAvg,
        avgCost: weightedAvg,
        lastPurchaseCost: match.costPrice,
      };
    }));
    setStockMovements((prev) => [
      ...groupedItems.map((item) => ({
        id: `${purchaseRef.id}-${item.productId}`,
        companyId: cId,
        productId: item.productId,
        productName: item.productName,
        type: 'PURCHASE' as const,
        quantity: item.quantity,
        stockAfter: (products.find((product) => product.id === item.productId)?.stock || 0) + item.quantity,
        referenceId: purchaseRef.id,
        createdAt: new Date(),
      })),
      ...prev.filter((item) => item.referenceId !== purchaseRef.id),
    ] as StockMovement[]);

    return {
      id: purchaseRef.id, companyId: cId, purchaseNumber,
      supplierId: input.supplierId, supplierName: input.supplierName,
      items: input.items, subtotal, discount: input.discount, tax: input.tax, total,
    } as Purchase;
  };

  const adjustStock = async (productId: string, newQty: number, note: string) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    await runTransaction(db, async (tx) => {
      const pRef = doc(db, 'products', productId);
      const snap = await tx.get(pRef);
      if (!snap.exists()) throw new Error('Product not found');
      const data = snap.data() as any;
      const diff = newQty - (data.stock || 0);
      tx.update(pRef, { stock: newQty });
      const mRef = doc(collection(db, 'stock_movements'));
      tx.set(mRef, {
        companyId: cId, productId, productName: data.name,
        type: 'ADJUSTMENT', quantity: diff, stockAfter: newQty,
        note, createdAt: serverTimestamp(),
      });
    });
  };

  // ---------- Expenses ----------
  const createExpense = async (e: Omit<Expense, 'id' | 'companyId' | 'createdAt'> & { paymentSource?: 'cash' | 'bank'; bankAccountId?: string }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const dateValue = e.date instanceof Date ? Timestamp.fromDate(e.date) : e.date;
    const paymentSource = e.paymentSource || 'cash';
    const expRef = doc(collection(db, 'expenses'));
    const ledgerCollection = paymentSource === 'bank' ? 'bank_ledger' : 'cash_ledger';
    const ledgerRef = doc(collection(db, ledgerCollection));
    await runTransaction(db, async (tx) => {
      tx.set(expRef, {
        category: e.category,
        amount: e.amount,
        description: e.description || null,
        paymentSource,
        bankAccountId: e.bankAccountId || null,
        ledgerCollection,
        ledgerEntryId: ledgerRef.id,
        companyId: cId,
        date: dateValue,
        createdAt: serverTimestamp(),
      });
      if (paymentSource === 'bank') {
        if (!e.bankAccountId) throw new Error('Bank account is required for bank expense');
        tx.set(ledgerRef, {
          companyId: cId,
          bankAccountId: e.bankAccountId,
          type: 'expense',
          amount: e.amount,
          expenseId: expRef.id,
          note: `Expense: ${e.category}`,
          reference: e.description || null,
          date: dateValue,
          createdAt: serverTimestamp(),
        });
      } else {
        tx.set(ledgerRef, {
          companyId: cId,
          type: 'expense',
          amount: e.amount,
          expenseId: expRef.id,
          note: `Expense: ${e.category}`,
          reference: e.description || null,
          date: dateValue,
          createdAt: serverTimestamp(),
        });
      }
    });
    return expRef.id;
  };
  const updateExpense = async (id: string, e: Partial<Expense>) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    await runTransaction(db, async (tx) => {
      const expRef = doc(db, 'expenses', id);
      const expSnap = await tx.get(expRef);
      if (!expSnap.exists()) throw new Error('Expense not found');

      const current = expSnap.data() as any;
      const nextPaymentSource = (e.paymentSource || current.paymentSource || 'cash') as 'cash' | 'bank';
      const nextBankAccountId = e.bankAccountId !== undefined ? e.bankAccountId : current.bankAccountId;
      const nextAmount = e.amount !== undefined ? e.amount : current.amount;
      const nextCategory = e.category || current.category;
      const nextDescription = e.description !== undefined ? e.description : current.description;
      const nextDateRaw = e.date !== undefined ? e.date : current.date;
      const nextDate = nextDateRaw instanceof Date ? Timestamp.fromDate(nextDateRaw) : nextDateRaw;

      if (nextPaymentSource === 'bank' && !nextBankAccountId) {
        throw new Error('Bank account is required for bank expense');
      }

      if (current.ledgerCollection && current.ledgerEntryId) {
        tx.delete(doc(db, current.ledgerCollection, current.ledgerEntryId));
      }

      const nextLedgerCollection: 'cash_ledger' | 'bank_ledger' = nextPaymentSource === 'bank' ? 'bank_ledger' : 'cash_ledger';
      const nextLedgerRef = doc(collection(db, nextLedgerCollection));

      if (nextPaymentSource === 'bank') {
        tx.set(nextLedgerRef, {
          companyId: cId,
          bankAccountId: nextBankAccountId,
          type: 'expense',
          amount: nextAmount,
          expenseId: id,
          note: `Expense: ${nextCategory}`,
          reference: nextDescription || null,
          date: nextDate,
          createdAt: serverTimestamp(),
        });
      } else {
        tx.set(nextLedgerRef, {
          companyId: cId,
          type: 'expense',
          amount: nextAmount,
          expenseId: id,
          note: `Expense: ${nextCategory}`,
          reference: nextDescription || null,
          date: nextDate,
          createdAt: serverTimestamp(),
        });
      }

      tx.update(expRef, {
        ...e,
        paymentSource: nextPaymentSource,
        bankAccountId: nextPaymentSource === 'bank' ? nextBankAccountId : null,
        ledgerCollection: nextLedgerCollection,
        ledgerEntryId: nextLedgerRef.id,
        date: nextDate,
      } as any);
    });
  };
  const deleteExpense = async (id: string) => {
    requireCompany();
    const db = getFirebaseDb();
    await runTransaction(db, async (tx) => {
      const expRef = doc(db, 'expenses', id);
      const expSnap = await tx.get(expRef);
      if (!expSnap.exists()) return;
      const data = expSnap.data() as any;
      if (data.ledgerCollection && data.ledgerEntryId) {
        tx.delete(doc(db, data.ledgerCollection, data.ledgerEntryId));
      }
      tx.delete(expRef);
    });
  };

  // ---------- Finance ----------
  const createCashEntry = async (entry: Omit<CashEntry, 'id' | 'companyId' | 'createdAt'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'cash_ledger'), {
      ...entry,
      companyId: cId,
      date: entry.date instanceof Date ? Timestamp.fromDate(entry.date) : entry.date,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const createBankAccount = async (account: Omit<BankAccount, 'id' | 'companyId' | 'createdAt'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'bank_accounts'), {
      ...account,
      companyId: cId,
      createdAt: serverTimestamp(),
    });
    if (account.openingBalance > 0) {
      await addDoc(collection(getFirebaseDb(), 'bank_ledger'), {
        companyId: cId,
        bankAccountId: ref.id,
        type: 'opening',
        amount: account.openingBalance,
        reference: 'Opening Balance',
        date: Timestamp.fromDate(new Date()),
        createdAt: serverTimestamp(),
      });
    }
    return ref.id;
  };

  const createBankEntry = async (entry: Omit<BankEntry, 'id' | 'companyId' | 'createdAt'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'bank_ledger'), {
      ...entry,
      companyId: cId,
      date: entry.date instanceof Date ? Timestamp.fromDate(entry.date) : entry.date,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  };

  const transferBankToCash = async (input: { bankAccountId: string; amount: number; reference?: string; note?: string; date?: Date }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const when = input.date ? Timestamp.fromDate(input.date) : Timestamp.fromDate(new Date());
    await runTransaction(db, async (tx) => {
      const bankRef = doc(collection(db, 'bank_ledger'));
      tx.set(bankRef, {
        companyId: cId,
        bankAccountId: input.bankAccountId,
        type: 'transfer_to_cash',
        amount: input.amount,
        reference: input.reference || 'Transfer to cash',
        note: input.note || null,
        date: when,
        createdAt: serverTimestamp(),
      });
      const cashRef = doc(collection(db, 'cash_ledger'));
      tx.set(cashRef, {
        companyId: cId,
        type: 'transfer_in',
        amount: input.amount,
        reference: input.reference || 'Transfer from bank',
        note: input.note || null,
        date: when,
        createdAt: serverTimestamp(),
      });
    });
  };

  const createCapitalEntry = async (entry: Omit<CapitalEntry, 'id' | 'companyId' | 'createdAt'>) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const when = entry.date instanceof Date ? Timestamp.fromDate(entry.date) : entry.date;
    const capRef = doc(collection(db, 'capital_entries'));
    await runTransaction(db, async (tx) => {
      tx.set(capRef, {
        ...entry,
        companyId: cId,
        date: when,
        createdAt: serverTimestamp(),
      });
      if (entry.destination === 'bank') {
        if (!entry.bankAccountId) throw new Error('Select a bank account for bank capital');
        const bRef = doc(collection(db, 'bank_ledger'));
        tx.set(bRef, {
          companyId: cId,
          bankAccountId: entry.bankAccountId,
          type: 'capital',
          amount: entry.amount,
          reference: entry.reference || 'Owner capital',
          note: 'Owner capital deposit',
          date: when,
          createdAt: serverTimestamp(),
        });
      } else {
        const cRef = doc(collection(db, 'cash_ledger'));
        tx.set(cRef, {
          companyId: cId,
          type: 'capital',
          amount: entry.amount,
          reference: entry.reference || 'Owner capital',
          note: 'Owner capital deposit',
          date: when,
          createdAt: serverTimestamp(),
        });
      }
    });
    return capRef.id;
  };

  // ---------- Team & Invites ----------
  const generateCode = () => {
    // 8-character alphanumeric, human-friendly (no O/0/I/1)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const createInvite = async (role: 'admin' | 'manager' | 'cashier') => {
    const cId = requireCompany();
    if (!profile) throw new Error('Not authenticated');
    const code = generateCode();
    await addDoc(collection(getFirebaseDb(), 'invite_codes'), {
      companyId: cId, code, role, createdBy: profile.uid, used: false, createdAt: serverTimestamp(),
    });
    return code;
  };

  const deleteInvite = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'invite_codes', id));
  };

  const changeMemberRole = async (uid: string, role: 'admin' | 'manager' | 'cashier') => {
    if (uid === profile?.uid) throw new Error('You cannot change your own role');
    await updateDoc(doc(getFirebaseDb(), 'users', uid), { role });
  };

  const removeMember = async (uid: string) => {
    if (uid === profile?.uid) throw new Error('You cannot remove yourself');
    await updateDoc(doc(getFirebaseDb(), 'users', uid), { companyId: null });
  };

  // ---------- Backup / Restore ----------
  const exportBackup = async () => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    const cols = ['products', 'categories', 'suppliers', 'customers', 'sales', 'purchases', 'expenses', 'stock_movements', 'cash_ledger', 'bank_accounts', 'bank_ledger', 'capital_entries'];
    const dump: any = { version: 1, exportedAt: new Date().toISOString(), companyId: cId, company: company };
    for (const c of cols) {
      const snap = await getDocs(query(collection(db, c), where('companyId', '==', cId)));
      dump[c] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return dump;
  };

  const restoreBackup = async (data: any) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
    const cols = ['products', 'categories', 'suppliers', 'customers', 'sales', 'purchases', 'expenses', 'stock_movements', 'cash_ledger', 'bank_accounts', 'bank_ledger', 'capital_entries'];

    // WipeThen restore. Batch operations in groups of 400.
    for (const c of cols) {
      const existing = await getDocs(query(collection(db, c), where('companyId', '==', cId)));
      let batch = writeBatch(db);
      let n = 0;
      for (const d of existing.docs) {
        batch.delete(d.ref);
        n++;
        if (n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; }
      }
      if (n > 0) await batch.commit();

      const list: any[] = data[c] || [];
      let b = writeBatch(db);
      let m = 0;
      for (const item of list) {
        const { id, ...rest } = item;
        const ref = id ? doc(db, c, id) : doc(collection(db, c));
        b.set(ref, { ...rest, companyId: cId });
        m++;
        if (m >= 400) { await b.commit(); b = writeBatch(db); m = 0; }
      }
      if (m > 0) await b.commit();
    }
  };

  return (
    <DataContext.Provider value={{
      company, products, categories, suppliers, customers, sales, purchases, purchaseOrders, goodsReceipts, supplierInvoices, payments, expenses, cashEntries, bankAccounts, bankEntries, capitalEntries, stockMovements, loading,
      invites, team,
      createCompany, updateCompany,
      createProduct, updateProduct, deleteProduct, archiveProduct,
      createCategory, updateCategory, deleteCategory,
      createSupplier, updateSupplier, deleteSupplier,
      createCustomer, updateCustomer, deleteCustomer,
      createSale, createPurchase, createPurchaseOrder, deletePurchaseOrder, receiveGoods, createSupplierInvoice, createPayment, adjustStock,
      createExpense, updateExpense, deleteExpense,
      createCashEntry, createBankAccount, createBankEntry, transferBankToCash, createCapitalEntry,
      createInvite, deleteInvite, changeMemberRole, removeMember,
      exportBackup, restoreBackup,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
