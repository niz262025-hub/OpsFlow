export const DEFAULT_MIN_STOCK = 10;

export function getMinStockThreshold(minStock?: number | null): number {
  return minStock ?? DEFAULT_MIN_STOCK;
}

export function isLowStock(stock: number, minStock?: number | null): boolean {
  return stock <= getMinStockThreshold(minStock);
}

export function parseMinStockValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_MIN_STOCK;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? DEFAULT_MIN_STOCK : parsed;
}
