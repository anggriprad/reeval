/**
 * Reeval ERP — End-to-End (E2E) Test Suite & Runner
 * Opaque-box & integration verification across 4 testing tiers.
 * 
 * Execution:
 *   npx tsx scripts/run-e2e-tests.ts
 *   npm run test:e2e
 */

import {
  resetStore,
  getStore,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventory,
  getMaterialById,
  saveMaterial,
  updateStock,
  getStockMovements,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  updateSalesOrderStatus,
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  updateJobCard,
  getDeliveries,
  getDeliveryOrders,
  getDeliveryOrderById,
  createDeliveryOrder,
  updateDeliveryStatus,
  getInvoices,
  getInvoiceById,
  createInvoice,
  recordInvoicePayment,
  getJournalEntries,
} from '../src/lib/data-provider';

import {
  USER_ACCOUNTS,
  getUserById,
  isRouteAllowed,
  canCreateOrder,
  canApproveOrder,
  canIssueSPK,
  canDeliverOrder,
  canConfirmPayment,
  canViewFinance,
} from '../src/lib/roles';

import {
  DEFAULT_CHART_OF_ACCOUNTS,
  createExpenseJournal,
} from '../src/lib/accounting';

import type {
  Customer,
  SalesOrderItem,
  JobCard,
  DeliveryStatus,
  POStatus,
  OrderStatus,
  SPKStatus,
} from '../src/lib/types';

// ============================================================================
// TEST HARNESS FRAMEWORK
// ============================================================================

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private currentSuite = '';

  suite(suiteName: string) {
    this.currentSuite = suiteName;
    console.log(`\n================================================================`);
    console.log(`SUITE: ${suiteName}`);
    console.log(`================================================================`);
  }

  async test(name: string, fn: () => void | Promise<void>) {
    const start = Date.now();
    try {
      // Reset store before each test for test isolation
      resetStore();
      await fn();
      const durationMs = Date.now() - start;
      this.results.push({
        suite: this.currentSuite,
        name,
        passed: true,
        durationMs,
      });
      console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errorMsg = err?.message || String(err);
      this.results.push({
        suite: this.currentSuite,
        name,
        passed: false,
        durationMs,
        error: errorMsg,
      });
      console.error(`  ✗ [FAIL] ${name} (${durationMs}ms)`);
      console.error(`    Error: ${errorMsg}`);
    }
  }

  summary(): { total: number; passed: number; failed: number; durationMs: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const durationMs = this.results.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(`\n================================================================`);
    console.log(`E2E TEST RUNNER SUMMARY REPORT`);
    console.log(`================================================================`);
    console.log(`Total Executed Tests : ${total}`);
    console.log(`Passed               : ${passed}`);
    console.log(`Failed               : ${failed}`);
    console.log(`Total Duration       : ${durationMs}ms`);
    console.log(`================================================================`);

    // Group results by suite
    const suites = Array.from(new Set(this.results.map(r => r.suite)));
    suites.forEach(s => {
      const suiteTests = this.results.filter(r => r.suite === s);
      const sPassed = suiteTests.filter(r => r.passed).length;
      console.log(`  - ${s}: ${sPassed}/${suiteTests.length} Passed`);
    });
    console.log(`================================================================\n`);

    return { total, passed, failed, durationMs };
  }

  hasFailures(): boolean {
    return this.results.some(r => !r.passed);
  }
}

// Custom Assertion Functions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `assertEquals Failed: ${message || ''} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertNotEquals<T>(actual: T, expected: T, message?: string) {
  if (actual === expected) {
    throw new Error(
      `assertNotEquals Failed: ${message || ''} Value should not equal ${JSON.stringify(expected)}`
    );
  }
}

function assertTrue(value: boolean, message?: string) {
  assertEquals(value, true, message || 'Expected true');
}

function assertFalse(value: boolean, message?: string) {
  assertEquals(value, false, message || 'Expected false');
}

function assertGreaterThan(actual: number, threshold: number, message?: string) {
  if (actual <= threshold) {
    throw new Error(
      `assertGreaterThan Failed: ${message || ''} Expected ${actual} > ${threshold}`
    );
  }
}

// ============================================================================
// MAIN RUNNER EXECUTION
// ============================================================================

async function runAllTests() {
  const runner = new TestRunner();

  // --------------------------------------------------------------------------
  // TIER 1: FEATURE COVERAGE (≥5 tests per module across 6 modules)
  // --------------------------------------------------------------------------

  // --- 1. AUTH MODULE ---
  runner.suite('Tier 1 - Auth Module');

  await runner.test('Auth-01: User Accounts Directory & System Roles List', () => {
    assertGreaterThan(USER_ACCOUNTS.length, 0, 'User accounts matrix must not be empty');
    const admin = getUserById('admin-1');
    assertEquals(admin.role, 'ADMIN');
    assertEquals(admin.name, 'Dewi Handayani');
  });

  await runner.test('Auth-02: Super Admin Credential Lookup', () => {
    const admin = USER_ACCOUNTS.find(u => u.email === 'admin@reeval.id');
    assert(admin !== undefined, 'Admin user account admin@reeval.id must exist');
    assertEquals(admin?.roleLabel, 'Super Admin');
  });

  await runner.test('Auth-03: Sales Executive Credential Lookup', () => {
    const sales = USER_ACCOUNTS.find(u => u.email === 'sales@reeval.id');
    assert(sales !== undefined, 'Sales user account sales@reeval.id must exist');
    assertEquals(sales?.role, 'SALES');
  });

  await runner.test('Auth-04: Non-Existent User Fallback Handling', () => {
    const user = getUserById('non-existent-user-id');
    assert(user !== undefined, 'Fallback user should be returned for non-existent user ID');
    assertEquals(user.id, USER_ACCOUNTS[0].id);
  });

  await runner.test('Auth-05: Role-Based Route Authorization Matrix', () => {
    assertTrue(isRouteAllowed('ADMIN', '/finance'), 'Admin can access /finance');
    assertFalse(isRouteAllowed('SALES', '/finance'), 'Sales cannot access /finance');
    assertTrue(isRouteAllowed('SALES', '/sales-order'), 'Sales can access /sales-order');
    assertTrue(isRouteAllowed('DRIVER', '/delivery'), 'Driver can access /delivery');
    assertFalse(isRouteAllowed('DRIVER', '/inventory'), 'Driver cannot access /inventory');
  });

  await runner.test('Auth-06: Permission Capabilities Matrix Checks', () => {
    assertTrue(canCreateOrder('SALES'), 'Sales role can create order');
    assertTrue(canCreateOrder('ADMIN'), 'Admin role can create order');
    assertFalse(canCreateOrder('DRIVER'), 'Driver role cannot create order');

    assertTrue(canApproveOrder('ADMIN'), 'Admin role can approve order');
    assertFalse(canApproveOrder('SALES'), 'Sales role cannot approve order');

    assertTrue(canDeliverOrder('DRIVER'), 'Driver role can deliver order');
    assertTrue(canDeliverOrder('ADMIN'), 'Admin role can deliver order');
  });

  // --- 2. INVENTORY MODULE ---
  runner.suite('Tier 1 - Inventory Module');

  await runner.test('Inv-01: Inventory Material Catalog Query', () => {
    const materials = getInventory();
    assertGreaterThan(materials.length, 0, 'Inventory materials list should not be empty');
    assert(materials.some(m => m.name.length > 0), 'Materials should have valid names');
  });

  await runner.test('Inv-02: New Raw Material Master Creation', () => {
    const newMaterial = saveMaterial({
      code: 'MAT-TEST-001',
      name: 'Kayu Jati Grade A',
      category: 'Kayu',
      unit: 'm3',
      unitCost: 1500000,
      stock: 10,
      minStock: 2,
    });

    assert(newMaterial.id.length > 0, 'Saved material must have generated ID');
    assertEquals(newMaterial.name, 'Kayu Jati Grade A');
    
    const retrieved = getMaterialById(newMaterial.id);
    assert(retrieved !== undefined, 'Created material must be retrievable by ID');
    assertEquals(retrieved?.unitCost, 1500000);
  });

  await runner.test('Inv-03: Stock Movement IN (Material Inward Receipt)', () => {
    const material = getInventory()[0];
    const initialStock = material.stock;
    const addedQty = 25;

    const result = updateStock(material.id, addedQty, 'IN', 'Ref-Inward-001');
    assert(result !== null, 'Stock update result must not be null');
    assertEquals(result?.material.stock, initialStock + addedQty, 'Material stock should increase');
    assertEquals(result?.movement.type, 'IN');
    assertEquals(result?.movement.qty, addedQty);
  });

  await runner.test('Inv-04: Stock Movement OUT (Material Outward Issuance)', () => {
    const material = saveMaterial({
      name: 'Busa Super Soft',
      category: 'Busa',
      unit: 'lembar',
      unitCost: 200000,
      stock: 50,
      minStock: 5,
    });

    const issueQty = 15;
    const result = updateStock(material.id, issueQty, 'OUT', 'Ref-Outward-001');
    assert(result !== null, 'Stock update result must not be null');
    assertEquals(result?.material.stock, 35, 'Material stock should decrease');
    assertEquals(result?.movement.type, 'OUT');
    assertEquals(result?.movement.qty, issueQty);
  });

  await runner.test('Inv-05: Purchase Order Creation & Calculation', () => {
    const materials = getInventory();
    const po = createPurchaseOrder({
      supplier: 'PT Kayu Nusantara',
      createdBy: 'Staff Gudang',
      items: [
        { materialId: materials[0].id, materialName: materials[0].name, qty: 10, unitCost: 100000 },
        { materialId: materials[1].id, materialName: materials[1].name, qty: 5, unitCost: 200000 },
      ],
      additionalCost: 50000,
    });

    assert(po.id.length > 0, 'PO must have an ID');
    assertEquals(po.status, 'ORDERED');
    assertEquals(po.totalAmount, (10 * 100000) + (5 * 200000) + 50000);
  });

  await runner.test('Inv-06: PO Receipt & Automatic Stock Increment', () => {
    const mat = saveMaterial({
      name: 'Kain Upholstery Velvet',
      category: 'Kain',
      unit: 'meter',
      unitCost: 80000,
      stock: 20,
      minStock: 10,
    });

    const po = createPurchaseOrder({
      supplier: 'Tekstil Utama',
      items: [{ materialId: mat.id, materialName: mat.name, qty: 30, unitCost: 80000 }],
    });

    const updatedPO = updatePurchaseOrderStatus(po.id, 'RECEIVED' as POStatus);
    assertEquals(updatedPO?.status, 'RECEIVED');
    assert(updatedPO?.receivedAt !== undefined, 'PO receivedAt timestamp must be set');

    const updatedMat = getMaterialById(mat.id);
    assertEquals(updatedMat?.stock, 50, 'Material stock should reflect PO items quantity');

    const movements = getStockMovements();
    const movement = movements.find(m => m.reference === po.poNumber);
    assert(movement !== undefined, 'Stock movement record must be auto-generated for PO receipt');
    assertEquals(movement?.qty, 30);
  });

  // --- 3. SALES / ORDERS MODULE ---
  runner.suite('Tier 1 - Sales & Orders Module');

  await runner.test('Sales-01: Sales Order Query & Listing', () => {
    const orders = getSalesOrders();
    assert(Array.isArray(orders), 'Sales orders result must be an array');
    assertGreaterThan(orders.length, 0, 'Initial sales orders should exist');
  });

  await runner.test('Sales-02: New Sales Order Creation', () => {
    const products = getProducts();
    const targetProduct = products[0];

    const customer: Customer = {
      name: 'Ahmad Dahlan',
      phone: '08123456789',
      address: 'Jl. Merdeka No. 45, Jakarta',
    };

    const items: SalesOrderItem[] = [
      {
        productId: targetProduct.id,
        productName: targetProduct.name,
        qty: 2,
        unitPrice: 2500000,
        isCustom: false,
      },
    ];

    const order = createSalesOrder({
      customer,
      items,
      createdBy: 'Budi Sales',
      shippingCost: 150000,
    });

    assert(order.id.length > 0, 'Order ID must be generated');
    assertEquals(order.status, 'PENDING');
    assertEquals(order.totalAmount, (2 * 2500000) + 150000);
    assertEquals(order.customer.name, 'Ahmad Dahlan');
  });

  await runner.test('Sales-03: Sales Order Pricing with Modifiers & Freight', () => {
    const products = getProducts();
    const customer: Customer = {
      name: 'Siti Rahma',
      phone: '08198765432',
      address: 'Bandung',
    };

    const items: SalesOrderItem[] = [
      {
        productId: products[0].id,
        productName: products[0].name,
        qty: 1,
        unitPrice: 1000000,
        selectedModifiers: [
          {
            groupId: 'g1',
            groupName: 'Add-on Cover',
            selectedOptions: [{ optionId: 'o1', name: 'Premium Leather', additionalPrice: 300000, bom: [] }],
          },
        ],
        isCustom: false,
      },
    ];

    const order = createSalesOrder({
      customer,
      items,
      shippingCost: 50000,
    });

    assertEquals(order.totalAmount, 1000000 + 300000 + 50000);
  });

  await runner.test('Sales-04: Sales Order Status Transition PENDING -> PROCESSING', () => {
    const customer: Customer = { name: 'Rudi H', phone: '08123', address: 'Surabaya' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 500000, isCustom: false }],
    });

    const updated = updateSalesOrderStatus(order.id, 'PROCESSING');
    assertEquals(updated?.status, 'PROCESSING');
    assert(updated?.confirmedAt !== undefined, 'confirmedAt must be set');
    assert(updated?.spkIssuedAt !== undefined, 'spkIssuedAt must be set');
  });

  await runner.test('Sales-05: Sales Order Cancellation with Reason & Role', () => {
    const customer: Customer = { name: 'Endang S', phone: '08123', address: 'Semarang' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 500000, isCustom: false }],
    });

    const updated = updateSalesOrderStatus(order.id, 'CANCELED', 'Pelanggan membatalkan pesanan', 'admin');
    assertEquals(updated?.status, 'CANCELED');
    assertEquals(updated?.cancelReason, 'Pelanggan membatalkan pesanan');
    assertEquals(updated?.cancelledByRole, 'admin');
  });

  await runner.test('Sales-06: Sales Order Details Retrieval by ID', () => {
    const orders = getSalesOrders();
    const firstOrder = orders[0];
    const retrieved = getSalesOrderById(firstOrder.id);
    assert(retrieved !== undefined, 'Order must be retrievable by ID');
    assertEquals(retrieved?.orderNumber, firstOrder.orderNumber);
  });

  // --- 4. PRODUCTION MODULE ---
  runner.suite('Tier 1 - Production Module');

  await runner.test('Prod-01: Auto Work Order (SPK) Generation on Order Processing', () => {
    const customer: Customer = { name: 'Dewi K', phone: '08123', address: 'Yogyakarta' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 2, unitPrice: 1200000, isCustom: false }],
    });

    updateSalesOrderStatus(order.id, 'PROCESSING');

    const workOrders = getWorkOrders();
    const wo = workOrders.find(w => w.salesOrderId === order.id);
    assert(wo !== undefined, 'Work Order must be auto-generated for processed order');
    assert(Boolean(wo?.spkNumber.startsWith('SPK-SO-')), 'SPK number must match format');
    assertEquals(wo?.status, 'PENDING');
  });

  await runner.test('Prod-02: Work Order Job Cards Sequence Inspection', () => {
    const workOrders = getWorkOrders();
    const wo = workOrders[0];
    assert(wo.jobCards.length > 0, 'Work Order must have job cards');
    assertEquals(wo.jobCards[0].sequence, 1, 'First job card sequence must be 1');
  });

  await runner.test('Prod-03: Job Card Execution Commencement (IN_PROGRESS)', () => {
    const customer: Customer = { name: 'Bambang', phone: '08123', address: 'Solo' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 800000, isCustom: false }],
    });
    updateSalesOrderStatus(order.id, 'PROCESSING');

    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;
    const jc = wo.jobCards[0];

    const result = updateJobCard(wo.id, jc.id, { status: 'IN_PROGRESS' });
    assertEquals(result?.jobCard.status, 'IN_PROGRESS');
    assert(result?.jobCard.startedAt !== undefined, 'jobCard startedAt timestamp must be recorded');
    assertEquals(result?.workOrder.status, 'PROCESSING');
  });

  await runner.test('Prod-04: Job Card Completion & Raw Material BOM Deduction', () => {
    const mat = saveMaterial({ name: 'Baut 5cm', category: 'Hardware', unit: 'pcs', unitCost: 500, stock: 100, minStock: 10 });
    const customer: Customer = { name: 'Rina S', phone: '08123', address: 'Malang' };
    const products = getProducts();

    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 500000, isCustom: false }],
    });
    updateSalesOrderStatus(order.id, 'PROCESSING');

    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;
    wo.materialsConsumed = [{ materialId: mat.id, qty: 10 }];

    const jc = wo.jobCards[0];
    updateJobCard(wo.id, jc.id, { status: 'COMPLETED', completedQty: jc.targetQty, picName: 'Operator Andi' });

    const updatedMat = getMaterialById(mat.id);
    assertEquals(updatedMat?.stock, 90, 'Material stock must be deducted upon job card 1 completion');
  });

  await runner.test('Prod-05: SPK Completion & Parent Order AUTO-READY Transition', () => {
    const customer: Customer = { name: 'Tono M', phone: '08123', address: 'Denpasar' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 600000, isCustom: false }],
    });
    updateSalesOrderStatus(order.id, 'PROCESSING');

    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;
    wo.jobCards.forEach(jc => {
      updateJobCard(wo.id, jc.id, { status: 'COMPLETED', completedQty: jc.targetQty, picName: 'Staff Pabrik' });
    });

    const updatedWO = getWorkOrderById(wo.id);
    assertEquals(updatedWO?.status, 'COMPLETED');

    const updatedSO = getSalesOrderById(order.id);
    assertEquals(updatedSO?.status, 'READY', 'Sales Order status should automatically transition to READY when all SPKs complete');
  });

  await runner.test('Prod-06: Work Order Creation & Field Validation', () => {
    const wo = createWorkOrder({
      salesOrderId: 'so-manual-1',
      salesOrderNumber: 'SO-2026-999',
      productName: 'Meja Makan Custom',
      isCustom: true,
      customNotes: 'Kayu Jati Finishing Natural',
    });

    assert(wo.id.length > 0, 'Manual WO must have ID');
    assertEquals(wo.productName, 'Meja Makan Custom');
    assertTrue(Boolean(wo.isCustom));
    assertEquals(wo.customNotes, 'Kayu Jati Finishing Natural');
  });

  // --- 5. DELIVERY MODULE ---
  runner.suite('Tier 1 - Delivery Module');

  await runner.test('Deliv-01: Delivery Order (Surat Jalan) Creation', () => {
    const customer: Customer = { name: 'Hasanuddin', phone: '08123', address: 'Makassar' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 1500000, isCustom: false }],
    });
    updateSalesOrderStatus(order.id, 'PROCESSING');

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Supri',
      vehiclePlate: 'B 1234 ABC',
      scheduledDate: '2026-09-20',
    });

    assert(delivery.id.length > 0, 'DO ID must be generated');
    assert(delivery.doNumber.startsWith('DO-'), 'DO number must start with DO-');
    assertEquals(delivery.assignedDriverName, 'Driver Supri');
    assertEquals(delivery.status, 'PENDING');
  });

  await runner.test('Deliv-02: Delivery Orders Catalog Query', () => {
    const deliveries = getDeliveries();
    assert(Array.isArray(deliveries), 'Deliveries list must be array');
    assertGreaterThan(deliveries.length, 0, 'Deliveries list should contain records');
  });

  await runner.test('Deliv-03: Proof of Delivery Confirmation & Driver Notes', () => {
    const customer: Customer = { name: 'Kartika', phone: '08123', address: 'Palembang' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 700000, isCustom: false }],
    });

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Joko',
      vehiclePlate: 'B 9999 XYZ',
      scheduledDate: '2026-09-15',
    });

    const updatedDO = updateDeliveryStatus(delivery.id, 'DELIVERED', 'Diterima oleh Pak Kartika langsung');
    assertEquals(updatedDO?.status, 'DELIVERED');
    assertEquals(updatedDO?.deliveryProofNote, 'Diterima oleh Pak Kartika langsung');
    assert(updatedDO?.deliveredAt !== undefined, 'deliveredAt timestamp must be set');
  });

  await runner.test('Deliv-04: Auto Order Status SENT on Delivery Confirmation', () => {
    const customer: Customer = { name: 'Lukman', phone: '08123', address: 'Bogor' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 1000000, isCustom: false }],
    });

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Amir',
      vehiclePlate: 'F 1111 AB',
      scheduledDate: '2026-09-16',
    });

    updateDeliveryStatus(delivery.id, 'DELIVERED');

    const updatedSO = getSalesOrderById(order.id);
    assertEquals(updatedSO?.status, 'SENT', 'Sales Order status must automatically change to SENT upon delivery confirmation');
  });

  await runner.test('Deliv-05: Auto Commercial Invoice Generation on Delivery Confirmation', () => {
    const customer: Customer = { name: 'Maya', phone: '08123', address: 'Depok' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 2, unitPrice: 800000, isCustom: false }],
    });

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Dedi',
      vehiclePlate: 'B 5555 CD',
      scheduledDate: '2026-09-17',
    });

    updateDeliveryStatus(delivery.id, 'DELIVERED');

    const invoices = getInvoices();
    const inv = invoices.find(i => i.salesOrderId === order.id);
    assert(inv !== undefined, 'Invoice must be auto-generated when Delivery Order is confirmed DELIVERED');
    assertEquals(inv?.totalAmount, 2 * 800000);
    assertEquals(inv?.status, 'UNPAID');
  });

  await runner.test('Deliv-06: Delivery Order Retrieval by ID', () => {
    const deliveries = getDeliveries();
    const first = deliveries[0];
    const retrieved = getDeliveryOrderById(first.id);
    assert(retrieved !== undefined, 'Delivery order must be retrievable by ID');
    assertEquals(retrieved?.doNumber, first.doNumber);
  });

  // --- 6. FINANCE MODULE ---
  runner.suite('Tier 1 - Finance Module');

  await runner.test('Fin-01: Invoices Ledger Query & Initial State', () => {
    const invoices = getInvoices();
    assert(Array.isArray(invoices), 'Invoices list must be array');
    assertGreaterThan(invoices.length, 0, 'Invoices list should contain default invoices');
  });

  await runner.test('Fin-02: Partial Invoice Payment Recording', () => {
    const invoices = getInvoices();
    const unpaidInv = invoices.find(i => i.status === 'UNPAID') || invoices[0];
    const initialPaidAmount = unpaidInv.paidAmount;

    const result = recordInvoicePayment(unpaidInv.id, 500000, 'TRANSFER', 'DP Pembayaran');
    assert(result !== null, 'Payment result must not be null');
    assertEquals(result?.invoice.paidAmount, initialPaidAmount + 500000);
    assert(Boolean(result?.invoice.payments.some(p => p.amount === 500000)), 'Payment record must be added to payments array');
  });

  await runner.test('Fin-03: Full Invoice Settlement & Paid Timestamp', () => {
    const customer: Customer = { name: 'Nadia', phone: '08123', address: 'Tangerang' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 2000000, isCustom: false }],
    });

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Eko',
      vehiclePlate: 'B 2222 EF',
      scheduledDate: '2026-09-18',
    });
    updateDeliveryStatus(delivery.id, 'DELIVERED');

    const inv = getInvoices().find(i => i.salesOrderId === order.id)!;
    recordInvoicePayment(inv.id, 2000000, 'TRANSFER', 'Pelunasan Full');

    const updatedInv = getInvoiceById(inv.id);
    assertEquals(updatedInv?.status, 'PAID');

    const updatedSO = getSalesOrderById(order.id);
    assert(updatedSO?.paidAt !== undefined, 'Sales Order paidAt timestamp must be updated on full payment');
  });

  await runner.test('Fin-04: Double-Entry Financial Journal Generation', () => {
    const customer: Customer = { name: 'Oky', phone: '08123', address: 'Bekasi' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 1000000, isCustom: false }],
    });

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Fajar',
      vehiclePlate: 'B 3333 GH',
      scheduledDate: '2026-09-19',
    });
    updateDeliveryStatus(delivery.id, 'DELIVERED');

    const inv = getInvoices().find(i => i.salesOrderId === order.id)!;
    recordInvoicePayment(inv.id, 1000000, 'TRANSFER', 'Pembayaran Penjualan');

    const journals = getJournalEntries();
    const paymentJournal = journals.find(j => j.sourceId === inv.id);
    assert(paymentJournal !== undefined, 'Journal entry for invoice payment must be created');

    const sumDebit = paymentJournal?.lines.reduce((s, l) => s + l.debit, 0) || 0;
    const sumCredit = paymentJournal?.lines.reduce((s, l) => s + l.credit, 0) || 0;
    assertEquals(sumDebit, sumCredit, 'Financial journal entry must be balanced (Sum Debit == Sum Credit)');
  });

  await runner.test('Fin-05: Operational Expense Recording & Journal Entry', () => {
    const initialJournalsCount = getJournalEntries().length;
    const journal = createExpenseJournal(
      {
        id: 'exp-test-1',
        category: 'TRANSPORT',
        amount: 250000,
        date: '2026-09-14',
        bankAccountId: 'bank-1',
        note: 'BBM Truck Pengiriman',
      },
      'Bank BCA',
      initialJournalsCount
    );

    assertEquals(journal.sourceType, 'EXPENSE');
    const sumDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
    const sumCredit = journal.lines.reduce((s, l) => s + l.credit, 0);
    assertEquals(sumDebit, 250000);
    assertEquals(sumCredit, 250000);
  });

  await runner.test('Fin-06: Chart of Accounts Structure & Default Accounts', () => {
    assertGreaterThan(DEFAULT_CHART_OF_ACCOUNTS.length, 0, 'Chart of Accounts must contain default accounts');
    const kasAccount = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === '1-1100');
    assert(kasAccount !== undefined, 'Kas & Bank account (1-1100) must exist');
    assertEquals(kasAccount?.type, 'ASSET');
    assertEquals(kasAccount?.normalBalance, 'DEBIT');
  });

  // --------------------------------------------------------------------------
  // TIER 2: BOUNDARY & CORNER CASES (8 tests)
  // --------------------------------------------------------------------------
  runner.suite('Tier 2 - Boundary & Corner Cases');

  await runner.test('Bound-01: Empty Customer Name Handling Strategy', () => {
    // Creating sales order with minimal/empty customer name is guarded by UI/API routes
    // Verification: Data layer stores customer object as provided
    const order = createSalesOrder({
      customer: { name: '', phone: '', address: '' },
      items: [{ productId: 'p1', productName: 'Item 1', qty: 1, unitPrice: 100, isCustom: false }],
    });
    assert(order.id.length > 0, 'Order created with fallback string');
  });

  await runner.test('Bound-02: Empty Items List Order Amount Invariant', () => {
    const order = createSalesOrder({
      customer: { name: 'Empty Test', phone: '00', address: '00' },
      items: [],
      shippingCost: 50000,
    });
    assertEquals(order.totalAmount, 50000, 'Total amount for empty items order equals shipping cost');
  });

  await runner.test('Bound-03: Stock Level Non-Negativity Floor Verification', () => {
    const mat = saveMaterial({ name: 'Kayu Test Zero Floor', category: 'Kayu', unit: 'pcs', unitCost: 1000, stock: 5, minStock: 1 });
    updateStock(mat.id, 100, 'OUT', 'Test Excessive Out');
    const updated = getMaterialById(mat.id);
    assertEquals(updated?.stock, 0, 'Stock must not drop below 0 floor on excessive outward movement');
  });

  await runner.test('Bound-04: Non-Existent Entity Lookup Return Values', () => {
    const nonExistentProduct = getProductById('non-existent-id-999');
    assertEquals(nonExistentProduct, undefined, 'Lookup for non-existent product should return undefined');

    const nonExistentOrder = getSalesOrderById('non-existent-so-999');
    assertEquals(nonExistentOrder, undefined, 'Lookup for non-existent sales order should return undefined');

    const nonExistentWO = getWorkOrderById('non-existent-wo-999');
    assertEquals(nonExistentWO, undefined, 'Lookup for non-existent work order should return undefined');
  });

  await runner.test('Bound-05: Product Deletion Protection for Ordered Products', () => {
    const products = getProducts();
    const activeProduct = products[0];

    // Create an order referencing this product
    createSalesOrder({
      customer: { name: 'Ref Customer', phone: '123', address: 'Addr' },
      items: [{ productId: activeProduct.id, productName: activeProduct.name, qty: 1, unitPrice: 500000, isCustom: false }],
    });

    const deleteResult = deleteProduct(activeProduct.id);
    assertFalse(deleteResult.success, 'Deleting a product referenced in active Sales Orders must be rejected');
    assert(deleteResult.error !== undefined, 'Deletion error message must be provided');
  });

  await runner.test('Bound-06: Invoice Payment for Non-Existent Invoice ID', () => {
    const result = recordInvoicePayment('invalid-inv-id-999', 100000, 'TRANSFER');
    assertEquals(result, null, 'Recording payment for invalid invoice ID should return null');
  });

  await runner.test('Bound-07: Optional Fields Null & Undefined Safety Invariants', () => {
    const products = getProducts();
    const order = createSalesOrder({
      customer: { name: 'Optional Safe', phone: '123', address: 'Addr' },
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 100000, isCustom: false }],
      // orderNotes, shippingCost, salesPhone omitted
    });

    assertEquals(order.shippingCost, 0, 'Unspecified shipping cost defaults to 0');
    assertEquals(order.orderNotes, '', 'Unspecified order notes defaults to empty string');
    assertEquals(order.salesPhone, '', 'Unspecified sales phone defaults to empty string');
  });

  await runner.test('Bound-08: Work Order Job Card Out-of-Bound Step Safety', () => {
    const customer: Customer = { name: 'Bound Step', phone: '123', address: 'Addr' };
    const products = getProducts();
    const order = createSalesOrder({
      customer,
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 100000, isCustom: false }],
    });
    updateSalesOrderStatus(order.id, 'PROCESSING');

    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;
    const invalidJCResult = updateJobCard(wo.id, 'non-existent-jc-999', { status: 'COMPLETED' });
    assertEquals(invalidJCResult, null, 'Updating non-existent job card returns null');
  });

  // --------------------------------------------------------------------------
  // TIER 3: CROSS-FEATURE INTERACTIONS (5 tests)
  // --------------------------------------------------------------------------
  runner.suite('Tier 3 - Cross-Feature Interactions');

  await runner.test('Cross-01: SO Creation -> SPK Generation -> Material Deduction', () => {
    const mat = saveMaterial({ name: 'Spons Busa Premium', category: 'Busa', unit: 'lembar', unitCost: 150000, stock: 100, minStock: 10 });
    const products = getProducts();

    const order = createSalesOrder({
      customer: { name: 'Cross Customer 1', phone: '08123', address: 'Jakarta' },
      items: [{ productId: products[0].id, productName: products[0].name, qty: 2, unitPrice: 1000000, isCustom: false }],
    });

    updateSalesOrderStatus(order.id, 'PROCESSING');
    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;
    wo.materialsConsumed = [{ materialId: mat.id, qty: 5 }];

    // Complete Job Card 1 -> triggers material stock deduction
    const jc1 = wo.jobCards[0];
    updateJobCard(wo.id, jc1.id, { status: 'COMPLETED', completedQty: jc1.targetQty, picName: 'Pabrik Crew' });

    const updatedMat = getMaterialById(mat.id);
    assertEquals(updatedMat?.stock, 95, 'Material stock should decrease from 100 to 95');

    const movements = getStockMovements();
    const movement = movements.find(m => m.materialId === mat.id && m.reference === wo.spkNumber);
    assert(movement !== undefined, 'Stock movement record OUT must be logged with SPK number reference');
  });

  await runner.test('Cross-02: Material Low Stock -> PO Procurement -> Stock Restoration -> AP Ledger', () => {
    const mat = saveMaterial({ name: 'Paku Tembak', category: 'Hardware', unit: 'box', unitCost: 45000, stock: 2, minStock: 5 });

    // Step 1: Create PO
    const po = createPurchaseOrder({
      supplier: 'CV Hardware Jaya',
      items: [{ materialId: mat.id, materialName: mat.name, qty: 20, unitCost: 45000 }],
    });
    assertEquals(po.status, 'ORDERED');

    // Step 2: Receive PO
    updatePurchaseOrderStatus(po.id, 'RECEIVED' as POStatus);

    // Step 3: Verify Stock restored
    const updatedMat = getMaterialById(mat.id);
    assertEquals(updatedMat?.stock, 22, 'Stock should increase from 2 to 22');
  });

  await runner.test('Cross-03: Production Finish -> SO Ready -> Delivery Dispatch -> Invoice Issuance', () => {
    const products = getProducts();
    const order = createSalesOrder({
      customer: { name: 'Cross Customer 3', phone: '08123', address: 'Surabaya' },
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 3000000, isCustom: false }],
    });

    // 1. Process Order
    updateSalesOrderStatus(order.id, 'PROCESSING');
    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;

    // 2. Complete all Job Cards
    wo.jobCards.forEach(jc => {
      updateJobCard(wo.id, jc.id, { status: 'COMPLETED', completedQty: jc.targetQty, picName: 'Workshop Team' });
    });

    // 3. Verify SO status is now READY
    const readySO = getSalesOrderById(order.id);
    assertEquals(readySO?.status, 'READY');

    // 4. Create Delivery Order
    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Hendra',
      vehiclePlate: 'L 1234 XY',
      scheduledDate: '2026-09-22',
    });

    // 5. Confirm Delivery
    updateDeliveryStatus(delivery.id, 'DELIVERED');

    // 6. Verify SO is SENT and Invoice auto-issued
    const sentSO = getSalesOrderById(order.id);
    assertEquals(sentSO?.status, 'SENT');

    const inv = getInvoices().find(i => i.salesOrderId === order.id);
    assert(inv !== undefined, 'Invoice must be auto-created upon delivery');
    assertEquals(inv?.totalAmount, 3000000);
  });

  await runner.test('Cross-04: Invoice Payment -> Cash Balance -> AR Settlement -> Balanced Journal', () => {
    const products = getProducts();
    const order = createSalesOrder({
      customer: { name: 'Cross Customer 4', phone: '08123', address: 'Bandung' },
      items: [{ productId: products[0].id, productName: products[0].name, qty: 1, unitPrice: 1500000, isCustom: false }],
    });

    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Driver Budi',
      vehiclePlate: 'D 9999 AB',
      scheduledDate: '2026-09-23',
    });
    updateDeliveryStatus(delivery.id, 'DELIVERED');

    const inv = getInvoices().find(i => i.salesOrderId === order.id)!;
    const paymentResult = recordInvoicePayment(inv.id, 1500000, 'TRANSFER', 'Pelunasan Bank Transfer');

    assert(paymentResult !== null, 'Payment result must exist');
    assertEquals(paymentResult?.invoice.status, 'PAID');

    // Verify journal entries
    const journals = getJournalEntries();
    const paymentJournals = journals.filter(j => j.sourceId === inv.id);
    assertGreaterThan(paymentJournals.length, 0, 'Payment journal entry must exist');

    paymentJournals.forEach(j => {
      const sumDebit = j.lines.reduce((s, l) => s + l.debit, 0);
      const sumCredit = j.lines.reduce((s, l) => s + l.credit, 0);
      assertEquals(sumDebit, sumCredit, `Journal ${j.entryNumber} must be balanced`);
    });
  });

  await runner.test('Cross-05: Custom Product & Modifier Specs -> SO Pricing -> Work Order Notes', () => {
    const products = getProducts();
    const order = createSalesOrder({
      customer: { name: 'Custom Furniture Client', phone: '081234', address: 'Jakarta Selatan' },
      items: [
        {
          productId: products[0].id,
          productName: products[0].name,
          qty: 1,
          unitPrice: 5000000,
          isCustom: true,
          customNotes: 'Kayu Mahoni Kualitas Super, Kain Beludru Merah',
          selectedModifiers: [
            {
              groupId: 'g-mod-1',
              groupName: 'Finishing',
              selectedOptions: [{ optionId: 'opt-1', name: 'High Gloss Walnut', additionalPrice: 500000, bom: [] }],
            },
          ],
        },
      ],
      orderNotes: 'Kirim sebelum akhir bulan',
    });

    assertEquals(order.totalAmount, 5500000);

    updateSalesOrderStatus(order.id, 'PROCESSING');
    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;

    assertTrue(Boolean(wo.isCustom), 'Work order must inherit isCustom flag');
    assertEquals(wo.customNotes, 'Kayu Mahoni Kualitas Super, Kain Beludru Merah', 'Work order must inherit custom notes');
    assert(wo.selectedModifiers !== undefined && wo.selectedModifiers.length > 0, 'Work order must inherit selected modifiers');
  });

  // --------------------------------------------------------------------------
  // TIER 4: REAL-WORLD ENTERPRISE SCENARIOS (3 full E2E workflows)
  // --------------------------------------------------------------------------
  runner.suite('Tier 4 - Real-World Scenarios');

  await runner.test('Scenario-01: Standard B2B Commercial Order-to-Cash Enterprise Workflow', () => {
    console.log('    [Step 1] Customer "Hotel Santika" places Sales Order for 3 Executive Bed Sets');
    const products = getProducts();
    const targetProduct = products[0];

    const customer: Customer = {
      name: 'Hotel Santika Corp',
      phone: '021-5551234',
      address: 'Jl. Jendral Sudirman No. 100, Jakarta',
    };

    const order = createSalesOrder({
      customer,
      items: [{ productId: targetProduct.id, productName: targetProduct.name, qty: 3, unitPrice: 4000000, isCustom: false }],
      createdBy: 'Sales Executive Budi',
      salesPhone: '081298765432',
      orderNotes: 'Pesanan untuk Proyek Renovasi Suite Room',
      shippingCost: 300000,
    });

    assertEquals(order.status, 'PENDING');
    assertEquals(order.totalAmount, (3 * 4000000) + 300000);

    console.log('    [Step 2] Admin approves order and issues SPK (PENDING -> PROCESSING)');
    updateSalesOrderStatus(order.id, 'PROCESSING');

    const workOrders = getWorkOrders().filter(w => w.salesOrderId === order.id);
    assertEquals(workOrders.length, 1, 'Exactly 1 Work Order (SPK) generated');
    const wo = workOrders[0];
    assertEquals(wo.status, 'PENDING');

    console.log('    [Step 3] Workshop executes all Job Card steps for SPK');
    wo.jobCards.forEach((jc, idx) => {
      const stepRes = updateJobCard(wo.id, jc.id, {
        status: 'COMPLETED',
        completedQty: jc.targetQty,
        picName: `Operator Team ${idx + 1}`,
        actualMinutes: 40,
      });
      assert(stepRes !== null, `Job Card ${jc.id} execution failed`);
    });

    console.log('    [Step 4] Verify Work Order is COMPLETED and Sales Order transitions to READY');
    const completedWO = getWorkOrderById(wo.id);
    assertEquals(completedWO?.status, 'COMPLETED');

    const readySO = getSalesOrderById(order.id);
    assertEquals(readySO?.status, 'READY');

    console.log('    [Step 5] Logistics prepares Delivery Order (Surat Jalan)');
    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Hasan Basri (Driver)',
      vehiclePlate: 'B 9876 FGH',
      scheduledDate: '2026-09-25',
    });
    assertEquals(delivery.status, 'PENDING');

    console.log('    [Step 6] Driver completes delivery and submits Proof of Delivery note');
    updateDeliveryStatus(delivery.id, 'DELIVERED', 'Diterima oleh Purchasing Hotel Santika (Pak Agus)');

    const sentSO = getSalesOrderById(order.id);
    assertEquals(sentSO?.status, 'SENT');

    console.log('    [Step 7] Verify Commercial Invoice auto-issuance');
    const inv = getInvoices().find(i => i.salesOrderId === order.id)!;
    assert(inv !== undefined, 'Invoice must be generated');
    assertEquals(inv.status, 'UNPAID');
    assertEquals(inv.totalAmount, 12300000);

    console.log('    [Step 8] Customer settles Invoice via Bank Transfer in 2 installments');
    recordInvoicePayment(inv.id, 5000000, 'TRANSFER', 'Termin 1 (DP)');
    let currentInv = getInvoiceById(inv.id);
    assertEquals(currentInv?.status, 'PARTIAL');

    recordInvoicePayment(inv.id, 7300000, 'TRANSFER', 'Termin 2 (Pelunasan)');
    currentInv = getInvoiceById(inv.id);
    assertEquals(currentInv?.status, 'PAID');

    const finalSO = getSalesOrderById(order.id);
    assert(finalSO?.paidAt !== undefined, 'Final SO paidAt timestamp must be recorded');

    console.log('    [Step 9] Financial Ledger Verification: Double-Entry Journal balance check');
    const journals = getJournalEntries().filter(j => j.sourceId === inv.id);
    assertGreaterThan(journals.length, 0, 'Payment journals must exist');
    journals.forEach(j => {
      const sumDebit = j.lines.reduce((s, l) => s + l.debit, 0);
      const sumCredit = j.lines.reduce((s, l) => s + l.credit, 0);
      assertEquals(sumDebit, sumCredit, `Payment journal ${j.entryNumber} balanced`);
    });
  });

  await runner.test('Scenario-02: Just-In-Time Procurement & Custom Furniture Workflow', () => {
    console.log('    [Step 1] Audit raw material stock & perform JIT Purchase Order');
    const matJati = saveMaterial({ name: 'Kayu Jati Perhutani', category: 'Kayu', unit: 'm3', unitCost: 2000000, stock: 1, minStock: 5 });
    
    const po = createPurchaseOrder({
      supplier: 'Perum Perhutani',
      createdBy: 'Staff Gudang Joko',
      items: [{ materialId: matJati.id, materialName: matJati.name, qty: 10, unitCost: 2000000 }],
    });
    updatePurchaseOrderStatus(po.id, 'RECEIVED' as POStatus);

    const replenishedMat = getMaterialById(matJati.id);
    assertEquals(replenishedMat?.stock, 11, 'Kayu Jati stock replenished to 11 m3');

    console.log('    [Step 2] Customer orders custom Sofa Set with custom BOM & modifier specs');
    const products = getProducts();
    const order = createSalesOrder({
      customer: { name: 'Ibu Ratna', phone: '0811223344', address: 'Menteng, Jakarta Pusat' },
      items: [
        {
          productId: products[0].id,
          productName: products[0].name,
          qty: 1,
          unitPrice: 7500000,
          isCustom: true,
          customNotes: 'Rangka Kayu Jati Perhutani, Ukuran 220cm',
          selectedModifiers: [
            {
              groupId: 'g-fabric',
              groupName: 'Kain Upholstery',
              selectedOptions: [{ optionId: 'opt-velvet', name: 'Velvet Soft Cream', additionalPrice: 800000, bom: [] }],
            },
          ],
        },
      ],
      shippingCost: 250000,
    });

    assertEquals(order.totalAmount, 7500000 + 800000 + 250000);

    console.log('    [Step 3] Order approval & SPK job card completion');
    updateSalesOrderStatus(order.id, 'PROCESSING');
    const wo = getWorkOrders().find(w => w.salesOrderId === order.id)!;
    wo.materialsConsumed = [{ materialId: matJati.id, qty: 2 }];

    wo.jobCards.forEach(jc => {
      updateJobCard(wo.id, jc.id, { status: 'COMPLETED', completedQty: jc.targetQty, picName: 'Master Carpenter' });
    });

    const matAfterProd = getMaterialById(matJati.id);
    assertEquals(matAfterProd?.stock, 9, '2 m3 Kayu Jati deducted during production');

    console.log('    [Step 4] Delivery & Invoice settlement');
    const delivery = createDeliveryOrder({
      salesOrderId: order.id,
      assignedDriverName: 'Hasan Basri',
      vehiclePlate: 'B 1122 CD',
      scheduledDate: '2026-09-26',
    });
    updateDeliveryStatus(delivery.id, 'DELIVERED', 'Diterima Ibu Ratna');

    const inv = getInvoices().find(i => i.salesOrderId === order.id)!;
    recordInvoicePayment(inv.id, order.totalAmount, 'TRANSFER', 'Pelunasan Cash Transfer');

    const settledInv = getInvoiceById(inv.id);
    assertEquals(settledInv?.status, 'PAID');
  });

  await runner.test('Scenario-03: Order Cancellation & Inventory Integrity Workflow', () => {
    console.log('    [Step 1] Customer places multi-item order');
    const mat = saveMaterial({ name: 'Kain Linen', category: 'Kain', unit: 'm', unitCost: 50000, stock: 50, minStock: 10 });
    const products = getProducts();

    const order = createSalesOrder({
      customer: { name: 'Bpk Hendro', phone: '08155566677', address: 'Surabaya' },
      items: [{ productId: products[0].id, productName: products[0].name, qty: 2, unitPrice: 1500000, isCustom: false }],
    });

    console.log('    [Step 2] Customer requests cancellation prior to production');
    const canceledSO = updateSalesOrderStatus(order.id, 'CANCELED', 'Pelanggan berubah pikiran sebelum produksi', 'sales');

    assertEquals(canceledSO?.status, 'CANCELED');
    assertEquals(canceledSO?.cancelReason, 'Pelanggan berubah pikiran sebelum produksi');
    assertEquals(canceledSO?.cancelledByRole, 'sales');

    console.log('    [Step 3] Integrity Check: Verify stock is untouched and no orphaned SPKs are processed');
    const currentMat = getMaterialById(mat.id);
    assertEquals(currentMat?.stock, 50, 'Material stock remains untouched');

    const wos = getWorkOrders().filter(w => w.salesOrderId === order.id);
    const activeWOs = wos.filter(w => w.status === 'PROCESSING' || w.status === 'COMPLETED');
    assertEquals(activeWOs.length, 0, 'No active or completed work orders should exist for canceled order');

    const invs = getInvoices().filter(i => i.salesOrderId === order.id);
    assertEquals(invs.length, 0, 'No invoice should be generated for canceled order');
  });

  // ==========================================================================
  // FINAL SUMMARY & EXIT
  // ==========================================================================
  const summary = runner.summary();

  if (runner.hasFailures()) {
    console.error('❌ E2E TEST RUNNER DETECTED FAILURES!');
    process.exit(1);
  } else {
    console.log('✅ ALL E2E TEST SUITES PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

// Execute runner
runAllTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
