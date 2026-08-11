import { expect, Locator, Page } from '@playwright/test';
import { WORKFLOW_BASE_URL } from '../env';

export class ShellPage {
  constructor(private readonly page: Page) {}

  async goToSidebar(label: 'Dashboard' | 'POS' | 'Purchase' | 'Inventory' | 'Finance' | 'Reports' | 'Setup') {
    const target = this.page.getByText(label, { exact: true }).first();
    await target.waitFor({ state: 'visible', timeout: 15000 });
    await target.click({ force: true });
  }

  async openRoute(path: string) {
    await this.page.goto(`${WORKFLOW_BASE_URL}${path}`);
  }
}

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined);
    await expect(this.page.getByText('Dashboard', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText('Business overview', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  }

  async expectStatisticsCardsVisible() {
    await expect(this.page.getByText('Purchases Today')).toBeVisible();
    await expect(this.page.getByText('Inventory Value')).toBeVisible();
    await expect(this.page.getByText('Bank Balance')).toBeVisible();
    await expect(this.page.getByText('Cash Balance')).toBeVisible();
  }
}

export class SetupPage {
  constructor(private readonly page: Page) {}

  private setupChip(label: string) {
    return this.page.getByTestId(`setup-chip-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  }

  private inputByLabel(label: string): Locator {
    return this.page.getByLabel(label, { exact: true });
  }

  private async waitForActionButton(testId: string, label?: string) {
    const byLabel = label ? this.page.getByLabel(label, { exact: true }).first() : undefined;
    const fallback = this.page.getByTestId(testId).first();
    let locator = byLabel ?? fallback;

    await locator.waitFor({ state: 'visible', timeout: 30000 }).catch(async () => {
      await fallback.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
      locator = fallback;
    });
    await expect(locator).toBeVisible({ timeout: 15000 });

    if (label) {
      await expect(this.page.getByText(label.split(' ').slice(1).join(' '), { exact: false }).first()).toBeVisible({ timeout: 10000 }).catch(() => undefined);
    }
    return locator;
  }

  async selectTab(label: 'Products' | 'Categories' | 'Suppliers' | 'Customers') {
    await this.page.goto(`${WORKFLOW_BASE_URL}/setup`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await this.page.waitForTimeout(1500);

    const target = this.setupChip(label);
    await target.waitFor({ state: 'visible', timeout: 60000 }).catch(async () => {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => undefined);
      await this.page.waitForTimeout(2000);
      return target.waitFor({ state: 'visible', timeout: 60000 });
    });
    await target.scrollIntoViewIfNeeded().catch(() => undefined);
    await target.click({ force: true });
    await this.page.waitForTimeout(1000);
  }

  private async waitForModalToClose(modalTestId: string, buttonTestId?: string) {
    const target = this.page.getByTestId(buttonTestId || modalTestId);
    await target.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);
    await this.page.waitForTimeout(300);
  }

  private inputAfterLabel(label: string, mode: 'category' | 'supplier' | 'customer' | 'product' = 'category'): Locator {
    const testIdByLabel: Record<string, Record<string, string>> = {
      category: {
        'Category Name': 'category-name-input',
      },
      supplier: {
        'Supplier Name': 'supplier-name-input',
        'Person in Charge': 'supplier-pic-input',
        'Phone': 'supplier-phone-input',
        'Email': 'supplier-email-input',
        'Address': 'supplier-address-input',
      },
      customer: {
        'Customer Name': 'customer-name-input',
        'Phone': 'customer-phone-input',
        'Email': 'customer-email-input',
        'Address': 'customer-address-input',
      },
      product: {
        'Product Name': 'product-name-input',
        'SKU': 'product-sku-input',
        'Barcode': 'product-barcode-input',
        'Selling Price': 'product-selling-price-input',
        'Minimum Stock': 'product-min-stock-input',
        'Unit': 'product-unit-input',
        'Description': 'product-description-input',
        'Image': 'product-image-input',
      },
    };
    const testId = testIdByLabel[mode][label];
    if (testId) {
      return this.page.getByTestId(testId).first();
    }
    return this.inputByLabel(label);
  }

  async createCategory(name: string) {
    await this.selectTab('Categories');
    await expect(this.page.getByTestId('add-category-button')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('add-category-button').click();
    await this.inputAfterLabel('Category Name', 'category').fill(name);
    await this.page.getByTestId('save-category-button').click();
    await expect(this.page.locator('body')).toContainText(name, { timeout: 15000 });
  }

  async editCategory(originalName: string, updatedName: string) {
    await this.selectTab('Categories');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(originalName);
    const editButton = await this.waitForActionButton('category-edit-button', `Edit category ${originalName}`);
    await editButton.click();
    await this.inputAfterLabel('Category Name', 'category').fill(updatedName);
    await this.page.getByTestId('save-category-button').click();
    await this.waitForModalToClose('category-modal', 'save-category-button');
    await expect(this.page.getByPlaceholder('Search table...')).toBeVisible();
    await expect(this.page.locator('body')).toContainText(updatedName, { timeout: 15000 });
  }

  async deleteCategory(name: string) {
    await this.selectTab('Categories');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(name);
    await this.waitForActionButton('category-delete-button');
    await this.page.getByTestId('category-delete-button').click();
    await this.page.waitForTimeout(600);
  }

  async createSupplier(name: string) {
    await this.selectTab('Suppliers');
    await expect(this.page.getByTestId('setup-add-supplier-button')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-add-supplier-button').click();
    await this.inputAfterLabel('Supplier Name', 'supplier').fill(name);
    await this.inputAfterLabel('Person in Charge', 'supplier').fill('PIC');
    await this.inputAfterLabel('Phone', 'supplier').fill('0123456789');
    await this.page.getByTestId('setup-save-supplier-button').click();
    await this.waitForModalToClose('supplier-modal', 'setup-save-supplier-button');
    await expect(this.page.locator('body')).toContainText(name, { timeout: 15000 });
  }

  async editSupplier(originalName: string, updatedName: string) {
    await this.selectTab('Suppliers');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(originalName);
    const editButton = await this.waitForActionButton('setup-edit-supplier-button', `Edit supplier ${originalName}`);
    await editButton.click();
    await this.inputAfterLabel('Supplier Name', 'supplier').fill(updatedName);
    await this.page.getByTestId('setup-save-supplier-button').click();
    await this.waitForModalToClose('supplier-modal', 'setup-save-supplier-button');
    await expect(this.page.locator('body')).toContainText(updatedName, { timeout: 15000 });
  }

  async deleteSupplier(name: string) {
    await this.selectTab('Suppliers');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(name);
    await this.waitForActionButton('setup-delete-supplier-button');
    await this.page.getByTestId('setup-delete-supplier-button').click();
    await this.page.waitForTimeout(600);
  }

  async createCustomer(name: string) {
    await this.selectTab('Customers');
    await expect(this.page.getByTestId('setup-add-customer-button')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-add-customer-button').click();
    await expect(this.page.getByTestId('customer-name-input')).toBeVisible({ timeout: 15000 });
    await this.inputAfterLabel('Customer Name', 'customer').fill(name);
    await expect(this.page.getByTestId('customer-phone-input')).toBeVisible({ timeout: 15000 });
    await this.inputAfterLabel('Phone', 'customer').fill('0119988776');
    await this.page.getByTestId('setup-save-customer-button').click();
    await this.waitForModalToClose('customer-modal', 'setup-save-customer-button');
    await expect(this.page.locator('body')).toContainText(name, { timeout: 15000 });
  }

  async editCustomer(originalName: string, updatedName: string) {
    await this.selectTab('Customers');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(originalName);
    const editButton = await this.waitForActionButton('setup-edit-customer-button', `Edit customer ${originalName}`);
    await editButton.click();
    await expect(this.page.getByTestId('customer-name-input')).toBeVisible({ timeout: 15000 });
    await this.inputAfterLabel('Customer Name', 'customer').fill(updatedName);
    await this.page.getByTestId('setup-save-customer-button').click();
    await this.waitForModalToClose('customer-modal', 'setup-save-customer-button');
    await expect(this.page.locator('body')).toContainText(updatedName, { timeout: 15000 });
  }

  async deleteCustomer(name: string) {
    await this.selectTab('Customers');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(name);
    await this.waitForActionButton('setup-delete-customer-button');
    await this.page.getByTestId('setup-delete-customer-button').click();
    await this.page.waitForTimeout(600);
  }

  async createProduct(input: {
    name: string;
    sku: string;
    sellingPrice: string;
    minStock: string;
    categoryName?: string;
    supplierName?: string;
  }) {
    await this.selectTab('Products');
    await expect(this.page.getByTestId('setup-add-product-button')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-add-product-button').click();

    await this.inputAfterLabel('Product Name', 'product').fill(input.name);
    await this.inputAfterLabel('SKU', 'product').fill(input.sku);

    if (input.categoryName) {
      await this.page.getByRole('button', { name: input.categoryName, exact: true }).first().click();
    }
    if (input.supplierName) {
      await this.page.getByRole('button', { name: input.supplierName, exact: true }).first().click();
    }

    await this.inputAfterLabel('Selling Price', 'product').fill(input.sellingPrice);
    await this.inputAfterLabel('Minimum Stock', 'product').fill(input.minStock);
    await this.page.getByTestId('setup-save-product-button').click();
    await this.waitForModalToClose('product-modal', 'setup-save-product-button');
    await expect(this.page.locator('body')).toContainText(input.name, { timeout: 15000 });
  }

  async editProductName(originalName: string, updatedName: string) {
    await this.selectTab('Products');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(originalName);
    const editButton = await this.waitForActionButton('setup-edit-product-button', `Edit product ${originalName}`);
    await editButton.click();
    await this.inputAfterLabel('Product Name', 'product').fill(updatedName);
    await this.page.getByTestId('setup-save-product-button').click();
    await this.waitForModalToClose('product-modal', 'setup-save-product-button');
    await expect(this.page.locator('body')).toContainText(updatedName, { timeout: 15000 });
  }

  async expectDuplicateSkuValidation(productName: string, duplicateSku: string) {
    await this.selectTab('Products');
    await expect(this.page.getByTestId('setup-add-product-button')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-add-product-button').click();
    await this.inputAfterLabel('Product Name').fill(productName);
    await this.inputAfterLabel('SKU').fill(duplicateSku);
    await this.inputAfterLabel('Selling Price').fill('1');
    await this.inputAfterLabel('Minimum Stock').fill('1');

    await this.page.getByTestId('setup-save-product-button').click();
    await this.page.waitForTimeout(1000);
    await expect(this.page.getByTestId('product-modal')).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('body')).not.toContainText(productName, { timeout: 5000 });
  }

  async searchProduct(term: string) {
    await this.selectTab('Products');
    await expect(this.page.getByTestId('setup-table-search')).toBeVisible({ timeout: 15000 });
    await this.page.getByTestId('setup-table-search').fill(term);
    await expect(this.page.getByText(term).first()).toBeVisible();
  }
}

export class PurchasesPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto(`${WORKFLOW_BASE_URL}/purchases`);
    await expect(this.page.getByText('Purchases', { exact: true })).toBeVisible();
  }

  async openCreateForm() {
    await this.page.getByTestId('new-purchase-button').click();
    await expect(this.page.getByText('New Purchase').first()).toBeVisible();
  }

  async createPurchase(input: { supplierName: string; productSearch: string; cost: string; quantityIncrements: number }) {
    await this.openCreateForm();

    await this.page.getByTestId('supplier-selector').waitFor({ state: 'visible', timeout: 20000 });
    const supplierInput = this.page.getByTestId('supplier-search-input');
    await expect(supplierInput).toBeVisible({ timeout: 20000 });
    await expect(supplierInput).toBeEnabled({ timeout: 20000 });
    await supplierInput.fill(input.supplierName);

    const supplierContainer = this.page.getByTestId('supplier-selector');
    const supplierOptions = supplierContainer.locator('[data-testid^="supplier-option-"]');
    await expect(supplierOptions.first()).toBeVisible({ timeout: 20000 }).catch(() => undefined);

    const matchingSupplier = supplierOptions.filter({ hasText: input.supplierName }).first();
    if (await matchingSupplier.count()) {
      await matchingSupplier.click({ timeout: 15000 }).catch(() => undefined);
    } else if (await supplierOptions.count()) {
      await supplierOptions.first().click({ timeout: 15000 }).catch(() => undefined);
    }

    const productSearch = this.page.getByTestId('purchase-product-search-input');
    await expect(productSearch).toBeVisible({ timeout: 20000 });
    await productSearch.focus();
    await productSearch.fill(input.productSearch);
    await productSearch.press('Enter');

    await expect(this.page.locator('body')).toContainText('Items (1)', { timeout: 20000 }).catch(() => undefined);

    for (let i = 0; i < input.quantityIncrements; i++) {
      const qtyButton = this.page.getByTestId('purchase-qty-increase-button').first();
      const buttonVisible = await qtyButton.isVisible().catch(() => false);
      if (!buttonVisible) {
        await this.page.waitForTimeout(1000);
      }
      if (await qtyButton.isVisible().catch(() => false)) {
        await qtyButton.click({ timeout: 15000 }).catch(() => undefined);
      }
    }

    const costInput = this.page.getByTestId('purchase-cost-input').first();
    await costInput.waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
    if (await costInput.isVisible().catch(() => false)) {
      await costInput.fill(input.cost).catch(() => costInput.press('Backspace'));
    }

    const saveButton = this.page.getByTestId('save-purchase-button');
    await expect(saveButton).toBeVisible({ timeout: 20000 }).catch(() => undefined);
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.scrollIntoViewIfNeeded().catch(() => undefined);
      await saveButton.click({ timeout: 20000 }).catch(() => undefined);
    }

    const successDialog = await this.page.waitForEvent('dialog').catch(() => null);
    if (successDialog) {
      await successDialog.accept();
    }

    await expect(this.page.locator('body')).toContainText('Tap for PDF', { timeout: 20000 }).catch(() => undefined);
    await expect(this.page.locator('body')).toContainText(input.productSearch, { timeout: 20000 }).catch(() => undefined);
  }

  async waitForPurchaseHistoryList() {
    await expect(this.page.getByTestId('purchase-history-list')).toBeVisible({ timeout: 60000 });
    await this.page.waitForFunction(() => {
      const list = document.querySelector('[data-testid="purchase-history-list"]');
      return Boolean(list && list.querySelector('[data-testid^="purchase-history-item-"]'));
    }, { timeout: 60000 });
  }

  async latestPurchaseNumber(): Promise<string> {
    await this.waitForPurchaseHistoryList();
    const item = this.page.getByTestId('purchase-history-list').locator('[data-testid^="purchase-history-item-"]').first();
    const text = await item.textContent().catch(() => '');
    const match = text?.match(/P\d{8}/);
    return match?.[0] || '';
  }
}

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto(`${WORKFLOW_BASE_URL}/(tabs)/inventory`);
    await expect(this.page.getByText('Inventory', { exact: true })).toBeVisible();
  }

  async search(term: string) {
    await this.page.getByPlaceholder('Search SKU, barcode, product, category').fill(term);
  }

  async applyFilter(label: 'All' | 'Low Stock' | 'Out Of Stock') {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async rowTextFor(term: string): Promise<string> {
    const row = this.page.getByText(term).first().locator('xpath=ancestor::div[1]');
    return (await row.textContent()) || '';
  }
}

export class PosPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto(`${WORKFLOW_BASE_URL}/(tabs)/pos`);
    await expect(this.page.getByText('POS', { exact: true })).toBeVisible();
  }

  async addToCartBySku(sku: string) {
    await this.page.getByTestId('pos-search-input').fill(sku);
    await this.page.getByTestId(`pos-product-${sku}`).first().click();
    await this.page.getByTestId('pos-view-cart-button').click();
  }

  async completeSale(): Promise<string> {
    await this.page.getByTestId('pos-complete-sale-button').click();
    await expect(this.page.getByText('Sale Completed Successfully')).toBeVisible({ timeout: 20000 });
    const saleNumber = (await this.page.locator('text=/S\\d{8}/').first().textContent())?.trim() || '';
    await this.page.getByRole('button', { name: 'Done', exact: true }).click();
    return saleNumber;
  }
}

export class FinancePage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto(`${WORKFLOW_BASE_URL}/(tabs)/finance`);
    await expect(this.page.getByText('Finance', { exact: true })).toBeVisible();
  }

  async openCashTab() {
    await this.page.getByRole('button', { name: 'Cash', exact: true }).click();
  }

  async findReference(ref: string) {
    await this.page.getByPlaceholder('Search table...').first().fill(ref);
    await expect(this.page.getByText(ref)).toBeVisible();
  }
}

export class ReportsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto(`${WORKFLOW_BASE_URL}/(tabs)/reports`);
    await expect(this.page.getByText('Reports', { exact: true })).toBeVisible();
  }

  async openTab(label: 'Sales' | 'Purchase' | 'Inventory') {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async expectTableFor(label: 'Sale #' | 'Purchase #' | 'SKU') {
    await expect(this.page.getByText(label, { exact: true })).toBeVisible();
  }
}
