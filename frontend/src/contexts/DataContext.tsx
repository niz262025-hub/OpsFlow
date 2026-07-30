import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/src/firebase/config';
import { useAuth } from './AuthContext';

// ---------- Types ----------
export interface Company {
  id: string;
  name: string;
  ssmNumber?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  currency: string;
  timezone: string;
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
  sellingPrice: number;
  stock: number;
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
export interface Sale {
  id: string; companyId: string; saleNumber: string; customerId?: string; customerName?: string;
  items: SaleItem[]; subtotal: number; discount: number; tax: number; total: number;
  paymentMethod: 'Cash' | 'QR' | 'Transfer';
  cashier?: string; cashierId?: string; createdAt?: any;
}
export interface PurchaseItem { productId: string; productName: string; sku: string; quantity: number; costPrice: number; total: number; }
export interface Purchase {
  id: string; companyId: string; purchaseNumber: string; supplierId?: string; supplierName?: string;
  items: PurchaseItem[]; subtotal: number; discount: number; tax: number; total: number;
  createdAt?: any;
}
export interface Expense { id: string; companyId: string; category: string; amount: number; description?: string; date: any; createdAt?: any; }
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
  expenses: Expense[];
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
  createSale: (input: { items: SaleItem[]; customerId?: string; customerName?: string; discount: number; tax: number; paymentMethod: 'Cash' | 'QR' | 'Transfer'; }) => Promise<Sale>;
  createPurchase: (input: { items: PurchaseItem[]; supplierId?: string; supplierName?: string; discount: number; tax: number; }) => Promise<Purchase>;
  adjustStock: (productId: string, newQty: number, note: string) => Promise<void>;

  createExpense: (e: Omit<Expense, 'id' | 'companyId' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, e: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

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
    const db = getFirebaseDb();
    const q = orderField
      ? query(collection(db, collectionName), where('companyId', '==', companyId), orderBy(orderField, 'desc'))
      : query(collection(db, collectionName), where('companyId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setState(list as T[]);
    }, () => setState([]));
    return () => unsub();
  }, [collectionName, companyId, orderField]);
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Company doc listener
  useEffect(() => {
    if (!companyId) { setCompany(null); return; }
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, 'companies', companyId), (snap) => {
      if (snap.exists()) setCompany({ id: snap.id, ...(snap.data() as any) });
    });
    return () => unsub();
  }, [companyId]);

  useCollectionListener<Product>('products', companyId, setProducts, 'createdAt');
  useCollectionListener<Category>('categories', companyId, setCategories);
  useCollectionListener<Supplier>('suppliers', companyId, setSuppliers);
  useCollectionListener<Customer>('customers', companyId, setCustomers);
  useCollectionListener<Sale>('sales', companyId, setSales, 'createdAt');
  useCollectionListener<Purchase>('purchases', companyId, setPurchases, 'createdAt');
  useCollectionListener<Expense>('expenses', companyId, setExpenses, 'date');
  useCollectionListener<StockMovement>('stock_movements', companyId, setStockMovements, 'createdAt');

  // Invite listener
  useEffect(() => {
    if (!companyId) { setInvites([]); return; }
    const db = getFirebaseDb();
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
    const db = getFirebaseDb();
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
    const ref = await addDoc(collection(db, 'companies'), { ...data, createdAt: serverTimestamp() });
    if (profile) {
      await updateDoc(doc(db, 'users', profile.uid), { companyId: ref.id });
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
  const createProduct = async (p: Omit<Product, 'id' | 'companyId' | 'createdAt'>) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    // duplicate SKU check
    const dup = products.find((x) => x.sku.toLowerCase() === p.sku.toLowerCase());
    if (dup) throw new Error(`SKU "${p.sku}" already exists`);
    const ref = await addDoc(collection(db, 'products'), {
      ...p,
      companyId: cId,
      status: p.status || 'active',
      createdAt: serverTimestamp(),
    });
    if (p.stock > 0) {
      await addDoc(collection(db, 'stock_movements'), {
        companyId: cId, productId: ref.id, productName: p.name,
        type: 'OPENING', quantity: p.stock, stockAfter: p.stock, createdAt: serverTimestamp(),
      });
    }
    return ref.id;
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
    const ref = await addDoc(collection(getFirebaseDb(), 'categories'), { ...c, companyId: cId });
    return ref.id;
  };
  const updateCategory = async (id: string, c: Partial<Category>) => {
    await updateDoc(doc(getFirebaseDb(), 'categories', id), c as any);
  };
  const deleteCategory = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'categories', id));
  };

  // ---------- Suppliers ----------
  const createSupplier = async (s: Omit<Supplier, 'id' | 'companyId'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'suppliers'), { ...s, companyId: cId });
    return ref.id;
  };
  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
    await updateDoc(doc(getFirebaseDb(), 'suppliers', id), s as any);
  };
  const deleteSupplier = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'suppliers', id));
  };

  // ---------- Customers ----------
  const createCustomer = async (c: Omit<Customer, 'id' | 'companyId'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'customers'), { ...c, companyId: cId });
    return ref.id;
  };
  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    await updateDoc(doc(getFirebaseDb(), 'customers', id), c as any);
  };
  const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'customers', id));
  };

  // ---------- Sale (atomic tx) ----------
  const createSale = async (input: { items: SaleItem[]; customerId?: string; customerName?: string; discount: number; tax: number; paymentMethod: 'Cash' | 'QR' | 'Transfer'; }) => {
    const cId = requireCompany();
    const db = getFirebaseDb();
    if (!input.items.length) throw new Error('Cart is empty');

    const subtotal = input.items.reduce((s, i) => s + i.total, 0);
    const total = Math.max(0, subtotal - input.discount + input.tax);
    const saleNumber = `S${Date.now().toString().slice(-8)}`;

    const saleRef = doc(collection(db, 'sales'));

    await runTransaction(db, async (tx) => {
      // 1) Read + validate every product
      const productRefs = input.items.map((i) => doc(db, 'products', i.productId));
      const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));
      const stockAfterMap: Record<string, number> = {};
      for (let idx = 0; idx < input.items.length; idx++) {
        const it = input.items[idx];
        const snap = productSnaps[idx];
        if (!snap.exists()) throw new Error(`Product not found: ${it.productName}`);
        const currentStock = (snap.data() as any).stock as number;
        if (currentStock < it.quantity) {
          throw new Error(`Insufficient stock for ${it.productName}. Available: ${currentStock}`);
        }
        stockAfterMap[it.productId] = currentStock - it.quantity;
      }
      // 2) Write sale
      tx.set(saleRef, {
        companyId: cId, saleNumber,
        customerId: input.customerId || null,
        customerName: input.customerName || null,
        items: input.items,
        subtotal, discount: input.discount, tax: input.tax, total,
        paymentMethod: input.paymentMethod,
        cashierId: profile?.uid || null,
        cashier: profile?.displayName || profile?.email || null,
        createdAt: serverTimestamp(),
      });
      // 3) Decrement stock and log movements
      for (const it of input.items) {
        const pRef = doc(db, 'products', it.productId);
        tx.update(pRef, { stock: stockAfterMap[it.productId] });
        const mRef = doc(collection(db, 'stock_movements'));
        tx.set(mRef, {
          companyId: cId, productId: it.productId, productName: it.productName,
          type: 'SALE', quantity: it.quantity, stockAfter: stockAfterMap[it.productId],
          referenceId: saleRef.id, createdAt: serverTimestamp(),
        });
      }
    });

    return {
      id: saleRef.id, companyId: cId, saleNumber,
      customerId: input.customerId, customerName: input.customerName,
      items: input.items, subtotal, discount: input.discount, tax: input.tax, total,
      paymentMethod: input.paymentMethod,
    } as Sale;
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

    await runTransaction(db, async (tx) => {
      const productRefs = input.items.map((i) => doc(db, 'products', i.productId));
      const snaps = await Promise.all(productRefs.map((r) => tx.get(r)));
      const stockAfterMap: Record<string, number> = {};
      for (let idx = 0; idx < input.items.length; idx++) {
        const it = input.items[idx];
        const s = snaps[idx];
        if (!s.exists()) throw new Error(`Product not found: ${it.productName}`);
        stockAfterMap[it.productId] = ((s.data() as any).stock as number) + it.quantity;
      }
      tx.set(purchaseRef, {
        companyId: cId, purchaseNumber,
        supplierId: input.supplierId || null,
        supplierName: input.supplierName || null,
        items: input.items, subtotal, discount: input.discount, tax: input.tax, total,
        createdAt: serverTimestamp(),
      });
      for (const it of input.items) {
        const pRef = doc(db, 'products', it.productId);
        tx.update(pRef, { stock: stockAfterMap[it.productId], costPrice: it.costPrice });
        const mRef = doc(collection(db, 'stock_movements'));
        tx.set(mRef, {
          companyId: cId, productId: it.productId, productName: it.productName,
          type: 'PURCHASE', quantity: it.quantity, stockAfter: stockAfterMap[it.productId],
          referenceId: purchaseRef.id, createdAt: serverTimestamp(),
        });
      }
    });

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
  const createExpense = async (e: Omit<Expense, 'id' | 'companyId' | 'createdAt'>) => {
    const cId = requireCompany();
    const ref = await addDoc(collection(getFirebaseDb(), 'expenses'), {
      ...e, companyId: cId, createdAt: serverTimestamp(),
      date: e.date instanceof Date ? Timestamp.fromDate(e.date) : e.date,
    });
    return ref.id;
  };
  const updateExpense = async (id: string, e: Partial<Expense>) => {
    await updateDoc(doc(getFirebaseDb(), 'expenses', id), e as any);
  };
  const deleteExpense = async (id: string) => {
    await deleteDoc(doc(getFirebaseDb(), 'expenses', id));
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
    const cols = ['products', 'categories', 'suppliers', 'customers', 'sales', 'purchases', 'expenses', 'stock_movements'];
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
    const cols = ['products', 'categories', 'suppliers', 'customers', 'sales', 'purchases', 'expenses', 'stock_movements'];

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
      company, products, categories, suppliers, customers, sales, purchases, expenses, stockMovements, loading,
      invites, team,
      createCompany, updateCompany,
      createProduct, updateProduct, deleteProduct, archiveProduct,
      createCategory, updateCategory, deleteCategory,
      createSupplier, updateSupplier, deleteSupplier,
      createCustomer, updateCustomer, deleteCustomer,
      createSale, createPurchase, adjustStock,
      createExpense, updateExpense, deleteExpense,
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
