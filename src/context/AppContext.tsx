'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  AppState,
  RawMaterial,
  Product,
  ProductVariantSKU,
  SalesOrder,
  OrderComplaint,
  SalesOrderItem,
  WorkOrder,
  PurchaseOrder,
  PurchaseOrderItem,
  StockMovement,
  DeliveryOrder,
  DeliveryOrderItem,
  Invoice,
  Payment,
  SPKStatus,
  POStatus,
  OrderStatus,
  DeleteResult,
  JobCard,
  Customer,
  CompanyAsset,
  CompanyAssetServiceLog,
  AssetDepreciation,
  ProductModifierGroup,
  ProductionOperation,
  ProductionRouting,
  ProductionOperator,
  BankAccount,
  Expense,
  OtherIncome,
  AccountCode,
  JournalEntry,
  JournalEntryLine,
  AttributeMaster,
  BOMTemplate,
  BOMTemplateItem,
  VariantBOM,
  VariantBOMItem,
  FormContainer,
  Armada,
  Driver,
  ShippingRate,
  FinishedGoodStock,
  FinishedGoodUnit,
  ReturnedGood,
  ReturnedGoodAction,
  ReturnedGoodStatus,
} from '@/lib/types';
import {
  initialMaterials,
  initialAttributes,
  initialProducts,
  initialSalesOrders,
  initialWorkOrders,
  initialPurchaseOrders,
  initialStockMovements,
  initialDeliveryOrders,
  initialInvoices,
  initialAssets,
  initialAssetServiceLogs,
  initialAssetDepreciations,
  initialModifierGroups,
  initialOperations,
  initialRoutings,
  initialOperators,
  initialBankAccounts,
  initialExpenses,
  initialChartOfAccounts,
  initialJournalEntries,
  initialBomTemplates,
  initialBomTemplateItems,
  initialVariantBoms,
  initialProductCategories,
  initialCategories,
  initialAssetCategories,
  initialArmadas,
  initialDrivers,
  initialFinishedGoods,
  initialReturnedGoods,
} from '@/lib/initial-data';
import { generateVariantsFromRules } from '@/lib/product-resolver';
import {
  createOpeningBalanceJournal,
  createInvoiceIssuedJournal,
  createInvoicePaymentJournal,
  createPOReceivedJournal,
  createPOPaymentJournal,
  createDirectPurchaseJournal,
  createReversalPOReceivedJournal,
  createReversalDirectPurchaseJournal,
  createExpenseJournal,
  createAssetPurchaseJournal,
  createBankTransferJournal,
  createCashInflowJournal,
  createManualJournal,
  createClosingJournal,
  createDividendJournal,
} from '@/lib/accounting';
import { generateId, calculateSubAssemblyCost, syncFinishedGoodsWithProducts, getEffectiveVariantBOM, generateOrderNumber, generateItemUnitNumber } from '@/lib/utils';
import { DEFAULT_USER_ID, getUserById, USER_ACCOUNTS, UserAccount } from '@/lib/roles';

const STORAGE_KEY = 'reeval-erp-state-v5';

// ========================================
// Context Shape
// ========================================
interface AppContextType extends AppState {
  currentUser: UserAccount;
  isLoggedIn: boolean;
  switchUser: (userId: string) => void;
  logout: () => void;
  login: (emailOrId: string, passwordInput: string) => { success: boolean; error?: string; user?: UserAccount };

  // Reusable BOM Templates & Variant-Level Overrides Actions
  cloneTemplateToVariant: (variantId: string, templateId: string) => void;
  updateVariantBomItem: (variantId: string, materialId: string, newQty: number) => void;
  removeVariantBomItem: (variantId: string, materialId: string) => void;
  addVariantBomItem: (variantId: string, materialId: string, qty: number) => void;
  getVariantBom: (variantId: string) => VariantBOMItem[];

  // Products CRUD
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => DeleteResult;

  // Global Attributes CRUD
  addAttribute: (attr: Omit<AttributeMaster, 'id'>) => void;
  updateAttribute: (id: string, attr: Partial<Omit<AttributeMaster, 'id'>>) => void;
  deleteAttribute: (id: string) => boolean;
  addAttributeValue: (attributeId: string, value: string) => void;
  removeAttributeValue: (attributeId: string, value: string) => void;

  // Modifier Groups CRUD
  addModifierGroup: (group: Omit<ProductModifierGroup, 'id'>) => void;
  updateModifierGroup: (id: string, group: Partial<Omit<ProductModifierGroup, 'id'>>) => void;
  deleteModifierGroup: (id: string) => boolean;
  setMasterModifierGroups: (groups: ProductModifierGroup[]) => void;

  // Raw Materials & Category CRUD
  addMaterial: (material: Omit<RawMaterial, 'id'>) => void;
  updateMaterial: (id: string, material: Partial<RawMaterial>) => void;
  deleteMaterial: (id: string) => DeleteResult;
  addMaterialCategory: (category: string) => void;
  updateMaterialCategory: (oldCategory: string, newCategory: string) => void;
  deleteMaterialCategory: (category: string) => boolean;
  reorderMaterialCategories: (categories: string[]) => void;

  // Finished Goods CRUD
  finishedGoods: FinishedGoodStock[];
  addFinishedGood: (fg: Omit<FinishedGoodStock, 'id'>) => void;
  updateFinishedGood: (id: string, fg: Partial<FinishedGoodStock>) => void;
  deleteFinishedGood: (id: string) => DeleteResult;
  adjustFinishedGoodStock: (productId: string, variantId: string | undefined, delta: number, reference: string) => void;

  // Product Category CRUD
  addProductCategory: (category: string) => void;
  deleteProductCategory: (category: string) => boolean;

  // Assets CRUD
  addAsset: (asset: Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>) => void;
  updateAsset: (id: string, asset: Partial<Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>>) => void;
  deleteAsset: (id: string) => DeleteResult;
  canDeleteAsset: (id: string) => { canDelete: boolean; reason?: string };
  addAssetCategory: (category: string) => void;
  updateAssetCategory: (oldCategory: string, newCategory: string) => void;
  deleteAssetCategory: (category: string) => boolean;
  reorderAssetCategories: (categories: string[]) => void;
  recordAssetService: (log: Omit<CompanyAssetServiceLog, 'id'>) => void;
  deleteAssetServiceLog: (id: string) => void;


  // Inventory / PO / Pengadaan
  createPO: (supplier: string, items: PurchaseOrderItem[]) => void;
  createDirectPurchase: (supplier: string, items: PurchaseOrderItem[], bankAccountId: string, additionalCost?: number) => void;
  receivePO: (poId: string, receivedItems?: { materialId: string; qty: number }[]) => { success: boolean; isPartial?: boolean; error?: string };
  orderPO: (poId: string) => void;
  rejectPO: (poId: string, reason?: string) => { success: boolean; error?: string };
  cancelPO: (poId: string, reason?: string) => { success: boolean; error?: string };
  cancelRemainingPO: (poId: string, reason?: string) => { success: boolean; error?: string };
  deletePO: (poId: string) => boolean;


  // Sales & Order Lifecycle
  createSalesOrder: (customer: Customer, items: SalesOrderItem[], orderNotes?: string, shippingCost?: number) => string;
  updateSalesOrder: (orderId: string, customer: Customer, items: SalesOrderItem[], orderNotes?: string, shippingCost?: number) => void;
  updateOrderCustomProcess: (orderId: string, updatedItems: SalesOrderItem[]) => { success: boolean; error?: string };
  processOrder: (orderId: string) => { success: boolean; error?: string };
  cancelOrder: (orderId: string, cancelReason: string) => void;
  submitOrderComplaint: (orderId: string, complaint: Omit<OrderComplaint, 'id' | 'status' | 'createdAt'>) => void;
  resolveOrderComplaint: (
    orderId: string,
    complaintId: string,
    resolution: 'Batalkan Pesanan (Refund)' | 'Penuhi Barang Pengganti' | 'Kirim Barang Pengganti' | 'Perbaikan' | 'Tolak Komplain',
    resolutionNotes?: string,
    refundBankAccountId?: string,
    options?: {
      replacementSource?: 'NEW_SPK' | 'FINISHED_STOCK';
      isReturnRequested?: boolean;
      selectedFinishedGoodUnitId?: string;
    }
  ) => { success: boolean; inStock?: boolean; spkNumber?: string } | void;
  rejectOrderComplaint: (orderId: string, complaintId: string, rejectionReason: string) => void;
  manuallyResolveComplaint: (orderId: string, complaintId: string, notes?: string) => void;

  // Barang Retur & Alokasi Barang Jadi
  returnedGoods: ReturnedGood[];
  confirmReceiveReturnedGood: (returnId: string) => void;
  processReturnedGoodAction: (returnId: string, action: ReturnedGoodAction, notes?: string) => void;
  allocateFinishedGoodToOrder: (
    fgId: string,
    unitId: string | undefined,
    orderId: string,
    complaintId?: string
  ) => { success: boolean; message?: string };

  // Production
  updateJobCardProgress: (workOrderId: string, jobCardId: string, completedQty: number, picName: string) => void;
  startJobCard: (workOrderId: string, jobCardId: string) => void;
  pauseJobCard: (workOrderId: string, jobCardId: string) => void;
  completeJobCard: (workOrderId: string, jobCardId: string, completedQty: number, picName: string, actualMinutes?: number, operatorId?: string) => { success: boolean; error?: string };
  createSubAssemblyWorkOrder: (subAssemblyId: string, targetQty: number, customNotes?: string) => { success: boolean; error?: string };
  createNormalWorkOrder: (productId: string, variantId: string | undefined, targetQty: number, customNotes?: string) => { success: boolean; error?: string };
  cancelWorkOrder: (workOrderId: string, reason?: string) => { success: boolean; error?: string };
  syncWorkOrderRouting: (workOrderId: string) => void;
  addOperation: (op: Omit<ProductionOperation, 'id'>) => string;
  updateOperation: (id: string, op: Partial<Omit<ProductionOperation, 'id'>>) => void;
  deleteOperation: (id: string) => boolean;
  addRouting: (rt: Omit<ProductionRouting, 'id'>) => void;
  updateRouting: (id: string, rt: Partial<Omit<ProductionRouting, 'id'>>) => void;
  deleteRouting: (id: string) => boolean;
  addOperator: (op: Omit<ProductionOperator, 'id'>) => void;
  updateOperator: (id: string, op: Partial<Omit<ProductionOperator, 'id'>>) => void;
  deleteOperator: (id: string) => boolean;
  strictSOStockCheck: boolean;
  setStrictSOStockCheck: (enabled: boolean) => void;

  // Delivery
  createDeliveryOrder: (
    paramsOrSOId: string | {
      salesOrderIds: string[];
      selectedItems?: DeliveryOrderItem[];
      driverName: string;
      driverId?: string;
      driverPhone?: string;
      vehiclePlate: string;
      armadaId?: string;
      armadaName?: string;
      scheduledDate: string;
      notes?: string;
    },
    legacyDriverName?: string,
    legacyVehiclePlate?: string,
    legacyScheduledDate?: string
  ) => void;
  confirmLoadingDelivery: (deliveryOrderId: string, driverName?: string) => void;
  confirmDelivery: (
    deliveryOrderId: string,
    proofData?: {
      receiverName?: string;
      proofNote?: string;
      proofPhoto?: string;
    } | string
  ) => void;
  reportFailedDelivery: (
    deliveryOrderId: string,
    failureData: {
      reason: string;
      note?: string;
      photo?: string;
    }
  ) => void;

  // Finance / Invoicing / Payment / Banking
  recordPayment: (invoiceId: string, amount: number, bankAccountId: string, note: string) => void;
  recordExpense: (category: Expense['category'], amount: number, bankAccountId: string, note?: string) => void;
  recordOtherIncome: (accountCode: string, accountName: string, amount: number, bankAccountId: string, note?: string) => void;
  paySupplierPO: (purchaseOrderId: string, bankAccountId: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, account: Partial<Omit<BankAccount, 'id'>>) => void;
  deleteBankAccount: (id: string) => boolean;
  transferBankFunds: (fromAccountId: string, toAccountId: string, amount: number, note?: string) => boolean;
  addManualJournal: (description: string, lines: Omit<JournalEntryLine, 'accountName'>[], date?: string) => void;
  closePeriod: (totalRevenue: number, totalCOGS: number, totalExpense: number, date?: string) => void;
  distributeDividend: (amount: number, bankAccountId: string, date?: string) => void;

  // Chart of Accounts
  addAccount: (account: Omit<AccountCode, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Omit<AccountCode, 'id'>>) => void;
  deleteAccount: (id: string) => { success: boolean; reason?: string };

  // BOM Templates CRUD
  addBomTemplate: (template: Omit<BOMTemplate, 'id'>, items: { materialId: string; defaultQty: number }[]) => void;
  updateBomTemplate: (id: string, template: Partial<Omit<BOMTemplate, 'id'>>, items?: { materialId: string; defaultQty: number }[]) => void;
  deleteBomTemplate: (id: string) => void;

  // Dynamic Forms & Order Settings
  updateOrderFormConfiguration: (newConfig: FormContainer[]) => void;
  showAllOrdersTab: boolean;
  setShowAllOrdersTab: (show: boolean) => void;
  isCustomOrderFormEnabled: boolean;
  setIsCustomOrderFormEnabled: (enabled: boolean) => void;

  // Delivery Configuration (Armada, Driver, Shipping Rate)
  addArmada: (armada: Omit<Armada, 'id'>) => void;
  updateArmada: (id: string, armada: Partial<Omit<Armada, 'id'>>) => void;
  deleteArmada: (id: string) => boolean;
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, driver: Partial<Omit<Driver, 'id'>>) => void;
  deleteDriver: (id: string) => boolean;
  addShippingRate: (rate: Omit<ShippingRate, 'id'>) => void;
  updateShippingRate: (id: string, rate: Partial<Omit<ShippingRate, 'id'>>) => void;
  deleteShippingRate: (id: string) => void;
  deleteShippingRatesByRegency: (regencyId: string) => void;
  setIsShippingRateEnabled: (enabled: boolean) => void;

  // Utils
  getProduct: (productId: string) => Product | undefined;
  getMaterial: (materialId: string) => RawMaterial | undefined;
  resetData: () => void;

  // HPP Projection
  getPendingOrderEstHPP: (salesOrderId: string) => { estMaterialCost: number; estLaborCost: number; totalEstHPP: number } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ========================================
// Load / Save helpers
// ========================================
function loadState(): AppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // ignore
  }
  return null;
}

function saveState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const initialOrderFormConfiguration: FormContainer[] = [
  {
    id: 'container-products',
    title: 'Item Produk',
    order: 0,
    fields: [
      { id: 'field-product-list', label: 'Daftar Produk', type: 'product_list', isRequired: true, order: 0 }
    ]
  },
  {
    id: 'container-customer',
    title: 'Informasi Pelanggan',
    order: 1,
    fields: [
      { id: 'field-customer-name', label: 'Nama Pelanggan', type: 'text', isRequired: true, order: 0 },
      { id: 'field-customer-phone', label: 'Nomor Telepon', type: 'number', isRequired: true, order: 1 },
      { id: 'field-customer-address', label: 'Alamat Lengkap', type: 'textarea', isRequired: true, order: 2 },
    ]
  },
  {
    id: 'container-notes',
    title: 'Catatan Pesanan',
    order: 2,
    fields: [
      { id: 'field-order-notes', label: '', type: 'textarea', isRequired: false, placeholder: 'Tambahkan catatan untuk pesanan ini', order: 0 }
    ]
  }
];

function getDefaultState(): AppState {
  return {
    materials: structuredClone(initialMaterials),
    attributes: structuredClone(initialAttributes),
    products: structuredClone(initialProducts),
    bomTemplates: structuredClone(initialBomTemplates),
    bomTemplateItems: structuredClone(initialBomTemplateItems),
    variantBoms: structuredClone(initialVariantBoms),
    salesOrders: structuredClone(initialSalesOrders).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    workOrders: structuredClone(initialWorkOrders),
    purchaseOrders: structuredClone(initialPurchaseOrders.map(po => ({ ...po, paymentStatus: po.paymentStatus || 'UNPAID' }))),
    stockMovements: structuredClone(initialStockMovements),
    deliveryOrders: structuredClone(initialDeliveryOrders),
    finishedGoods: initialFinishedGoods,
    returnedGoods: structuredClone(initialReturnedGoods),
    invoices: structuredClone(initialInvoices),
    currentUserId: DEFAULT_USER_ID,
    categories: structuredClone(initialCategories),
    assetCategories: structuredClone(initialAssetCategories),
    productCategories: structuredClone(initialProductCategories),
    assets: structuredClone(initialAssets),
    assetServiceLogs: structuredClone(initialAssetServiceLogs),
    assetDepreciations: structuredClone(initialAssetDepreciations || []),
    masterModifierGroups: structuredClone(initialModifierGroups),
    operations: structuredClone(initialOperations),
    routings: structuredClone(initialRoutings),
    operators: structuredClone(initialOperators),
    bankAccounts: structuredClone(initialBankAccounts),
    expenses: structuredClone(initialExpenses),
    otherIncomes: [],
    chartOfAccounts: structuredClone(initialChartOfAccounts),
    journalEntries: structuredClone(initialJournalEntries),
    orderFormConfiguration: structuredClone(initialOrderFormConfiguration),
    showAllOrdersTab: false,
    isCustomOrderFormEnabled: false,
    armadas: structuredClone(initialArmadas),
    drivers: structuredClone(initialDrivers),
    shippingRates: [],
    isShippingRateEnabled: false,
  };
}



// Helper: compute SO status based on item-level fulfillment counters
export function computeSOStatus(so: SalesOrder): OrderStatus {
  if (so.status === 'CANCELED') return 'CANCELED';
  if (so.status === 'PENDING') return 'PENDING';

  const items = so.items;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalDelivered = items.reduce((s, i) => s + (i.deliveredQty || 0), 0);
  const totalProduced = items.reduce((s, i) => s + (i.producedQty || 0), 0);

  // Status hanya SENT jika seluruh item telah diterima pelanggan
  if (totalDelivered >= totalQty) return 'SENT';
  // Status hanya PARTIALLY_SHIPPED jika sebagian barang telah diterima di pelanggan
  if (totalDelivered > 0) return 'PARTIALLY_SHIPPED';
  // Jika seluruh barang telah selesai diproduksi dan belum ada serah terima, status adalah SIAP KIRIM (READY)
  if (totalProduced >= totalQty) return 'READY';
  // Jika sebagian barang telah selesai diproduksi
  if (totalProduced > 0) return 'PARTIALLY_READY';
  return 'PROCESSING';
}

// ========================================
// Provider Component
// ========================================
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(getDefaultState);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      const loadedBankAccounts = saved.bankAccounts || structuredClone(initialBankAccounts);
      const validBankIds = new Set(loadedBankAccounts.map(b => b.id));

      setState({
        ...getDefaultState(),
        ...saved,
        attributes: saved.attributes || structuredClone(initialAttributes),
        bomTemplates: saved.bomTemplates?.length ? saved.bomTemplates : structuredClone(initialBomTemplates),
        bomTemplateItems: saved.bomTemplateItems?.length ? saved.bomTemplateItems : structuredClone(initialBomTemplateItems),
        variantBoms: saved.variantBoms?.length ? saved.variantBoms : structuredClone(initialVariantBoms),
        products: saved.products?.length ? saved.products : structuredClone(initialProducts),
        materials: saved.materials?.length ? saved.materials : structuredClone(initialMaterials),
        finishedGoods: syncFinishedGoodsWithProducts(
          saved.products?.length ? saved.products : structuredClone(initialProducts),
          saved.finishedGoods || []
        ),
        productCategories: saved.productCategories?.length ? saved.productCategories : structuredClone(initialProductCategories),
        categories: saved.categories !== undefined ? saved.categories : structuredClone(initialCategories),
        assetCategories: saved.assetCategories !== undefined ? saved.assetCategories : structuredClone(initialAssetCategories),
        returnedGoods: (() => {
          const rawReturns = saved.returnedGoods || [];
          const soList = saved.salesOrders || initialSalesOrders;
          return rawReturns.filter(rg => {
            if (!rg.complaintId) return true;
            const targetSo = soList.find(o => o.id === rg.salesOrderId || o.orderNumber === rg.salesOrderNumber);
            const cmp = targetSo?.complaints?.find(c => c.id === rg.complaintId);
            return cmp && cmp.status !== 'DIAJUKAN' && cmp.status !== 'DITOLAK';
          });
        })(),
        salesOrders: (saved.salesOrders || getDefaultState().salesOrders)
          .map(so => {
            const initSo = initialSalesOrders.find(iso => iso.id === so.id);
            if (initSo && so.id === 'so-3' && so.status === 'PARTIALLY_SHIPPED') {
              return { ...so, status: initSo.status, items: structuredClone(initSo.items) };
            }
            // Auto-heal status if SO was wrongly marked PARTIALLY_SHIPPED before any items were actually delivered
            const correctedStatus = computeSOStatus(so);
            const sanitizedSO = { ...so, status: correctedStatus };

            if (!sanitizedSO.complaints || sanitizedSO.complaints.length === 0) return sanitizedSO;
            return {
              ...sanitizedSO,
              complaints: sanitizedSO.complaints.map(cmp => {
                if (cmp.attachments && cmp.attachments.length > 0) return cmp;
                const initSo = initialSalesOrders.find(iso => iso.id === sanitizedSO.id);
                const initCmp = initSo?.complaints?.find(ic => ic.id === cmp.id);
                if (initCmp?.attachments && initCmp.attachments.length > 0) {
                  return { ...cmp, attachments: initCmp.attachments };
                }
                return cmp;
              })
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        deliveryOrders: (() => {
          const loaded = (saved.deliveryOrders && saved.deliveryOrders.length > 0) ? saved.deliveryOrders : structuredClone(initialDeliveryOrders);
          const loadedIds = new Set(loaded.map((d: DeliveryOrder) => d.id));
          const missingSeeds = initialDeliveryOrders.filter(d => !loadedIds.has(d.id));
          const merged = [...loaded, ...structuredClone(missingSeeds)];
          return merged.map((d: DeliveryOrder) => {
            const initDO = initialDeliveryOrders.find(id => id.id === d.id);
            let updated = { ...d };
            if (!updated.deliveryProofPhoto && initDO?.deliveryProofPhoto) {
              updated.deliveryProofPhoto = initDO.deliveryProofPhoto;
            }
            if (initDO?.status === 'FAILED' && !updated.failureReason) {
              updated = {
                ...updated,
                status: initDO.status,
                failureReason: initDO.failureReason,
                failureNote: initDO.failureNote,
                failedAt: initDO.failedAt
              };
            }
            return updated;
          });
        })(),
        assets: (saved.assets || structuredClone(initialAssets)).map(ast => ({
          ...ast,
          acquisitionType: ast.acquisitionType || 'EXISTING',
          usefulLifeMonths: ast.usefulLifeMonths || (ast.usefulLifeYears * 12),
          salvageValue: ast.salvageValue || 0,
          currentBookValue: ast.currentBookValue !== undefined ? ast.currentBookValue : ast.purchaseCost,
        })),
        assetServiceLogs: saved.assetServiceLogs || structuredClone(initialAssetServiceLogs),
        assetDepreciations: saved.assetDepreciations || structuredClone(initialAssetDepreciations || []),
        masterModifierGroups: saved.masterModifierGroups || structuredClone(initialModifierGroups),
        bankAccounts: loadedBankAccounts,
        expenses: saved.expenses || structuredClone(initialExpenses),
        otherIncomes: saved.otherIncomes || [],
        armadas: saved.armadas || structuredClone(initialArmadas),
        drivers: saved.drivers || structuredClone(initialDrivers),
        shippingRates: saved.shippingRates || [],
        chartOfAccounts: (saved.chartOfAccounts || structuredClone(initialChartOfAccounts)).map(acc =>
          acc.code === '1-1100' || acc.id === 'coa-11100' ? { ...acc, isHeader: false } : acc
        ),
        journalEntries: (saved.journalEntries?.length ? saved.journalEntries : structuredClone(initialJournalEntries))
          .filter(j => j.sourceType !== 'OPENING_BALANCE' || !j.sourceId || validBankIds.has(j.sourceId))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        orderFormConfiguration: (() => {
          const cfg = saved.orderFormConfiguration;
          if (!cfg || !Array.isArray(cfg) || cfg.length === 0) {
            return structuredClone(initialOrderFormConfiguration);
          }
          const notesIdx = cfg.findIndex(c => c.id === 'container-notes');
          const custIdx = cfg.findIndex(c => c.id === 'container-customer');
          if (notesIdx !== -1 && custIdx !== -1 && notesIdx < custIdx && !saved.isCustomOrderFormEnabled) {
            const reordered = [...cfg];
            const [notes] = reordered.splice(notesIdx, 1);
            const newCustIdx = reordered.findIndex(c => c.id === 'container-customer');
            reordered.splice(newCustIdx + 1, 0, notes);
            return reordered.map((c, idx) => ({ ...c, order: idx }));
          }
          return cfg;
        })(),
      });
    }
  }, []);



  // Persist on every change
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    saveState(state);
  }, [state, initialized]);

  const currentUser = getUserById(state.currentUserId || DEFAULT_USER_ID);
  const isLoggedIn = Boolean(state.currentUserId);

  const switchUser = useCallback((userId: string) => {
    setState(prev => ({ ...prev, currentUserId: userId }));
  }, []);

  const logout = useCallback(() => {
    setState(prev => ({ ...prev, currentUserId: '' }));
  }, []);

  const login = useCallback((emailOrId: string, passwordInput: string) => {
    if (passwordInput !== '123456') {
      return { success: false, error: 'Password salah. Gunakan password default: 123456' };
    }
    const clean = emailOrId.trim().toLowerCase();
    const account = USER_ACCOUNTS.find(
      u => u.id.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    if (!account) {
      return { success: false, error: 'Akun pengguna tidak ditemukan. Pilih salah satu akun demo.' };
    }
    setState(prev => ({ ...prev, currentUserId: account.id }));
    return { success: true, user: account };
  }, []);

  // ---- Modifier Groups CRUD ----
  const addModifierGroup = useCallback((group: Omit<ProductModifierGroup, 'id'>) => {
    const id = `pmg-${generateId()}`;
    setState(prev => ({
      ...prev,
      masterModifierGroups: [...prev.masterModifierGroups, { id, ...group }]
    }));
  }, []);

  const updateModifierGroup = useCallback((id: string, group: Partial<Omit<ProductModifierGroup, 'id'>>) => {
    setState(prev => ({
      ...prev,
      masterModifierGroups: prev.masterModifierGroups.map(g => (g.id === id ? { ...g, ...group } : g)),
    }));
  }, []);

  const deleteModifierGroup = useCallback((id: string): boolean => {
    let canDelete = true;
    setState(prev => {
      const usedByProduct = prev.products.some(p => p.modifierGroupIds?.includes(id));
      if (usedByProduct) {
        canDelete = false;
        return prev;
      }
      return {
        ...prev,
        masterModifierGroups: prev.masterModifierGroups.filter(g => g.id !== id)
      };
    });
    return canDelete;
  }, []);

  const setMasterModifierGroups = useCallback((groups: ProductModifierGroup[]) => {
    setState(prev => ({
      ...prev,
      masterModifierGroups: groups
    }));
  }, []);

  // ---- Reusable BOM Templates & Variant-Level Overrides ----

  /**
   * cloneTemplateToVariant(variantId, templateId)
   * Mengkloning master preset BOM ke varian fisik:
   * 1. Filter bomTemplateItems berdasarkan templateId.
   * 2. Lakukan DEEP COPY (menyalin value, bukan referensi) agar master template steril.
   * 3. Masukkan / replace isi variantBoms untuk variantId tersebut.
   * 4. Sinkronkan juga ke state products (variant.bom) agar integrasi SPK/SO tetap valid.
   */
  const cloneTemplateToVariant = useCallback((variantId: string, templateId: string) => {
    setState(prev => {
      const templateItems = prev.bomTemplateItems.filter(item => item.templateId === templateId);

      // Strict Deep copy: salin nilai baru murni, tidak ada reference leak ke template asli
      const clonedItems: VariantBOMItem[] = templateItems.map(item => ({
        materialId: item.materialId,
        qty: Number(item.defaultQty) || 0,
      }));

      // Update variantBoms
      const existingBomIndex = prev.variantBoms.findIndex(vb => vb.variantId === variantId);
      let updatedVariantBoms: VariantBOM[];
      if (existingBomIndex >= 0) {
        updatedVariantBoms = prev.variantBoms.map((vb, idx) =>
          idx === existingBomIndex ? { variantId, items: clonedItems } : vb
        );
      } else {
        updatedVariantBoms = [...prev.variantBoms, { variantId, items: clonedItems }];
      }

      // Sinkronkan ke products -> variants -> bom
      const updatedProducts = prev.products.map(p => {
        const hasVariant = p.variants.some(v => v.id === variantId);
        if (!hasVariant) return p;
        return {
          ...p,
          variants: p.variants.map(v => {
            if (v.id !== variantId) return v;
            return {
              ...v,
              bom: clonedItems.map(ci => ({ materialId: ci.materialId, qty: ci.qty })),
            };
          }),
        };
      });

      return {
        ...prev,
        variantBoms: updatedVariantBoms,
        products: updatedProducts,
      };
    });
  }, []);

  /**
   * updateVariantBomItem(variantId, materialId, newQty)
   * Menyesuaikan kuantitas material pada BOM varian aktif
   */
  const updateVariantBomItem = useCallback((variantId: string, materialId: string, newQty: number) => {
    setState(prev => {
      const qtyNum = Math.max(0, Number(newQty) || 0);

      // 1. Update variantBoms
      const existingBomIndex = prev.variantBoms.findIndex(vb => vb.variantId === variantId);
      let updatedVariantBoms: VariantBOM[];
      if (existingBomIndex >= 0) {
        updatedVariantBoms = prev.variantBoms.map((vb, idx) => {
          if (idx !== existingBomIndex) return vb;
          const updatedItems = vb.items.map(it =>
            it.materialId === materialId ? { ...it, qty: qtyNum } : it
          );
          return { ...vb, items: updatedItems };
        });
      } else {
        updatedVariantBoms = [...prev.variantBoms, { variantId, items: [{ materialId, qty: qtyNum }] }];
      }

      // 2. Sync to products
      const updatedProducts = prev.products.map(p => {
        const hasVariant = p.variants.some(v => v.id === variantId);
        if (!hasVariant) return p;
        return {
          ...p,
          variants: p.variants.map(v => {
            if (v.id !== variantId) return v;
            const updatedBom = v.bom.map(b =>
              b.materialId === materialId ? { ...b, qty: qtyNum } : b
            );
            return { ...v, bom: updatedBom };
          }),
        };
      });

      return {
        ...prev,
        variantBoms: updatedVariantBoms,
        products: updatedProducts,
      };
    });
  }, []);

  /**
   * removeVariantBomItem(variantId, materialId)
   * Menghapus item material tertentu dari BOM varian
   */
  const removeVariantBomItem = useCallback((variantId: string, materialId: string) => {
    setState(prev => {
      // 1. Update variantBoms
      const updatedVariantBoms = prev.variantBoms.map(vb => {
        if (vb.variantId !== variantId) return vb;
        return {
          ...vb,
          items: vb.items.filter(it => it.materialId !== materialId),
        };
      });

      // 2. Sync to products
      const updatedProducts = prev.products.map(p => {
        const hasVariant = p.variants.some(v => v.id === variantId);
        if (!hasVariant) return p;
        return {
          ...p,
          variants: p.variants.map(v => {
            if (v.id !== variantId) return v;
            return {
              ...v,
              bom: v.bom.filter(b => b.materialId !== materialId),
            };
          }),
        };
      });

      return {
        ...prev,
        variantBoms: updatedVariantBoms,
        products: updatedProducts,
      };
    });
  }, []);

  /**
   * addVariantBomItem(variantId, materialId, qty)
   * Menambah material baru secara manual ke BOM varian di luar preset
   */
  const addVariantBomItem = useCallback((variantId: string, materialId: string, qty: number) => {
    setState(prev => {
      const qtyNum = Math.max(0, Number(qty) || 1);

      // 1. Update variantBoms
      const existingBomIndex = prev.variantBoms.findIndex(vb => vb.variantId === variantId);
      let updatedVariantBoms: VariantBOM[];
      if (existingBomIndex >= 0) {
        updatedVariantBoms = prev.variantBoms.map((vb, idx) => {
          if (idx !== existingBomIndex) return vb;
          const exists = vb.items.some(it => it.materialId === materialId);
          const updatedItems = exists
            ? vb.items.map(it => it.materialId === materialId ? { ...it, qty: it.qty + qtyNum } : it)
            : [...vb.items, { materialId, qty: qtyNum }];
          return { ...vb, items: updatedItems };
        });
      } else {
        updatedVariantBoms = [...prev.variantBoms, { variantId, items: [{ materialId, qty: qtyNum }] }];
      }

      // 2. Sync to products
      const updatedProducts = prev.products.map(p => {
        const hasVariant = p.variants.some(v => v.id === variantId);
        if (!hasVariant) return p;
        return {
          ...p,
          variants: p.variants.map(v => {
            if (v.id !== variantId) return v;
            const exists = v.bom.some(b => b.materialId === materialId);
            const updatedBom = exists
              ? v.bom.map(b => b.materialId === materialId ? { ...b, qty: b.qty + qtyNum } : b)
              : [...v.bom, { materialId, qty: qtyNum }];
            return { ...v, bom: updatedBom };
          }),
        };
      });

      return {
        ...prev,
        variantBoms: updatedVariantBoms,
        products: updatedProducts,
      };
    });
  }, []);

  const getVariantBom = useCallback((variantId: string): VariantBOMItem[] => {
    for (const p of state.products) {
      const v = p.variants.find(item => item.id === variantId);
      if (v) {
        if (v.isCustomBOM) {
          return (v.bom || []).map(b => ({ materialId: b.materialId, qty: b.qty }));
        }
        if (v.presetId) {
          const tplItems = state.bomTemplateItems.filter(item => item.templateId === v.presetId);
          if (tplItems.length > 0) {
            return tplItems.map(item => ({ materialId: item.materialId, qty: item.defaultQty }));
          }
        }
        return (v.bom || []).map(b => ({ materialId: b.materialId, qty: b.qty }));
      }
    }
    const found = state.variantBoms.find(vb => vb.variantId === variantId);
    if (found) return found.items;
    return [];
  }, [state.products, state.bomTemplateItems, state.variantBoms]);

  // ---- Delivery Configuration CRUD ----
  const addArmada = useCallback((armada: Omit<Armada, 'id'>) => {
    const id = `arm-${generateId()}`;
    setState(prev => ({ ...prev, armadas: [...prev.armadas, { id, ...armada }] }));
  }, []);

  const updateArmada = useCallback((id: string, armada: Partial<Omit<Armada, 'id'>>) => {
    setState(prev => ({
      ...prev,
      armadas: prev.armadas.map(a => (a.id === id ? { ...a, ...armada } : a))
    }));
  }, []);

  const deleteArmada = useCallback((id: string): boolean => {
    // Basic check: is it used in DeliveryOrders? (Could check, but for now just delete)
    setState(prev => ({
      ...prev,
      armadas: prev.armadas.filter(a => a.id !== id)
    }));
    return true;
  }, []);

  const addDriver = useCallback((driver: Omit<Driver, 'id'>) => {
    const id = `drv-${generateId()}`;
    setState(prev => ({ ...prev, drivers: [...prev.drivers, { id, ...driver }] }));
  }, []);

  const updateDriver = useCallback((id: string, driver: Partial<Omit<Driver, 'id'>>) => {
    setState(prev => ({
      ...prev,
      drivers: prev.drivers.map(d => (d.id === id ? { ...d, ...driver } : d))
    }));
  }, []);

  const deleteDriver = useCallback((id: string): boolean => {
    setState(prev => ({
      ...prev,
      drivers: prev.drivers.filter(d => d.id !== id)
    }));
    return true;
  }, []);

  const addShippingRate = useCallback((rate: Omit<ShippingRate, 'id'>) => {
    const id = `sr-${generateId()}`;
    setState(prev => ({ ...prev, shippingRates: [...prev.shippingRates, { id, ...rate }] }));
  }, []);

  const updateShippingRate = useCallback((id: string, rate: Partial<Omit<ShippingRate, 'id'>>) => {
    setState(prev => ({
      ...prev,
      shippingRates: prev.shippingRates.map(r => (r.id === id ? { ...r, ...rate } : r))
    }));
  }, []);

  const deleteShippingRate = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      shippingRates: prev.shippingRates.filter(r => r.id !== id)
    }));
  }, []);

  const deleteShippingRatesByRegency = useCallback((regencyId: string) => {
    setState(prev => ({
      ...prev,
      shippingRates: prev.shippingRates.filter(r => r.regencyId !== regencyId)
    }));
  }, []);

  const setIsShippingRateEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isShippingRateEnabled: enabled }));
  }, []);

  // ---- Products CRUD ----
  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const id = `prod-${generateId()}`;
    const productWithId = { id, isActive: true, ...product } as Product;
    const rawVariants = (product.variants && product.variants.length > 0)
      ? product.variants
      : generateVariantsFromRules(productWithId, state.materials);

    const variants = rawVariants.map(v => {
      if ((!v.bom || v.bom.length === 0) && v.presetId) {
        const eff = getEffectiveVariantBOM(v, state.bomTemplateItems);
        if (eff.length > 0) {
          return { ...v, bom: structuredClone(eff) };
        }
      }
      return v;
    });

    const newVariantBoms: VariantBOM[] = variants.map(v => ({
      variantId: v.id,
      items: (v.bom || []).map(b => ({ materialId: b.materialId, qty: b.qty })),
    }));

    setState(prev => {
      const nextProducts = [{ ...productWithId, variants }, ...prev.products];
      const syncedFG = syncFinishedGoodsWithProducts(nextProducts, prev.finishedGoods);

      // Record StockMovement for any newly created finished good with initialStock > 0
      const initialMovements: StockMovement[] = [];
      const now = new Date().toISOString();
      for (const fg of syncedFG) {
        if (fg.productId === id && fg.stock > 0) {
          initialMovements.push({
            id: `sm-${crypto.randomUUID().slice(0, 8)}`,
            materialId: fg.id,
            materialName: fg.productName + (fg.variantLabel ? ` (${fg.variantLabel})` : ''),
            type: 'INIT',
            qty: fg.stock,
            reference: 'Inisiasi Stok',
            date: now,
            stockCategory: 'FINISHED',
          });
        }
      }

      return {
        ...prev,
        products: nextProducts,
        finishedGoods: syncedFG,
        stockMovements: [...initialMovements, ...prev.stockMovements],
        variantBoms: [
          ...prev.variantBoms.filter(vb => !variants.some(v => v.id === vb.variantId)),
          ...newVariantBoms,
        ],
      };
    });
  }, [state.materials, state.bomTemplateItems]);

  const updateProduct = useCallback((id: string, product: Partial<Omit<Product, 'id'>>) => {
    setState(prev => {
      const existingProduct = prev.products.find(p => p.id === id);
      if (!existingProduct) return prev;

      const merged = { ...existingProduct, ...product } as Product;
      const rawVariants = (product.variants && product.variants.length > 0)
        ? product.variants
        : generateVariantsFromRules(merged, prev.materials, existingProduct.variants);

      const variants = rawVariants.map(v => {
        if ((!v.bom || v.bom.length === 0) && v.presetId) {
          const eff = getEffectiveVariantBOM(v, prev.bomTemplateItems);
          if (eff.length > 0) {
            return { ...v, bom: structuredClone(eff) };
          }
        }
        return v;
      });

      const newVariantBoms: VariantBOM[] = variants.map(v => ({
        variantId: v.id,
        items: (v.bom || []).map(b => ({ materialId: b.materialId, qty: b.qty })),
      }));

      const nextProducts = prev.products.map(p => (p.id === id ? { ...merged, variants } : p));
      return {
        ...prev,
        products: nextProducts,
        finishedGoods: syncFinishedGoodsWithProducts(nextProducts, prev.finishedGoods),
        variantBoms: [
          ...prev.variantBoms.filter(vb => !variants.some(v => v.id === vb.variantId)),
          ...newVariantBoms,
        ],
      };
    });
  }, []);

  const deleteProduct = useCallback((id: string): DeleteResult => {
    const prod = state.products.find(p => p.id === id);
    if (!prod) {
      return { success: false, reason: 'Produk tidak ditemukan.' };
    }

    const fgIds = new Set(state.finishedGoods.filter(fg => fg.productId === id).map(fg => fg.id));
    const movements = state.stockMovements.filter(sm => fgIds.has(sm.materialId) || sm.materialId === id);
    const hasOtherMovements = movements.some(
      sm => sm.type !== 'INIT' && !sm.reference.trim().toLowerCase().startsWith('inisiasi')
    );
    if (hasOtherMovements) {
      const otherRef = movements.find(sm => sm.type !== 'INIT' && !sm.reference.trim().toLowerCase().startsWith('inisiasi'))?.reference;
      return {
        success: false,
        reason: `Produk "${prod.name}" memiliki riwayat mutasi transaksi (${otherRef || 'transaksi operasional'}). Tidak dapat dihapus demi integritas audit.`,
      };
    }

    // 2. Cek Sales Order
    const usedInSO = state.salesOrders.some(so => so.items.some(i => i.productId === id));
    if (usedInSO) {
      return {
        success: false,
        reason: `Produk "${prod.name}" sudah terdaftar dalam transaksi Sales Order.`,
      };
    }

    // Soft delete: set isActive = false pada produk & barang jadi terkait, bersihkan mutasi inisiasinya
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => (p.id === id ? { ...p, isActive: false } : p)),
      finishedGoods: prev.finishedGoods.map(fg => (fg.productId === id ? { ...fg, isActive: false } : fg)),
      stockMovements: prev.stockMovements.filter(sm => !fgIds.has(sm.materialId) && sm.materialId !== id),
    }));

    return { success: true };
  }, [state.products, state.finishedGoods, state.stockMovements, state.salesOrders]);

  // ---- Global Attribute Master CRUD ----
  const addAttribute = useCallback((attr: Omit<AttributeMaster, 'id'>) => {
    const id = `attr-${generateId()}`;
    setState(prev => ({
      ...prev,
      attributes: [...prev.attributes, { id, ...attr }]
    }));
  }, []);

  const updateAttribute = useCallback((id: string, attr: Partial<Omit<AttributeMaster, 'id'>>) => {
    setState(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => (a.id === id ? { ...a, ...attr } : a))
    }));
  }, []);

  const deleteAttribute = useCallback((id: string): boolean => {
    let canDelete = true;
    setState(prev => {
      const isUsed = prev.products.some(p => p.productAttributes?.some(pa => pa.attributeId === id));
      if (isUsed) {
        canDelete = false;
        return prev;
      }
      return {
        ...prev,
        attributes: prev.attributes.filter(a => a.id !== id)
      };
    });
    return canDelete;
  }, []);

  const addAttributeValue = useCallback((attributeId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setState(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => {
        if (a.id !== attributeId) return a;
        if (a.values.includes(trimmed)) return a;
        return { ...a, values: [...a.values, trimmed] };
      })
    }));
  }, []);

  const removeAttributeValue = useCallback((attributeId: string, value: string) => {
    setState(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => {
        if (a.id !== attributeId) return a;
        return { ...a, values: a.values.filter(v => v !== value) };
      })
    }));
  }, []);

  // ---- Helpers ----
  const getProduct = useCallback((id: string) => state.products.find(p => p.id === id), [state.products]);
  const getMaterial = useCallback((id: string) => state.materials.find(m => m.id === id), [state.materials]);

  const nextOrderNumber = useCallback(() => {
    return generateOrderNumber(state.salesOrders.length + 1);
  }, [state.salesOrders.length]);

  const nextPONumber = useCallback(() => {
    return String(state.purchaseOrders.length + 1);
  }, [state.purchaseOrders.length]);

  const nextDONumber = useCallback(() => {
    return String(state.deliveryOrders.length + 1);
  }, [state.deliveryOrders.length]);

  // ── Finished Goods CRUD ──────────────────────────────────────────────────
  const addFinishedGood = useCallback((fg: Omit<FinishedGoodStock, 'id'>) => {
    const newId = `fg-${crypto.randomUUID().slice(0, 8)}`;
    const newFG: FinishedGoodStock = { ...fg, id: newId, isActive: true };
    const movements: StockMovement[] = [];
    if (newFG.stock > 0) {
      movements.push({
        id: `sm-${crypto.randomUUID().slice(0, 8)}`,
        materialId: newFG.id,
        materialName: newFG.productName + (newFG.variantLabel ? ` (${newFG.variantLabel})` : ''),
        type: 'INIT',
        qty: newFG.stock,
        reference: 'Inisiasi Stok',
        date: new Date().toISOString(),
        stockCategory: 'FINISHED',
      });
    }
    setState(prev => ({
      ...prev,
      finishedGoods: [newFG, ...prev.finishedGoods],
      stockMovements: [...movements, ...prev.stockMovements],
    }));
  }, []);

  const updateFinishedGood = useCallback((id: string, updates: Partial<FinishedGoodStock>) => {
    setState(prev => ({
      ...prev,
      finishedGoods: prev.finishedGoods.map(fg =>
        fg.id === id ? { ...fg, ...updates } : fg
      ),
    }));
  }, []);

  const deleteFinishedGood = useCallback((id: string): DeleteResult => {
    const fg = state.finishedGoods.find(item => item.id === id);
    if (!fg) {
      return { success: false, reason: 'Barang jadi tidak ditemukan.' };
    }

    const movements = state.stockMovements.filter(sm => sm.materialId === id);
    const hasOtherMovements = movements.some(
      sm => sm.type !== 'INIT' && !sm.reference.trim().toLowerCase().startsWith('inisiasi')
    );
    if (hasOtherMovements) {
      const otherRef = movements.find(sm => sm.type !== 'INIT' && !sm.reference.trim().toLowerCase().startsWith('inisiasi'))?.reference;
      return {
        success: false,
        reason: `Barang jadi "${fg.productName}" memiliki riwayat mutasi transaksi (${otherRef || 'transaksi operasional'}). Tidak dapat dihapus demi integritas audit.`,
      };
    }

    const usedInSO = state.salesOrders?.some(so =>
      so.items?.some(item =>
        item.productId === fg.productId &&
        (!fg.variantId || item.variantId === fg.variantId)
      )
    );
    if (usedInSO) {
      return {
        success: false,
        reason: `Barang jadi "${fg.productName}" sudah terhubung dengan dokumen Sales Order.`,
      };
    }

    // Soft delete: set isActive = false, dan bersihkan mutasi inisiasinya
    setState(prev => ({
      ...prev,
      finishedGoods: prev.finishedGoods.map(item => item.id === id ? { ...item, isActive: false } : item),
      stockMovements: prev.stockMovements.filter(sm => sm.materialId !== id),
    }));

    return { success: true };
  }, [state.finishedGoods, state.stockMovements, state.salesOrders]);

  const adjustFinishedGoodStock = useCallback((productId: string, variantId: string | undefined, delta: number, reference: string) => {
    setState(prev => {
      const now = new Date().toISOString();
      const idx = prev.finishedGoods.findIndex(fg =>
        fg.productId === productId && (fg.variantId || '') === (variantId || '')
      );

      let updatedFG = [...prev.finishedGoods];
      let fgName = '';
      let fgId = '';

      if (idx >= 0) {
        updatedFG[idx] = {
          ...updatedFG[idx],
          stock: Math.max(0, updatedFG[idx].stock + delta),
        };
        fgName = updatedFG[idx].productName + (updatedFG[idx].variantLabel ? ` (${updatedFG[idx].variantLabel})` : '');
        fgId = updatedFG[idx].id;
      } else if (delta > 0) {
        // Auto-create finished good entry if not exists and delta is positive
        const product = prev.products.find(p => p.id === productId);
        const variant = product?.variants.find(v => v.id === variantId);
        const newFG: FinishedGoodStock = {
          id: `fg-${crypto.randomUUID().slice(0, 8)}`,
          productId,
          variantId,
          productName: product?.name || 'Produk',
          variantLabel: variant ? Object.values(variant.combination || {}).join(' • ') || variant.sku : undefined,
          stock: delta,
          minStock: 0,
          unit: 'unit',
        };
        updatedFG = [newFG, ...updatedFG];
        fgName = newFG.productName + (newFG.variantLabel ? ` (${newFG.variantLabel})` : '');
        fgId = newFG.id;
      } else {
        return prev; // Can't subtract from non-existent stock
      }

      // Record stock movement
      const movement = {
        id: `sm-${crypto.randomUUID().slice(0, 8)}`,
        materialId: fgId,
        materialName: fgName,
        type: (delta > 0 ? 'IN' : 'OUT') as 'IN' | 'OUT',
        qty: Math.abs(delta),
        reference,
        date: now,
        stockCategory: 'FINISHED' as const,
      };

      return {
        ...prev,
        finishedGoods: updatedFG,
        stockMovements: [movement, ...prev.stockMovements],
      };
    });
  }, []);

  // ---- Raw Materials CRUD ----
  const addMaterial = useCallback((material: Omit<RawMaterial, 'id'>) => {
    const id = `mat-${generateId()}`;
    const newMaterial: RawMaterial = {
      id,
      isActive: true,
      ...material,
    };
    const movements: StockMovement[] = [];
    if (newMaterial.stock > 0) {
      movements.push({
        id: `sm-${crypto.randomUUID().slice(0, 8)}`,
        materialId: newMaterial.id,
        materialName: newMaterial.name,
        type: 'INIT',
        qty: newMaterial.stock,
        reference: 'Inisiasi Stok',
        date: new Date().toISOString(),
        stockCategory: newMaterial.isSubAssembly ? 'WIP' : 'RAW',
      });
    }
    setState(prev => ({
      ...prev,
      materials: [newMaterial, ...prev.materials],
      stockMovements: [...movements, ...prev.stockMovements],
    }));
  }, []);

  const updateMaterial = useCallback((id: string, material: Partial<RawMaterial>) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => (m.id === id ? { ...m, ...material } : m)),
    }));
  }, []);

  const deleteMaterial = useCallback((id: string): DeleteResult => {
    const mat = state.materials.find(m => m.id === id);
    if (!mat) {
      return { success: false, reason: 'Bahan baku tidak ditemukan.' };
    }

    // 1. Cek mutasi selain inisiasi
    const movements = state.stockMovements.filter(sm => sm.materialId === id);
    const hasOtherMovements = movements.some(
      sm => sm.type !== 'INIT' && !sm.reference.trim().toLowerCase().startsWith('inisiasi')
    );
    if (hasOtherMovements) {
      const otherRef = movements.find(sm => sm.type !== 'INIT' && !sm.reference.trim().toLowerCase().startsWith('inisiasi'))?.reference;
      return {
        success: false,
        reason: `Bahan baku "${mat.name}" memiliki riwayat mutasi transaksi (${otherRef || 'transaksi operasional'}). Tidak dapat dihapus demi integritas audit.`,
      };
    }

    // 2. Cek penggunaan pada dokumen operasional:
    const usedInSPK = state.workOrders.some(wo => wo.materialsConsumed.some(mc => mc.materialId === id));
    if (usedInSPK) {
      return {
        success: false,
        reason: `Bahan baku "${mat.name}" sudah digunakan dalam dokumen SPK produksi.`,
      };
    }

    const usedInPO = state.purchaseOrders.some(po => po.items.some(pi => pi.materialId === id));
    if (usedInPO) {
      return {
        success: false,
        reason: `Bahan baku "${mat.name}" sudah digunakan dalam dokumen Purchase Order.`,
      };
    }

    const usedInProductBOM = state.products.some(p =>
      p.isActive !== false && p.variants.some(v => v.bom?.some(b => b.materialId === id))
    );
    if (usedInProductBOM) {
      return {
        success: false,
        reason: `Bahan baku "${mat.name}" digunakan pada struktur BOM produk katalog aktif.`,
      };
    }

    // Soft delete: set isActive = false, dan bersihkan mutasi inisiasinya
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => (m.id === id ? { ...m, isActive: false } : m)),
      stockMovements: prev.stockMovements.filter(sm => sm.materialId !== id),
    }));

    return { success: true };
  }, [state.materials, state.stockMovements, state.workOrders, state.purchaseOrders, state.products]);

  const addMaterialCategory = useCallback((category: string) => {
    setState(prev => {
      const trimmed = category.trim();
      const exists = prev.categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
      if (exists || !trimmed) return prev;
      return {
        ...prev,
        categories: [...prev.categories, trimmed],
      };
    });
  }, []);

  const updateMaterialCategory = useCallback((oldCategory: string, newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed || (oldCategory.toLowerCase() === trimmed.toLowerCase() && oldCategory === trimmed)) return;
    setState(prev => {
      const updatedCategories = prev.categories.map(c => c.toLowerCase() === oldCategory.toLowerCase() ? trimmed : c);
      const updatedMaterials = prev.materials.map(m => m.category.toLowerCase() === oldCategory.toLowerCase() ? { ...m, category: trimmed } : m);
      return {
        ...prev,
        categories: updatedCategories,
        materials: updatedMaterials,
      };
    });
  }, []);

  const reorderMaterialCategories = useCallback((newCategories: string[]) => {
    setState(prev => ({
      ...prev,
      categories: newCategories,
    }));
  }, []);

  const deleteMaterialCategory = useCallback((category: string): boolean => {
    let success = true;
    setState(prev => {
      const isUsed = prev.materials.some(m => m.category.toLowerCase() === category.trim().toLowerCase());
      if (isUsed) {
        success = false;
        return prev;
      }
      return {
        ...prev,
        categories: prev.categories.filter(c => c.toLowerCase() !== category.trim().toLowerCase()),
      };
    });
    return success;
  }, []);

  // ---- Product Category CRUD ----
  const addProductCategory = useCallback((category: string) => {
    setState(prev => {
      if (prev.productCategories.find(c => c.toLowerCase() === category.trim().toLowerCase())) return prev;
      return { ...prev, productCategories: [...prev.productCategories, category.trim()] };
    });
  }, []);

  const deleteProductCategory = useCallback((category: string): boolean => {
    let success = true;
    setState(prev => {
      const isUsed = prev.products.some(p => p.category.toLowerCase() === category.trim().toLowerCase());
      if (isUsed) {
        success = false;
        return prev;
      }
      return {
        ...prev,
        productCategories: prev.productCategories.filter(c => c.toLowerCase() !== category.trim().toLowerCase()),
      };
    });
    return success;
  }, []);

  // ---- Asset Category CRUD ----
  const addAssetCategory = useCallback((category: string) => {
    setState(prev => {
      if (prev.assetCategories.find(c => c.toLowerCase() === category.trim().toLowerCase())) return prev;
      return { ...prev, assetCategories: [...prev.assetCategories, category.trim()] };
    });
  }, []);

  const updateAssetCategory = useCallback((oldCategory: string, newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed || (oldCategory.toLowerCase() === trimmed.toLowerCase() && oldCategory === trimmed)) return;
    setState(prev => {
      const updatedCategories = prev.assetCategories.map(c => c.toLowerCase() === oldCategory.toLowerCase() ? trimmed : c);
      const updatedAssets = prev.assets.map(a => a.category.toLowerCase() === oldCategory.toLowerCase() ? { ...a, category: trimmed } : a);
      return {
        ...prev,
        assetCategories: updatedCategories,
        assets: updatedAssets,
      };
    });
  }, []);

  const reorderAssetCategories = useCallback((newCategories: string[]) => {
    setState(prev => ({
      ...prev,
      assetCategories: newCategories,
    }));
  }, []);

  const deleteAssetCategory = useCallback((category: string): boolean => {
    let success = true;
    setState(prev => {
      const isUsed = prev.assets.some(a => a.category.toLowerCase() === category.trim().toLowerCase());
      if (isUsed) {
        success = false;
        return prev;
      }
      return {
        ...prev,
        assetCategories: prev.assetCategories.filter(c => c.toLowerCase() !== category.trim().toLowerCase()),
      };
    });
    return success;
  }, []);

  // ---- Assets CRUD ----
  const canDeleteAsset = useCallback((id: string): { canDelete: boolean; reason?: string } => {
    const asset = state.assets.find(a => a.id === id);
    if (!asset) return { canDelete: false, reason: 'Aset tidak ditemukan.' };

    const serviceLogsCount = (state.assetServiceLogs || []).filter(l => l.assetId === id).length;
    if (serviceLogsCount > 0) {
      return {
        canDelete: false,
        reason: `Aset memiliki ${serviceLogsCount} riwayat pemeliharaan/servis. Tidak dapat dihapus.`,
      };
    }

    const depreciationsCount = (state.assetDepreciations || []).filter(d => d.assetId === id).length;
    if (depreciationsCount > 0) {
      return {
        canDelete: false,
        reason: `Aset memiliki ${depreciationsCount} catatan penyusutan. Tidak dapat dihapus.`,
      };
    }

    return { canDelete: true };
  }, [state.assets, state.assetServiceLogs, state.assetDepreciations]);

  const addAsset = useCallback((asset: Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>) => {
    const id = `ast-${generateId()}`;
    const usefulLifeMonths = asset.usefulLifeMonths || (asset.usefulLifeYears * 12);
    const usefulLifeYears = asset.usefulLifeYears || Math.round((usefulLifeMonths / 12) * 10) / 10;
    const salvageValue = Math.max(0, asset.salvageValue || 0);
    const monthlyDepreciation = (asset.purchaseCost - salvageValue) / usefulLifeMonths;
    const acquisitionType = asset.acquisitionType || 'EXISTING';

    setState(prev => {
      let createdExpense: Expense | undefined;
      let updatedBankAccounts = [...prev.bankAccounts];
      let updatedExpenses = [...prev.expenses];
      let updatedJournalEntries = [...prev.journalEntries];
      let financeTransactionId: string | undefined;

      // Handle NEW_PURCHASE: Atomic cash out & journal
      if (acquisitionType === 'NEW_PURCHASE' && asset.cashAccountId) {
        const cashAccount = prev.bankAccounts.find(ba => ba.id === asset.cashAccountId);
        if (cashAccount) {
          const expenseId = generateId();
          const now = asset.purchaseDate || new Date().toISOString();
          createdExpense = {
            id: expenseId,
            category: 'ASET',
            amount: asset.purchaseCost,
            date: now,
            bankAccountId: asset.cashAccountId,
            note: `Pembelian Aset: ${asset.name} (${asset.code.toUpperCase()})`,
          };

          updatedBankAccounts = updatedBankAccounts.map(ba =>
            ba.id === asset.cashAccountId
              ? { ...ba, balance: ba.balance - asset.purchaseCost }
              : ba
          );

          const journalEntry = createAssetPurchaseJournal(
            {
              name: asset.name,
              code: asset.code.toUpperCase(),
              purchaseCost: asset.purchaseCost,
              category: asset.category,
            },
            expenseId,
            cashAccount.name,
            updatedJournalEntries.length,
            now,
            prev.chartOfAccounts
          );

          updatedExpenses = [createdExpense, ...updatedExpenses];
          updatedJournalEntries = [journalEntry, ...updatedJournalEntries];
          financeTransactionId = expenseId;
        }
      }

      const newAsset: CompanyAsset = {
        id,
        ...asset,
        code: asset.code.trim().toUpperCase(),
        acquisitionType,
        usefulLifeMonths,
        usefulLifeYears,
        salvageValue,
        currentBookValue: asset.currentBookValue !== undefined ? asset.currentBookValue : asset.purchaseCost,
        accumulatedServiceCost: 0,
        monthlyDepreciation,
        status: asset.status || 'ACTIVE',
        cashAccountId: acquisitionType === 'NEW_PURCHASE' ? asset.cashAccountId : undefined,
        financeTransactionId,
      };

      return {
        ...prev,
        assets: [newAsset, ...prev.assets],
        bankAccounts: updatedBankAccounts,
        expenses: updatedExpenses,
        journalEntries: updatedJournalEntries,
      };
    });
  }, []);

  const updateAsset = useCallback((id: string, asset: Partial<Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>>) => {
    setState(prev => ({
      ...prev,
      assets: prev.assets.map(a => {
        if (a.id === id) {
          const merged = { ...a, ...asset };
          const usefulLifeMonths = merged.usefulLifeMonths || (merged.usefulLifeYears * 12);
          const usefulLifeYears = merged.usefulLifeYears || Math.round((usefulLifeMonths / 12) * 10) / 10;
          const salvageValue = Math.max(0, merged.salvageValue || 0);
          const monthlyDepreciation = (merged.purchaseCost - salvageValue) / usefulLifeMonths;
          return {
            ...merged,
            usefulLifeMonths,
            usefulLifeYears,
            salvageValue,
            monthlyDepreciation,
          };
        }
        return a;
      }),
    }));
  }, []);

  const deleteAsset = useCallback((id: string): DeleteResult => {
    const asset = state.assets.find(a => a.id === id);
    if (!asset) {
      return { success: false, reason: 'Aset tidak ditemukan.' };
    }

    // Constraint 1: service logs
    const serviceCount = (state.assetServiceLogs || []).filter(l => l.assetId === id).length;
    if (serviceCount > 0) {
      return {
        success: false,
        reason: `Aset memiliki ${serviceCount} catatan riwayat servis. Tidak dapat dihapus.`,
      };
    }

    // Constraint 2: depreciations
    const depreciationCount = (state.assetDepreciations || []).filter(d => d.assetId === id).length;
    if (depreciationCount > 0) {
      return {
        success: false,
        reason: `Aset memiliki ${depreciationCount} riwayat penyusutan/amortisasi. Tidak dapat dihapus.`,
      };
    }

    // Atomic execution & cash rollback if NEW_PURCHASE
    setState(prev => {
      let updatedBankAccounts = [...prev.bankAccounts];
      let updatedExpenses = [...prev.expenses];
      let updatedJournalEntries = [...prev.journalEntries];

      if (asset.acquisitionType === 'NEW_PURCHASE' && asset.financeTransactionId) {
        const linkedExpense = prev.expenses.find(e => e.id === asset.financeTransactionId);
        if (linkedExpense) {
          // Kembalikan saldo kas
          updatedBankAccounts = updatedBankAccounts.map(ba =>
            ba.id === linkedExpense.bankAccountId
              ? { ...ba, balance: ba.balance + linkedExpense.amount }
              : ba
          );
          // Hapus expense
          updatedExpenses = updatedExpenses.filter(e => e.id !== linkedExpense.id);
          // Hapus jurnal terkait
          updatedJournalEntries = updatedJournalEntries.filter(
            j => !(j.sourceType === 'EXPENSE' && j.sourceId === linkedExpense.id)
          );
        }
      }

      return {
        ...prev,
        assets: prev.assets.filter(a => a.id !== id),
        assetServiceLogs: prev.assetServiceLogs.filter(l => l.assetId !== id),
        bankAccounts: updatedBankAccounts,
        expenses: updatedExpenses,
        journalEntries: updatedJournalEntries,
      };
    });

    return { success: true };
  }, [state.assets, state.assetServiceLogs, state.assetDepreciations]);

  const recordAssetService = useCallback((log: Omit<CompanyAssetServiceLog, 'id'>) => {
    const id = `asl-${generateId()}`;
    const newLog: CompanyAssetServiceLog = {
      id,
      ...log,
    };
    setState(prev => {
      const updatedAssets = prev.assets.map(a => {
        if (a.id === log.assetId) {
          return {
            ...a,
            accumulatedServiceCost: a.accumulatedServiceCost + log.cost,
          };
        }
        return a;
      });
      return {
        ...prev,
        assets: updatedAssets,
        assetServiceLogs: [newLog, ...prev.assetServiceLogs],
      };
    });
  }, []);

  const deleteAssetServiceLog = useCallback((id: string) => {
    setState(prev => {
      const log = prev.assetServiceLogs.find(l => l.id === id);
      if (!log) return prev;
      const updatedAssets = prev.assets.map(a => {
        if (a.id === log.assetId) {
          return {
            ...a,
            accumulatedServiceCost: Math.max(0, a.accumulatedServiceCost - log.cost),
          };
        }
        return a;
      });
      return {
        ...prev,
        assets: updatedAssets,
        assetServiceLogs: prev.assetServiceLogs.filter(l => l.id !== id),
      };
    });
  }, []);


  // ---- Inventory / PO ----

  const createPO = useCallback((supplier: string, items: PurchaseOrderItem[]) => {
    const totalAmount = items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
    const po: PurchaseOrder = {
      id: generateId(),
      poNumber: nextPONumber(),
      supplier,
      createdBy: currentUser.name,
      items,
      status: 'DRAFT',
      totalAmount,
      createdAt: new Date().toISOString(),
      paymentStatus: 'UNPAID',
    };
    setState(prev => ({ ...prev, purchaseOrders: [...prev.purchaseOrders, po] }));
  }, [nextPONumber, currentUser.name]);

  const createDirectPurchase = useCallback((
    supplier: string,
    items: PurchaseOrderItem[],
    bankAccountId: string,
    additionalCost: number = 0
  ) => {
    setState(prev => {
      const bankAccount = prev.bankAccounts.find(b => b.id === bankAccountId);
      if (!bankAccount) return prev;

      const itemsTotal = items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
      const grandTotal = itemsTotal + (additionalCost || 0);

      const now = new Date().toISOString();
      const poNumber = nextPONumber();

      const po: PurchaseOrder = {
        id: generateId(),
        poNumber,
        supplier,
        createdBy: currentUser.name,
        items,
        status: 'RECEIVED',
        paymentStatus: 'PAID',
        totalAmount: grandTotal,
        bankAccountId,
        createdAt: now,
        receivedAt: now,
        paidAt: now,
        purchaseType: 'DIRECT',
        additionalCost: additionalCost || 0,
      };

      // 1. Immediately update raw material stocks
      const newMaterials = prev.materials.map(m => {
        const poItem = items.find(i => i.materialId === m.id);
        if (poItem) {
          return { ...m, stock: parseFloat((m.stock + poItem.qty).toFixed(4)) };
        }
        return m;
      });

      // 2. Immediately create stock movements
      const newMovements: StockMovement[] = items.map(item => ({
        id: generateId(),
        materialId: item.materialId,
        materialName: item.materialName,
        type: 'IN' as const,
        qty: item.qty,
        reference: `${poNumber} (Pembelian Langsung)`,
        date: now,
      }));

      // 3. Immediately deduct selected bank account balance
      const updatedBankAccounts = prev.bankAccounts.map(ba =>
        ba.id === bankAccountId
          ? { ...ba, balance: ba.balance - grandTotal }
          : ba
      );

      // 4. Create direct purchase journal
      const directJournal = createDirectPurchaseJournal(
        po,
        bankAccount.name,
        prev.journalEntries.length,
        now,
        prev.chartOfAccounts
      );

      return {
        ...prev,
        materials: newMaterials,
        purchaseOrders: [...prev.purchaseOrders, po],
        stockMovements: [...prev.stockMovements, ...newMovements],
        bankAccounts: updatedBankAccounts,
        journalEntries: [directJournal, ...prev.journalEntries],
      };
    });
  }, [nextPONumber, currentUser.name]);

  const orderPO = useCallback((poId: string) => {
    setState(prev => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map(p =>
        p.id === poId ? { ...p, status: 'ORDERED' as const } : p
      ),
    }));
  }, []);

  const rejectPO = useCallback((poId: string, reason?: string): { success: boolean; error?: string } => {
    let result: { success: boolean; error?: string } = { success: true };
    setState(prev => {
      const currentUser = getUserById(prev.currentUserId || DEFAULT_USER_ID);
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po || po.status !== 'DRAFT') {
        result = { success: false, error: 'Hanya pengadaan berstatus Diajukan yang dapat ditolak.' };
        return prev;
      }

      const now = new Date().toISOString();

      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.map(p =>
          p.id === poId
            ? {
                ...p,
                status: 'REJECTED' as const,
                rejectionReason: reason?.trim() || undefined,
                cancelReason: reason?.trim() || undefined,
                rejectedBy: currentUser.name,
                rejectedAt: now,
              }
            : p
        ),
      };
    });
    return result;
  }, []);

  const cancelPO = useCallback((poId: string, reason?: string): { success: boolean; error?: string } => {
    let result: { success: boolean; error?: string } = { success: true };
    setState(prev => {
      const currentUser = getUserById(prev.currentUserId || DEFAULT_USER_ID);
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po) {
        result = { success: false, error: 'Pengadaan tidak ditemukan.' };
        return prev;
      }
      if (po.status !== 'DRAFT' && po.status !== 'ORDERED') {
        result = { success: false, error: 'Pengadaan tidak dapat dibatalkan pada status ini.' };
        return prev;
      }

      const now = new Date().toISOString();

      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.map(p =>
          p.id === poId
            ? {
                ...p,
                status: 'CANCELED' as const,
                cancelReason: reason?.trim() || (po.status === 'DRAFT' ? 'Dibatalkan oleh pembuat pengadaan' : 'Dibatalkan'),
                cancelledBy: currentUser.name,
                cancelledAt: now,
              }
            : p
        ),
      };
    });
    return result;
  }, []);

  const cancelRemainingPO = useCallback((poId: string, reason?: string): { success: boolean; error?: string } => {
    let result: { success: boolean; error?: string } = { success: true };
    setState(prev => {
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po || po.status !== 'PARTIALLY_RECEIVED') {
        result = { success: false, error: 'Hanya pengadaan berstatus Diterima Sebagian yang dapat dibatalkan sisa pesanannya.' };
        return prev;
      }

      const now = new Date().toISOString();
      // Hapus/sesuaikan sisa kuantitas yang belum diterima: qty item menjadi sebesar yang sudah diterima
      const updatedItems = po.items.map(item => ({
        ...item,
        qty: item.receivedQty || 0,
      }));
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0) + (po.additionalCost || 0);

      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.map(p =>
          p.id === poId
            ? {
                ...p,
                items: updatedItems,
                totalAmount: newTotalAmount,
                status: 'RECEIVED' as const,
                receivedAt: p.receivedAt || now,
                cancelReason: reason?.trim() || 'Sisa kuantitas PO dibatalkan oleh pengguna',
              }
            : p
        ),
      };
    });
    return result;
  }, []);

  const deletePO = useCallback((poId: string): boolean => {
    let success = true;
    setState(prev => {
      const currentUser = getUserById(prev.currentUserId || DEFAULT_USER_ID);
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po) {
        success = false;
        return prev;
      }
      if (po.status !== 'DRAFT' || po.createdBy !== currentUser.name) {
        success = false;
        return prev;
      }
      return {
        ...prev,
        purchaseOrders: prev.purchaseOrders.filter(p => p.id !== poId),
      };
    });
    return success;
  }, []);

  const receivePO = useCallback((
    poId: string,
    receivedItems?: { materialId: string; qty: number }[]
  ): { success: boolean; isPartial?: boolean; error?: string } => {
    let result: { success: boolean; isPartial?: boolean; error?: string } = { success: true };
    setState(prev => {
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po || (po.status !== 'ORDERED' && po.status !== 'PARTIALLY_RECEIVED')) {
        result = { success: false, error: 'Pengadaan tidak dalam status Dipesan atau Diterima Sebagian.' };
        return prev;
      }

      const now = new Date().toISOString();

      // Menghitung kuantitas barang yang diterima pada transaksi ini
      const toReceiveMap = new Map<string, number>();
      if (receivedItems && receivedItems.length > 0) {
        for (const r of receivedItems) {
          if (r.qty > 0) {
            toReceiveMap.set(r.materialId, r.qty);
          }
        }
      } else {
        // Fallback: terima seluruh sisa kuantitas
        for (const item of po.items) {
          const remaining = item.qty - (item.receivedQty || 0);
          if (remaining > 0) {
            toReceiveMap.set(item.materialId, remaining);
          }
        }
      }

      if (toReceiveMap.size === 0) {
        result = { success: false, error: 'Tidak ada item yang dipilih untuk diterima.' };
        return prev;
      }

      // 1. Update stok bahan baku di gudang
      const newMaterials = prev.materials.map(m => {
        const incomingQty = toReceiveMap.get(m.id);
        if (incomingQty && incomingQty > 0) {
          return { ...m, stock: parseFloat((m.stock + incomingQty).toFixed(4)) };
        }
        return m;
      });

      // 2. Buat mutasi stok masuk (IN)
      const newMovements: StockMovement[] = [];
      toReceiveMap.forEach((qty, matId) => {
        const item = po.items.find(i => i.materialId === matId);
        if (item && qty > 0) {
          newMovements.push({
            id: generateId(),
            materialId: item.materialId,
            materialName: item.materialName,
            type: 'IN' as const,
            qty,
            reference: po.poNumber,
            date: now,
          });
        }
      });

      // 3. Update status receivedQty pada masing-masing item PO
      const updatedItems = po.items.map(item => {
        const incomingQty = toReceiveMap.get(item.materialId) || 0;
        const currentRecv = item.receivedQty || 0;
        return {
          ...item,
          receivedQty: parseFloat((currentRecv + incomingQty).toFixed(4)),
        };
      });

      // 4. Periksa apakah seluruh item sudah diterima penuh
      const allFullyReceived = updatedItems.every(i => (i.receivedQty || 0) >= i.qty);
      const newStatus: POStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      // 5. Jurnal akuntansi penerimaan barang
      const poJournal = createPOReceivedJournal(
        { ...po, items: updatedItems },
        prev.journalEntries.length,
        now,
        prev.chartOfAccounts
      );

      result = { success: true, isPartial: !allFullyReceived };

      return {
        ...prev,
        materials: newMaterials,
        purchaseOrders: prev.purchaseOrders.map(p =>
          p.id === poId
            ? {
                ...p,
                items: updatedItems,
                status: newStatus,
                receivedAt: allFullyReceived ? now : p.receivedAt,
              }
            : p
        ),
        stockMovements: [...prev.stockMovements, ...newMovements],
        journalEntries: [poJournal, ...prev.journalEntries],
      };
    });
    return result;
  }, []);

  // ---- Sales Orders ----
  const createSalesOrder = useCallback((customer: Customer, items: SalesOrderItem[], orderNotes?: string, shippingCost?: number): string => {
    const id = generateId();
    const orderNumber = nextOrderNumber();
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const totalAmount = subtotal + (shippingCost || 0);
    const now = new Date().toISOString();
    const so: SalesOrder = {
      id,
      orderNumber,
      createdBy: currentUser.name,
      salesPhone: currentUser.phone || '6281298765432',
      customer,
      items: items.map(item => ({ ...item, producedQty: 0, shippedQty: 0, deliveredQty: 0 })),
      status: 'PENDING',
      totalAmount,
      shippingCost,
      orderNotes: orderNotes?.trim() || undefined,
      createdAt: now,
    };
    setState(prev => ({ ...prev, salesOrders: [so, ...prev.salesOrders] }));
    return id;
  }, [nextOrderNumber, currentUser.name, currentUser.phone]);

  const updateSalesOrder = useCallback((orderId: string, customer: Customer, items: SalesOrderItem[], orderNotes?: string, shippingCost?: number) => {
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      salesOrders: prev.salesOrders.map(o => {
        if (o.id === orderId && o.status === 'PENDING') {
          const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
          const totalAmount = subtotal + (shippingCost || 0);
          return {
            ...o,
            customer,
            items,
            totalAmount,
            shippingCost,
            orderNotes: orderNotes?.trim() || undefined,
            updatedAt: now,
            updatedBy: currentUser.name,
          };
        }
        return o;
      }),
    }));
  }, [currentUser.name]);

  const updateOrderCustomProcess = useCallback((orderId: string, updatedItems: SalesOrderItem[]): { success: boolean; error?: string } => {
    const order = state.salesOrders.find(o => o.id === orderId);
    if (!order || order.status !== 'PENDING') {
      return { success: false, error: 'Pesanan tidak ditemukan atau bukan berstatus PENDING.' };
    }

    const now = new Date().toISOString();
    const hasCustom = updatedItems.some(i => i.isBomCustomized);

    setState(prev => ({
      ...prev,
      salesOrders: prev.salesOrders.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            items: updatedItems,
            isCustomProcess: hasCustom,
            customProcessAt: hasCustom ? now : undefined,
            customProcessBy: hasCustom ? currentUser.name : undefined,
            updatedAt: now,
            updatedBy: currentUser.name,
          };
        }
        return o;
      })
    }));

    return { success: true };
  }, [state.salesOrders, currentUser.name]);

  const cancelOrder = useCallback((orderId: string, cancelReason: string) => {
    const user = getUserById(state.currentUserId || DEFAULT_USER_ID);
    const roleLabel = user.role === 'ADMIN' ? 'admin' : user.role === 'SALES' ? 'sales' : user.role.toLowerCase();
    const now = new Date().toISOString();

    const targetOrder = state.salesOrders.find(o => o.id === orderId);
    if (!targetOrder) return;
    // Hanya izinkan pembatalan jika pesanan berstatus PENDING atau PROCESSING
    if (targetOrder.status !== 'PENDING' && targetOrder.status !== 'PROCESSING') return;

    setState(prev => {
      const order = prev.salesOrders.find(o => o.id === orderId);
      if (!order) return prev;

      let nextMaterials = [...prev.materials];
      let nextMovements = [...prev.stockMovements];
      let nextFinishedGoods = [...prev.finishedGoods];

      // 1. Update status Sales Order menjadi CANCELED
      const nextSalesOrders = prev.salesOrders.map(o =>
        o.id === orderId
          ? {
            ...o,
            status: 'CANCELED' as const,
            cancelReason,
            cancelledByRole: roleLabel,
            updatedAt: now,
            updatedBy: user.name,
          }
          : o
      );

      // 2. Jika order tadinya berstatus PROCESSING, proses semua SPK terkait
      const nextWorkOrders = prev.workOrders.map(wo => {
        if (wo.salesOrderId !== order.id && wo.salesOrderNumber !== order.orderNumber) {
          return wo;
        }

        // Cek apakah SPK sudah ada pengerjaan oleh operator
        const hasAnyWorkStarted = wo.status === 'PROCESSING' || wo.status === 'COMPLETED' ||
          wo.jobCards.some(jc => jc.status === 'IN_PROGRESS' || jc.status === 'PAUSED' || jc.status === 'COMPLETED' || (jc.completedQty && jc.completedQty > 0));

        if (!hasAnyWorkStarted) {
          // Kasus 1: Belum dikerjakan sama sekali -> Bahan baku kembali ke stok gudang
          wo.materialsConsumed.forEach(b => {
            const mIdx = nextMaterials.findIndex(m => m.id === b.materialId);
            if (mIdx >= 0) {
              const currentMat = nextMaterials[mIdx];
              const restoredStock = parseFloat((currentMat.stock + b.qty).toFixed(4));
              nextMaterials[mIdx] = { ...currentMat, stock: restoredStock };

              nextMovements.unshift({
                id: generateId(),
                materialId: currentMat.id,
                materialName: currentMat.name,
                type: 'IN',
                qty: b.qty,
                date: now,
                reference: `Batal SO-${order.orderNumber} (Restorasi Bahan ${wo.spkNumber})`,
              });
            }
          });
        } else {
          // Kasus 2: Sudah ada yang dikerjakan -> Dianggap selesai semuanya dan masuk ke stok barang jadi / WIP
          if (wo.isSubAssembly && wo.subAssemblyId) {
            const targetQty = wo.jobCards[0]?.targetQty || 1;
            const subIdx = nextMaterials.findIndex(m => m.id === wo.subAssemblyId);
            if (subIdx >= 0) {
              const subMat = nextMaterials[subIdx];
              nextMaterials[subIdx] = { ...subMat, stock: subMat.stock + targetQty };
              nextMovements.unshift({
                id: generateId(),
                materialId: subMat.id,
                materialName: subMat.name,
                type: 'IN',
                qty: targetQty,
                date: now,
                reference: `Batal SO-${order.orderNumber} (Stok Setengah Jadi ${wo.spkNumber})`,
              });
            }
          } else {
            // Produk Jadi
            const matchingItem = order.items.find(item =>
              wo.productName === item.productName ||
              wo.productName.includes(item.productName) ||
              item.productName.includes(wo.productName)
            );

            const prodId = matchingItem?.productId || `prod-auto-${generateId()}`;
            const varId = matchingItem?.variantId;
            const pName = matchingItem?.productName || wo.productName;
            const varLabel = matchingItem?.variantLabel || wo.variantName;

            const fgIndex = nextFinishedGoods.findIndex(fg =>
              fg.productId === prodId && (fg.variantId || '') === (varId || '')
            );

            let targetFGId = '';
            if (fgIndex >= 0) {
              targetFGId = nextFinishedGoods[fgIndex].id;
              nextFinishedGoods[fgIndex] = {
                ...nextFinishedGoods[fgIndex],
                stock: nextFinishedGoods[fgIndex].stock + 1,
              };
            } else {
              targetFGId = `fg-${generateId()}`;
              nextFinishedGoods.unshift({
                id: targetFGId,
                productId: prodId,
                variantId: varId,
                productName: pName,
                variantLabel: varLabel,
                stock: 1,
                minStock: 0,
                unit: 'unit',
              });
            }

            nextMovements.unshift({
              id: generateId(),
              materialId: targetFGId,
              materialName: `${pName}${varLabel ? ` (${varLabel})` : ''}`,
              type: 'IN',
              qty: 1,
              reference: `Batal SO-${order.orderNumber} (Alihkan ke Stok Jadi ${wo.spkNumber})`,
              date: now,
              stockCategory: 'FINISHED',
            });
          }
        }

        // Semua SPK terkait otomatis berubah status menjadi CANCELED
        return {
          ...wo,
          status: 'CANCELED' as const,
        };
      });

      return {
        ...prev,
        materials: nextMaterials,
        stockMovements: nextMovements,
        finishedGoods: nextFinishedGoods,
        salesOrders: nextSalesOrders,
        workOrders: nextWorkOrders,
      };
    });
  }, [state.currentUserId, state.salesOrders]);

  const submitOrderComplaint = useCallback((orderId: string, complaint: Omit<OrderComplaint, 'id' | 'status' | 'createdAt'>) => {
    setState(prev => ({
      ...prev,
      salesOrders: prev.salesOrders.map(o => {
        if (o.id !== orderId) return o;
        const totalComplaints = prev.salesOrders.reduce((sum, so) => sum + (so.complaints?.length || 0), 0);
        const newComplaint: OrderComplaint = {
          ...complaint,
          id: String(totalComplaints + 1),
          status: 'MENUNGGU',
          createdAt: new Date().toISOString(),
        };
        return {
          ...o,
          complaints: [...(o.complaints || []), newComplaint]
        };
      })
    }));
  }, []);

  const resolveOrderComplaint = useCallback((
    orderId: string,
    complaintId: string,
    resolution: 'Batalkan Pesanan (Refund)' | 'Penuhi Barang Pengganti' | 'Kirim Barang Pengganti' | 'Perbaikan' | 'Tolak Komplain',
    resolutionNotes?: string,
    refundBankAccountId?: string,
    options?: {
      replacementSource?: 'NEW_SPK' | 'FINISHED_STOCK';
      isReturnRequested?: boolean;
      selectedFinishedGoodUnitId?: string;
    }
  ) => {
    let result = { success: true, inStock: false, spkNumber: '' };

    setState(prev => {
      const targetOrder = prev.salesOrders.find(o => o.id === orderId);
      if (!targetOrder || !targetOrder.complaints) return prev;

      const complaint = targetOrder.complaints.find(c => c.id === complaintId);
      if (!complaint) return prev;

      const now = new Date().toISOString();
      const isRefund = resolution === 'Batalkan Pesanan (Refund)';
      const isFulfillment = resolution === 'Penuhi Barang Pengganti' || resolution === 'Kirim Barang Pengganti' || resolution === 'Perbaikan';
      const replacementSource = options?.replacementSource || 'NEW_SPK';
      const isReturnRequested = options?.isReturnRequested !== false; // default true unless explicitly false

      const refundAmount = isRefund
        ? (complaint.items || []).reduce((sum, item) => {
            const price = (item.unitPrice && item.unitPrice > 0)
              ? item.unitPrice
              : (targetOrder.items.find(oi => oi.productId === item.productId)?.unitPrice ?? 0);
            return sum + (price * item.qty);
          }, 0)
        : 0;

      // 1. Masukkan item komplain retur ke inventaris Barang Retur jika isReturnRequested = true
      let updatedReturnedGoods = [...(prev.returnedGoods || [])];
      let newReturnGoodId = '';
      if ((isRefund || isFulfillment) && isReturnRequested) {
        const newReturnItems: ReturnedGood[] = (complaint.items || []).map((ci, idx) => {
          const soItem = targetOrder.items.find(oi => oi.productId === ci.productId && (ci.variantId ? oi.variantId === ci.variantId : true)) || targetOrder.items.find(oi => oi.productId === ci.productId);
          const retId = `ret-${Date.now()}-${idx}`;
          if (!newReturnGoodId) newReturnGoodId = retId;
          return {
            id: retId,
            complaintId: complaint.id,
            salesOrderId: targetOrder.id,
            salesOrderNumber: targetOrder.orderNumber,
            customerName: targetOrder.customer.name,
            productId: ci.productId,
            variantId: (ci as any).variantId || soItem?.variantId,
            productName: ci.productName,
            variantLabel: ci.variantLabel || soItem?.variantLabel,
            qty: ci.qty,
            unitPrice: (ci.unitPrice && ci.unitPrice > 0) ? ci.unitPrice : (soItem?.unitPrice ?? 0),
            conditionReason: `${complaint.category}: ${complaint.description}`,
            customNotes: soItem?.customNotes,
            returnedAt: now,
            status: 'AWAITING_RECEIVAL' as const,
          };
        });
        updatedReturnedGoods = [...newReturnItems, ...updatedReturnedGoods];
      }

      let updatedFinishedGoods = [...prev.finishedGoods];
      let updatedStockMovements = [...prev.stockMovements];
      let updatedWorkOrders = [...prev.workOrders];
      let replacementStatus: 'READY_FOR_DELIVERY' | 'WAITING_PRODUCTION' | undefined = undefined;
      let replacementWOId: string | undefined = undefined;

      if (isFulfillment) {
        const complaintItems = complaint.items || [];

        if (replacementSource === 'FINISHED_STOCK') {
          // Ambil dari Stok Bebas Gudang!
          complaintItems.forEach(ci => {
            const fgIdx = updatedFinishedGoods.findIndex(item =>
              (item.productId === ci.productId || item.productName === ci.productName) &&
              ((ci.variantId && item.variantId === ci.variantId) || (ci.variantLabel && item.variantLabel === ci.variantLabel) || (!ci.variantId && !ci.variantLabel))
            );
            if (fgIdx >= 0) {
              const currentFG = updatedFinishedGoods[fgIdx];
              const fgUnits = [...(currentFG.units || [])];
              for (let q = 0; q < ci.qty; q++) {
                const availIdx = fgUnits.findIndex(u => u.status === 'AVAILABLE');
                if (availIdx >= 0) {
                  fgUnits[availIdx] = {
                    ...fgUnits[availIdx],
                    status: 'RESERVED',
                    reservedForOrderId: targetOrder.id,
                    reservedForOrderNumber: targetOrder.orderNumber,
                    complaintId: complaint.id,
                  };
                } else {
                  fgUnits.push({
                    id: `fgu-${generateId()}`,
                    finishedGoodStockId: currentFG.id,
                    productId: currentFG.productId,
                    variantId: currentFG.variantId,
                    productName: currentFG.productName,
                    variantLabel: currentFG.variantLabel,
                    status: 'RESERVED',
                    reservedForOrderId: targetOrder.id,
                    reservedForOrderNumber: targetOrder.orderNumber,
                    complaintId: complaint.id,
                    createdAt: now,
                  });
                }
              }

              updatedFinishedGoods[fgIdx] = {
                ...currentFG,
                units: fgUnits,
              };

              updatedStockMovements.unshift({
                id: generateId(),
                materialId: currentFG.id,
                materialName: `${currentFG.productName}${currentFG.variantLabel ? ` (${currentFG.variantLabel})` : ''}`,
                type: 'OUT',
                qty: ci.qty,
                reference: `Alokasi Penggantian Komplain #${targetOrder.orderNumber}`,
                date: now,
                stockCategory: 'FINISHED',
              });
            }
          });
          replacementStatus = 'READY_FOR_DELIVERY';
          result = { success: true, inStock: true, spkNumber: '' };
        } else {
          // Buat SPK baru untuk produksi
          replacementStatus = 'WAITING_PRODUCTION';
          const newSpkNumbers: string[] = [];

          for (const ci of complaintItems) {
            const soItem = targetOrder.items.find(oi => oi.productId === ci.productId && (ci.variantId ? oi.variantId === ci.variantId : true)) || targetOrder.items.find(oi => oi.productId === ci.productId);
            const product = prev.products.find(p => p.id === ci.productId || p.name === ci.productName);
            const variant = product?.variants?.find(v => (ci.variantId && v.id === ci.variantId) || (ci.variantLabel && Object.values(v.combination || {}).join(' • ') === ci.variantLabel));

            const targetQty = ci.qty;
            const bomItems = (variant?.bom && variant.bom.length > 0)
              ? variant.bom
              : getEffectiveVariantBOM(variant, prev.bomTemplateItems);

            const woId = `wo-${generateId()}`;
            let spkNumSeq = updatedWorkOrders.length + 1;
            let spkNumber = generateItemUnitNumber(targetOrder.orderNumber, spkNumSeq);
            while (updatedWorkOrders.some(w => w.spkNumber === spkNumber)) {
              spkNumSeq++;
              spkNumber = generateItemUnitNumber(targetOrder.orderNumber, spkNumSeq);
            }

            const assignedRouting = (variant?.routingId ? prev.routings.find(r => r.id === variant.routingId) : null)
              || (product?.defaultRoutingId ? prev.routings.find(r => r.id === product.defaultRoutingId) : null)
              || prev.routings[0];

            const jobCards: JobCard[] = assignedRouting && assignedRouting.steps.length > 0
              ? assignedRouting.steps.sort((a, b) => a.sequence - b.sequence).map(step => {
                const op = prev.operations.find(o => o.id === step.operationId);
                return {
                  id: `jc-${generateId()}`,
                  workOrderId: woId,
                  operationId: step.operationId,
                  operationName: op?.name || 'Operasi',
                  sequence: step.sequence,
                  targetQty,
                  completedQty: 0,
                  picName: '',
                  plannedMinutes: (op?.durationMinutes || 30) * targetQty,
                  status: 'PENDING' as const,
                };
              })
              : [
                {
                  id: `jc-${generateId()}`,
                  workOrderId: woId,
                  operationId: 'op-prod-default',
                  operationName: 'Produksi Barang Jadi',
                  sequence: 1,
                  targetQty,
                  completedQty: 0,
                  picName: '',
                  plannedMinutes: 60 * targetQty,
                  status: 'PENDING' as const,
                },
              ];

            const plannedLaborCost = jobCards.reduce((acc, jc) => {
              const op = prev.operations.find(o => o.id === jc.operationId);
              if (!op) return acc;
              if (op.costingMethod === 'fixed') {
                return acc + ((op.fixedLaborCost || 0) * targetQty);
              }
              const hrs = (jc.plannedMinutes || 30) / 60;
              return acc + (hrs * (op.laborCostPerHour || 0));
            }, 0);

            const materialsConsumed = bomItems.map(b => ({
              materialId: b.materialId,
              qty: b.qty * targetQty,
            }));

            const materialCost = materialsConsumed.reduce((acc, b) => {
              const mat = prev.materials.find(m => m.id === b.materialId);
              return acc + ((mat?.unitCost || 0) * b.qty);
            }, 0);

            const variantLabel = ci.variantLabel || (variant ? (Object.values(variant.combination || {}).join(' • ') || variant.sku) : undefined);

            const newWO: WorkOrder = {
              id: woId,
              spkNumber,
              salesOrderId: targetOrder.id,
              salesOrderNumber: targetOrder.orderNumber,
              productId: product?.id || ci.productId,
              variantId: variant?.id || ci.variantId,
              productName: ci.productName,
              variantName: variantLabel,
              status: 'PENDING',
              jobCards,
              materialsConsumed,
              materialCost,
              plannedLaborCost,
              actualLaborCost: 0,
              issuedAt: now,
              isCustom: Boolean(soItem?.customNotes?.trim()),
              customNotes: soItem?.customNotes?.trim() || undefined,
              isSubAssembly: false,
              isComplaintReplacement: true,
              complaintId: complaint.id,
            };

            updatedWorkOrders = [newWO, ...updatedWorkOrders];
            replacementWOId = woId;
            newSpkNumbers.push(spkNumber);
          }

          result = { success: true, inStock: false, spkNumber: newSpkNumbers.join(', ') };
        }
      }

      // Update Sales Order totalAmount & complaint status
      const newOrderTotal = isRefund ? Math.max(0, targetOrder.totalAmount - refundAmount) : targetOrder.totalAmount;
      const updatedSOs = prev.salesOrders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          totalAmount: newOrderTotal,
          complaints: (o.complaints || []).map(c =>
            c.id === complaintId
              ? {
                  ...c,
                  status: isRefund ? ('SELESAI' as const) : ('DITANGANI' as const),
                  resolution: resolution === 'Perbaikan' || resolution === 'Kirim Barang Pengganti' ? 'Penuhi Barang Pengganti' : resolution,
                  resolutionNotes,
                  replacementSource: isFulfillment ? replacementSource : c.replacementSource,
                  isReturnRequested: isFulfillment || isRefund ? isReturnRequested : false,
                  returnGoodId: newReturnGoodId || c.returnGoodId,
                  handledAt: now,
                  resolvedAt: isRefund ? now : undefined,
                  replacementStatus: isFulfillment ? replacementStatus : c.replacementStatus,
                  replacementWOId: isFulfillment ? replacementWOId : c.replacementWOId,
                }
              : c
          ),
        };
      });

      if (!isRefund || refundAmount <= 0) {
        return {
          ...prev,
          salesOrders: updatedSOs,
          returnedGoods: updatedReturnedGoods,
          finishedGoods: updatedFinishedGoods,
          stockMovements: updatedStockMovements,
          workOrders: updatedWorkOrders,
        };
      }

      // 2. Update Invoices, Bank Accounts & Journal Entries in Finance
      let updatedInvoices = [...prev.invoices];
      let updatedBankAccounts = [...prev.bankAccounts];
      let updatedJournalEntries = [...prev.journalEntries];

      const invIndex = prev.invoices.findIndex(
        i => i.salesOrderId === orderId || i.salesOrderNumber === targetOrder.orderNumber
      );

      if (invIndex >= 0) {
        const inv = prev.invoices[invIndex];
        const newInvoiceTotal = Math.max(0, inv.totalAmount - refundAmount);
        const currentPaid = inv.paidAmount;

        // Evaluasi 3 Kondisi:
        // - Jika pelanggan bayar melebihi total baru -> Kembalikan kelebihan dana kas (cashToReturn)
        // - Jika belum bayar atau uang muka masih <= total baru -> Cukup kurangi sisa piutang tanpa kas keluar
        const cashToReturn = Math.max(0, currentPaid - newInvoiceTotal);
        const newPaidAmount = currentPaid > newInvoiceTotal ? newInvoiceTotal : currentPaid;
        const newStatus = newInvoiceTotal === 0
          ? ('PAID' as const)
          : newPaidAmount >= newInvoiceTotal
            ? ('PAID' as const)
            : newPaidAmount > 0
              ? ('PARTIAL' as const)
              : ('UNPAID' as const);

        let newPayments = [...inv.payments];

        if (cashToReturn > 0) {
          const bankAccount = prev.bankAccounts.find(ba => ba.id === refundBankAccountId) || prev.bankAccounts[0];
          const methodName = bankAccount ? bankAccount.name : 'Kas';

          if (bankAccount) {
            updatedBankAccounts = prev.bankAccounts.map(ba =>
              ba.id === bankAccount.id ? { ...ba, balance: ba.balance - cashToReturn } : ba
            );
          }

          newPayments.push({
            id: generateId(),
            amount: -cashToReturn,
            method: methodName,
            date: now,
            note: `Refund Komplain ${complaint.id} (${resolutionNotes || 'Pengembalian kelebihan dana'})`,
            confirmedBy: currentUser.name,
          });

          // Catat Jurnal Pengeluaran Kas Refund
          updatedJournalEntries.unshift({
            id: `je-rf-${generateId()}`,
            entryNumber: `JE-REF-${Date.now().toString().slice(-4)}`,
            date: now,
            description: `Pengembalian Dana (Refund) Komplain ${complaint.id} - ${targetOrder.orderNumber} (${targetOrder.customer.name})`,
            sourceType: 'REFUND',
            sourceId: complaint.id,
            createdAt: now,
            lines: [
              {
                accountId: 'coa-41000',
                accountCode: '4-1000',
                accountName: 'Pendapatan Penjualan',
                debit: cashToReturn,
                credit: 0,
              },
              {
                accountId: bankAccount ? bankAccount.id : 'coa-11100',
                accountCode: '1-1100',
                accountName: methodName,
                debit: 0,
                credit: cashToReturn,
              },
            ],
          });
        }

        updatedInvoices[invIndex] = {
          ...inv,
          totalAmount: newInvoiceTotal,
          paidAmount: newPaidAmount,
          status: newStatus,
          payments: newPayments,
        };
      }

      return {
        ...prev,
        salesOrders: updatedSOs,
        invoices: updatedInvoices,
        bankAccounts: updatedBankAccounts,
        journalEntries: updatedJournalEntries,
        returnedGoods: updatedReturnedGoods,
      };
    });

    return result;
  }, [currentUser.name]);

  const rejectOrderComplaint = useCallback((
    orderId: string,
    complaintId: string,
    rejectionReason: string
  ) => {
    const now = new Date().toISOString();
    setState(prev => {
      const targetOrder = prev.salesOrders.find(o => o.id === orderId);
      if (!targetOrder || !targetOrder.complaints) return prev;

      const updatedSOs = prev.salesOrders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          complaints: (o.complaints || []).map(c => {
            if (c.id !== complaintId) return c;
            return {
              ...c,
              status: 'DITOLAK' as const,
              resolution: 'Tolak Komplain' as const,
              rejectionReason: rejectionReason.trim(),
              rejectedAt: now,
              rejectedBy: currentUser.name,
              resolvedAt: now,
            };
          }),
        };
      });

      return {
        ...prev,
        salesOrders: updatedSOs,
      };
    });
  }, [currentUser.name]);

  const confirmReceiveReturnedGood = useCallback((returnId: string) => {
    const now = new Date().toISOString();
    setState(prev => {
      const updatedReturnedGoods = (prev.returnedGoods || []).map(rg =>
        rg.id === returnId
          ? {
              ...rg,
              status: 'RECEIVED' as const,
              receivedAt: now,
              receivedBy: currentUser.name,
            }
          : rg
      );
      return {
        ...prev,
        returnedGoods: updatedReturnedGoods,
      };
    });
  }, [currentUser.name]);

  const processReturnedGoodAction = useCallback((
    returnId: string,
    action: ReturnedGoodAction,
    notes?: string
  ) => {
    setState(prev => {
      const item = (prev.returnedGoods || []).find(rg => rg.id === returnId);
      if (!item || (item.status !== 'PENDING' && item.status !== 'RECEIVED' && item.status !== 'AWAITING_RECEIVAL')) return prev;

      const now = new Date().toISOString();
      let updatedFinishedGoods = [...prev.finishedGoods];
      let updatedMaterials = [...prev.materials];
      let updatedMovements = [...prev.stockMovements];

      if (action === 'RESTOCK') {
        // Masuk kembali ke stok bebas barang jadi
        const fgIndex = updatedFinishedGoods.findIndex(
          fg => fg.productId === item.productId && (!item.variantId || fg.variantId === item.variantId)
        );
        let fgName = item.productName + (item.variantLabel ? ` (${item.variantLabel})` : '');
        let fgId = '';

        const newUnit: FinishedGoodUnit = {
          id: `fgu-${Date.now()}-${generateId()}`,
          finishedGoodStockId: '',
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          status: 'AVAILABLE',
          createdAt: now,
        };

        if (fgIndex >= 0) {
          fgId = updatedFinishedGoods[fgIndex].id;
          newUnit.finishedGoodStockId = fgId;
          const currentUnits = [...(updatedFinishedGoods[fgIndex].units || []), newUnit];
          updatedFinishedGoods[fgIndex] = {
            ...updatedFinishedGoods[fgIndex],
            stock: updatedFinishedGoods[fgIndex].stock + item.qty,
            units: currentUnits,
          };
        } else {
          fgId = `fg-${Date.now()}`;
          newUnit.finishedGoodStockId = fgId;
          const newFG: FinishedGoodStock = {
            id: fgId,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
            stock: item.qty,
            minStock: 0,
            unit: 'unit',
            units: [newUnit],
          };
          updatedFinishedGoods = [newFG, ...updatedFinishedGoods];
        }

        updatedMovements.unshift({
          id: generateId(),
          materialId: fgId,
          materialName: fgName,
          type: 'IN',
          qty: item.qty,
          reference: `Restock Barang Retur (${item.complaintId || item.salesOrderNumber})`,
          date: now,
          stockCategory: 'FINISHED',
        });
      } else if (action === 'DISASSEMBLE') {
        // Bongkar barang: kembalikan bahan baku ke gudang sesuai BOM
        const product = prev.products.find(p => p.id === item.productId);
        const variant = product?.variants?.find(v => v.id === item.variantId);
        const bomItems = (variant?.bom && variant.bom.length > 0)
          ? variant.bom
          : getEffectiveVariantBOM(variant, prev.bomTemplateItems);

        if (bomItems.length > 0) {
          bomItems.forEach(b => {
            const matIdx = updatedMaterials.findIndex(m => m.id === b.materialId);
            const returnQty = b.qty * item.qty;
            if (matIdx >= 0) {
              const currentMat = updatedMaterials[matIdx];
              updatedMaterials[matIdx] = {
                ...currentMat,
                stock: parseFloat((currentMat.stock + returnQty).toFixed(4)),
              };
              updatedMovements.unshift({
                id: generateId(),
                materialId: currentMat.id,
                materialName: currentMat.name,
                type: 'IN',
                qty: returnQty,
                reference: `Bongkar Retur (${item.complaintId || item.salesOrderNumber})`,
                date: now,
                stockCategory: 'RAW',
              });
            }
          });
        }
      } else if (action === 'SCRAP') {
        // Dibuang / jadi sampah
        updatedMovements.unshift({
          id: generateId(),
          materialId: item.id,
          materialName: `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''} (Afkir / Sampah)`,
          type: 'OUT',
          qty: item.qty,
          reference: `Afkir Retur (${item.complaintId || item.salesOrderNumber})`,
          date: now,
          stockCategory: 'FINISHED',
        });
      }

      const statusMap: Record<ReturnedGoodAction, ReturnedGoodStatus> = {
        RESTOCK: 'RESTOCKED',
        REPAIR: 'REPAIR',
        DISASSEMBLE: 'DISASSEMBLED',
        SCRAP: 'SCRAPPED',
        CANCEL: 'CANCELED',
      };

      const updatedReturnedGoods = (prev.returnedGoods || []).map(rg =>
        rg.id === returnId
          ? {
              ...rg,
              status: statusMap[action] || ('CANCELED' as const),
              actionTaken: action,
              actionNotes: notes,
              actionAt: now,
              actionBy: currentUser.name,
            }
          : rg
      );

      return {
        ...prev,
        returnedGoods: updatedReturnedGoods,
        finishedGoods: updatedFinishedGoods,
        materials: updatedMaterials,
        stockMovements: updatedMovements,
      };
    });
  }, [currentUser.name]);

  const allocateFinishedGoodToOrder = useCallback((
    fgId: string,
    unitId: string | undefined,
    orderId: string,
    complaintId?: string
  ) => {
    let result = { success: false, message: '' };
    setState(prev => {
      const fg = prev.finishedGoods.find(f => f.id === fgId);
      const targetOrder = prev.salesOrders.find(o => o.id === orderId);
      if (!fg || !targetOrder) {
        result = { success: false, message: 'Barang jadi atau Sales Order tidak ditemukan' };
        return prev;
      }

      const now = new Date().toISOString();
      const units = fg.units || [];
      const targetUnit = unitId ? units.find(u => u.id === unitId) : units.find(u => u.status === 'AVAILABLE');

      // Check available stock
      const reservedCount = units.filter(u => u.status === 'RESERVED').length;
      const availableStock = Math.max(0, fg.stock - reservedCount);
      if (availableStock <= 0) {
        result = { success: false, message: 'Tidak ada stok bebas yang tersedia untuk produk ini' };
        return prev;
      }

      const updatedUnits = [...units];
      if (targetUnit && targetUnit.status === 'AVAILABLE') {
        const uIdx = updatedUnits.findIndex(u => u.id === targetUnit.id);
        if (uIdx >= 0) {
          updatedUnits[uIdx] = {
            ...updatedUnits[uIdx],
            status: 'RESERVED',
            reservedForOrderId: targetOrder.id,
            reservedForOrderNumber: targetOrder.orderNumber,
            complaintId,
          };
        }
      } else {
        updatedUnits.push({
          id: `fgu-${generateId()}`,
          finishedGoodStockId: fg.id,
          productId: fg.productId,
          variantId: fg.variantId,
          productName: fg.productName,
          variantLabel: fg.variantLabel,
          status: 'RESERVED',
          reservedForOrderId: targetOrder.id,
          reservedForOrderNumber: targetOrder.orderNumber,
          complaintId,
          createdAt: now,
        });
      }

      const updatedFinishedGoods = prev.finishedGoods.map(f =>
        f.id === fgId
          ? {
              ...f,
              units: updatedUnits,
            }
          : f
      );

      // If allocated for complaint:
      let updatedSOs = prev.salesOrders;
      if (complaintId) {
        updatedSOs = prev.salesOrders.map(so => {
          if (so.id !== orderId) return so;
          return {
            ...so,
            complaints: (so.complaints || []).map(c =>
              c.id === complaintId
                ? {
                    ...c,
                    replacementStatus: 'READY_FOR_DELIVERY' as const,
                    replacementSource: 'FINISHED_STOCK' as const,
                  }
                : c
            ),
          };
        });
      } else {
        // If allocated for regular SO item fulfillment:
        updatedSOs = prev.salesOrders.map(so => {
          if (so.id !== orderId) return so;
          const targetItemIdx = so.items.findIndex(it =>
            it.productId === fg.productId &&
            (!fg.variantId || it.variantId === fg.variantId) &&
            (it.producedQty || 0) < it.qty
          );
          if (targetItemIdx >= 0) {
            const updatedItems = so.items.map((it, idx) =>
              idx === targetItemIdx
                ? { ...it, producedQty: (it.producedQty || 0) + 1 }
                : it
            );
            const upd = { ...so, items: updatedItems };
            return { ...upd, status: computeSOStatus(upd) };
          }
          return so;
        });
      }

      result = { success: true, message: `Berhasil mengalokasikan unit ke pesanan ${targetOrder.orderNumber}` };

      return {
        ...prev,
        finishedGoods: updatedFinishedGoods,
        salesOrders: updatedSOs,
      };
    });
    return result;
  }, []);

  const manuallyResolveComplaint = useCallback((orderId: string, complaintId: string, notes?: string) => {
    const now = new Date().toISOString();
    setState(prev => {
      const updatedSOs = prev.salesOrders.map(so => {
        if (so.id !== orderId) return so;
        return {
          ...so,
          complaints: (so.complaints || []).map(c =>
            c.id === complaintId
              ? {
                  ...c,
                  status: 'SELESAI' as const,
                  resolvedAt: now,
                  resolutionNotes: notes ? (c.resolutionNotes ? `${c.resolutionNotes}\n${notes}` : notes) : c.resolutionNotes,
                }
              : c
          ),
        };
      });
      return {
        ...prev,
        salesOrders: updatedSOs,
      };
    });
  }, []);

  const processOrder = useCallback((orderId: string): { success: boolean; error?: string } => {
    const order = state.salesOrders.find(o => o.id === orderId);
    if (!order || order.status !== 'PENDING') {
      return { success: false, error: 'Order not found or not in PENDING state.' };
    }

    // Check all materials required (calculated per unit)
    const allMaterialsNeeded = new Map<string, number>();

    order.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      const variant = item.variantId ? product?.variants.find(v => v.id === item.variantId) : product?.variants[0];

      for (let unit = 1; unit <= item.qty; unit++) {
        const unitCustom = item.unitCustomProcesses?.find(u => u.unitIndex === unit);
        const isUnitCustomized = unitCustom ? unitCustom.isBomCustomized : item.isBomCustomized;
        const unitCustomBom = unitCustom?.isBomCustomized ? unitCustom.customBom : (item.isBomCustomized ? item.customBom : undefined);

        if (isUnitCustomized && unitCustomBom) {
          unitCustomBom.forEach(b => {
            allMaterialsNeeded.set(b.materialId, (allMaterialsNeeded.get(b.materialId) || 0) + b.qty);
          });
        } else {
          if (variant?.bom) {
            variant.bom.forEach(b => {
              allMaterialsNeeded.set(b.materialId, (allMaterialsNeeded.get(b.materialId) || 0) + b.qty);
            });
          }

          if (item.selectedModifiers && item.selectedModifiers.length > 0) {
            item.selectedModifiers.forEach(group => {
              group.selectedOptions.forEach(opt => {
                opt.bom.forEach(b => {
                  allMaterialsNeeded.set(b.materialId, (allMaterialsNeeded.get(b.materialId) || 0) + b.qty);
                });
              });
            });
          }
        }
      }
    });

    // Calculate active reserved demand for ALL Materials (raw & sub-assemblies) from active uncompleted Product WOs
    const activeReservedMaterialMap = new Map<string, number>();
    const activeReservedSubAssemblyMap = new Map<string, number>();
    state.workOrders
      .filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELED')
      .forEach(w => {
        w.materialsConsumed.forEach(b => {
          activeReservedMaterialMap.set(b.materialId, (activeReservedMaterialMap.get(b.materialId) || 0) + b.qty);
          const mat = state.materials.find(m => m.id === b.materialId);
          if (mat?.isSubAssembly) {
            activeReservedSubAssemblyMap.set(b.materialId, (activeReservedSubAssemblyMap.get(b.materialId) || 0) + b.qty);
          }
        });
      });

    // Calculate active reserved demand for Finished Goods from active Delivery Orders
    const activeReservedFGMap = new Map<string, number>();
    state.deliveryOrders
      .filter(d => d.status === 'READY_TO_SHIP' || d.status === 'IN_TRANSIT')
      .forEach(d => {
        if (d.orderItems && d.orderItems.length > 0) {
          d.orderItems.forEach(item => {
            const fg = state.finishedGoods.find(f =>
              (item.productId && f.productId === item.productId && (item.variantLabel ? f.variantLabel === item.variantLabel : true)) ||
              (f.productName === item.productName && (item.variantLabel ? f.variantLabel === item.variantLabel : true))
            );
            if (fg) {
              activeReservedFGMap.set(fg.id, (activeReservedFGMap.get(fg.id) || 0) + (item.qty || 1));
            }
          });
        }
      });

    // Verify stock (with MRP Bahan Setengah Jadi auto-expansion, strict mode check, and Finished Goods support)
    for (const [matId, qtyNeeded] of allMaterialsNeeded.entries()) {
      const mat = state.materials.find(m => m.id === matId);
      const fg = !mat ? state.finishedGoods.find(f => f.id === matId) : null;
      if (!mat && !fg) {
        return { success: false, error: `Bahan / barang jadi tidak ditemukan: ${matId}.` };
      }

      if (fg) {
        const reservedFG = activeReservedFGMap.get(fg.id) || 0;
        const availableFG = Math.max(0, fg.stock - reservedFG);
        if (availableFG < qtyNeeded) {
          return {
            success: false,
            error: `Stok barang jadi "${fg.productName}${fg.variantLabel ? ` (${fg.variantLabel})` : ''}" tidak mencukupi. Stok fisik: ${fg.stock} ${fg.unit}, ditahan pengiriman: ${reservedFG} ${fg.unit}, tersedia: ${availableFG} ${fg.unit}. Kebutuhan: ${qtyNeeded} ${fg.unit}.`,
          };
        }
      } else if (mat) {
        const reservedQty = activeReservedMaterialMap.get(matId) || 0;
        const availableStock = Math.max(0, (mat.stock || 0) - reservedQty);

        if (state.strictSOStockCheck ?? true) {
          if (availableStock < qtyNeeded) {
            return {
              success: false,
              error: `Stok ${mat.isSubAssembly ? 'bahan setengah jadi' : 'bahan baku'} "${mat.name}" tidak mencukupi. Stok fisik: ${mat.stock} ${mat.unit}, ditahan SPK: ${reservedQty} ${mat.unit}, tersedia: ${availableStock} ${mat.unit}. Kebutuhan: ${qtyNeeded} ${mat.unit}.`,
            };
          }
        } else {
          if (mat.isSubAssembly) {
            const reservedQty = activeReservedSubAssemblyMap.get(matId) || 0;
            const availableEffective = Math.max(0, (mat.stock || 0) - reservedQty);
            const deficit = qtyNeeded - availableEffective;

            if (deficit > 0) {
              // Check child BOM raw materials for the deficit quantity
              if (!mat.childBom || mat.childBom.length === 0) {
                return {
                  success: false,
                  error: `Stok barang setengah jadi "${mat.name}" tidak mencukupi. Stok tersedia: ${mat.stock} ${mat.unit}, kebutuhan: ${qtyNeeded} ${mat.unit}.`,
                };
              }

              for (const child of mat.childBom) {
                const childQtyNeeded = child.qty * deficit;
                const childMat = state.materials.find(m => m.id === child.materialId);
                if (!childMat || childMat.stock < childQtyNeeded) {
                  return {
                    success: false,
                    error: `Stok bahan baku "${childMat?.name || child.materialId}" tidak mencukupi. Stok tersedia: ${childMat?.stock || 0} ${childMat?.unit || ''}, kebutuhan: ${childQtyNeeded} ${childMat?.unit || ''}.`,
                  };
                }
              }
            }
          } else {
            if (mat.stock < qtyNeeded) {
              return {
                success: false,
                error: `Stok bahan baku "${mat.name}" tidak mencukupi. Stok tersedia: ${mat.stock} ${mat.unit}, kebutuhan: ${qtyNeeded} ${mat.unit}.`,
              };
            }
          }
        }
      }
    }

    const now = new Date().toISOString();

    setState(prev => {
      const newWorkOrders: WorkOrder[] = [];
      const newMovements: StockMovement[] = [];
      const subAssemblyDemands: { subMat: RawMaterial; deficit: number }[] = [];

      const updatedMaterialsMap = new Map<string, RawMaterial>(prev.materials.map(m => [m.id, { ...m }]));
      const updatedFinishedGoodsMap = new Map<string, FinishedGoodStock>(prev.finishedGoods.map(fg => [fg.id, { ...fg }]));

      for (const [matId, qtyNeeded] of allMaterialsNeeded.entries()) {
        const mat = updatedMaterialsMap.get(matId);
        const fg = !mat ? updatedFinishedGoodsMap.get(matId) : null;

        if (fg) {
          fg.stock = Math.max(0, parseFloat((fg.stock - qtyNeeded).toFixed(4)));
          newMovements.push({
            id: generateId(),
            materialId: fg.id,
            materialName: `${fg.productName}${fg.variantLabel ? ` (${fg.variantLabel})` : ''}`,
            type: 'OUT',
            qty: qtyNeeded,
            date: now,
            reference: `SO-${order.orderNumber} (Konsumsi Stok Barang Jadi)`,
            stockCategory: 'FINISHED',
          });
          continue;
        }

        if (!mat) continue;

        if (mat.isSubAssembly) {
          const reservedQty = activeReservedSubAssemblyMap.get(matId) || 0;
          const availableEffective = Math.max(0, mat.stock - reservedQty);
          const deficit = Math.max(0, qtyNeeded - availableEffective);
          if (deficit > 0) {
            subAssemblyDemands.push({ subMat: mat, deficit });
          }
        }
      }

      // Process subAssemblyDemands: create Bahan Setengah Jadi Work Orders
      // Child raw materials remain on physical shelf and are reserved in Stok Ditahan,
      // and will be deducted when the SubAssembly Work Order is COMPLETED.
      subAssemblyDemands.forEach(({ subMat, deficit }) => {
        const childBom = subMat.childBom || [];

        const woId = `wo-sa-${generateId()}`;
        let saSeq = prev.workOrders.length + newWorkOrders.length + 1;
        let spkNumber = String(saSeq);
        while (prev.workOrders.some(w => w.spkNumber === spkNumber) || newWorkOrders.some(w => w.spkNumber === spkNumber)) {
          saSeq++;
          spkNumber = String(saSeq);
        }
        const materialsConsumed = childBom.map(b => ({
          materialId: b.materialId,
          qty: b.qty * deficit,
        }));

        const assignedRouting = subMat.routingId
          ? prev.routings.find(r => r.id === subMat.routingId)
          : prev.routings[0];

        const jobCards: JobCard[] = assignedRouting
          ? assignedRouting.steps.sort((a, b) => a.sequence - b.sequence).map(step => {
            const op = prev.operations.find(o => o.id === step.operationId);
            return {
              id: `jc-${generateId()}`,
              workOrderId: woId,
              operationId: step.operationId,
              operationName: op?.name || 'Operasi',
              sequence: step.sequence,
              targetQty: deficit,
              completedQty: 0,
              picName: '',
              plannedMinutes: (op?.durationMinutes || 30) * deficit,
              status: 'PENDING' as const,
            };
          })
          : [
            {
              id: `jc-${generateId()}`,
              workOrderId: woId,
              operationId: 'op-sa-default',
              operationName: 'Pembuatan & Perakitan Bahan Setengah Jadi',
              sequence: 1,
              targetQty: deficit,
              completedQty: 0,
              picName: '',
              plannedMinutes: 60 * deficit,
              status: 'PENDING' as const,
            },
          ];

        const plannedLaborCost = jobCards.reduce((acc, jc) => {
          const op = prev.operations.find(o => o.id === jc.operationId);
          if (!op) return acc;
          if (op.costingMethod === 'fixed') {
            return acc + ((op.fixedLaborCost || 0) * deficit);
          }
          const hrs = (jc.plannedMinutes || 30) / 60;
          return acc + (hrs * (op.laborCostPerHour || 0));
        }, 0);

        const materialCost = calculateSubAssemblyCost(childBom, Array.from(updatedMaterialsMap.values()), subMat.routingId, prev.routings, prev.operations) * deficit;

        newWorkOrders.push({
          id: woId,
          spkNumber,
          salesOrderId: order.id,
          salesOrderNumber: order.orderNumber,
          productName: subMat.name,
          variantName: `${deficit} ${subMat.unit}`,
          status: 'PENDING',
          jobCards,
          materialsConsumed,
          materialCost,
          plannedLaborCost,
          actualLaborCost: plannedLaborCost,
          issuedAt: now,
          isCustom: false,
          isSubAssembly: true,
          subAssemblyId: subMat.id,
        });
      });

      let spkCounter = 1;
      order.items.forEach((item, idx) => {
        const product = prev.products.find(p => p.id === item.productId);
        if (!product) return;
        const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : product.variants[0];
        if (!variant) return;
        const variantCombination = item.variantLabel ? item.variantLabel : Object.values(variant.combination).join(' • ');
        const routing = variant.routingId ? prev.routings.find(r => r.id === variant.routingId) : null;

        for (let unit = 1; unit <= item.qty; unit++) {
          const woId = `wo-${generateId()}`;

          const unitCustom = item.unitCustomProcesses?.find(u => u.unitIndex === unit);
          const isUnitCustomized = unitCustom ? unitCustom.isBomCustomized : item.isBomCustomized;
          const unitCustomBom = unitCustom?.isBomCustomized ? unitCustom.customBom : (item.isBomCustomized ? item.customBom : undefined);
          const unitCustomOps = unitCustom?.isBomCustomized
            ? (unitCustom.customOperations || unitCustom.customOperationIds)
            : (item.isBomCustomized ? (item.customOperations || item.customOperationIds) : undefined);

          let effectiveSteps: {
            sequence: number;
            operationId: string;
            customOp?: import('@/lib/types').CustomOperationItem;
          }[] = [];

          if (isUnitCustomized && unitCustomOps && unitCustomOps.length > 0) {
            effectiveSteps = unitCustomOps.map((opItem: any, idx: number) => {
              const opId = typeof opItem === 'string' ? opItem : opItem.operationId;
              const customOp = typeof opItem === 'object' ? opItem : undefined;
              return {
                sequence: idx + 1,
                operationId: opId,
                customOp,
              };
            });
          } else if (routing) {
            effectiveSteps = routing.steps.map(s => ({ sequence: s.sequence, operationId: s.operationId }));
          }

          const jobCards: JobCard[] = effectiveSteps.sort((a, b) => a.sequence - b.sequence).map(step => {
            const op = prev.operations.find(o => o.id === step.operationId);
            const plannedMinutes = step.customOp?.durationMinutes !== undefined
              ? step.customOp.durationMinutes
              : (op?.durationMinutes || 0);

            return {
              id: `jc-${generateId()}`,
              workOrderId: woId,
              operationId: step.operationId,
              operationName: op?.name || 'Operasi',
              sequence: step.sequence,
              targetQty: 1,
              status: 'PENDING' as const,
              completedQty: 0,
              picName: '',
              plannedMinutes,
            };
          });

          let plannedLaborCost = 0;
          effectiveSteps.forEach(step => {
            const op = prev.operations.find(o => o.id === step.operationId);
            if (!op) return;
            const costingMethod = step.customOp?.costingMethod ?? op.costingMethod ?? 'fixed';
            const fixedCost = step.customOp?.fixedLaborCost !== undefined ? step.customOp.fixedLaborCost : (op.fixedLaborCost || 0);
            const hourlyRate = step.customOp?.laborCostPerHour !== undefined ? step.customOp.laborCostPerHour : (op.laborCostPerHour || 0);
            const duration = step.customOp?.durationMinutes !== undefined ? step.customOp.durationMinutes : (op.durationMinutes || 0);

            if (costingMethod === 'fixed') {
              plannedLaborCost += fixedCost;
            } else {
              const hours = duration / 60;
              plannedLaborCost += hours * hourlyRate;
            }
          });

          let materialCost = 0;
          const materialsConsumed: { materialId: string; qty: number }[] = [];

          if (isUnitCustomized && unitCustomBom) {
            unitCustomBom.forEach(b => {
              const mat = updatedMaterialsMap.get(b.materialId);
              const fg = !mat ? updatedFinishedGoodsMap.get(b.materialId) : null;
              materialsConsumed.push({ materialId: b.materialId, qty: b.qty });
              if (mat) {
                materialCost += (mat.unitCost || 0) * b.qty;
              } else if (fg) {
                const prod = prev.products.find(p => p.id === fg.productId);
                const variant = prod?.variants.find(v => v.id === fg.variantId) || prod?.variants[0];
                const estCost = variant?.price ? variant.price * 0.6 : 0;
                materialCost += estCost * b.qty;
              }
            });
          } else {
            variant.bom.forEach(b => {
              const mat = updatedMaterialsMap.get(b.materialId);
              materialsConsumed.push({ materialId: b.materialId, qty: b.qty });
              materialCost += (mat?.unitCost || 0) * b.qty;
            });

            if (item.selectedModifiers) {
              item.selectedModifiers.forEach(g => {
                g.selectedOptions.forEach(opt => {
                  opt.bom.forEach(b => {
                    const mat = updatedMaterialsMap.get(b.materialId);
                    materialsConsumed.push({ materialId: b.materialId, qty: b.qty });
                    materialCost += (mat?.unitCost || 0) * b.qty;
                  });
                });
              });
            }
          }

          let spkNum = generateItemUnitNumber(order.orderNumber, spkCounter);
          while (prev.workOrders.some(w => w.spkNumber === spkNum) || newWorkOrders.some(w => w.spkNumber === spkNum)) {
            spkCounter++;
            spkNum = generateItemUnitNumber(order.orderNumber, spkCounter);
          }
          spkCounter++;

          newWorkOrders.push({
            id: woId,
            spkNumber: spkNum,
            salesOrderId: order.id,
            salesOrderNumber: order.orderNumber,
            productId: product.id,
            variantId: variant.id,
            itemIndex: idx,
            unitIndex: unit,
            productName: product.name,
            variantName: variantCombination || undefined,
            selectedModifiers: item.selectedModifiers,
            status: 'PENDING',
            jobCards,
            materialsConsumed,
            materialCost,
            plannedLaborCost,
            actualLaborCost: plannedLaborCost,
            issuedAt: now,
            isCustom: item.isCustom || Boolean(isUnitCustomized),
            customNotes: item.customNotes,
          });
        }
      });

      return {
        ...prev,
        materials: Array.from(updatedMaterialsMap.values()),
        finishedGoods: Array.from(updatedFinishedGoodsMap.values()),
        workOrders: [...newWorkOrders, ...prev.workOrders],
        stockMovements: [...prev.stockMovements, ...newMovements],
        salesOrders: prev.salesOrders.map(o =>
          o.id === orderId
            ? {
              ...o,
              status: 'PROCESSING' as const,
              spkIssuedAt: now,
              updatedAt: now,
              updatedBy: currentUser.name,
              items: o.items.map(it => ({
                ...it,
                producedQty: it.producedQty || 0,
                shippedQty: it.shippedQty || 0,
                deliveredQty: it.deliveredQty || 0,
              })),
            }
            : o
        ),
      };
    });

    return { success: true };
  }, [state, currentUser.name]);

  // ---- Production ----

  // Helper: update WO status and check SO completion / Bahan Setengah Jadi stock mutation

  const updateWOStatusAndSO = (prev: AppState, workOrderId: string, updatedWOs: WorkOrder[]): AppState => {
    let updatedSOs = prev.salesOrders;
    let updatedMaterials = prev.materials;
    let updatedMovements = prev.stockMovements;
    let updatedFinishedGoods = prev.finishedGoods;
    const now = new Date().toISOString();

    const targetWO = updatedWOs.find(w => w.id === workOrderId);
    if (targetWO && targetWO.status === 'COMPLETED') {
      const prevWO = prev.workOrders.find(w => w.id === workOrderId);

      // 1. Bahan Setengah Jadi WO completion: Add produced Bahan Setengah Jadi stock (Stock IN)
      if (targetWO.isSubAssembly && targetWO.subAssemblyId && prevWO && prevWO.status !== 'COMPLETED') {
        const producedQty = targetWO.jobCards[0]?.targetQty || 1;
        const subMat = prev.materials.find(m => m.id === targetWO.subAssemblyId);

        if (subMat) {
          updatedMaterials = updatedMaterials.map(m => {
            if (m.id === targetWO.subAssemblyId) {
              return { ...m, stock: parseFloat((m.stock + producedQty).toFixed(4)) };
            }
            return m;
          });

          const newMovements: StockMovement[] = [{
            id: generateId(),
            materialId: subMat.id,
            materialName: subMat.name,
            type: 'IN',
            qty: producedQty,
            reference: targetWO.spkNumber,
            date: now,
          }];

          // Deduct Child BOM raw materials for all SubAssembly WOs upon completion
          const consumedMap = new Map<string, number>();
          targetWO.materialsConsumed.forEach(b => {
            consumedMap.set(b.materialId, (consumedMap.get(b.materialId) || 0) + b.qty);
          });

          updatedMaterials = updatedMaterials.map(m => {
            const consumedQty = consumedMap.get(m.id);
            if (consumedQty) {
              return { ...m, stock: parseFloat((m.stock - consumedQty).toFixed(4)) };
            }
            return m;
          });

          targetWO.materialsConsumed.forEach(b => {
            const raw = prev.materials.find(m => m.id === b.materialId);
            newMovements.push({
              id: generateId(),
              materialId: b.materialId,
              materialName: raw?.name || b.materialId,
              type: 'OUT',
              qty: b.qty,
              reference: `${targetWO.spkNumber} (Konsumsi Bahan Setengah Jadi)`,
              date: now,
              stockCategory: 'RAW',
            });
          });

          updatedMovements = [...newMovements, ...updatedMovements];
        }
      }
      // 2. Product WO completion: Deduct consumed Bahan Setengah Jadi stock (Stock OUT) & update SO status
      else if (!targetWO.isSubAssembly && prevWO && prevWO.status !== 'COMPLETED') {
        if (targetWO.salesOrderId === 'INTERNAL-PROD') {
          const producedQty = targetWO.jobCards[0]?.targetQty || 1;
          const consumedMap = new Map<string, number>();
          targetWO.materialsConsumed.forEach(b => {
            consumedMap.set(b.materialId, (consumedMap.get(b.materialId) || 0) + b.qty);
          });

          const newOutMovements: StockMovement[] = [];
          updatedMaterials = updatedMaterials.map(m => {
            const consumedQty = consumedMap.get(m.id);
            if (consumedQty) {
              return { ...m, stock: parseFloat((m.stock - consumedQty).toFixed(4)) };
            }
            return m;
          });

          targetWO.materialsConsumed.forEach(b => {
            const mat = prev.materials.find(m => m.id === b.materialId);
            newOutMovements.push({
              id: generateId(),
              materialId: b.materialId,
              materialName: mat?.name || b.materialId,
              type: 'OUT',
              qty: b.qty,
              reference: targetWO.spkNumber,
              date: now,
              stockCategory: mat?.isSubAssembly ? 'WIP' : 'RAW',
            });
          });

          // Simpan hasil ke stok barang jadi dengan id barang sesuai id SPK-nya
          const targetFGId = targetWO.spkNumber;
          const pName = targetWO.productName;
          const varLabel = targetWO.variantName;
          const fgIndex = prev.finishedGoods.findIndex(fg => fg.id === targetFGId);

          if (fgIndex >= 0) {
            updatedFinishedGoods = prev.finishedGoods.map((fg, idx) =>
              idx === fgIndex ? { ...fg, stock: fg.stock + producedQty } : fg
            );
          } else {
            const newFG: FinishedGoodStock = {
              id: targetFGId,
              productId: targetWO.productId || '',
              variantId: targetWO.variantId,
              productName: pName,
              variantLabel: varLabel,
              stock: producedQty,
              minStock: 0,
              unit: 'unit',
            };
            updatedFinishedGoods = [newFG, ...prev.finishedGoods];
          }

          const newInMovement: StockMovement = {
            id: generateId(),
            materialId: targetFGId,
            materialName: `${pName}${varLabel ? ` (${varLabel})` : ''}`,
            type: 'IN',
            qty: producedQty,
            reference: `${targetWO.spkNumber} (Produksi Selesai)`,
            date: now,
            stockCategory: 'FINISHED',
          };

          updatedMovements = [newInMovement, ...newOutMovements, ...updatedMovements];
        } else {
          // Regular Sales Order WO completion: Deduct consumed raw materials and sub-assemblies from physical inventory
          const consumedMap = new Map<string, number>();
          targetWO.materialsConsumed.forEach(b => {
            consumedMap.set(b.materialId, (consumedMap.get(b.materialId) || 0) + b.qty);
          });

          if (consumedMap.size > 0) {
            const newMovements: StockMovement[] = [];
            updatedMaterials = updatedMaterials.map(m => {
              const consumedQty = consumedMap.get(m.id);
              if (consumedQty) {
                return { ...m, stock: parseFloat((m.stock - consumedQty).toFixed(4)) };
              }
              return m;
            });

            targetWO.materialsConsumed.forEach(b => {
              const mat = prev.materials.find(m => m.id === b.materialId);
              newMovements.push({
                id: generateId(),
                materialId: b.materialId,
                materialName: mat?.name || b.materialId,
                type: 'OUT',
                qty: b.qty,
                reference: `${targetWO.spkNumber} (Produksi Selesai - Konsumsi Bahan)`,
                date: now,
                stockCategory: mat?.isSubAssembly ? 'WIP' : 'RAW',
              });
            });

            updatedMovements = [...newMovements, ...updatedMovements];
          }

          if (targetWO.isComplaintReplacement && targetWO.complaintId) {
            // Complaint replacement WO completion:
            // Increment physical finished goods stock and add reserved unit for this complaint
            const fgIndex = prev.finishedGoods.findIndex(fg =>
              (targetWO.productId && fg.productId === targetWO.productId && (!targetWO.variantId || fg.variantId === targetWO.variantId)) ||
              fg.productName === targetWO.productName
            );
            if (fgIndex >= 0) {
              const currentFG = prev.finishedGoods[fgIndex];
              const fgUnits = [...(currentFG.units || [])];
              fgUnits.push({
                id: `fgu-${generateId()}`,
                finishedGoodStockId: currentFG.id,
                productId: currentFG.productId,
                variantId: currentFG.variantId,
                productName: currentFG.productName,
                variantLabel: currentFG.variantLabel,
                spkNumber: targetWO.spkNumber,
                customNotes: targetWO.customNotes,
                status: 'RESERVED',
                reservedForOrderId: targetWO.salesOrderId,
                reservedForOrderNumber: targetWO.salesOrderNumber,
                complaintId: targetWO.complaintId,
                createdAt: now,
              });
              updatedFinishedGoods = prev.finishedGoods.map((fg, idx) =>
                idx === fgIndex ? { ...fg, stock: fg.stock + 1, units: fgUnits } : fg
              );
            }

            // Check if all WOs for this complaint are now completed
            const otherUnfinishedWOs = updatedWOs.filter(
              w => w.complaintId === targetWO.complaintId && w.id !== targetWO.id && w.status !== 'COMPLETED'
            );
            if (otherUnfinishedWOs.length === 0) {
              // All replacement WOs completed! Transition complaint replacementStatus to 'READY_FOR_DELIVERY'
              updatedSOs = (updatedSOs === prev.salesOrders ? [...prev.salesOrders] : updatedSOs).map(so => {
                if (so.id !== targetWO.salesOrderId && so.orderNumber !== targetWO.salesOrderNumber) return so;
                return {
                  ...so,
                  complaints: (so.complaints || []).map(c =>
                    c.id === targetWO.complaintId
                      ? { ...c, replacementStatus: 'READY_FOR_DELIVERY' as const }
                      : c
                  ),
                };
              });
            }
          } else {
            // Regular Sales Order WO completion: Item-level fulfillment: increment producedQty for the matching SO item
            const soId = targetWO.salesOrderId;
            updatedFinishedGoods = prev.finishedGoods;
            const matchingSO = prev.salesOrders.find(
              s => s.id === soId || s.orderNumber === targetWO.salesOrderNumber || (soId && s.orderNumber === soId)
            );

            // Determine target SO item index accurately
            let targetItemIndex = -1;
            if (targetWO.itemIndex !== undefined && matchingSO && matchingSO.items[targetWO.itemIndex]) {
              targetItemIndex = targetWO.itemIndex;
            } else if (matchingSO) {
              targetItemIndex = matchingSO.items.findIndex(item => {
                if (targetWO.productId && item.productId) {
                  const prodMatch = targetWO.productId === item.productId;
                  const varMatch = targetWO.variantId && item.variantId ? targetWO.variantId === item.variantId : true;
                  return prodMatch && varMatch;
                }
                return targetWO.productName === item.productName;
              });
            }

            const matchingSOItem = targetItemIndex >= 0 && matchingSO ? matchingSO.items[targetItemIndex] : undefined;

            if (matchingSOItem) {
              const prodId = matchingSOItem.productId;
              const varId = matchingSOItem.variantId;
              const prodObj = prev.products.find(p => p.id === prodId);
              const varObj = prodObj?.variants?.find(v => v.id === varId);
              const varLabel = matchingSOItem.variantLabel || (varObj ? Object.values(varObj.combination || {}).join(' • ') || varObj.sku : undefined);
              const pName = matchingSOItem.productName || prodObj?.name || targetWO.productName;

              const fgIndex = prev.finishedGoods.findIndex(fg => fg.productId === prodId && (fg.variantId || '') === (varId || ''));
              let targetFGId = '';
              if (fgIndex >= 0) {
                targetFGId = prev.finishedGoods[fgIndex].id;
                updatedFinishedGoods = prev.finishedGoods.map((fg, idx) =>
                  idx === fgIndex ? { ...fg, stock: fg.stock + 1 } : fg
                );
              } else {
                targetFGId = `fg-${generateId()}`;
                const newFG: FinishedGoodStock = {
                  id: targetFGId,
                  productId: prodId,
                  variantId: varId,
                  productName: pName,
                  variantLabel: varLabel,
                  stock: 1,
                  minStock: 0,
                  unit: 'unit',
                };
                updatedFinishedGoods = [newFG, ...prev.finishedGoods];
              }

              updatedMovements = [{
                id: generateId(),
                materialId: targetFGId,
                materialName: `${pName}${varLabel ? ` (${varLabel})` : ''}`,
                type: 'IN',
                qty: 1,
                reference: `${targetWO.spkNumber} (Produksi Selesai)`,
                date: now,
                stockCategory: 'FINISHED',
              }, ...updatedMovements];
            }

            updatedSOs = (updatedSOs === prev.salesOrders ? [...prev.salesOrders] : updatedSOs).map(so => {
              const isMatch = so.id === soId || so.orderNumber === targetWO.salesOrderNumber || (soId && so.orderNumber === soId);
              if (!isMatch) return so;
              // Increment producedQty ONLY for the single targeted item
              const updatedItems = so.items.map((item, idx) => {
                if (idx === targetItemIndex && (item.producedQty || 0) < item.qty) {
                  return { ...item, producedQty: (item.producedQty || 0) + 1 };
                }
                return item;
              });
              const updatedSO = { ...so, items: updatedItems };
              return { ...updatedSO, status: computeSOStatus(updatedSO) };
            });
          }
        }
      }
    }
    return {
      ...prev,
      materials: updatedMaterials,
      finishedGoods: updatedFinishedGoods ?? prev.finishedGoods,
      stockMovements: updatedMovements,
      workOrders: updatedWOs,
      salesOrders: updatedSOs,
    };
  };

  const createSubAssemblyWorkOrder = useCallback((subAssemblyId: string, targetQty: number, customNotes?: string) => {
    let result = { success: true, error: '' };
    const now = new Date().toISOString();

    setState(prev => {
      const subMat = prev.materials.find(m => m.id === subAssemblyId && m.isSubAssembly);
      if (!subMat || !subMat.childBom || subMat.childBom.length === 0) {
        result = { success: false, error: 'Item Bahan Setengah Jadi tidak valid atau belum memiliki Child BOM.' };
        return prev;
      }
      if (targetQty <= 0) {
        result = { success: false, error: 'Jumlah rencana produksi harus lebih dari 0.' };
        return prev;
      }

      // Check stock availability if strict check enabled
      if (prev.strictSOStockCheck) {
        for (const item of subMat.childBom) {
          const reqQty = item.qty * targetQty;
          const rawMat = prev.materials.find(m => m.id === item.materialId);
          if (!rawMat || rawMat.stock < reqQty) {
            result = {
              success: false,
              error: `Stok bahan mentah "${rawMat?.name || item.materialId}" kurang! Butuh ${reqQty} ${rawMat?.unit || ''}, tersedia ${rawMat?.stock || 0}.`,
            };
            return prev;
          }
        }
      }

      const woId = `wo-sa-${generateId()}`;
      let saSeq = prev.workOrders.length + 1;
      let spkNumber = String(saSeq);
      while (prev.workOrders.some(w => w.spkNumber === spkNumber)) {
        saSeq++;
        spkNumber = String(saSeq);
      }
      const materialsConsumed = subMat.childBom.map(b => ({
        materialId: b.materialId,
        qty: b.qty * targetQty,
      }));
      const materialCost = calculateSubAssemblyCost(subMat.childBom, prev.materials, subMat.routingId, prev.routings, prev.operations) * targetQty;

      const assignedRouting = subMat.routingId
        ? prev.routings.find(r => r.id === subMat.routingId)
        : prev.routings[0];

      const jobCards: JobCard[] = assignedRouting
        ? assignedRouting.steps.sort((a, b) => a.sequence - b.sequence).map(step => {
          const op = prev.operations.find(o => o.id === step.operationId);
          return {
            id: `jc-${generateId()}`,
            workOrderId: woId,
            operationId: step.operationId,
            operationName: op?.name || 'Operasi',
            sequence: step.sequence,
            targetQty,
            completedQty: 0,
            picName: '',
            plannedMinutes: (op?.durationMinutes || 30) * targetQty,
            status: 'PENDING' as const,
          };
        })
        : [
          {
            id: `jc-${generateId()}`,
            workOrderId: woId,
            operationId: 'op-sa-default',
            operationName: 'Pembuatan & Perakitan Bahan Setengah Jadi',
            sequence: 1,
            targetQty,
            completedQty: 0,
            picName: '',
            plannedMinutes: 60 * targetQty,
            status: 'PENDING' as const,
          },
        ];

      const plannedLaborCost = jobCards.reduce((acc, jc) => {
        const op = prev.operations.find(o => o.id === jc.operationId);
        if (!op) return acc;
        if (op.costingMethod === 'fixed') {
          return acc + ((op.fixedLaborCost || 0) * targetQty);
        }
        const hrs = (jc.plannedMinutes || 30) / 60;
        return acc + (hrs * (op.laborCostPerHour || 0));
      }, 0);

      const newWO: WorkOrder = {
        id: woId,
        spkNumber,
        salesOrderId: 'INTERNAL-SA',
        salesOrderNumber: 'SPK Internal Bahan Setengah Jadi',
        productName: subMat.name,
        variantName: `${targetQty} ${subMat.unit}`,
        status: 'PENDING',
        jobCards,
        materialsConsumed,
        materialCost,
        plannedLaborCost,
        actualLaborCost: 0,
        issuedAt: now,
        isCustom: Boolean(customNotes?.trim()),
        customNotes: customNotes?.trim() || undefined,
        isSubAssembly: true,
        subAssemblyId: subMat.id,
      };

      return {
        ...prev,
        workOrders: [newWO, ...prev.workOrders],
      };
    });

    return result;
  }, []);

  const createNormalWorkOrder = useCallback((productId: string, variantId: string | undefined, targetQty: number, customNotes?: string) => {
    let result = { success: true, error: '' };
    const now = new Date().toISOString();

    setState(prev => {
      const product = prev.products.find(p => p.id === productId);
      if (!product) {
        result = { success: false, error: 'Produk tidak ditemukan.' };
        return prev;
      }
      if (targetQty <= 0) {
        result = { success: false, error: 'Jumlah rencana produksi harus lebih dari 0.' };
        return prev;
      }

      // Tentukan varian
      let variant = product.variants?.find(v => v.id === variantId);
      if (!variant && (!product.variants || product.variants.length === 0)) {
        variant = undefined;
      } else if (!variant && product.variants && product.variants.length > 0) {
        if (!variantId && product.variants.length === 1) {
          variant = product.variants[0];
        } else if (!variantId) {
          result = { success: false, error: 'Silakan pilih varian produk terlebih dahulu.' };
          return prev;
        } else {
          result = { success: false, error: 'Varian produk yang dipilih tidak valid.' };
          return prev;
        }
      }

      const bomItems = (variant?.bom && variant.bom.length > 0)
        ? variant.bom
        : getEffectiveVariantBOM(variant, prev.bomTemplateItems);

      // Validasi ketersediaan stok bahan baku jika strict check diaktifkan
      if (prev.strictSOStockCheck) {
        for (const item of bomItems) {
          const reqQty = item.qty * targetQty;
          const mat = prev.materials.find(m => m.id === item.materialId);
          if (!mat || mat.stock < reqQty) {
            result = {
              success: false,
              error: `Stok "${mat?.name || item.materialId}" kurang! Butuh ${reqQty} ${mat?.unit || ''}, tersedia ${mat?.stock || 0}.`,
            };
            return prev;
          }
        }
      }

      const woId = `wo-${generateId()}`;
      let spkNumSeq = prev.workOrders.length + 1;
      let spkNumber = String(spkNumSeq);
      while (prev.workOrders.some(w => w.spkNumber === spkNumber)) {
        spkNumSeq++;
        spkNumber = String(spkNumSeq);
      }

      const assignedRouting = (variant?.routingId ? prev.routings.find(r => r.id === variant.routingId) : null)
        || (product.defaultRoutingId ? prev.routings.find(r => r.id === product.defaultRoutingId) : null)
        || prev.routings[0];

      const jobCards: JobCard[] = assignedRouting && assignedRouting.steps.length > 0
        ? assignedRouting.steps.sort((a, b) => a.sequence - b.sequence).map(step => {
          const op = prev.operations.find(o => o.id === step.operationId);
          return {
            id: `jc-${generateId()}`,
            workOrderId: woId,
            operationId: step.operationId,
            operationName: op?.name || 'Operasi',
            sequence: step.sequence,
            targetQty,
            completedQty: 0,
            picName: '',
            plannedMinutes: (op?.durationMinutes || 30) * targetQty,
            status: 'PENDING' as const,
          };
        })
        : [
          {
            id: `jc-${generateId()}`,
            workOrderId: woId,
            operationId: 'op-prod-default',
            operationName: 'Produksi Barang Jadi',
            sequence: 1,
            targetQty,
            completedQty: 0,
            picName: '',
            plannedMinutes: 60 * targetQty,
            status: 'PENDING' as const,
          },
        ];

      const plannedLaborCost = jobCards.reduce((acc, jc) => {
        const op = prev.operations.find(o => o.id === jc.operationId);
        if (!op) return acc;
        if (op.costingMethod === 'fixed') {
          return acc + ((op.fixedLaborCost || 0) * targetQty);
        }
        const hrs = (jc.plannedMinutes || 30) / 60;
        return acc + (hrs * (op.laborCostPerHour || 0));
      }, 0);

      const materialsConsumed = bomItems.map(b => ({
        materialId: b.materialId,
        qty: b.qty * targetQty,
      }));

      const materialCost = materialsConsumed.reduce((acc, b) => {
        const mat = prev.materials.find(m => m.id === b.materialId);
        return acc + ((mat?.unitCost || 0) * b.qty);
      }, 0);

      const variantLabel = variant
        ? (Object.values(variant.combination || {}).join(' • ') || variant.sku)
        : undefined;

      const newWO: WorkOrder = {
        id: woId,
        spkNumber,
        salesOrderId: 'INTERNAL-PROD',
        salesOrderNumber: 'Stok Barang Jadi',
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variantLabel,
        status: 'PENDING',
        jobCards,
        materialsConsumed,
        materialCost,
        plannedLaborCost,
        actualLaborCost: 0,
        issuedAt: now,
        isCustom: Boolean(customNotes?.trim()),
        customNotes: customNotes?.trim() || undefined,
        isSubAssembly: false,
      };

      return {
        ...prev,
        workOrders: [newWO, ...prev.workOrders],
      };
    });

    return result;
  }, []);

  const cancelWorkOrder = useCallback((workOrderId: string, reason?: string) => {
    let result = { success: true, error: '' };

    setState(prev => {
      const wo = prev.workOrders.find(w => w.id === workOrderId);
      if (!wo) {
        result = { success: false, error: 'SPK tidak ditemukan.' };
        return prev;
      }

      if (wo.status === 'CANCELED') {
        result = { success: false, error: 'SPK sudah dibatalkan sebelumnya.' };
        return prev;
      }

      if (wo.status === 'COMPLETED') {
        result = { success: false, error: 'SPK yang sudah selesai tidak dapat dibatalkan.' };
        return prev;
      }

      // Validasi: belum ada operasi yang dikerjakan
      const hasStarted = wo.jobCards.some(
        jc => jc.status !== 'PENDING' || (jc.completedQty || 0) > 0 || Boolean(jc.startedAt) || (jc.actualMinutes || 0) > 0
      );

      if (hasStarted) {
        result = { success: false, error: 'SPK tidak dapat dibatalkan karena operasi produksi sudah mulai berjalan.' };
        return prev;
      }

      const now = new Date().toISOString();
      const cancelReason = reason?.trim() || 'Dibatalkan';

      // 1. Update Work Order status ke CANCELED
      const updatedWorkOrders = prev.workOrders.map(w =>
        w.id === workOrderId
          ? {
              ...w,
              status: 'CANCELED' as const,
              canceledAt: now,
              cancelReason,
            }
          : w
      );

      // 2. Cek apakah SPK berasal dari Sales Order
      let updatedSalesOrders = prev.salesOrders;
      const isManual = !wo.salesOrderId || wo.salesOrderId === 'INTERNAL-SA' || wo.salesOrderId === 'INTERNAL-PROD';

      if (!isManual) {
        const targetSO = prev.salesOrders.find(so => so.id === wo.salesOrderId);
        if (targetSO) {
          // Cari sisa SPK aktif untuk SO ini (selain yang baru saja dibatalkan)
          const remainingActiveWOs = updatedWorkOrders.filter(
            w => w.salesOrderId === targetSO.id && w.status !== 'CANCELED'
          );

          if (remainingActiveWOs.length === 0) {
            // Semua SPK untuk SO ini telah dibatalkan -> kembalikan status SO ke 'PENDING'
            updatedSalesOrders = prev.salesOrders.map(so =>
              so.id === targetSO.id
                ? {
                    ...so,
                    status: 'PENDING' as const,
                    spkIssuedAt: undefined,
                    updatedAt: now,
                    updatedBy: currentUser.name,
                  }
                : so
            );
          } else {
            // Masih ada SPK aktif lain dari SO yang sama -> hitung ulang status SO
            updatedSalesOrders = prev.salesOrders.map(so =>
              so.id === targetSO.id
                ? {
                    ...so,
                    status: computeSOStatus(so),
                    updatedAt: now,
                    updatedBy: currentUser.name,
                  }
                : so
            );
          }
        }
      }

      return {
        ...prev,
        workOrders: updatedWorkOrders,
        salesOrders: updatedSalesOrders,
      };
    });

    return result;
  }, [currentUser.name]);

  const updateJobCardProgress = useCallback((workOrderId: string, jobCardId: string, completedQty: number, picName: string) => {
    setState(prev => {
      const updatedWOs = prev.workOrders.map(wo => {
        if (wo.id === workOrderId) {
          const updatedJobCards = wo.jobCards.map(jc => {
            if (jc.id === jobCardId) {
              const newQty = Math.min(Math.max(0, completedQty), jc.targetQty);
              const status: JobCard['status'] = newQty >= jc.targetQty ? 'COMPLETED' : (newQty > 0 ? 'IN_PROGRESS' : 'PENDING');
              return { ...jc, completedQty: newQty, status, picName };
            }
            return jc;
          });
          const allJcComplete = updatedJobCards.length > 0 && updatedJobCards.every(jc => jc.status === 'COMPLETED');
          const anyJcStarted = updatedJobCards.some(jc => jc.status === 'IN_PROGRESS' || jc.status === 'COMPLETED');
          const status: SPKStatus = allJcComplete ? 'COMPLETED' : (anyJcStarted ? 'PROCESSING' : 'PENDING');
          const updatedWO = { ...wo, jobCards: updatedJobCards, status, completedAt: allJcComplete ? new Date().toISOString() : wo.completedAt };
          return updatedWO;
        }
        return wo;
      });
      return updateWOStatusAndSO(prev, workOrderId, updatedWOs);
    });
  }, []);

  const startJobCard = useCallback((workOrderId: string, jobCardId: string) => {
    setState(prev => {
      const now = new Date().toISOString();
      const updatedWOs = prev.workOrders.map(wo => {
        if (wo.id === workOrderId) {
          const updatedJobCards = wo.jobCards.map(jc =>
            jc.id === jobCardId && (jc.status === 'PENDING' || jc.status === 'PAUSED')
              ? { ...jc, status: 'IN_PROGRESS' as const, startedAt: jc.startedAt || now }
              : jc
          );
          const anyJcStarted = updatedJobCards.some(jc => jc.status === 'IN_PROGRESS' || jc.status === 'COMPLETED' || jc.status === 'PAUSED');
          return { ...wo, jobCards: updatedJobCards, status: (anyJcStarted ? 'PROCESSING' : wo.status) as SPKStatus };
        }
        return wo;
      });
      return { ...prev, workOrders: updatedWOs };
    });
  }, []);

  const pauseJobCard = useCallback((workOrderId: string, jobCardId: string) => {
    setState(prev => {
      const updatedWOs = prev.workOrders.map(wo => {
        if (wo.id === workOrderId) {
          const updatedJobCards = wo.jobCards.map(jc =>
            jc.id === jobCardId && jc.status === 'IN_PROGRESS'
              ? { ...jc, status: 'PAUSED' as const }
              : jc
          );
          return { ...wo, jobCards: updatedJobCards };
        }
        return wo;
      });
      return { ...prev, workOrders: updatedWOs };
    });
  }, []);

  const completeJobCard = useCallback((workOrderId: string, jobCardId: string, completedQty: number, picName: string, actualMinutes?: number, operatorId?: string) => {
    let result = { success: true, error: '' };
    setState(prev => {
      const targetWO = prev.workOrders.find(w => w.id === workOrderId);
      if (!targetWO) return prev;

      // Check if completing this job card will make ALL job cards of this WO completed
      const willBeAllJcComplete = targetWO.jobCards.every(jc => jc.id === jobCardId || jc.status === 'COMPLETED');

      if (willBeAllJcComplete && !targetWO.isSubAssembly) {
        // Find if there are any pending Bahan Setengah Jadi WOs for the same sales order
        const pendingSA = prev.workOrders.find(w => w.salesOrderId === targetWO.salesOrderId && w.isSubAssembly && w.status !== 'COMPLETED');
        if (pendingSA) {
          result = {
            success: false,
            error: `SPK Bahan Setengah Jadi ${pendingSA.spkNumber} belum selesai.`,
          };
          return prev;
        }
      }

      const now = new Date().toISOString();
      const updatedWOs = prev.workOrders.map(wo => {
        if (wo.id === workOrderId) {
          const updatedJobCards = wo.jobCards.map(jc => {
            if (jc.id === jobCardId) {
              const calcActualMinutes = actualMinutes ?? (jc.startedAt
                ? Math.round((new Date(now).getTime() - new Date(jc.startedAt).getTime()) / 60000)
                : jc.plannedMinutes);
              return {
                ...jc,
                status: 'COMPLETED' as const,
                completedQty: Math.min(completedQty, jc.targetQty),
                picName,
                operatorId: operatorId || jc.operatorId,
                completedAt: now,
                actualMinutes: calcActualMinutes,
              };
            }
            return jc;
          });
          const allJcComplete = updatedJobCards.length > 0 && updatedJobCards.every(jc => jc.status === 'COMPLETED');
          const status: SPKStatus = allJcComplete ? 'COMPLETED' : 'PROCESSING';
          const updatedWO = { ...wo, jobCards: updatedJobCards, status, completedAt: allJcComplete ? now : wo.completedAt };
          return updatedWO;
        }
        return wo;
      });
      return updateWOStatusAndSO(prev, workOrderId, updatedWOs);
    });
    return result;
  }, []);

  const addOperator = useCallback((op: Omit<ProductionOperator, 'id'>) => {
    setState(prev => ({
      ...prev,
      operators: [...(prev.operators || []), { ...op, id: generateId() }]
    }));
  }, []);

  const updateOperator = useCallback((id: string, op: Partial<Omit<ProductionOperator, 'id'>>) => {
    setState(prev => ({
      ...prev,
      operators: (prev.operators || []).map(o => o.id === id ? { ...o, ...op } : o)
    }));
  }, []);

  const deleteOperator = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      operators: (prev.operators || []).filter(o => o.id !== id)
    }));
    return true;
  }, []);

  const syncWorkOrderRouting = useCallback((woId: string) => {
    setState(prev => {
      const wo = prev.workOrders.find(w => w.id === woId);
      if (!wo) return prev;
      const so = prev.salesOrders.find(s => s.id === wo.salesOrderId);
      if (!so) return prev;
      const item = so.items.find(i => wo.productName.includes(i.productName) || i.productName.includes(wo.productName));
      if (!item) return prev;
      const product = prev.products.find(p => p.id === item.productId);
      if (!product) return prev;
      const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : product.variants[0];
      if (!variant?.routingId) return prev;
      const routing = prev.routings.find(r => r.id === variant.routingId);
      if (!routing) return prev;

      let plannedLaborCost = 0;
      const jobCards: JobCard[] = routing.steps.sort((a, b) => a.sequence - b.sequence).map(step => {
        const op = prev.operations.find(o => o.id === step.operationId);
        if (op) {
          if (op.costingMethod === 'fixed') {
            plannedLaborCost += (op.fixedLaborCost || 0);
          } else {
            const hours = (op.durationMinutes || 0) / 60;
            plannedLaborCost += hours * (op.laborCostPerHour || 0);
          }
        }
        return {
          id: `jc-${generateId()}`, workOrderId: woId, operationId: step.operationId,
          operationName: op?.name || 'Operasi', sequence: step.sequence,
          targetQty: 1, status: 'PENDING' as const, completedQty: 0, picName: '',
          plannedMinutes: op?.durationMinutes || 0,
        };
      });

      return { ...prev, workOrders: prev.workOrders.map(w => w.id === woId ? { ...w, jobCards, plannedLaborCost } : w) };
    });
  }, []);

  const addOperation = useCallback((op: Omit<ProductionOperation, 'id'>): string => {
    const id = `op-${generateId()}`;
    setState(prev => ({ ...prev, operations: [...prev.operations, { ...op, id }] }));
    return id;
  }, []);

  const updateOperation = useCallback((id: string, op: Partial<Omit<ProductionOperation, 'id'>>) => {
    setState(prev => ({ ...prev, operations: prev.operations.map(o => o.id === id ? { ...o, ...op } : o) }));
  }, []);

  const deleteOperation = useCallback((id: string) => {
    let success = true;
    setState(prev => {
      const isUsed = prev.routings.some(r => r.steps.some(s => s.operationId === id));
      if (isUsed) { success = false; return prev; }
      return { ...prev, operations: prev.operations.filter(o => o.id !== id) };
    });
    return success;
  }, []);

  const addRouting = useCallback((rt: Omit<ProductionRouting, 'id'>) => {
    setState(prev => ({ ...prev, routings: [...prev.routings, { ...rt, id: generateId() }] }));
  }, []);

  const updateRouting = useCallback((id: string, rt: Partial<Omit<ProductionRouting, 'id'>>) => {
    setState(prev => ({ ...prev, routings: prev.routings.map(r => r.id === id ? { ...r, ...rt } : r) }));
  }, []);

  const deleteRouting = useCallback((id: string) => {
    let success = true;
    setState(prev => {
      const isUsed = prev.products.some(p => p.variants.some(v => v.routingId === id));
      if (isUsed) { success = false; return prev; }
      return { ...prev, routings: prev.routings.filter(r => r.id !== id) };
    });
    return success;
  }, []);

  // ---- Delivery ----
  const createDeliveryOrder = useCallback((
    paramsOrSOId: string | {
      salesOrderIds: string[];
      selectedItems?: DeliveryOrderItem[];
      driverName: string;
      driverId?: string;
      driverPhone?: string;
      vehiclePlate: string;
      armadaId?: string;
      armadaName?: string;
      scheduledDate: string;
      notes?: string;
    },
    legacyDriverName?: string,
    legacyVehiclePlate?: string,
    legacyScheduledDate?: string
  ) => {
    setState(prev => {
      let salesOrderIds: string[] = [];
      let selectedItems: DeliveryOrderItem[] | undefined;
      let driverName = '';
      let driverId: string | undefined;
      let driverPhone: string | undefined;
      let vehiclePlate = '';
      let armadaId: string | undefined;
      let armadaName: string | undefined;
      let scheduledDate = new Date().toISOString().split('T')[0];
      let notes: string | undefined;

      if (typeof paramsOrSOId === 'string') {
        salesOrderIds = [paramsOrSOId];
        driverName = legacyDriverName || '';
        vehiclePlate = legacyVehiclePlate || '';
        scheduledDate = legacyScheduledDate || scheduledDate;
      } else {
        salesOrderIds = paramsOrSOId.salesOrderIds || [];
        selectedItems = paramsOrSOId.selectedItems;
        driverName = paramsOrSOId.driverName;
        driverId = paramsOrSOId.driverId;
        driverPhone = paramsOrSOId.driverPhone;
        vehiclePlate = paramsOrSOId.vehiclePlate;
        armadaId = paramsOrSOId.armadaId;
        armadaName = paramsOrSOId.armadaName;
        scheduledDate = paramsOrSOId.scheduledDate || scheduledDate;
        notes = paramsOrSOId.notes;
      }

      if (salesOrderIds.length === 0) return prev;

      const targetSOs = prev.salesOrders.filter(o => salesOrderIds.includes(o.id));
      if (targetSOs.length === 0) return prev;

      const existingTripNumbers = new Set(prev.deliveryOrders.map(d => d.tripNumber).filter(Boolean));
      const tripNumber = String(existingTripNumbers.size + 1);
      const tripId = `trip-${generateId()}`;
      const now = new Date().toISOString();

      const newDOs: DeliveryOrder[] = [];

      targetSOs.forEach(so => {
        const soSelectedItems = selectedItems && selectedItems.length > 0
          ? selectedItems.filter(si => si.orderId === so.id)
          : [];

        let itemsStringList: string[] = [];
        if (soSelectedItems.length > 0) {
          itemsStringList = soSelectedItems.map(
            i => `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.qty}`
          );
        } else {
          itemsStringList = so.items.map(
            i => `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''}${i.qty > 1 ? ` x${i.qty}` : ''}`
          );
        }

        const doIndex = prev.deliveryOrders.length + newDOs.length + 1;
        const doNumber = String(doIndex);

        const dOrder: DeliveryOrder = {
          id: generateId(),
          doNumber,
          tripId,
          tripNumber,
          salesOrderId: so.id,
          salesOrderNumber: so.orderNumber,
          salesOrderIds: [so.id],
          salesOrderNumbers: [so.orderNumber],
          customerName: so.customer.name,
          customerAddress: so.customer.address || '',
          items: itemsStringList,
          orderItems: soSelectedItems.length > 0 ? soSelectedItems : undefined,
          driverId,
          assignedDriverName: driverName,
          driverPhone,
          armadaId,
          armadaName,
          vehiclePlate,
          scheduledDate,
          status: 'READY_TO_SHIP',
          notes,
          createdAt: now,
          isReplacement: soSelectedItems.some(si => si.isReplacement),
          complaintId: soSelectedItems.find(si => si.complaintId)?.complaintId,
        };

        newDOs.push(dOrder);
      });

      // Update shippedQty for each regular SO item and mark complaint replacementStatus as SHIPPED
      let updatedSalesOrders = prev.salesOrders;
      if (selectedItems && selectedItems.length > 0) {
        updatedSalesOrders = prev.salesOrders.map(so => {
          if (!salesOrderIds.includes(so.id)) return so;
          const relevantItems = selectedItems!.filter(si => si.orderId === so.id);
          if (relevantItems.length === 0) return so;

          const regularItems = relevantItems.filter(si => !si.isReplacement);
          const replacementItems = relevantItems.filter(si => si.isReplacement && si.complaintId);

          const updatedItems = so.items.map((item, idx) => {
            const matchingItems = regularItems.filter(si =>
              si.itemIndex !== undefined
                ? si.itemIndex === idx
                : (
                    si.productName === item.productName &&
                    (si.variantLabel || '') === (item.variantLabel || '')
                  )
            );
            if (matchingItems.length > 0) {
              const addedQty = matchingItems.reduce((sum, mi) => sum + (mi.qty || 1), 0);
              return { ...item, shippedQty: (item.shippedQty || 0) + addedQty };
            }
            return item;
          });

          const updatedComplaints = (so.complaints || []).map(c => {
            if (replacementItems.some(ri => ri.complaintId === c.id)) {
              return { ...c, replacementStatus: 'SHIPPED' as const };
            }
            return c;
          });

          const updatedSO = { ...so, items: updatedItems, complaints: updatedComplaints };
          const newStatus = computeSOStatus(updatedSO);
          return { ...updatedSO, status: newStatus };
        });
      }

      return {
        ...prev,
        deliveryOrders: [...newDOs, ...prev.deliveryOrders],
        salesOrders: updatedSalesOrders,
      };
    });
  }, [nextDONumber]);

  const confirmLoadingDelivery = useCallback((deliveryOrderIdOrTripId: string, driverName?: string) => {
    setState(prev => {
      const matchingDO = prev.deliveryOrders.find(
        d => d.id === deliveryOrderIdOrTripId || d.tripId === deliveryOrderIdOrTripId
      );
      if (!matchingDO) return prev;

      const targetTripId = matchingDO.tripId;
      const now = new Date().toISOString();

      const updatedDOs = prev.deliveryOrders.map(d => {
        const isMatch = (targetTripId && d.tripId === targetTripId) || d.id === deliveryOrderIdOrTripId;
        if (isMatch && d.status !== 'DELIVERED') {
          return {
            ...d,
            status: 'IN_TRANSIT' as const,
            loadedAt: now,
            loadedBy: driverName || d.assignedDriverName,
          };
        }
        return d;
      });

      return {
        ...prev,
        deliveryOrders: updatedDOs,
      };
    });
  }, []);

  const confirmDelivery = useCallback((
    deliveryOrderId: string,
    proofData?: {
      receiverName?: string;
      proofNote?: string;
      proofPhoto?: string;
    } | string
  ) => {
    setState(prev => {
      const dOrder = prev.deliveryOrders.find(d => d.id === deliveryOrderId);
      if (!dOrder || dOrder.status === 'DELIVERED') return prev;

      let receiverName = '';
      let proofNote = '';
      let proofPhoto: string | undefined;

      if (typeof proofData === 'string') {
        proofNote = proofData;
        receiverName = dOrder.customerName || '';
      } else if (proofData) {
        receiverName = proofData.receiverName?.trim() || dOrder.customerName || '';
        proofNote = proofData.proofNote || '';
        proofPhoto = proofData.proofPhoto;
      } else {
        receiverName = dOrder.customerName || '';
      }

      const fullProofNote = proofNote
        ? (receiverName ? `Diterima oleh: ${receiverName}. ${proofNote}` : proofNote)
        : (receiverName ? `Diterima oleh: ${receiverName}. Barang lengkap dan tidak ada kerusakan.` : 'Barang lengkap dan tidak ada kerusakan.');

      const now = new Date().toISOString();

      const updatedDOs = prev.deliveryOrders.map(d =>
        d.id === deliveryOrderId
          ? {
            ...d,
            status: 'DELIVERED' as const,
            receiverName,
            deliveryProofNote: fullProofNote,
            deliveryProofPhoto: proofPhoto,
            deliveredAt: now,
          }
          : d
      );

      // Find all target sales order IDs
      const targetSOIds = dOrder.salesOrderIds && dOrder.salesOrderIds.length > 0
        ? dOrder.salesOrderIds
        : [dOrder.salesOrderId];

      // Item-level fulfillment: increment deliveredQty for each delivered item
      const deliveredItems = dOrder.orderItems || [];
      const updatedSOs = prev.salesOrders.map(so => {
        if (!targetSOIds.includes(so.id)) return so;
        if (deliveredItems.length > 0) {
          const relevantItems = deliveredItems.filter(di => di.orderId === so.id);
          if (relevantItems.length === 0) return so;

          const regularDeliveredItems = relevantItems.filter(di => !di.isReplacement);
          const replacementDeliveredItems = relevantItems.filter(di => di.isReplacement && di.complaintId);

          const updatedItems = so.items.map((item, idx) => {
            const matchingItems = regularDeliveredItems.filter(di =>
              di.itemIndex !== undefined
                ? di.itemIndex === idx
                : (
                    di.productName === item.productName &&
                    (di.variantLabel || '') === (item.variantLabel || '')
                  )
            );
            if (matchingItems.length > 0) {
              const addedQty = matchingItems.reduce((sum, mi) => sum + (mi.qty || 1), 0);
              return { ...item, deliveredQty: (item.deliveredQty || 0) + addedQty };
            }
            return item;
          });

          const updatedComplaints = (so.complaints || []).map(c => {
            if (replacementDeliveredItems.some(ri => ri.complaintId === c.id)) {
              return {
                ...c,
                status: 'SELESAI' as const,
                replacementStatus: 'DELIVERED' as const,
                resolvedAt: now,
              };
            }
            return c;
          });

          const updatedSO = { ...so, items: updatedItems, complaints: updatedComplaints };
          const newStatus = computeSOStatus(updatedSO);
          return {
            ...updatedSO,
            status: newStatus,
            deliveredAt: newStatus === 'SENT' ? (so.deliveredAt || now) : so.deliveredAt,
          };
        }
        // Fallback for legacy DOs without orderItems: mark fully delivered
        const updatedItems = so.items.map(item => ({
          ...item,
          deliveredQty: item.qty,
          shippedQty: Math.max(item.shippedQty || 0, item.qty),
        }));
        const updatedSO = { ...so, items: updatedItems };
        return { ...updatedSO, status: 'SENT' as const, deliveredAt: now };
      });

      let updatedInvoices = [...prev.invoices];
      let newJournalEntries = [...prev.journalEntries];

      // Only create invoice when SO becomes fully delivered (SENT) and NOT a replacement DO
      if (!dOrder.isReplacement) {
        for (const soId of targetSOIds) {
          const updatedSO = updatedSOs.find(o => o.id === soId);
          if (!updatedSO || updatedSO.status !== 'SENT') continue;

          const existingInv = updatedInvoices.find(i => i.salesOrderId === soId);
          if (!existingInv) {
            const originalSO = prev.salesOrders.find(o => o.id === soId);
            const newInvoice: Invoice = {
              id: generateId(),
              invoiceNumber: String(updatedInvoices.length + 1),
              salesOrderId: updatedSO.id,
              salesOrderNumber: updatedSO.orderNumber,
              salesName: updatedSO.createdBy,
              customerName: updatedSO.customer.name,
              totalAmount: updatedSO.totalAmount,
              paidAmount: 0,
              status: 'UNPAID',
              payments: [],
              issuedAt: now,
              createdAt: now,
            };
            updatedInvoices.push(newInvoice);
            const invJournal = createInvoiceIssuedJournal(newInvoice, newJournalEntries.length, now, prev.chartOfAccounts);
            newJournalEntries = [invJournal, ...newJournalEntries];
          }
        }
      }

      // Deduct delivered items from Finished Goods stock (both regular and replacement items)
      let updatedFinishedGoods = [...prev.finishedGoods];
      const newFGMovs: StockMovement[] = [];

      if (deliveredItems.length > 0) {
        deliveredItems.forEach(di => {
          const qty = di.qty || 1;
          const idx = updatedFinishedGoods.findIndex(fg =>
            (di.productId && fg.productId === di.productId && (di.variantLabel ? fg.variantLabel === di.variantLabel : true)) ||
            (fg.productName === di.productName && (di.variantLabel ? fg.variantLabel === di.variantLabel : true))
          );
          if (idx >= 0) {
            const currentFG = updatedFinishedGoods[idx];
            let remainingUnits = currentFG.units ? [...currentFG.units] : [];
            if (di.isReplacement && di.complaintId) {
              const uIdx = remainingUnits.findIndex(u => u.complaintId === di.complaintId);
              if (uIdx >= 0) remainingUnits.splice(uIdx, 1);
            } else {
              const uIdx = remainingUnits.findIndex(u => u.reservedForOrderId === di.orderId);
              if (uIdx >= 0) remainingUnits.splice(uIdx, 1);
            }

            updatedFinishedGoods[idx] = {
              ...currentFG,
              stock: Math.max(0, currentFG.stock - qty),
              units: remainingUnits,
            };
            newFGMovs.push({
              id: generateId(),
              materialId: currentFG.id,
              materialName: `${currentFG.productName}${currentFG.variantLabel ? ` (${currentFG.variantLabel})` : ''}`,
              type: 'OUT',
              qty,
              reference: `${dOrder.doNumber} (${di.isReplacement ? 'Penggantian Komplain Terkirim' : 'Pengiriman Selesai'})`,
              date: now,
              stockCategory: 'FINISHED',
            });
          }
        });
      }

      return {
        ...prev,
        finishedGoods: updatedFinishedGoods,
        stockMovements: newFGMovs.length > 0 ? [...newFGMovs, ...prev.stockMovements] : prev.stockMovements,
        deliveryOrders: updatedDOs,
        salesOrders: updatedSOs,
        invoices: updatedInvoices,
        journalEntries: newJournalEntries,
      };
    });
  }, []);

  const reportFailedDelivery = useCallback((
    deliveryOrderId: string,
    failureData: {
      reason: string;
      note?: string;
      photo?: string;
    }
  ) => {
    setState(prev => {
      const dOrder = prev.deliveryOrders.find(d => d.id === deliveryOrderId);
      if (!dOrder || dOrder.status === 'DELIVERED') return prev;

      const now = new Date().toISOString();
      const updatedDOs = prev.deliveryOrders.map(d =>
        d.id === deliveryOrderId
          ? {
              ...d,
              status: 'FAILED' as const,
              failureReason: failureData.reason,
              failureNote: failureData.note?.trim() || undefined,
              failurePhoto: failureData.photo || undefined,
              failedAt: now,
            }
          : d
      );

      // Rollback shippedQty on Sales Order items so they return to queue
      const targetSOIds = dOrder.salesOrderIds && dOrder.salesOrderIds.length > 0
        ? dOrder.salesOrderIds
        : [dOrder.salesOrderId];

      const failedItems = dOrder.orderItems || [];
      const updatedSOs = prev.salesOrders.map(so => {
        if (!targetSOIds.includes(so.id)) return so;

        if (failedItems.length > 0) {
          const relevantItems = failedItems.filter(di => di.orderId === so.id);
          if (relevantItems.length === 0) return so;

          const regularFailedItems = relevantItems.filter(di => !di.isReplacement);
          const replacementFailedItems = relevantItems.filter(di => di.isReplacement && di.complaintId);

          const updatedItems = so.items.map((item, idx) => {
            const matchingItems = regularFailedItems.filter(di =>
              di.itemIndex !== undefined
                ? di.itemIndex === idx
                : (
                    di.productName === item.productName &&
                    (di.variantLabel || '') === (item.variantLabel || '')
                  )
            );
            if (matchingItems.length > 0) {
              const failedQty = matchingItems.reduce((sum, mi) => sum + (mi.qty || 1), 0);
              return {
                ...item,
                shippedQty: Math.max(0, (item.shippedQty || 0) - failedQty),
              };
            }
            return item;
          });

          const updatedComplaints = (so.complaints || []).map(c => {
            if (replacementFailedItems.some(ri => ri.complaintId === c.id)) {
              return {
                ...c,
                replacementStatus: 'READY_FOR_DELIVERY' as const,
              };
            }
            return c;
          });

          const updatedSO = { ...so, items: updatedItems, complaints: updatedComplaints };
          const newStatus = computeSOStatus(updatedSO);
          return { ...updatedSO, status: newStatus };
        }

        // Fallback for legacy DOs without orderItems
        const updatedItems = so.items.map(item => ({
          ...item,
          shippedQty: 0,
        }));
        const updatedSO = { ...so, items: updatedItems };
        const newStatus = computeSOStatus(updatedSO);
        return { ...updatedSO, status: newStatus };
      });

      return {
        ...prev,
        deliveryOrders: updatedDOs,
        salesOrders: updatedSOs,
      };
    });
  }, []);

  // ---- Finance & Banking ----
  const recordPayment = useCallback((invoiceId: string, amount: number, bankAccountId: string, note: string) => {
    setState(prev => {
      const invoice = prev.invoices.find(i => i.id === invoiceId);
      if (!invoice) return prev;

      const bankAccount = prev.bankAccounts.find(ba => ba.id === bankAccountId);
      const methodName = bankAccount ? bankAccount.name : 'Kas';

      const now = new Date().toISOString();
      const newPayment: Payment = {
        id: generateId(),
        amount,
        method: methodName,
        date: now,
        note,
        confirmedBy: currentUser.name,
      };

      const newPaidAmount = invoice.paidAmount + amount;
      const isPaidFull = newPaidAmount >= invoice.totalAmount;
      const newStatus = isPaidFull ? ('PAID' as const) : ('PARTIAL' as const);

      const updatedInvoices = prev.invoices.map(i =>
        i.id === invoiceId
          ? { ...i, paidAmount: newPaidAmount, status: newStatus, payments: [...i.payments, newPayment] }
          : i
      );

      const updatedSOs = isPaidFull
        ? prev.salesOrders.map(o =>
          o.id === invoice.salesOrderId
            ? { ...o, paidAt: now }
            : o
        )
        : prev.salesOrders;

      const updatedBankAccounts = prev.bankAccounts.map(ba =>
        ba.id === bankAccountId
          ? { ...ba, balance: ba.balance + amount }
          : ba
      );

      const payJournal = createInvoicePaymentJournal(
        invoice,
        amount,
        methodName,
        prev.journalEntries.length,
        note,
        now,
        prev.chartOfAccounts
      );

      return {
        ...prev,
        invoices: updatedInvoices,
        salesOrders: updatedSOs,
        bankAccounts: updatedBankAccounts,
        journalEntries: [payJournal, ...prev.journalEntries],
      };
    });
  }, [currentUser.name]);

  const recordExpense = useCallback((category: Expense['category'], amount: number, bankAccountId: string, note?: string) => {
    setState(prev => {
      const bankAccount = prev.bankAccounts.find(ba => ba.id === bankAccountId);
      if (!bankAccount) return prev;

      const now = new Date().toISOString();
      const newExpense: Expense = {
        id: generateId(),
        category,
        amount,
        date: now,
        bankAccountId,
        note
      };

      const updatedBankAccounts = prev.bankAccounts.map(ba =>
        ba.id === bankAccountId
          ? { ...ba, balance: ba.balance - amount }
          : ba
      );

      const expJournal = createExpenseJournal(
        newExpense,
        bankAccount.name,
        prev.journalEntries.length,
        now,
        prev.chartOfAccounts
      );

      return {
        ...prev,
        expenses: [newExpense, ...prev.expenses],
        bankAccounts: updatedBankAccounts,
        journalEntries: [expJournal, ...prev.journalEntries],
      };
    });
  }, []);

  const recordOtherIncome = useCallback((accountCode: string, accountName: string, amount: number, bankAccountId: string, note?: string) => {
    setState(prev => {
      const bankAccount = prev.bankAccounts.find(ba => ba.id === bankAccountId);
      if (!bankAccount) return prev;

      const now = new Date().toISOString();
      const newIncome: OtherIncome = {
        id: generateId(),
        accountCode,
        accountName,
        amount,
        date: now,
        bankAccountId,
        note,
      };

      const updatedBankAccounts = prev.bankAccounts.map(ba =>
        ba.id === bankAccountId
          ? { ...ba, balance: ba.balance + amount }
          : ba
      );

      const inflowJournal = createCashInflowJournal(
        newIncome,
        bankAccount.name,
        prev.journalEntries.length,
        now,
        prev.chartOfAccounts
      );

      return {
        ...prev,
        otherIncomes: [newIncome, ...prev.otherIncomes],
        bankAccounts: updatedBankAccounts,
        journalEntries: [inflowJournal, ...prev.journalEntries],
      };
    });
  }, []);

  const paySupplierPO = useCallback((purchaseOrderId: string, bankAccountId: string) => {
    setState(prev => {
      const po = prev.purchaseOrders.find(p => p.id === purchaseOrderId);
      if (!po || po.paymentStatus === 'PAID') return prev;

      const bankAccount = prev.bankAccounts.find(ba => ba.id === bankAccountId);
      if (!bankAccount) return prev;

      const now = new Date().toISOString();
      const updatedPOs = prev.purchaseOrders.map(p =>
        p.id === purchaseOrderId
          ? { ...p, paymentStatus: 'PAID' as const, bankAccountId, paidAt: now }
          : p
      );

      const updatedBankAccounts = prev.bankAccounts.map(ba =>
        ba.id === bankAccountId
          ? { ...ba, balance: ba.balance - po.totalAmount }
          : ba
      );

      const poPayJournal = createPOPaymentJournal(
        po,
        bankAccount.name,
        prev.journalEntries.length,
        now,
        prev.chartOfAccounts
      );

      return {
        ...prev,
        purchaseOrders: updatedPOs,
        bankAccounts: updatedBankAccounts,
        journalEntries: [poPayJournal, ...prev.journalEntries],
      };
    });
  }, []);

  const addManualJournal = useCallback((description: string, lines: Omit<JournalEntryLine, 'accountName'>[], date?: string) => {
    setState(prev => {
      const now = date || new Date().toISOString();
      const journal = createManualJournal(description, lines, prev.journalEntries.length, now, prev.chartOfAccounts);
      return {
        ...prev,
        journalEntries: [journal, ...prev.journalEntries],
      };
    });
  }, []);

  const closePeriod = useCallback((totalRevenue: number, totalCOGS: number, totalExpense: number, date?: string) => {
    setState(prev => {
      const now = date || new Date().toISOString();
      const journal = createClosingJournal(totalRevenue, totalCOGS, totalExpense, prev.journalEntries.length, now, prev.chartOfAccounts);
      return {
        ...prev,
        journalEntries: [journal, ...prev.journalEntries],
      };
    });
  }, []);

  const distributeDividend = useCallback((amount: number, bankAccountId: string, date?: string) => {
    setState(prev => {
      const bankAccount = prev.bankAccounts.find(ba => ba.id === bankAccountId);
      if (!bankAccount) return prev;

      const now = date || new Date().toISOString();

      const updatedBankAccounts = prev.bankAccounts.map(ba =>
        ba.id === bankAccountId
          ? { ...ba, balance: ba.balance - amount }
          : ba
      );

      const dividendJournal = createDividendJournal(amount, bankAccountId, prev.journalEntries.length, now, prev.chartOfAccounts);

      return {
        ...prev,
        bankAccounts: updatedBankAccounts,
        journalEntries: [dividendJournal, ...prev.journalEntries],
      };
    });
  }, []);

  const addAccount = useCallback((account: Omit<AccountCode, 'id'>) => {
    setState(prev => {
      const newAccount: AccountCode = {
        id: `acc-${generateId()}`,
        ...account,
      };
      // Insert in a smart position: after its parent, or at the end
      return {
        ...prev,
        chartOfAccounts: [...prev.chartOfAccounts, newAccount],
      };
    });
  }, []);

  const updateAccount = useCallback((id: string, account: Partial<Omit<AccountCode, 'id'>>) => {
    setState(prev => ({
      ...prev,
      chartOfAccounts: prev.chartOfAccounts.map(acc => acc.id === id ? { ...acc, ...account } : acc),
    }));
  }, []);

  const deleteAccount = useCallback((id: string): { success: boolean; reason?: string } => {
    let result: { success: boolean; reason?: string } = { success: true };
    setState(prev => {
      const acc = prev.chartOfAccounts.find(a => a.id === id);
      if (!acc) {
        result = { success: false, reason: 'Akun tidak ditemukan.' };
        return prev;
      }

      // Check if it's a default core system account
      if (acc.isSystem) {
        result = {
          success: false,
          reason: `Akun "${acc.code} - ${acc.name}" merupakan Akun Sistem Bawaan yang bersifat permanen dan tidak boleh dihapus pada bentuk perusahaan apapun.`
        };
        return prev;
      }

      // Check if used in journal entries
      const isUsedInJournal = prev.journalEntries.some(j =>
        j.lines.some(line => line.accountId === id || line.accountCode === acc.code)
      );

      if (isUsedInJournal) {
        result = {
          success: false,
          reason: `Akun "${acc.code} - ${acc.name}" sudah memiliki riwayat transaksi/penjurnalan sehingga tidak dapat dihapus.`
        };
        return prev;
      }

      // Check if it's a parent to other accounts
      const isParent = prev.chartOfAccounts.some(a => a.parentId === id);

      if (isParent) {
        result = {
          success: false,
          reason: `Akun "${acc.code} - ${acc.name}" merupakan Akun Induk (Header) yang masih memiliki sub-akun/anak akun di bawahnya.`
        };
        return prev;
      }

      return {
        ...prev,
        chartOfAccounts: prev.chartOfAccounts.filter(a => a.id !== id),
      };
    });
    return result;
  }, []);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    setState(prev => {
      const newAccount: BankAccount = {
        id: `ba-${generateId()}`,
        ...account,
      };

      const newJournalEntries = [...prev.journalEntries];
      if (newAccount.balance > 0) {
        const openingJournal = createOpeningBalanceJournal(newAccount, prev.journalEntries.length, new Date().toISOString(), prev.chartOfAccounts);
        newJournalEntries.unshift(openingJournal);
      }

      return {
        ...prev,
        bankAccounts: [...prev.bankAccounts, newAccount],
        journalEntries: newJournalEntries,
      };
    });
  }, []);

  const updateBankAccount = useCallback((id: string, account: Partial<Omit<BankAccount, 'id'>>) => {
    setState(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(ba => ba.id === id ? { ...ba, ...account } : ba),
    }));
  }, []);

  const deleteBankAccount = useCallback((id: string): boolean => {
    let success = true;
    setState(prev => {
      const ba = prev.bankAccounts.find(b => b.id === id);
      if (!ba) {
        success = false;
        return prev;
      }
      // Check if this bank account is used in any transactions
      // 1. Invoices payments
      const isUsedInInvoices = prev.invoices.some(inv =>
        inv.payments.some(pay => pay.method === ba.name)
      );
      // 2. Expenses
      const isUsedInExpenses = prev.expenses.some(exp => exp.bankAccountId === id);
      // 3. Purchase Orders
      const isUsedInPOs = prev.purchaseOrders.some(po => po.bankAccountId === id);
      // 4. Other Incomes
      const isUsedInOtherIncomes = prev.otherIncomes?.some(inc => inc.bankAccountId === id);
      // 5. Bank Transfers
      const isUsedInTransfers = prev.journalEntries.some(j =>
        j.sourceType === 'BANK_TRANSFER' && j.sourceId && j.sourceId.split('-').includes(id)
      );
      // 6. Dividends
      const isUsedInDividends = prev.journalEntries.some(j =>
        j.sourceType === 'DIVIDEND' && j.sourceId === id
      );

      if (isUsedInInvoices || isUsedInExpenses || isUsedInPOs || isUsedInOtherIncomes || isUsedInTransfers || isUsedInDividends) {
        success = false;
        return prev;
      }

      return {
        ...prev,
        bankAccounts: prev.bankAccounts.filter(b => b.id !== id),
        journalEntries: prev.journalEntries.filter(j => !(j.sourceType === 'OPENING_BALANCE' && j.sourceId === id)),
      };
    });
    return success;
  }, []);

  const transferBankFunds = useCallback((fromAccountId: string, toAccountId: string, amount: number, note?: string): boolean => {
    let success = false;
    setState(prev => {
      const fromBank = prev.bankAccounts.find(b => b.id === fromAccountId);
      const toBank = prev.bankAccounts.find(b => b.id === toAccountId);
      if (!fromBank || !toBank || fromBank.id === toBank.id || amount <= 0 || fromBank.balance < amount) {
        return prev;
      }
      success = true;
      const now = new Date().toISOString();
      const transferJournal = createBankTransferJournal(fromBank, toBank, amount, prev.journalEntries.length, note, now, prev.chartOfAccounts);
      const updatedBankAccounts = prev.bankAccounts.map(b => {
        if (b.id === fromAccountId) return { ...b, balance: b.balance - amount };
        if (b.id === toAccountId) return { ...b, balance: b.balance + amount };
        return b;
      });
      return {
        ...prev,
        bankAccounts: updatedBankAccounts,
        journalEntries: [transferJournal, ...prev.journalEntries],
      };
    });
    return success;
  }, []);

  // ---- Dynamic Form Builder ----
  const updateOrderFormConfiguration = useCallback((newConfig: FormContainer[]) => {
    setState(prev => ({
      ...prev,
      orderFormConfiguration: newConfig
    }));
  }, []);

  const setShowAllOrdersTab = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      showAllOrdersTab: show,
    }));
  }, []);

  const setIsCustomOrderFormEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      isCustomOrderFormEnabled: enabled,
    }));
  }, []);

  // ---- Reset ----
  const resetData = useCallback(() => {
    const fresh = getDefaultState();
    setState(fresh);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ---- HPP Projection for Pending Orders ----
  const getPendingOrderEstHPP = useCallback((salesOrderId: string): { estMaterialCost: number; estLaborCost: number; totalEstHPP: number } | null => {
    const order = state.salesOrders.find(o => o.id === salesOrderId);
    if (!order || order.status !== 'PENDING') return null;

    let estMaterialCost = 0;
    let estLaborCost = 0;

    order.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (!product) return;
      const variant = item.variantId
        ? product.variants.find(v => v.id === item.variantId)
        : product.variants[0];
      if (!variant) return;

      const routing = variant.routingId ? state.routings.find(r => r.id === variant.routingId) : null;

      for (let unit = 1; unit <= item.qty; unit++) {
        const unitCustom = item.unitCustomProcesses?.find(u => u.unitIndex === unit);
        const isUnitCustomized = unitCustom ? unitCustom.isBomCustomized : item.isBomCustomized;
        const unitCustomBom = unitCustom?.isBomCustomized ? unitCustom.customBom : (item.isBomCustomized ? item.customBom : undefined);
        const unitCustomOps = unitCustom?.isBomCustomized
          ? (unitCustom.customOperations || unitCustom.customOperationIds)
          : (item.isBomCustomized ? (item.customOperations || item.customOperationIds) : undefined);

        if (isUnitCustomized && unitCustomBom) {
          unitCustomBom.forEach(b => {
            const mat = state.materials.find(m => m.id === b.materialId);
            const fg = !mat ? state.finishedGoods.find(f => f.id === b.materialId) : null;
            if (mat) {
              estMaterialCost += (mat.unitCost || 0) * b.qty;
            } else if (fg) {
              const prod = state.products.find(p => p.id === fg.productId);
              const variant = prod?.variants.find(v => v.id === fg.variantId) || prod?.variants[0];
              const estCost = variant?.price ? variant.price * 0.6 : 0;
              estMaterialCost += estCost * b.qty;
            }
          });
        } else {
          // Estimate material cost from variant BOM
          variant.bom.forEach(b => {
            const mat = state.materials.find(m => m.id === b.materialId);
            estMaterialCost += (mat?.unitCost || 0) * b.qty;
          });

          // Estimate material cost from selected modifiers BOM
          if (item.selectedModifiers) {
            item.selectedModifiers.forEach(group => {
              group.selectedOptions.forEach(opt => {
                opt.bom.forEach(b => {
                  const mat = state.materials.find(m => m.id === b.materialId);
                  estMaterialCost += (mat?.unitCost || 0) * b.qty;
                });
              });
            });
          }
        }

        // Estimate labor cost from routing or custom operations
        if (isUnitCustomized && unitCustomOps && unitCustomOps.length > 0) {
          let laborForUnit = 0;
          unitCustomOps.forEach((opItem: any) => {
            const opId = typeof opItem === 'string' ? opItem : opItem.operationId;
            const customOp = typeof opItem === 'object' ? opItem : undefined;
            const op = state.operations.find(o => o.id === opId);
            if (!op) return;
            const costingMethod = customOp?.costingMethod ?? op.costingMethod ?? 'fixed';
            const fixedCost = customOp?.fixedLaborCost !== undefined ? customOp.fixedLaborCost : (op.fixedLaborCost || 0);
            const hourlyRate = customOp?.laborCostPerHour !== undefined ? customOp.laborCostPerHour : (op.laborCostPerHour || 0);
            const duration = customOp?.durationMinutes !== undefined ? customOp.durationMinutes : (op.durationMinutes || 0);

            if (costingMethod === 'fixed') {
              laborForUnit += fixedCost;
            } else {
              const hours = duration / 60;
              laborForUnit += hours * hourlyRate;
            }
          });
          estLaborCost += laborForUnit;
        } else if (routing) {
          let laborForUnit = 0;
          routing.steps.forEach(step => {
            const op = state.operations.find(o => o.id === step.operationId);
            if (!op) return;
            if (op.costingMethod === 'fixed') {
              laborForUnit += op.fixedLaborCost || 0;
            } else {
              const hours = (op.durationMinutes || 0) / 60;
              laborForUnit += hours * (op.laborCostPerHour || 0);
            }
          });
          estLaborCost += laborForUnit;
        }
      }
    });

    return { estMaterialCost, estLaborCost, totalEstHPP: estMaterialCost + estLaborCost };
  }, [state.salesOrders, state.products, state.materials, state.routings, state.operations]);

  const addBomTemplate = useCallback((template: Omit<BOMTemplate, 'id'>, items: { materialId: string; defaultQty: number }[]) => {
    setState(prev => {
      const templateId = `tmpl-${generateId()}`;
      const newTemplate: BOMTemplate = {
        id: templateId,
        ...template,
      };
      const newItems: BOMTemplateItem[] = items.map(item => ({
        id: `bti-${generateId()}`,
        templateId,
        materialId: item.materialId,
        defaultQty: item.defaultQty,
      }));

      return {
        ...prev,
        bomTemplates: [...prev.bomTemplates, newTemplate],
        bomTemplateItems: [...prev.bomTemplateItems, ...newItems],
      };
    });
  }, []);

  const updateBomTemplate = useCallback((id: string, template: Partial<Omit<BOMTemplate, 'id'>>, items?: { materialId: string; defaultQty: number }[]) => {
    setState(prev => {
      const nextTemplates = prev.bomTemplates.map(t => t.id === id ? { ...t, ...template } : t);
      let nextItems = prev.bomTemplateItems;

      if (items) {
        const filtered = prev.bomTemplateItems.filter(item => item.templateId !== id);
        const newItems: BOMTemplateItem[] = items.map(item => ({
          id: `bti-${generateId()}`,
          templateId: id,
          materialId: item.materialId,
          defaultQty: item.defaultQty,
        }));
        nextItems = [...filtered, ...newItems];
      }

      return {
        ...prev,
        bomTemplates: nextTemplates,
        bomTemplateItems: nextItems,
      };
    });
  }, []);

  const deleteBomTemplate = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      bomTemplates: prev.bomTemplates.filter(t => t.id !== id),
      bomTemplateItems: prev.bomTemplateItems.filter(item => item.templateId !== id),
    }));
  }, []);

  const setStrictSOStockCheck = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      strictSOStockCheck: enabled,
    }));
  }, []);

  const contextValue: AppContextType = {
    ...state,
    currentUser,
    isLoggedIn,
    switchUser,
    logout,
    login,
    cloneTemplateToVariant,
    updateVariantBomItem,
    removeVariantBomItem,
    addVariantBomItem,
    getVariantBom,
    addProduct,
    updateProduct,
    deleteProduct,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    addAttributeValue,
    removeAttributeValue,
    addModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
    setMasterModifierGroups,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    reorderMaterialCategories,
    finishedGoods: state.finishedGoods,
    addFinishedGood,
    updateFinishedGood,
    deleteFinishedGood,
    adjustFinishedGoodStock,
    addProductCategory,
    deleteProductCategory,
    addAssetCategory,
    updateAssetCategory,
    deleteAssetCategory,
    reorderAssetCategories,
    addAsset,
    updateAsset,
    deleteAsset,
    canDeleteAsset,
    recordAssetService,
    deleteAssetServiceLog,

    createPO,
    createDirectPurchase,
    receivePO,
    orderPO,
    rejectPO,
    cancelPO,
    cancelRemainingPO,
    deletePO,
    createSalesOrder,
    updateSalesOrder,
    updateOrderCustomProcess,
    processOrder,
    cancelOrder,
    submitOrderComplaint,
    resolveOrderComplaint,
    rejectOrderComplaint,
    manuallyResolveComplaint,
    returnedGoods: state.returnedGoods || [],
    confirmReceiveReturnedGood,
    processReturnedGoodAction,
    allocateFinishedGoodToOrder,
    updateJobCardProgress,
    startJobCard,
    pauseJobCard,
    completeJobCard,
    createSubAssemblyWorkOrder,
    createNormalWorkOrder,
    cancelWorkOrder,
    syncWorkOrderRouting,
    addOperation,
    updateOperation,
    deleteOperation,
    addRouting,
    updateRouting,
    deleteRouting,
    addOperator,
    updateOperator,
    deleteOperator,
    createDeliveryOrder,
    confirmLoadingDelivery,
    confirmDelivery,
    reportFailedDelivery,
    recordPayment,
    recordExpense,
    recordOtherIncome,
    paySupplierPO,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    transferBankFunds,
    addManualJournal,
    closePeriod,
    distributeDividend,

    addAccount,
    updateAccount,
    deleteAccount,

    addBomTemplate,
    updateBomTemplate,
    deleteBomTemplate,

    addArmada,
    updateArmada,
    deleteArmada,
    addDriver,
    updateDriver,
    deleteDriver,
    addShippingRate,
    updateShippingRate,
    deleteShippingRate,
    deleteShippingRatesByRegency,
    setIsShippingRateEnabled,

    getProduct,
    getMaterial,
    updateOrderFormConfiguration,
    showAllOrdersTab: state.showAllOrdersTab ?? false,
    setShowAllOrdersTab,
    strictSOStockCheck: state.strictSOStockCheck ?? true,
    setStrictSOStockCheck,
    isCustomOrderFormEnabled: state.isCustomOrderFormEnabled ?? false,
    setIsCustomOrderFormEnabled,
    resetData,
    getPendingOrderEstHPP,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
