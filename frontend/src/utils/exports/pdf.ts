// Professional PDF generation using expo-print + expo-sharing.
// A4 layout, printable, share/save/print supported cross-platform.
//
// Usage:
//   import { generateInvoicePDF, generatePurchaseOrderPDF, generateFinancialReportPDF } from '@/src/utils/exports/pdf';
//   await generateInvoicePDF(sale, company);

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Company, Purchase, Sale } from '@/src/contexts/DataContext';
import { formatMYR } from '@/src/utils/currency';

const escape = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDate = (ts: any): string => {
  const d = ts?.toDate?.() || (ts instanceof Date ? ts : new Date());
  return d.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// -------- Shared A4 chrome --------
const wrapHtml = (title: string, body: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escape(title)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #0F172A; font-size: 12px; margin: 0; }
  .hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #2563EB; }
  .hd .brand { }
  .hd .brand h1 { color: #2563EB; font-size: 24px; margin: 0 0 4px 0; letter-spacing: -0.5px; }
  .hd .brand p { margin: 2px 0; color: #64748B; font-size: 11px; }
  .hd .doc { text-align: right; }
  .hd .doc h2 { color: #0F172A; font-size: 20px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px; }
  .hd .doc .meta { color: #64748B; font-size: 11px; margin: 2px 0; }
  .hd .doc .num { color: #2563EB; font-weight: 700; font-size: 13px; }
  .party { display: flex; gap: 24px; margin: 24px 0 20px; }
  .party .box { flex: 1; padding: 12px 14px; background: #F1F5F9; border-radius: 8px; border-left: 3px solid #2563EB; }
  .party .box .label { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-weight: 700; }
  .party .box .name { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
  .party .box .info { font-size: 11px; color: #475569; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #2563EB; color: #FFF; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  th.r, td.r { text-align: right; }
  th.c, td.c { text-align: center; }
  td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
  tbody tr:nth-child(even) { background: #F8FAFC; }
  .totals { margin-top: 12px; margin-left: auto; width: 50%; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 12px; }
  .totals .row.sep { border-top: 1px solid #E2E8F0; margin-top: 4px; padding-top: 10px; }
  .totals .row.grand { background: #2563EB; color: #FFF; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 15px; font-weight: 800; }
  .totals .row.grand .label { text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
  .pay { margin: 20px 0; padding: 12px 14px; background: #DBEAFE; border-radius: 8px; font-size: 11px; }
  .pay strong { color: #2563EB; }
  .foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 10px; line-height: 1.6; }
  .stamp { display: inline-block; padding: 8px 18px; border: 2px solid #10B981; color: #10B981; font-weight: 800; font-size: 14px; letter-spacing: 2px; border-radius: 6px; transform: rotate(-4deg); }
  .stat { font-weight: 800; font-size: 13px; }
  .stat.pos { color: #10B981; }
  .stat.neg { color: #EF4444; }
  h3.section { font-size: 14px; color: #0F172A; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #2563EB; }
  .kpis { display: flex; gap: 12px; margin: 12px 0; }
  .kpis .card { flex: 1; padding: 14px; background: #F1F5F9; border-radius: 8px; border-left: 3px solid #2563EB; }
  .kpis .card .l { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-weight: 700; }
  .kpis .card .v { font-size: 17px; font-weight: 800; color: #0F172A; }
</style>
</head>
<body>
${body}
</body>
</html>`;

// -------- Header component --------
const companyBox = (company: Company | null) => `
<div class="hd">
  <div class="brand">
    <h1>${escape(company?.name || 'BizFlow Pro')}</h1>
    ${company?.ssmNumber ? `<p>SSM: ${escape(company.ssmNumber)}</p>` : ''}
    ${company?.address ? `<p>${escape(company.address)}</p>` : ''}
    ${company?.phone ? `<p>Tel: ${escape(company.phone)}${company?.email ? ` · ${escape(company.email)}` : ''}</p>` : ''}
  </div>
  <div class="doc">
    <h2>{{DOC_TYPE}}</h2>
    <div class="num">{{DOC_NUMBER}}</div>
    <div class="meta">Date: {{DOC_DATE}}</div>
  </div>
</div>
`;

// ================= INVOICE / RECEIPT =================
export function buildInvoiceHtml(sale: Sale, company: Company | null): string {
  const rows = sale.items
    .map(
      (i) => `
      <tr>
        <td>${escape(i.productName)}<br/><span style="color:#94A3B8;font-size:10px;">${escape(i.sku)}</span></td>
        <td class="c">${i.quantity}</td>
        <td class="r">${escape(formatMYR(i.unitPrice))}</td>
        <td class="r"><strong>${escape(formatMYR(i.total))}</strong></td>
      </tr>
    `,
    )
    .join('');

  const body = companyBox(company)
    .replace('{{DOC_TYPE}}', 'Tax Invoice')
    .replace('{{DOC_NUMBER}}', escape(sale.saleNumber))
    .replace('{{DOC_DATE}}', escape(formatDate(sale.createdAt))) + `
  <div class="party">
    <div class="box">
      <div class="label">Bill To</div>
      <div class="name">${escape(sale.customerName || 'Walk-in Customer')}</div>
    </div>
    <div class="box">
      <div class="label">Payment</div>
      <div class="name">${escape(sale.paymentMethod)}</div>
      ${sale.cashier ? `<div class="info">Cashier: ${escape(sale.cashier)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:52%">Item</th>
        <th class="c" style="width:10%">Qty</th>
        <th class="r" style="width:18%">Unit Price</th>
        <th class="r" style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${escape(formatMYR(sale.subtotal))}</span></div>
    <div class="row"><span>Discount</span><span>- ${escape(formatMYR(sale.discount))}</span></div>
    <div class="row"><span>Tax</span><span>+ ${escape(formatMYR(sale.tax))}</span></div>
    <div class="row grand"><span class="label">Grand Total</span><span>${escape(formatMYR(sale.total))}</span></div>
  </div>

  <div class="pay">
    <strong>PAID</strong> · via ${escape(sale.paymentMethod)} · ${escape(formatDate(sale.createdAt))}
  </div>

  <div style="text-align:center;margin-top:32px;"><span class="stamp">PAID</span></div>

  <div class="foot">
    Thank you for your business!<br/>
    ${escape(company?.name || 'BizFlow Pro')} · Generated by BizFlow Pro
  </div>
  `;

  return wrapHtml(`Invoice ${sale.saleNumber}`, body);
}

// Thermal-friendly 80mm receipt
export function buildReceiptHtml(sale: Sale, company: Company | null): string {
  const rows = sale.items
    .map((i) => `<tr><td>${escape(i.productName)}<br/><span style="font-size:9px;color:#666">${i.quantity} × ${escape(formatMYR(i.unitPrice))}</span></td><td style="text-align:right;">${escape(formatMYR(i.total))}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: monospace; font-size: 11px; color: #000; width: 72mm; margin: 0; }
    .c { text-align: center; }
    .r { text-align: right; }
    h1 { font-size: 14px; margin: 4px 0; text-align: center; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
    .big { font-size: 14px; font-weight: bold; }
  </style></head><body>
    <h1>${escape(company?.name || 'BizFlow Pro')}</h1>
    ${company?.ssmNumber ? `<div class="c">SSM: ${escape(company.ssmNumber)}</div>` : ''}
    ${company?.phone ? `<div class="c">${escape(company.phone)}</div>` : ''}
    <hr />
    <div><strong>Receipt: ${escape(sale.saleNumber)}</strong></div>
    <div>${escape(formatDate(sale.createdAt))}</div>
    ${sale.cashier ? `<div>Cashier: ${escape(sale.cashier)}</div>` : ''}
    ${sale.customerName ? `<div>Customer: ${escape(sale.customerName)}</div>` : ''}
    <hr />
    <table>${rows}</table>
    <hr />
    <table>
      <tr><td>Subtotal</td><td class="r">${escape(formatMYR(sale.subtotal))}</td></tr>
      <tr><td>Discount</td><td class="r">- ${escape(formatMYR(sale.discount))}</td></tr>
      <tr><td>Tax</td><td class="r">+ ${escape(formatMYR(sale.tax))}</td></tr>
      <tr class="big"><td>TOTAL</td><td class="r">${escape(formatMYR(sale.total))}</td></tr>
      <tr><td>Payment</td><td class="r">${escape(sale.paymentMethod)}</td></tr>
    </table>
    <hr />
    <div class="c">Thank you!</div>
    <div class="c" style="font-size:9px;color:#666;margin-top:6px;">Powered by BizFlow Pro</div>
  </body></html>`;
}

// ================= PURCHASE ORDER =================
export function buildPurchaseOrderHtml(purchase: Purchase, company: Company | null): string {
  const rows = purchase.items
    .map(
      (i) => `
      <tr>
        <td>${escape(i.productName)}<br/><span style="color:#94A3B8;font-size:10px;">${escape(i.sku)}</span></td>
        <td class="c">${i.quantity}</td>
        <td class="r">${escape(formatMYR(i.costPrice))}</td>
        <td class="r"><strong>${escape(formatMYR(i.total))}</strong></td>
      </tr>
    `,
    )
    .join('');

  const body = companyBox(company)
    .replace('{{DOC_TYPE}}', 'Purchase Order')
    .replace('{{DOC_NUMBER}}', escape(purchase.purchaseNumber))
    .replace('{{DOC_DATE}}', escape(formatDate(purchase.createdAt))) + `
  <div class="party">
    <div class="box">
      <div class="label">Supplier</div>
      <div class="name">${escape(purchase.supplierName || 'Direct Purchase')}</div>
    </div>
    <div class="box">
      <div class="label">Delivery Address</div>
      <div class="info">${escape(company?.address || '—')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:52%">Item</th>
        <th class="c" style="width:10%">Qty</th>
        <th class="r" style="width:18%">Unit Cost</th>
        <th class="r" style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${escape(formatMYR(purchase.subtotal))}</span></div>
    <div class="row"><span>Discount</span><span>- ${escape(formatMYR(purchase.discount))}</span></div>
    <div class="row"><span>Tax</span><span>+ ${escape(formatMYR(purchase.tax))}</span></div>
    <div class="row grand"><span class="label">Grand Total</span><span>${escape(formatMYR(purchase.total))}</span></div>
  </div>

  <h3 class="section">Terms & Signature</h3>
  <div style="display:flex;gap:24px;margin-top:20px;">
    <div style="flex:1;">
      <div style="border-top:1px solid #94A3B8;padding-top:8px;text-align:center;font-size:11px;color:#64748B;">Authorised by (Buyer)</div>
    </div>
    <div style="flex:1;">
      <div style="border-top:1px solid #94A3B8;padding-top:8px;text-align:center;font-size:11px;color:#64748B;">Received by (Supplier)</div>
    </div>
  </div>

  <div class="foot">
    Purchase Order · ${escape(company?.name || 'BizFlow Pro')}<br/>
    Generated by BizFlow Pro
  </div>
  `;

  return wrapHtml(`Purchase Order ${purchase.purchaseNumber}`, body);
}

// ================= FINANCIAL REPORT =================
export function buildFinancialReportHtml(input: {
  company: Company | null;
  rangeLabel: string;
  from: Date;
  to: Date;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  purchaseTotal: number;
  paymentBreakdown: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
}): string {
  const { company, rangeLabel, from, to, revenue, cogs, grossProfit, expenses, netProfit, purchaseTotal, paymentBreakdown, topProducts } = input;
  const netCashFlow = revenue - purchaseTotal - expenses;

  const topRows = topProducts.slice(0, 15).map((p, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${escape(p.name)}</td>
      <td class="c">${p.qty}</td>
      <td class="r"><strong>${escape(formatMYR(p.revenue))}</strong></td>
    </tr>`).join('');

  const paymentRows = Object.entries(paymentBreakdown).map(([k, v]) => `
    <tr>
      <td>${escape(k)}</td>
      <td class="r">${escape(formatMYR(v))}</td>
      <td class="r">${revenue > 0 ? ((v / revenue) * 100).toFixed(1) : '0.0'}%</td>
    </tr>`).join('');

  const body = companyBox(company)
    .replace('{{DOC_TYPE}}', 'Financial Report')
    .replace('{{DOC_NUMBER}}', escape(rangeLabel))
    .replace('{{DOC_DATE}}', `${from.toLocaleDateString('en-MY')} - ${to.toLocaleDateString('en-MY')}`) + `

  <div class="kpis">
    <div class="card"><div class="l">Revenue</div><div class="v">${escape(formatMYR(revenue))}</div></div>
    <div class="card"><div class="l">Gross Profit</div><div class="v">${escape(formatMYR(grossProfit))}</div></div>
    <div class="card"><div class="l">Net Profit</div><div class="v" style="color:${netProfit >= 0 ? '#10B981' : '#EF4444'}">${escape(formatMYR(netProfit))}</div></div>
  </div>

  <h3 class="section">Profit &amp; Loss Statement</h3>
  <table>
    <tbody>
      <tr><td>Revenue (Total Sales)</td><td class="r stat pos">${escape(formatMYR(revenue))}</td></tr>
      <tr><td>Cost of Goods Sold (COGS)</td><td class="r stat neg">- ${escape(formatMYR(cogs))}</td></tr>
      <tr style="background:#DBEAFE;font-weight:800;"><td>Gross Profit</td><td class="r">${escape(formatMYR(grossProfit))}</td></tr>
      <tr><td>Operating Expenses</td><td class="r stat neg">- ${escape(formatMYR(expenses))}</td></tr>
      <tr style="background:#2563EB;color:#FFF;font-weight:800;"><td>NET PROFIT</td><td class="r">${escape(formatMYR(netProfit))}</td></tr>
    </tbody>
  </table>

  <h3 class="section">Cash Flow Summary</h3>
  <table>
    <tbody>
      <tr><td>Cash In (from Sales)</td><td class="r stat pos">+ ${escape(formatMYR(revenue))}</td></tr>
      <tr><td>Cash Out (Purchases / Stock)</td><td class="r stat neg">- ${escape(formatMYR(purchaseTotal))}</td></tr>
      <tr><td>Cash Out (Expenses)</td><td class="r stat neg">- ${escape(formatMYR(expenses))}</td></tr>
      <tr style="background:#DBEAFE;font-weight:800;"><td>Net Cash Flow</td><td class="r ${netCashFlow >= 0 ? 'stat pos' : 'stat neg'}">${escape(formatMYR(netCashFlow))}</td></tr>
    </tbody>
  </table>

  <h3 class="section">Sales by Payment Method</h3>
  <table>
    <thead><tr><th>Method</th><th class="r">Amount</th><th class="r">% of Revenue</th></tr></thead>
    <tbody>${paymentRows || '<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:20px;">No sales in this period</td></tr>'}</tbody>
  </table>

  <h3 class="section">Top Selling Products</h3>
  <table>
    <thead><tr><th class="c" style="width:8%">#</th><th>Product</th><th class="c" style="width:15%">Qty Sold</th><th class="r" style="width:22%">Revenue</th></tr></thead>
    <tbody>${topRows || '<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:20px;">No sales in this period</td></tr>'}</tbody>
  </table>

  <div class="foot">
    Confidential · For internal use only<br/>
    ${escape(company?.name || 'BizFlow Pro')} · Generated ${escape(formatDate(new Date()))}
  </div>
  `;

  return wrapHtml('Financial Report', body);
}

// -------- Actions --------
export type PdfAction = 'share' | 'print';

/** Generate PDF from HTML and hand off via share sheet OR direct-print dialog. */
export async function renderPDF(html: string, filename: string, action: PdfAction = 'share'): Promise<string | null> {
  if (action === 'print') {
    // Native print dialog. Falls back to share on unsupported platforms.
    try {
      await Print.printAsync({ html });
      return null;
    } catch (e) {
      // fall through to share
    }
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  // rename to friendly filename in same tmp dir (best-effort; sharing dialog shows this name)
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetUri = uri.replace(/[^/]+\.pdf$/, `${safeName}.pdf`);
  try {
    const FS = await import('expo-file-system/legacy').catch(() => null as any);
    if (FS?.moveAsync) {
      await FS.moveAsync({ from: uri, to: targetUri });
    }
  } catch {}
  const finalUri = targetUri;

  if (Platform.OS === 'web') {
    // On web the "uri" is a data URI; open in new tab
    if (typeof window !== 'undefined') window.open(finalUri, '_blank');
    return finalUri;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
  }
  return finalUri;
}

// Convenience wrappers
export const generateInvoicePDF = (sale: Sale, company: Company | null, action: PdfAction = 'share') =>
  renderPDF(buildInvoiceHtml(sale, company), `Invoice-${sale.saleNumber}`, action);

export const generateReceiptPDF = (sale: Sale, company: Company | null, action: PdfAction = 'share') =>
  renderPDF(buildReceiptHtml(sale, company), `Receipt-${sale.saleNumber}`, action);

export const generatePurchaseOrderPDF = (purchase: Purchase, company: Company | null, action: PdfAction = 'share') =>
  renderPDF(buildPurchaseOrderHtml(purchase, company), `PO-${purchase.purchaseNumber}`, action);

export const generateFinancialReportPDF = (input: Parameters<typeof buildFinancialReportHtml>[0], action: PdfAction = 'share') =>
  renderPDF(buildFinancialReportHtml(input), `Financial-Report-${input.rangeLabel}`, action);
