import type {
  Product,
  RawMaterial,
  StockMovement,
  PurchaseOrder,
  SalesOrder,
  WorkOrder,
  JobCard,
  DeliveryOrder,
  Invoice,
  Payment,
  JournalEntry,
  BankAccount,
  Expense,
  OrderStatus,
  SPKStatus,
  POStatus,
  StockMovementType,
  DeliveryStatus,
  Customer,
  SalesOrderItem,
  BOMItem,
} from './types';
import {
  initialProducts,
  initialMaterials,
  initialSalesOrders,
  initialWorkOrders,
  initialPurchaseOrders,
  initialStockMovements,
  initialDeliveryOrders,
  initialInvoices,
  initialBankAccounts,
  initialExpenses,
  initialJournalEntries,
  initialRoutings,
  initialOperations,
} from './initial-data';
import { generateId } from './utils';

// ============================================================================
// IN-MEMORY / PERSISTENT STORE INTERFACE
// ============================================================================

export interface ERPDataStore {
  products: Product[];
  materials: RawMaterial[];
  stockMovements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  workOrders: WorkOrder[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  expenses: Expense[];
  journalEntries: JournalEntry[];
}

declare global {
  // Global declaration for Next.js hot module reloading preservation
  // eslint-disable-next-line no-var
  var __erp_data_store__: ERPDataStore | undefined;
}

function initializeStore(): ERPDataStore {
  return {
    products: structuredClone(initialProducts),
    materials: structuredClone(initialMaterials),
    stockMovements: structuredClone(initialStockMovements),
    purchaseOrders: structuredClone(initialPurchaseOrders),
    salesOrders: structuredClone(initialSalesOrders),
    workOrders: structuredClone(initialWorkOrders),
    deliveryOrders: structuredClone(initialDeliveryOrders),
    invoices: structuredClone(initialInvoices),
    bankAccounts: structuredClone(initialBankAccounts),
    expenses: structuredClone(initialExpenses),
    journalEntries: structuredClone(initialJournalEntries),
  };
}

export function getStore(): ERPDataStore {
  if (!globalThis.__erp_data_store__) {
    globalThis.__erp_data_store__ = initializeStore();
  }
  return globalThis.__erp_data_store__;
}

export function resetStore(): ERPDataStore {
  globalThis.__erp_data_store__ = initializeStore();
  return globalThis.__erp_data_store__;
}

// ============================================================================
// PRODUCTS DATA ACCESS
// ============================================================================

export function getProducts(category?: string): Product[] {
  const store = getStore();
  if (category) {
    return store.products.filter(
      p => p.category.toLowerCase() === category.toLowerCase()
    );
  }
  return store.products;
}

export function getProductById(id: string): Product | undefined {
  const store = getStore();
  return store.products.find(p => p.id === id);
}

export function saveProduct(productData: Partial<Product> & { name: string; category: string }): Product {
  const store = getStore();
  if (productData.id) {
    const existingIndex = store.products.findIndex(p => p.id === productData.id);
    if (existingIndex !== -1) {
      const updatedProduct: Product = {
        ...store.products[existingIndex],
        ...productData,
      } as Product;
      store.products[existingIndex] = updatedProduct;
      return updatedProduct;
    }
  }

  // Create new product
  const newId = productData.id || `prod-${generateId()}`;
  const newProduct: Product = {
    ...productData,
    id: newId,
    name: productData.name,
    description: productData.description || '',
    category: productData.category,
    imageIcon: productData.imageIcon || 'Package',
    variants: productData.variants || [],
  } as Product;

  store.products.unshift(newProduct);
  return newProduct;
}

export function createProduct(productData: Omit<Product, 'id'>): Product {
  return saveProduct(productData);
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const store = getStore();
  const existingIndex = store.products.findIndex(p => p.id === id);
  if (existingIndex === -1) return null;

  const updatedProduct: Product = {
    ...store.products[existingIndex],
    ...updates,
  };
  store.products[existingIndex] = updatedProduct;
  return updatedProduct;
}

export function deleteProduct(id: string): { success: boolean; error?: string } {
  const store = getStore();
  const isUsedInOrder = store.salesOrders.some(so =>
    so.items.some(item => item.productId === id)
  );

  if (isUsedInOrder) {
    return {
      success: false,
      error: 'Produk tidak dapat dihapus karena sudah pernah dipesan pada Sales Order.',
    };
  }

  const existingIndex = store.products.findIndex(p => p.id === id);
  if (existingIndex === -1) {
    return { success: false, error: 'Produk tidak ditemukan.' };
  }

  store.products.splice(existingIndex, 1);
  return { success: true };
}

// ============================================================================
// INVENTORY & RAW MATERIALS DATA ACCESS
// ============================================================================

export function getInventory(): RawMaterial[] {
  const store = getStore();
  return store.materials;
}

export function getMaterials(): RawMaterial[] {
  return getInventory();
}

export function getMaterialById(id: string): RawMaterial | undefined {
  const store = getStore();
  return store.materials.find(m => m.id === id);
}

export function saveMaterial(materialData: Partial<RawMaterial> & { name: string }): RawMaterial {
  const store = getStore();
  if (materialData.id) {
    const idx = store.materials.findIndex(m => m.id === materialData.id);
    if (idx !== -1) {
      const updated = { ...store.materials[idx], ...materialData } as RawMaterial;
      store.materials[idx] = updated;
      return updated;
    }
  }

  const newId = materialData.id || `mat-${generateId()}`;
  const newMaterial: RawMaterial = {
    id: newId,
    code: materialData.code || `MAT-${generateId().toUpperCase()}`,
    category: materialData.category || 'Umum',
    unit: materialData.unit || 'pcs',
    unitCost: materialData.unitCost || 0,
    stock: materialData.stock || 0,
    minStock: materialData.minStock || 5,
    ...materialData,
  } as RawMaterial;

  store.materials.unshift(newMaterial);
  return newMaterial;
}

export function updateStock(
  materialId: string,
  deltaQty: number,
  type: StockMovementType,
  reference: string
): { material: RawMaterial; movement: StockMovement } | null {
  const store = getStore();
  const material = store.materials.find(m => m.id === materialId);
  if (!material) return null;

  if (type === 'IN') {
    material.stock += deltaQty;
  } else {
    material.stock = Math.max(0, material.stock - deltaQty);
  }

  const movement: StockMovement = {
    id: `sm-${generateId()}`,
    materialId,
    materialName: material.name,
    type,
    qty: deltaQty,
    reference,
    date: new Date().toISOString(),
  };

  store.stockMovements.unshift(movement);
  return { material, movement };
}

export function getStockMovements(): StockMovement[] {
  const store = getStore();
  return store.stockMovements;
}

export function getPurchaseOrders(): PurchaseOrder[] {
  const store = getStore();
  return store.purchaseOrders;
}

export function createPurchaseOrder(poData: {
  supplier: string;
  createdBy?: string;
  items: Array<{ materialId: string; materialName: string; qty: number; unitCost: number; unit?: string }>;
  purchaseType?: 'PO' | 'DIRECT';
  additionalCost?: number;
}): PurchaseOrder {
  const store = getStore();
  const totalItemsCost = poData.items.reduce((acc, i) => acc + i.qty * i.unitCost, 0);
  const totalAmount = totalItemsCost + (poData.additionalCost || 0);

  const poNumber = `PO-${new Date().getFullYear()}-${String(store.purchaseOrders.length + 1).padStart(3, '0')}`;
  const po: PurchaseOrder = {
    id: `po-${generateId()}`,
    poNumber,
    supplier: poData.supplier,
    createdBy: poData.createdBy || 'System',
    items: poData.items,
    status: 'ORDERED',
    totalAmount,
    createdAt: new Date().toISOString(),
    paymentStatus: 'UNPAID',
    purchaseType: poData.purchaseType || 'PO',
    additionalCost: poData.additionalCost || 0,
  };

  store.purchaseOrders.unshift(po);
  return po;
}

export function updatePurchaseOrderStatus(id: string, status: POStatus): PurchaseOrder | null {
  const store = getStore();
  const po = store.purchaseOrders.find(p => p.id === id);
  if (!po) return null;

  po.status = status;

  // If status changed to RECEIVED, auto update stock and create stock movements
  if (status === 'RECEIVED') {
    po.receivedAt = new Date().toISOString();
    po.items.forEach(item => {
      updateStock(item.materialId, item.qty, 'IN', po.poNumber);
    });
  }

  return po;
}

// ============================================================================
// SALES ORDERS DATA ACCESS
// ============================================================================

export function getSalesOrders(status?: OrderStatus): SalesOrder[] {
  const store = getStore();
  if (status) {
    return store.salesOrders.filter(so => so.status === status);
  }
  return store.salesOrders;
}

export function getSalesOrderById(id: string): SalesOrder | undefined {
  const store = getStore();
  return store.salesOrders.find(so => so.id === id);
}

export function createSalesOrder(orderData: {
  customer: Customer;
  items: SalesOrderItem[];
  createdBy?: string;
  salesPhone?: string;
  orderNotes?: string;
  shippingCost?: number;
}): SalesOrder {
  const store = getStore();

  const itemsTotal = orderData.items.reduce((acc, item) => {
    let modPrice = 0;
    if (item.selectedModifiers) {
      item.selectedModifiers.forEach(g => {
        g.selectedOptions.forEach(o => {
          modPrice += o.additionalPrice;
        });
      });
    }
    return acc + (item.unitPrice + modPrice) * item.qty;
  }, 0);

  const totalAmount = itemsTotal + (orderData.shippingCost || 0);

  const count = store.salesOrders.length + 1;
  const orderNumber = `SO-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const newOrder: SalesOrder = {
    id: `so-${generateId()}`,
    orderNumber,
    createdBy: orderData.createdBy || 'Sales Executive',
    salesPhone: orderData.salesPhone || '',
    customer: orderData.customer,
    items: orderData.items,
    status: 'PENDING',
    totalAmount,
    shippingCost: orderData.shippingCost || 0,
    orderNotes: orderData.orderNotes || '',
    createdAt: now,
    submittedAt: now,
    updatedAt: now,
    updatedBy: orderData.createdBy || 'Sales Executive',
  };

  store.salesOrders.unshift(newOrder);
  return newOrder;
}

export function updateSalesOrder(id: string, updates: Partial<SalesOrder>): SalesOrder | null {
  const store = getStore();
  const index = store.salesOrders.findIndex(so => so.id === id);
  if (index === -1) return null;

  const updatedOrder: SalesOrder = {
    ...store.salesOrders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  store.salesOrders[index] = updatedOrder;
  return updatedOrder;
}

export function updateSalesOrderStatus(
  id: string,
  status: OrderStatus,
  cancelReason?: string,
  cancelledByRole?: string
): SalesOrder | null {
  const store = getStore();
  const order = store.salesOrders.find(so => so.id === id);
  if (!order) return null;

  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;

  if (status === 'CANCELED') {
    order.cancelReason = cancelReason || 'Dibatalkan oleh sistem';
    order.cancelledByRole = cancelledByRole || 'admin';
  } else if (status === 'PROCESSING') {
    order.confirmedAt = now;
    order.spkIssuedAt = now;

    // Automatically generate Work Orders (SPKs) for each item in the order
    order.items.forEach((item, itemIdx) => {
      const woId = `wo-${order.id}-${itemIdx + 1}`;
      const existingWO = store.workOrders.find(w => w.id === woId);
      if (!existingWO) {
        const product = store.products.find(p => p.id === item.productId);
        const routingId = product?.defaultRoutingId || 'rt-1';
        const routing = initialRoutings.find(r => r.id === routingId) || initialRoutings[0];

        // Create job cards based on routing steps
        const jobCards: JobCard[] = routing.steps.map((step, idx) => {
          const op = initialOperations.find(o => o.id === step.operationId);
          return {
            id: `jc-${woId}-${idx + 1}`,
            workOrderId: woId,
            operationId: step.operationId,
            operationName: op?.name || `Langkah ${idx + 1}`,
            sequence: step.sequence,
            status: idx === 0 ? 'PENDING' : 'PENDING',
            targetQty: item.qty,
            completedQty: 0,
            plannedMinutes: (op?.durationMinutes || 45) * item.qty,
          };
        });

        // Determine BOM materials consumed
        let bom: BOMItem[] = [];
        if (item.variantId && product) {
          const v = product.variants.find(v => v.id === item.variantId);
          if (v && v.bom) bom = v.bom;
        }

        const materialCost = bom.reduce((sum, b) => {
          const mat = store.materials.find(m => m.id === b.materialId);
          return sum + (mat ? mat.unitCost * b.qty * item.qty : 0);
        }, 0);

        const newWorkOrder: WorkOrder = {
          id: woId,
          spkNumber: `SPK-${order.orderNumber}-${itemIdx + 1}`,
          salesOrderId: order.id,
          salesOrderNumber: order.orderNumber,
          productName: item.productName,
          variantName: item.variantLabel,
          selectedModifiers: item.selectedModifiers,
          status: 'PENDING',
          jobCards,
          materialsConsumed: bom,
          materialCost,
          plannedLaborCost: 50000 * item.qty,
          actualLaborCost: 0,
          issuedAt: now,
          isCustom: item.isCustom,
          customNotes: item.customNotes,
        };

        store.workOrders.unshift(newWorkOrder);
      }
    });
  } else if (status === 'SENT') {
    order.deliveredAt = now;
  }

  return order;
}

// ============================================================================
// PRODUCTION / WORK ORDERS (SPK) DATA ACCESS
// ============================================================================

export function getWorkOrders(): WorkOrder[] {
  const store = getStore();
  return store.workOrders;
}

export function getWorkOrderById(id: string): WorkOrder | undefined {
  const store = getStore();
  return store.workOrders.find(wo => wo.id === id);
}

export function createWorkOrder(woData: {
  salesOrderId: string;
  salesOrderNumber: string;
  productName: string;
  variantName?: string;
  selectedModifiers?: any[];
  jobCards?: JobCard[];
  materialsConsumed?: BOMItem[];
  materialCost?: number;
  plannedLaborCost?: number;
  isCustom?: boolean;
  customNotes?: string;
}): WorkOrder {
  const store = getStore();
  const count = store.workOrders.length + 1;
  const spkNumber = `SPK-${woData.salesOrderNumber}-${count}`;
  const now = new Date().toISOString();

  const wo: WorkOrder = {
    id: `wo-${generateId()}`,
    spkNumber,
    salesOrderId: woData.salesOrderId,
    salesOrderNumber: woData.salesOrderNumber,
    productName: woData.productName,
    variantName: woData.variantName,
    selectedModifiers: woData.selectedModifiers,
    status: 'PENDING',
    jobCards: woData.jobCards || [],
    materialsConsumed: woData.materialsConsumed || [],
    materialCost: woData.materialCost || 0,
    plannedLaborCost: woData.plannedLaborCost || 0,
    actualLaborCost: 0,
    issuedAt: now,
    isCustom: woData.isCustom || false,
    customNotes: woData.customNotes,
  };

  store.workOrders.unshift(wo);
  return wo;
}

export function updateWorkOrder(id: string, updates: Partial<WorkOrder>): WorkOrder | null {
  const store = getStore();
  const index = store.workOrders.findIndex(w => w.id === id);
  if (index === -1) return null;

  const updatedWO = {
    ...store.workOrders[index],
    ...updates,
  };
  store.workOrders[index] = updatedWO;
  return updatedWO;
}

export function updateJobCard(
  workOrderId: string,
  jobCardId: string,
  updates: {
    status?: JobCard['status'];
    completedQty?: number;
    picName?: string;
    actualMinutes?: number;
    operatorId?: string;
  }
): { workOrder: WorkOrder; jobCard: JobCard } | null {
  const store = getStore();
  const wo = store.workOrders.find(w => w.id === workOrderId);
  if (!wo) return null;

  const jc = wo.jobCards.find(j => j.id === jobCardId);
  if (!jc) return null;

  const now = new Date().toISOString();

  if (updates.status) jc.status = updates.status;
  if (updates.completedQty !== undefined) jc.completedQty = updates.completedQty;
  if (updates.picName) jc.picName = updates.picName;
  if (updates.operatorId) jc.operatorId = updates.operatorId;
  if (updates.actualMinutes !== undefined) jc.actualMinutes = updates.actualMinutes;

  if (updates.status === 'IN_PROGRESS' && !jc.startedAt) {
    jc.startedAt = now;
    wo.status = 'PROCESSING';
  }

  if (updates.status === 'COMPLETED') {
    jc.completedAt = now;
    if (jc.completedQty < jc.targetQty) {
      jc.completedQty = jc.targetQty;
    }

    // Deduct stock for consumed materials if this is the first job card completing
    if (jc.sequence === 1 && wo.materialsConsumed && wo.materialsConsumed.length > 0) {
      wo.materialsConsumed.forEach(item => {
        updateStock(item.materialId, item.qty, 'OUT', wo.spkNumber);
      });
    }
  }

  // Check if all job cards in this work order are completed
  const allCompleted = wo.jobCards.every(j => j.status === 'COMPLETED');
  if (allCompleted) {
    wo.status = 'COMPLETED';
    wo.completedAt = now;

    // Check if all work orders for the parent Sales Order are completed
    const siblingWOs = store.workOrders.filter(w => w.salesOrderId === wo.salesOrderId);
    const allSiblingsCompleted = siblingWOs.every(w => w.status === 'COMPLETED');
    if (allSiblingsCompleted) {
      updateSalesOrderStatus(wo.salesOrderId, 'READY');
    }
  }

  return { workOrder: wo, jobCard: jc };
}

// ============================================================================
// DELIVERY ORDERS (Surat Jalan) DATA ACCESS
// ============================================================================

export function getDeliveries(): DeliveryOrder[] {
  const store = getStore();
  return store.deliveryOrders;
}

export function getDeliveryOrders(): DeliveryOrder[] {
  return getDeliveries();
}

export function getDeliveryOrderById(id: string): DeliveryOrder | undefined {
  const store = getStore();
  return store.deliveryOrders.find(d => d.id === id);
}

export function createDeliveryOrder(deliveryData: {
  salesOrderId: string;
  assignedDriverName: string;
  vehiclePlate: string;
  scheduledDate: string;
}): DeliveryOrder {
  const store = getStore();
  const order = store.salesOrders.find(so => so.id === deliveryData.salesOrderId);
  if (!order) {
    throw new Error(`Sales Order dengan ID ${deliveryData.salesOrderId} tidak ditemukan`);
  }

  const count = store.deliveryOrders.length + 1;
  const doNumber = `DO-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const itemSummaries = order.items.map(
    i => `${i.productName} (${i.variantLabel || 'Standar'}) x${i.qty}`
  );

  const newDO: DeliveryOrder = {
    id: `do-${generateId()}`,
    doNumber,
    salesOrderId: order.id,
    salesOrderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerAddress: order.customer.address,
    items: itemSummaries,
    assignedDriverName: deliveryData.assignedDriverName,
    vehiclePlate: deliveryData.vehiclePlate,
    scheduledDate: deliveryData.scheduledDate,
    status: 'PENDING',
    createdAt: now,
  };

  store.deliveryOrders.unshift(newDO);
  return newDO;
}

export function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
  deliveryProofNote?: string
): DeliveryOrder | null {
  const store = getStore();
  const doOrder = store.deliveryOrders.find(d => d.id === id);
  if (!doOrder) return null;

  const now = new Date().toISOString();
  doOrder.status = status;

  if (status === 'DELIVERED') {
    doOrder.deliveredAt = now;
    if (deliveryProofNote) doOrder.deliveryProofNote = deliveryProofNote;

    // Update Sales Order status to SENT and issue invoice automatically
    updateSalesOrderStatus(doOrder.salesOrderId, 'SENT');
    createInvoice(doOrder.salesOrderId);
  }

  return doOrder;
}

// ============================================================================
// FINANCE (Invoices, Payments, Expenses, Journals) DATA ACCESS
// ============================================================================

export function getInvoices(): Invoice[] {
  const store = getStore();
  return store.invoices;
}

export function getInvoiceById(id: string): Invoice | undefined {
  const store = getStore();
  return store.invoices.find(inv => inv.id === id);
}

export function createInvoice(salesOrderId: string): Invoice | null {
  const store = getStore();
  const existing = store.invoices.find(inv => inv.salesOrderId === salesOrderId);
  if (existing) return existing;

  const order = store.salesOrders.find(so => so.id === salesOrderId);
  if (!order) return null;

  const count = store.invoices.length + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const newInvoice: Invoice = {
    id: `inv-${generateId()}`,
    invoiceNumber,
    salesOrderId: order.id,
    salesOrderNumber: order.orderNumber,
    salesName: order.createdBy,
    customerName: order.customer.name,
    totalAmount: order.totalAmount,
    paidAmount: 0,
    status: 'UNPAID',
    payments: [],
    issuedAt: now,
    createdAt: now,
  };

  store.invoices.unshift(newInvoice);
  return newInvoice;
}

export function recordInvoicePayment(
  invoiceId: string,
  amount: number,
  method: string,
  note?: string,
  confirmedBy?: string
): { invoice: Invoice; payment: Payment } | null {
  const store = getStore();
  const invoice = store.invoices.find(inv => inv.id === invoiceId);
  if (!invoice) return null;

  const now = new Date().toISOString();
  const payment: Payment = {
    id: `pay-${generateId()}`,
    amount,
    method,
    date: now,
    note: note || '',
    confirmedBy: confirmedBy || invoice.salesName || 'Admin Finance',
  };

  invoice.payments.push(payment);
  invoice.paidAmount += amount;

  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'PAID';
    // Update Sales Order paidAt timestamp
    const order = store.salesOrders.find(so => so.id === invoice.salesOrderId);
    if (order) order.paidAt = now;
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'PARTIAL';
  }

  // Create financial journal entry for this payment
  createJournalEntry({
    date: now,
    description: `Pembayaran Invoice #${invoice.invoiceNumber} (${invoice.customerName})`,
    sourceType: 'INVOICE_PAYMENT',
    sourceId: invoice.id,
    lines: [
      {
        accountId: 'coa-11100',
        accountCode: '1-1100',
        accountName: 'Kas & Bank',
        debit: amount,
        credit: 0,
      },
      {
        accountId: 'coa-11200',
        accountCode: '1-1200',
        accountName: 'Piutang Dagang',
        debit: 0,
        credit: amount,
      },
    ],
  });

  return { invoice, payment };
}

export function getJournalEntries(): JournalEntry[] {
  const store = getStore();
  return store.journalEntries;
}

export function createJournalEntry(
  entryData: Omit<JournalEntry, 'id' | 'entryNumber' | 'createdAt'>
): JournalEntry {
  const store = getStore();
  const count = store.journalEntries.length + 1;
  const entryNumber = `JE-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const entry: JournalEntry = {
    id: `je-${generateId()}`,
    entryNumber,
    date: entryData.date || now,
    description: entryData.description,
    lines: entryData.lines,
    sourceType: entryData.sourceType,
    sourceId: entryData.sourceId,
    createdAt: now,
  };

  store.journalEntries.unshift(entry);
  return entry;
}

export function getBankAccounts(): BankAccount[] {
  const store = getStore();
  return store.bankAccounts;
}

export function getExpenses(): Expense[] {
  const store = getStore();
  return store.expenses;
}

export function recordExpense(expenseData: Omit<Expense, 'id'>): Expense {
  const store = getStore();
  const newExpense: Expense = {
    id: `exp-${generateId()}`,
    category: expenseData.category,
    amount: expenseData.amount,
    date: expenseData.date || new Date().toISOString(),
    bankAccountId: expenseData.bankAccountId,
    note: expenseData.note,
  };

  store.expenses.unshift(newExpense);

  // Deduct bank account balance
  const bank = store.bankAccounts.find(b => b.id === expenseData.bankAccountId);
  if (bank) {
    bank.balance -= expenseData.amount;
  }

  // Create journal entry for expense
  createJournalEntry({
    date: newExpense.date,
    description: `Beban ${expenseData.category}: ${expenseData.note || '-'}`,
    sourceType: 'EXPENSE',
    sourceId: newExpense.id,
    lines: [
      {
        accountId: 'coa-61000',
        accountCode: '6-1000',
        accountName: `Beban ${expenseData.category}`,
        debit: expenseData.amount,
        credit: 0,
      },
      {
        accountId: 'coa-11100',
        accountCode: '1-1100',
        accountName: bank?.name || 'Kas & Bank',
        debit: 0,
        credit: expenseData.amount,
      },
    ],
  });

  return newExpense;
}
