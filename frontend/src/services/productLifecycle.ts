import { doc, runTransaction } from './documentStore';

/** Reversible catalog deletion; inventory and receipt history remain auditable. */
export async function setProductArchived(db: unknown, companyId: string, productId: string, archived: boolean) {
  if (!companyId || !productId) throw new Error('Select a product in the current company.');
  await runTransaction(db, async tx => {
    const ref = doc(db, 'products', productId);
    const product = (await tx.get(ref)).data();
    if (!product || product.companyId !== companyId) throw new Error('Product not found in this company.');
    if (archived && (product.stock !== 0 || (product.reservedStock ?? 0) !== 0)) {
      throw new Error('Clear product stock and reservations before deleting. Stock history will be retained.');
    }
    tx.update(ref, { status: archived ? 'archived' : 'active' });
  });
}

export function assertSellableProduct(product: { companyId?: string; status?: string } | undefined, companyId: string) {
  if (!product || product.companyId !== companyId || product.status !== 'active') {
    throw new Error('Product is no longer available for sale. Remove it from the cart and refresh.');
  }
}
