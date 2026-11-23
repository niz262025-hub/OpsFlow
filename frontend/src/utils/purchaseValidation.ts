type Line = { productId: string; productName: string; sku: string; quantity: number; unitCost: number; receivedQuantity?: number };
export function purchaseLines(items: Line[]) {
  if (!items.length) throw new Error('Add at least one product.');
  const ids = new Set<string>();
  return items.map(item => {
    if (!item.productId || ids.has(item.productId)) throw new Error('Select each product only once.');
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitCost) || item.unitCost < 0) throw new Error('Enter a positive quantity and a valid non-negative unit cost.');
    ids.add(item.productId);
    return { ...item, total: Math.round(item.quantity * item.unitCost * 100) / 100 };
  });
}

export function receiptLines(order: { status: string; items: Line[] }, incoming: { productId: string; receivedQuantity: number }[]) {
  if (['Closed', 'Fully Received'].includes(order.status)) throw new Error('This order cannot receive more goods.');
  if (!incoming.length) throw new Error('Enter at least one received quantity.');
  const ids = new Set<string>();
  return incoming.map(row => {
    const item = order.items.find(line => line.productId === row.productId);
    if (!item || ids.has(row.productId)) throw new Error('Received product must match one order line.');
    const remaining = item.quantity - (item.receivedQuantity || 0);
    if (!Number.isFinite(row.receivedQuantity) || row.receivedQuantity <= 0 || row.receivedQuantity > remaining) throw new Error('Received quantity must be positive and cannot exceed the outstanding quantity.');
    ids.add(row.productId);
    return { productId: item.productId, productName: item.productName, sku: item.sku, orderedQuantity: item.quantity, receivedQuantity: row.receivedQuantity, unitCost: item.unitCost, total: Math.round(row.receivedQuantity * item.unitCost * 100) / 100 };
  });
}
