import { collection, doc, runTransaction, serverTimestamp } from './documentStore';

/** Records a full return after the merchant returns payment; no payment is transmitted. */
export async function recordSaleRefund(db: unknown, companyId: string, actorId: string, saleId: string, reason: string) {
  const note = reason.trim();
  if (!companyId || !actorId || !saleId || !note || note.length > 200) throw new Error('Enter a refund reason (1–200 characters).');
  return runTransaction(db, async tx => {
    const saleRef = doc(db, 'sales', saleId);
    const saleSnapshot = await tx.get(saleRef);
    const sale = saleSnapshot.data();
    if (!sale || sale.companyId !== companyId) throw new Error('Sale not found in this company.');
    if (sale.status === 'REFUNDED' || sale.refundedAt) throw new Error('This sale has already been refunded.');
    if (!Array.isArray(sale.items) || !sale.items.length || !Number.isFinite(sale.total) || sale.total < 0) throw new Error('Invalid original sale.');
    const quantities = new Map<string, number>();
    for (const item of sale.items) {
      if (!item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Invalid original sale quantity.');
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }
    const products = [];
    for (const [id, quantity] of quantities) {
      const ref = doc(db, 'products', id);
      const product = (await tx.get(ref)).data();
      if (!product || product.companyId !== companyId || !Number.isFinite(product.stock)) throw new Error('Original product is unavailable in this company.');
      products.push({ ref, quantity, name: product.name, stock: product.stock + quantity });
    }
    const cash = sale.paymentMethod === 'Cash';
    if (!cash) {
      if (!['QR', 'Bank Transfer', 'Transfer'].includes(sale.paymentMethod) || !sale.bankAccountId) throw new Error('Review the original payment account before refunding this sale.');
      const bank = (await tx.get(doc(db, 'bank_accounts', sale.bankAccountId))).data();
      if (!bank || bank.companyId !== companyId) throw new Error('Original payment account is unavailable.');
    }
    const ledger = doc(db, cash ? 'cash_ledger' : 'bank_ledger', `refund-${saleId}`);
    if ((await tx.get(ledger)).exists()) throw new Error('This sale has already been refunded.');
    const reference = `RF-${sale.saleNumber || saleId}`;
    tx.update(saleRef, { status: 'REFUNDED', refundedAt: serverTimestamp(), refundedBy: actorId, refundReason: note, refundReference: reference });
    for (const product of products) {
      tx.update(product.ref, { stock: product.stock });
      tx.set(doc(collection(db, 'stock_movements')), { companyId, productId: product.ref.id, productName: product.name, type: 'RETURN', quantity: product.quantity, stockAfter: product.stock, referenceId: saleId, note, createdAt: serverTimestamp() });
    }
    tx.set(ledger, { companyId, ...(cash ? {} : { bankAccountId: sale.bankAccountId }), type: cash ? 'out' : 'withdrawal', amount: Math.round(sale.total * 100) / 100, reference, saleId, note, date: serverTimestamp(), createdAt: serverTimestamp() });
    return reference;
  });
}
