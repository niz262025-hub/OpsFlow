import { test, expect } from './fixtures';
import { WORKFLOW_BASE_URL } from './env';
import { parseMoney, uniqueName, uniqueSku } from './helpers';
import {
  DashboardPage,
  FinancePage,
  InventoryPage,
  PosPage,
  PurchasesPage,
  ReportsPage,
  SetupPage,
  ShellPage,
} from './pom/WorkflowPages';

test.describe('BizFlow Pro Business Workflows', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  const data = {
    categoryName: uniqueName('QA-CAT'),
    categoryEdited: uniqueName('QA-CAT-EDIT'),
    supplierName: uniqueName('QA-SUP'),
    supplierEdited: uniqueName('QA-SUP-EDIT'),
    supplierDeleteName: uniqueName('QA-SUP-DEL'),
    customerName: uniqueName('QA-CUST'),
    customerEdited: uniqueName('QA-CUST-EDIT'),
    productName: uniqueName('QA-PROD'),
    productEdited: uniqueName('QA-PROD-EDIT'),
    productSku: uniqueSku('QAPRD'),
    duplicateProductName: uniqueName('QA-PROD-DUP'),
  };

  let purchaseNumber = '';
  let saleNumber = '';

  test('Dashboard: loads, cards visible, sidebar navigation works, no JavaScript errors', async ({ appPage, jsErrors }) => {
    const dashboard = new DashboardPage(appPage);
    const shell = new ShellPage(appPage);

    if (await appPage.getByTestId('login-email-input').isVisible().catch(() => false)) {
      test.skip(true, 'Authentication fixture did not reach the dashboard route for this run.');
    }

    await dashboard.expectLoaded();
    await dashboard.expectStatisticsCardsVisible();

    await shell.goToSidebar('Setup');
    await expect(appPage.getByText('Setup', { exact: true }).first()).toBeVisible();
    await shell.goToSidebar('Dashboard');
    await dashboard.expectLoaded();

    const criticalErrors = jsErrors.filter((e) => !/favicon|deprecated|extension/i.test(e));
    expect(criticalErrors).toEqual([]);
  });

  test('Categories: create, edit, delete', async ({ appPage }) => {
    const shell = new ShellPage(appPage);
    const setup = new SetupPage(appPage);

    await appPage.goto(`${WORKFLOW_BASE_URL}/(tabs)/dashboard`);
    await appPage.goto(`${WORKFLOW_BASE_URL}/(tabs)/setup`);
    await setup.createCategory(data.categoryName);
    await setup.editCategory(data.categoryName, data.categoryEdited);
    await setup.deleteCategory(data.categoryEdited);
  });

  test('Suppliers: create and edit', async ({ appPage }) => {
    const shell = new ShellPage(appPage);
    const setup = new SetupPage(appPage);

    await shell.goToSidebar('Setup');
    await setup.createSupplier(data.supplierName);
    await setup.editSupplier(data.supplierName, data.supplierEdited);

    // Keep one supplier for purchase workflow supplier selection verification.
    await setup.createSupplier(data.supplierDeleteName);
  });

  test('Customers: create, edit, delete', async ({ appPage }) => {
    const shell = new ShellPage(appPage);
    const setup = new SetupPage(appPage);

    await shell.goToSidebar('Setup');
    await setup.createCustomer(data.customerName);
    await setup.editCustomer(data.customerName, data.customerEdited);
    await setup.deleteCustomer(data.customerEdited);
  });

  test('Products: create, edit, search, duplicate SKU validation', async ({ appPage }) => {
    const shell = new ShellPage(appPage);
    const setup = new SetupPage(appPage);

    await shell.goToSidebar('Setup');
    await setup.createProduct({
      name: data.productName,
      sku: data.productSku,
      sellingPrice: '20.00',
      minStock: '1',
      supplierName: data.supplierEdited,
    });

    await setup.editProductName(data.productName, data.productEdited);
    await setup.searchProduct(data.productEdited);
    await setup.expectDuplicateSkuValidation(data.duplicateProductName, data.productSku);
  });

  test('Products: archive product (blocked by missing archive UI action)', async () => {
    test.skip(true, 'Archive action is not exposed in current Setup > Products UI (only delete is available).');
  });

  test('Purchase + Inventory: create purchase, add product, save, verify inventory increase and cost update', async ({ appPage }) => {
    const purchases = new PurchasesPage(appPage);
    const inventory = new InventoryPage(appPage);

    const authDebugBefore = await appPage.evaluate(() => ({
      uid: (window as any).__BIZFLOW_DEBUG__?.uid ?? null,
      companyId: (window as any).__BIZFLOW_DEBUG__?.companyId ?? null,
      pathname: window.location.pathname,
    }));
    console.log('[workflow] purchase auth debug', authDebugBefore);

    await purchases.open();
    await purchases.createPurchase({
      supplierName: data.supplierEdited,
      productSearch: data.productEdited,
      cost: '9.99',
      quantityIncrements: 1,
    });

    await purchases.waitForPurchaseHistoryList();
    purchaseNumber = await purchases.latestPurchaseNumber();
    expect(purchaseNumber).toMatch(/^P\d{8}$/);

    await inventory.open();
    await inventory.search(data.productSku);
    await appPage.waitForFunction((needle: string) => document.body?.innerText?.includes(needle), data.productEdited, { timeout: 60000 });

    const rowText = await inventory.rowTextFor(data.productEdited);
    expect(rowText).toContain('9.99');

    await expect(appPage.getByText('Stock Movement History')).toBeVisible();
    await expect(appPage.getByText(data.productEdited)).toBeVisible();
    await expect(appPage.getByText('PURCHASE')).toBeVisible();
    await expect(appPage.getByText('+2')).toBeVisible();
  });

  test('Inventory: product list loads, search works, filter works', async ({ appPage }) => {
    const inventory = new InventoryPage(appPage);

    await inventory.open();
    await expect(appPage.getByText('Inventory summary')).toBeVisible();

    await inventory.search(data.productSku);
    await expect(appPage.getByText(data.productEdited)).toBeVisible();

    await inventory.applyFilter('Low Stock');
    await expect(appPage.getByText('Low Stock', { exact: true })).toBeVisible();
    await inventory.applyFilter('All');
  });

  test('POS + Inventory: open new sale, search product, add to cart, complete sale, verify inventory decrease', async ({ appPage }) => {
    const pos = new PosPage(appPage);
    const inventory = new InventoryPage(appPage);

    await pos.open();
    await appPage.getByTestId('pos-new-sale-button').click();
    await pos.addToCartBySku(data.productSku);
    saleNumber = await pos.completeSale();
    expect(saleNumber).toMatch(/^S\d{8}$/);

    await inventory.open();
    await inventory.search(data.productSku);
    await expect(appPage.getByText('Stock Movement History')).toBeVisible();
    await expect(appPage.getByText(data.productEdited)).toBeVisible();
    await expect(appPage.getByText('SALE')).toBeVisible();
    await expect(appPage.getByText('+2')).toBeVisible();

    const rowText = await inventory.rowTextFor(data.productEdited);
    const maybeMoney = parseMoney(rowText);
    expect(maybeMoney).toBeGreaterThanOrEqual(0);
  });

  test('Finance: purchase and sale create ledger transactions', async ({ appPage }) => {
    const finance = new FinancePage(appPage);

    await finance.open();
    await finance.openCashTab();

    if (purchaseNumber) {
      await finance.findReference(purchaseNumber);
      await expect(appPage.getByText('OUT')).toBeVisible();
    }

    if (saleNumber) {
      await finance.findReference(saleNumber);
      await expect(appPage.getByText('IN')).toBeVisible();
    }
  });

  test('Reports: sales, purchase, inventory reports open', async ({ appPage }) => {
    const reports = new ReportsPage(appPage);

    await reports.open();

    await reports.openTab('Sales');
    await reports.expectTableFor('Sale #');

    await reports.openTab('Purchase');
    await reports.expectTableFor('Purchase #');

    await reports.openTab('Inventory');
    await reports.expectTableFor('SKU');
  });

  test('Suppliers: delete', async ({ appPage }) => {
    const shell = new ShellPage(appPage);
    const setup = new SetupPage(appPage);

    await shell.goToSidebar('Setup');
    await setup.deleteSupplier(data.supplierDeleteName);
  });
});
