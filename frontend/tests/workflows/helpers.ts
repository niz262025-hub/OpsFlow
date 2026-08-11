export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function uniqueSku(prefix: string): string {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `${prefix}${seed.slice(-8)}`.toUpperCase();
}

export function parseMoney(value: string): number {
  const numeric = value.replace(/[^0-9.-]/g, '');
  return Number.parseFloat(numeric || '0');
}

export function parseFirstInteger(value: string): number {
  const match = value.match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}
