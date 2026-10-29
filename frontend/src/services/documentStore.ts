/** OpsFlow document adapter. All authorization and atomic commits run on the API. */
import { opsflowRequest } from './myopsAppAccess';
export type DocumentReference = { path: string; id: string; collection: string };
type Query = { collection: string; filters?: { field: string; value: unknown }[] };
type StoredRow = { id: string; data: Record<string, any>; version: number };
export class Timestamp {
  constructor(private value: string) {}
  static fromDate(date: Date) { return new Timestamp(date.toISOString()); }
  toDate() { return new Date(this.value); }
  toJSON() { return { $date: this.value }; }
}
export const serverTimestamp = () => ({ $serverTimestamp: true });
const store = {};
export const getDocumentStore = () => store;
function name(parts: unknown[]) { return parts.filter(p => typeof p === 'string').join('/'); }
function normalizeCollection(path: string) {
  const parts = path.split('/');
  if (parts.length === 3 && parts[0] === 'purchase_orders') {
    return { collection: parts[2] === 'items' ? 'purchase_order_items' : 'pending_references', parentId: parts[1] };
  }
  return { collection: path, parentId: undefined };
}
export function collection(_db: unknown, ...parts: string[]): Query {
  const normalized = normalizeCollection(name(parts));
  return { collection: normalized.collection, filters: normalized.parentId ? [{ field: 'purchaseOrderId', value: normalized.parentId }] : [] };
}
export function doc(...parts: any[]): DocumentReference {
  let path = name(parts);
  if (parts[0]?.collection) path = parts[0].collection + '/' + (parts[1] || crypto.randomUUID());
  const segments = path.split('/');
  if (segments.length < 2) throw new Error('Invalid document reference');
  const id = segments.pop()!;
  const normalized = normalizeCollection(segments.join('/'));
  return { collection: normalized.collection, id, path: normalized.collection + '/' + id };
}
export function where(field: string, operator: string, value: unknown) {
  if (operator !== '==') throw new Error('Unsupported query');
  return { field, value };
}
export function query(base: Query, ...filters: { field: string; value: unknown }[]): Query {
  return { ...base, filters: [...(base.filters || []), ...filters] };
}
function decode(value: any): any {
  if (value && typeof value === 'object') {
    if (typeof value.$date === 'string') return Timestamp.fromDate(new Date(value.$date));
    if (Array.isArray(value)) return value.map(decode);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decode(child)]));
  }
  return value;
}
function snapshot(ref: DocumentReference, row?: StoredRow | null) {
  return { id: ref.id, ref, version: row?.version || 0, exists: () => !!row, data: () => row ? decode(row.data) : undefined };
}
async function request(action: string, payload: Record<string, unknown>): Promise<any> {
  return opsflowRequest('/api/data', { action, payload });
}
export async function getDoc(ref: DocumentReference) {
  return snapshot(ref, await request('get', ref));
}
export async function getDocs(q: Query) {
  const company = q.filters?.find(f => f.field === 'companyId')?.value;
  const rows: StoredRow[] = await request('list', { collection: q.collection, ...(company ? { companyId: company } : {}) });
  const docs = rows.filter(row => (q.filters || []).every(f => row.data[f.field] === f.value))
    .map(row => snapshot({ id: row.id, collection: q.collection, path: q.collection + '/' + row.id }, row));
  return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn: (d: ReturnType<typeof snapshot>) => void) => docs.forEach(fn) };
}
export function onSnapshot(target: Query, next: (s: Awaited<ReturnType<typeof getDocs>>) => void, error?: (e: unknown) => void): () => void;
export function onSnapshot(target: DocumentReference, next: (s: Awaited<ReturnType<typeof getDoc>>) => void, error?: (e: unknown) => void): () => void;
export function onSnapshot(target: Query | DocumentReference, next: (s: any) => void, error?: (e: unknown) => void) {
  let alive = true;
  let running = false;
  const read = async () => {
    if (running) return;
    running = true;
    try { const result = 'id' in target ? await getDoc(target) : await getDocs(target); if (alive) next(result); }
    catch (e) { if (alive) error?.(e); }
    finally { running = false; }
  };
  void read();
  const timer = setInterval(() => { void read(); }, 15_000);
  return () => { alive = false; clearInterval(timer); };
}
function batch() {
  const operations: any[] = [];
  return {
    set: (ref: DocumentReference, data: unknown, options?: { merge?: boolean }) => { operations.push({ ...ref, kind: 'set', data, merge: options?.merge || false }); },
    update: (ref: DocumentReference, data: unknown) => { operations.push({ ...ref, kind: 'update', data }); },
    delete: (ref: DocumentReference) => { operations.push({ ...ref, kind: 'delete' }); },
    commit: async (reads: any[] = []) => request('commit', { operations, reads }),
  };
}
export const writeBatch = (_db: unknown) => batch();
export async function setDoc(ref: DocumentReference, data: unknown, options?: { merge?: boolean }) { const b = batch(); b.set(ref, data, options); await b.commit(); }
export async function updateDoc(ref: DocumentReference, data: unknown) { const b = batch(); b.update(ref, data); await b.commit(); }
export async function deleteDoc(ref: DocumentReference) { const b = batch(); b.delete(ref); await b.commit(); }
export async function addDoc(q: Query, data: unknown) { const ref = doc(q); await setDoc(ref, data); return ref; }
export async function runTransaction<T>(_db: unknown, callback: (tx: { get: typeof getDoc; set: ReturnType<typeof batch>['set']; update: ReturnType<typeof batch>['update']; delete: ReturnType<typeof batch>['delete'] }) => Promise<T>) {
  const b = batch(); const reads: any[] = [];
  const result = await callback({ ...b, get: async ref => { const row = await getDoc(ref); reads.push({ collection: ref.collection, id: ref.id, version: row.version }); return row; } });
  await b.commit(reads);
  return result;
}
