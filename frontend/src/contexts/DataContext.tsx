import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category_id: string;
  category_name: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_alert: number;
}

export interface Sale {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  selling_price?: number;
  total_price: number;
  total_amount?: number;
  payment_method: string;
  created_at: string;
}

export interface LatestSale {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  created_at: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_alert: number;
}

export interface DashboardData {
  today_sales: number;
  total_products: number;
  total_stock: number;
  stock_value: number;
  low_stock: number;
  low_stock_products: LowStockProduct[];
  latest_sales: LatestSale[];
}

interface DataContextType {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  dashboard: DashboardData | null;
  loading: boolean;

  // Refresh methods
  refreshAll: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshCategories: () => Promise<void>;

  // Mutations — auto-trigger refreshes across connected data
  createProduct: (payload: any) => Promise<Product>;
  updateProduct: (id: string, payload: any) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  updateCategory: (id: string, name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  createSale: (payload: { product_id: string; quantity: number; payment_method: string }) => Promise<any>;
  updateSettings: (payload: any) => Promise<void>;
  seedSampleData: () => Promise<{ message: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const fetchJSON = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...(options.headers || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (data && (data.detail || data.message)) || 'Request failed';
        throw new Error(message);
      }
      return data;
    },
    [authHeaders]
  );

  const refreshDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchJSON('/api/dashboard');
      setDashboard(data);
    } catch (e) {
      // silent — surface via loading/errors in future
    }
  }, [token, fetchJSON]);

  const refreshProducts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchJSON('/api/products');
      setProducts(data);
    } catch (e) {
      // silent
    }
  }, [token, fetchJSON]);

  const refreshSales = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchJSON('/api/sales');
      setSales(data);
    } catch (e) {
      // silent
    }
  }, [token, fetchJSON]);

  const refreshCategories = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchJSON('/api/categories');
      setCategories(data);
    } catch (e) {
      // silent
    }
  }, [token, fetchJSON]);

  const refreshAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshProducts(),
        refreshSales(),
        refreshCategories(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [token, refreshDashboard, refreshProducts, refreshSales, refreshCategories]);

  // Fetch data on login / token change; clear on logout
  useEffect(() => {
    if (token) {
      refreshAll();
    } else {
      setProducts([]);
      setCategories([]);
      setSales([]);
      setDashboard(null);
    }
  }, [token]);

  // MUTATIONS — every mutation refreshes affected slices
  const createProduct = useCallback(
    async (payload: any) => {
      const newProduct = await fetchJSON('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // Refresh products + dashboard (stock counts changed)
      await Promise.all([refreshProducts(), refreshDashboard()]);
      return newProduct as Product;
    },
    [fetchJSON, refreshProducts, refreshDashboard]
  );

  const updateProduct = useCallback(
    async (id: string, payload: any) => {
      const updated = await fetchJSON(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      await Promise.all([refreshProducts(), refreshDashboard()]);
      return updated as Product;
    },
    [fetchJSON, refreshProducts, refreshDashboard]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await fetchJSON(`/api/products/${id}`, { method: 'DELETE' });
      await Promise.all([refreshProducts(), refreshDashboard()]);
    },
    [fetchJSON, refreshProducts, refreshDashboard]
  );

  const createCategory = useCallback(
    async (name: string) => {
      const cat = await fetchJSON('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await refreshCategories();
      return cat as Category;
    },
    [fetchJSON, refreshCategories]
  );

  const updateCategory = useCallback(
    async (id: string, name: string) => {
      const cat = await fetchJSON(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      await Promise.all([refreshCategories(), refreshProducts()]);
      return cat as Category;
    },
    [fetchJSON, refreshCategories, refreshProducts]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await fetchJSON(`/api/categories/${id}`, { method: 'DELETE' });
      await refreshCategories();
    },
    [fetchJSON, refreshCategories]
  );

  const createSale = useCallback(
    async (payload: { product_id: string; quantity: number; payment_method: string }) => {
      const sale = await fetchJSON('/api/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // Sale affects: sales, products (stock), dashboard (all metrics)
      await Promise.all([refreshSales(), refreshProducts(), refreshDashboard()]);
      return sale;
    },
    [fetchJSON, refreshSales, refreshProducts, refreshDashboard]
  );

  const updateSettings = useCallback(
    async (payload: any) => {
      await fetchJSON('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      // low_stock_threshold change affects dashboard low_stock count
      await Promise.all([refreshDashboard(), refreshProducts(), refreshUser()]);
    },
    [fetchJSON, refreshDashboard, refreshProducts, refreshUser]
  );

  const seedSampleData = useCallback(async () => {
    const res = await fetchJSON('/api/seed-data', { method: 'POST' });
    await refreshAll();
    return res;
  }, [fetchJSON, refreshAll]);

  return (
    <DataContext.Provider
      value={{
        products,
        categories,
        sales,
        dashboard,
        loading,
        refreshAll,
        refreshDashboard,
        refreshProducts,
        refreshSales,
        refreshCategories,
        createProduct,
        updateProduct,
        deleteProduct,
        createCategory,
        updateCategory,
        deleteCategory,
        createSale,
        updateSettings,
        seedSampleData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
