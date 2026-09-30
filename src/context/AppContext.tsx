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
  OrderStatus,
  JobCard,
  Customer,
  CompanyAsset,
  CompanyAssetServiceLog,
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
  createBankTransferJournal,
  createCashInflowJournal,
  createManualJournal,
  createClosingJournal,
  createDividendJournal,
} from '@/lib/accounting';
import { generateId, calculateSubAssemblyCost, syncFinishedGoodsWithProducts } from '@/lib/utils';
import { DEFAULT_USER_ID, getUserById, USER_ACCOUNTS, UserAccount } from '@/lib/roles';

const STORAGE_KEY = 'reeval-erp-state-v16'; // v16: Default to populated initial-data with Bahan Setengah Jadi Multi-Level BOM

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
  deleteProduct: (id: string) => boolean;

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
  deleteMaterial: (id: string) => boolean;
  addMaterialCategory: (category: string) => void;
  updateMaterialCategory: (oldCategory: string, newCategory: string) => void;
  deleteMaterialCategory: (category: string) => boolean;
  reorderMaterialCategories: (categories: string[]) => void;

  // Finished Goods CRUD
  finishedGoods: FinishedGoodStock[];
  addFinishedGood: (fg: Omit<FinishedGoodStock, 'id'>) => void;
  updateFinishedGood: (id: string, fg: Partial<FinishedGoodStock>) => void;
  deleteFinishedGood: (id: string) => boolean;
  adjustFinishedGoodStock: (productId: string, variantId: string | undefined, delta: number, reference: string) => void;

  // Product Category CRUD
  addProductCategory: (category: string) => void;
  deleteProductCategory: (category: string) => boolean;

  // Assets CRUD
  addAsset: (asset: Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>) => void;
  updateAsset: (id: string, asset: Partial<Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>>) => void;
  deleteAsset: (id: string) => boolean;
  addAssetCategory: (category: string) => void;
  updateAssetCategory: (oldCategory: string, newCategory: string) => void;
  deleteAssetCategory: (category: string) => boolean;
  reorderAssetCategories: (categories: string[]) => void;
  recordAssetService: (log: Omit<CompanyAssetServiceLog, 'id'>) => void;
  deleteAssetServiceLog: (id: string) => void;


  // Inventory / PO / Pengadaan
  createPO: (supplier: string, items: PurchaseOrderItem[]) => void;
  createDirectPurchase: (supplier: string, items: PurchaseOrderItem[], bankAccountId: string, additionalCost?: number) => void;
  receivePO: (poId: string) => void;
  orderPO: (poId: string) => void;
  rejectPO: (poId: string, reason?: string) => { success: boolean; error?: string };
  deletePO: (poId: string) => boolean;

  // Sales & Order Lifecycle
  createSalesOrder: (customer: Customer, items: SalesOrderItem[], orderNotes?: string, shippingCost?: number) => string;
  updateSalesOrder: (orderId: string, customer: Customer, items: SalesOrderItem[], orderNotes?: string, shippingCost?: number) => void;
  processOrder: (orderId: string) => { success: boolean; error?: string };
  cancelOrder: (orderId: string, cancelReason: string) => void;
  submitOrderComplaint: (orderId: string, complaint: Omit<OrderComplaint, 'id' | 'status' | 'createdAt'>) => void;
  resolveOrderComplaint: (orderId: string, complaintId: string, resolution: 'Batalkan Pesanan (Refund)' | 'Kirim Barang Pengganti' | 'Perbaikan', resolutionNotes?: string, refundBankAccountId?: string) => void;

  // Barang Retur
  returnedGoods: ReturnedGood[];
  processReturnedGoodAction: (returnId: string, action: ReturnedGoodAction, notes?: string) => void;

  // Production
  updateJobCardProgress: (workOrderId: string, jobCardId: string, completedQty: number, picName: string) => void;
  startJobCard: (workOrderId: string, jobCardId: string) => void;
  pauseJobCard: (workOrderId: string, jobCardId: string) => void;
  completeJobCard: (workOrderId: string, jobCardId: string, completedQty: number, picName: string, actualMinutes?: number, operatorId?: string) => { success: boolean; error?: string };
  createSubAssemblyWorkOrder: (subAssemblyId: string, targetQty: number) => { success: boolean; error?: string };
  syncWorkOrderRouting: (workOrderId: string) => void;
  addOperation: (op: Omit<ProductionOperation, 'id'>) => void;
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
    proofData: {
      receiverName: string;
      proofNote?: string;
      proofPhoto?: string;
    } | string
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
    id: 'container-notes',
    title: 'Catatan Pesanan',
    order: 1,
    fields: [
      { id: 'field-order-notes', label: '', type: 'textarea', isRequired: false, placeholder: 'Tambahkan catatan untuk pesanan ini', order: 0 }
    ]
  },
  {
    id: 'container-customer',
    title: 'Informasi Pelanggan',
    order: 2,
    fields: [
      { id: 'field-customer-name', label: 'Nama Pelanggan', type: 'text', isRequired: true, order: 0 },
      { id: 'field-customer-phone', label: 'Nomor Telepon', type: 'number', isRequired: true, order: 1 },
      { id: 'field-customer-address', label: 'Alamat Lengkap', type: 'textarea', isRequired: true, order: 2 },
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
        salesOrders: (saved.salesOrders || getDefaultState().salesOrders)
          .map(so => {
            if (!so.complaints || so.complaints.length === 0) return so;
            return {
              ...so,
              complaints: so.complaints.map(cmp => {
                if (cmp.attachments && cmp.attachments.length > 0) return cmp;
                const initSo = initialSalesOrders.find(iso => iso.id === so.id);
                const initCmp = initSo?.complaints?.find(ic => ic.id === cmp.id);
                if (initCmp?.attachments && initCmp.attachments.length > 0) {
                  return { ...cmp, attachments: initCmp.attachments };
                }
                return cmp;
              })
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        assets: saved.assets || structuredClone(initialAssets),
        assetServiceLogs: saved.assetServiceLogs || structuredClone(initialAssetServiceLogs),
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
    const productWithId = { id, ...product } as Product;
    const variants = (product.variants && product.variants.length > 0)
      ? product.variants
      : generateVariantsFromRules(productWithId, state.materials);

    const newVariantBoms: VariantBOM[] = variants.map(v => ({
      variantId: v.id,
      items: (v.bom || []).map(b => ({ materialId: b.materialId, qty: b.qty })),
    }));

    setState(prev => {
      const nextProducts = [{ ...productWithId, variants }, ...prev.products];
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
  }, [state.materials]);

  const updateProduct = useCallback((id: string, product: Partial<Omit<Product, 'id'>>) => {
    setState(prev => {
      const existingProduct = prev.products.find(p => p.id === id);
      if (!existingProduct) return prev;

      const merged = { ...existingProduct, ...product } as Product;
      const variants = (product.variants && product.variants.length > 0)
        ? product.variants
        : generateVariantsFromRules(merged, prev.materials, existingProduct.variants);

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

  const deleteProduct = useCallback((id: string): boolean => {
    let canDelete = true;
    setState(prev => {
      const usedInSO = prev.salesOrders.some(so => so.items.some(i => i.productId === id));
      if (usedInSO) { canDelete = false; return prev; }
      const nextProducts = prev.products.filter(p => p.id !== id);
      return {
        ...prev,
        products: nextProducts,
        finishedGoods: syncFinishedGoodsWithProducts(nextProducts, prev.finishedGoods),
      };
    });
    return canDelete;
  }, []);

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
    const year = new Date().getFullYear();
    const count = state.salesOrders.length + 1;
    return `SO-${year}-${String(count).padStart(3, '0')}`;
  }, [state.salesOrders.length]);

  const nextPONumber = useCallback(() => {
    const year = new Date().getFullYear();
    const count = state.purchaseOrders.length + 1;
    return `PO-${year}-${String(count).padStart(3, '0')}`;
  }, [state.purchaseOrders.length]);

  const nextDONumber = useCallback(() => {
    const year = new Date().getFullYear();
    const count = state.deliveryOrders.length + 1;
    return `DO-${year}-${String(count).padStart(3, '0')}`;
  }, [state.deliveryOrders.length]);

  // ── Finished Goods CRUD ──────────────────────────────────────────────────
  const addFinishedGood = useCallback((fg: Omit<FinishedGoodStock, 'id'>) => {
    setState(prev => ({
      ...prev,
      finishedGoods: [
        { ...fg, id: `fg-${crypto.randomUUID().slice(0, 8)}` },
        ...prev.finishedGoods,
      ],
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

  const deleteFinishedGood = useCallback((id: string): boolean => {
    let deleted = false;
    setState(prev => {
      const exists = prev.finishedGoods.find(fg => fg.id === id);
      if (!exists) return prev;
      deleted = true;
      const isCatalog = prev.products.some(p => p.id === exists.productId);
      if (isCatalog) {
        return {
          ...prev,
          finishedGoods: prev.finishedGoods.map(fg => fg.id === id ? { ...fg, stock: 0, minStock: 0 } : fg),
        };
      }
      return {
        ...prev,
        finishedGoods: prev.finishedGoods.filter(fg => fg.id !== id),
      };
    });
    return deleted;
  }, []);

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
      ...material,
    };
    setState(prev => ({ ...prev, materials: [newMaterial, ...prev.materials] }));
  }, []);

  const updateMaterial = useCallback((id: string, material: Partial<RawMaterial>) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => (m.id === id ? { ...m, ...material } : m)),
    }));
  }, []);

  const deleteMaterial = useCallback((id: string): boolean => {
    let canDelete = true;
    setState(prev => {
      // Check if material is referenced in any SPK (workOrders) or purchaseOrders items
      const usedInSPK = prev.workOrders.some(wo => wo.materialsConsumed.some(mc => mc.materialId === id));
      const usedInPO = prev.purchaseOrders.some(po => po.items.some(pi => pi.materialId === id));
      if (usedInSPK || usedInPO) {
        canDelete = false;
        return prev;
      }
      return {
        ...prev,
        materials: prev.materials.filter(m => m.id !== id),
      };
    });
    return canDelete;
  }, []);

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
  const addAsset = useCallback((asset: Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>) => {
    const id = `ast-${generateId()}`;
    const monthlyDepreciation = asset.purchaseCost / (asset.usefulLifeYears * 12);
    const newAsset: CompanyAsset = {
      id,
      ...asset,
      accumulatedServiceCost: 0,
      monthlyDepreciation,
    };
    setState(prev => ({ ...prev, assets: [newAsset, ...prev.assets] }));
  }, []);

  const updateAsset = useCallback((id: string, asset: Partial<Omit<CompanyAsset, 'id' | 'monthlyDepreciation' | 'accumulatedServiceCost'>>) => {
    setState(prev => ({
      ...prev,
      assets: prev.assets.map(a => {
        if (a.id === id) {
          const merged = { ...a, ...asset };
          const monthlyDepreciation = merged.purchaseCost / (merged.usefulLifeYears * 12);
          return { ...merged, monthlyDepreciation };
        }
        return a;
      }),
    }));
  }, []);

  const deleteAsset = useCallback((id: string): boolean => {
    setState(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a.id !== id),
      assetServiceLogs: prev.assetServiceLogs.filter(l => l.assetId !== id),
    }));
    return true;
  }, []);

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
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po || po.status === 'REJECTED') {
        result = { success: false, error: 'Pengadaan tidak ditemukan atau sudah dibatalkan.' };
        return prev;
      }

      const wasReceived = po.status === 'RECEIVED' || po.purchaseType === 'DIRECT';
      const now = new Date().toISOString();

      let updatedMaterials = prev.materials;
      let updatedMovements = prev.stockMovements;
      let updatedBankAccounts = prev.bankAccounts;
      let newJournals: JournalEntry[] = [];

      if (wasReceived) {
        // Stock Safety Check: Check if any material stock is less than poItem.qty
        const insufficientMat = po.items.find(poItem => {
          const mat = prev.materials.find(m => m.id === poItem.materialId);
          return !mat || mat.stock < poItem.qty;
        });

        if (insufficientMat) {
          const matObj = prev.materials.find(m => m.id === insufficientMat.materialId);
          const currentQty = matObj ? matObj.stock : 0;
          result = {
            success: false,
            error: `Gagal membatalkan. Stok "${insufficientMat.materialName}" saat ini tersisa ${currentQty} ${insufficientMat.unit || 'unit'}, kurang dari ${insufficientMat.qty} unit pada PO. Bahan baku ini sebagian telah dikonsumsi oleh SPK produksi.`,
          };
          return prev;
        }

        // Deduct material stock that was previously added
        updatedMaterials = prev.materials.map(m => {
          const poItem = po.items.find(i => i.materialId === m.id);
          if (poItem) {
            return { ...m, stock: Math.max(0, parseFloat((m.stock - poItem.qty).toFixed(4))) };
          }
          return m;
        });

        // Add cancellation stock movement
        const cancelMovements: StockMovement[] = po.items.map(item => ({
          id: generateId(),
          materialId: item.materialId,
          materialName: item.materialName,
          type: 'OUT' as const,
          qty: item.qty,
          reference: `Batal ${po.poNumber}`,
          date: now,
        }));
        updatedMovements = [...cancelMovements, ...prev.stockMovements];

        // Refund cash if it was direct purchase & create reversal journal
        if (po.purchaseType === 'DIRECT' && po.bankAccountId) {
          updatedBankAccounts = prev.bankAccounts.map(b =>
            b.id === po.bankAccountId ? { ...b, balance: b.balance + po.totalAmount } : b
          );
          const revJournal = createReversalDirectPurchaseJournal(
            po,
            prev.journalEntries.length,
            reason,
            now,
            prev.chartOfAccounts
          );
          newJournals.push(revJournal);
        } else {
          const revJournal = createReversalPOReceivedJournal(
            po,
            prev.journalEntries.length,
            reason,
            now,
            prev.chartOfAccounts
          );
          newJournals.push(revJournal);
        }
      }

      const currentUser = getUserById(prev.currentUserId || DEFAULT_USER_ID);

      return {
        ...prev,
        materials: updatedMaterials,
        stockMovements: updatedMovements,
        bankAccounts: updatedBankAccounts,
        journalEntries: [...newJournals, ...prev.journalEntries],
        purchaseOrders: prev.purchaseOrders.map(p =>
          p.id === poId
            ? {
              ...p,
              status: 'REJECTED' as const,
              cancelReason: reason?.trim() || undefined,
              cancelledBy: currentUser.name,
              cancelledAt: now,
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

  const receivePO = useCallback((poId: string) => {
    setState(prev => {
      const po = prev.purchaseOrders.find(p => p.id === poId);
      if (!po || po.status === 'RECEIVED') return prev;

      const now = new Date().toISOString();
      const newMaterials = prev.materials.map(m => {
        const poItem = po.items.find(i => i.materialId === m.id);
        if (poItem) return { ...m, stock: parseFloat((m.stock + poItem.qty).toFixed(4)) };
        return m;
      });

      const newMovements: StockMovement[] = po.items.map(item => ({
        id: generateId(),
        materialId: item.materialId,
        materialName: item.materialName,
        type: 'IN' as const,
        qty: item.qty,
        reference: po.poNumber,
        date: now,
      }));

      const poJournal = createPOReceivedJournal(po, prev.journalEntries.length, now, prev.chartOfAccounts);

      return {
        ...prev,
        materials: newMaterials,
        purchaseOrders: prev.purchaseOrders.map(p =>
          p.id === poId ? { ...p, status: 'RECEIVED' as const, receivedAt: now } : p
        ),
        stockMovements: [...prev.stockMovements, ...newMovements],
        journalEntries: [poJournal, ...prev.journalEntries],
      };
    });
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
        const newComplaint: OrderComplaint = {
          ...complaint,
          id: `CMP-${Date.now()}`,
          status: 'DIAJUKAN',
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
    resolution: 'Batalkan Pesanan (Refund)' | 'Kirim Barang Pengganti' | 'Perbaikan',
    resolutionNotes?: string,
    refundBankAccountId?: string
  ) => {
    setState(prev => {
      const targetOrder = prev.salesOrders.find(o => o.id === orderId);
      if (!targetOrder || !targetOrder.complaints) return prev;

      const complaint = targetOrder.complaints.find(c => c.id === complaintId);
      if (!complaint) return prev;

      const now = new Date().toISOString();
      const isRefund = resolution === 'Batalkan Pesanan (Refund)';
      const refundAmount = isRefund
        ? (complaint.items || []).reduce((sum, item) => {
            const price = (item.unitPrice && item.unitPrice > 0)
              ? item.unitPrice
              : (targetOrder.items.find(oi => oi.productId === item.productId)?.unitPrice ?? 0);
            return sum + (price * item.qty);
          }, 0)
        : 0;

      // 1. Update Sales Order totalAmount & complaint status
      const newOrderTotal = isRefund ? Math.max(0, targetOrder.totalAmount - refundAmount) : targetOrder.totalAmount;
      const updatedSOs = prev.salesOrders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          totalAmount: newOrderTotal,
          complaints: (o.complaints || []).map(c =>
            c.id === complaintId
              ? { ...c, status: 'SELESAI' as const, resolution, resolutionNotes, resolvedAt: now }
              : c
          ),
        };
      });

      // 3. Masukkan item komplain refund ke inventaris Barang Retur
      let updatedReturnedGoods = [...(prev.returnedGoods || [])];
      if (isRefund) {
        const newReturnItems: ReturnedGood[] = (complaint.items || []).map((ci, idx) => {
          const soItem = targetOrder.items.find(oi => oi.productId === ci.productId);
          return {
            id: `ret-${Date.now()}-${idx}`,
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
            status: 'PENDING' as const,
          };
        });
        updatedReturnedGoods = [...newReturnItems, ...updatedReturnedGoods];
      }

      if (!isRefund || refundAmount <= 0) {
        return {
          ...prev,
          salesOrders: updatedSOs,
          returnedGoods: updatedReturnedGoods,
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
  }, [currentUser.name]);

  const processReturnedGoodAction = useCallback((
    returnId: string,
    action: ReturnedGoodAction,
    notes?: string
  ) => {
    setState(prev => {
      const item = (prev.returnedGoods || []).find(rg => rg.id === returnId);
      if (!item || item.status !== 'PENDING') return prev;

      const now = new Date().toISOString();
      let updatedFinishedGoods = [...prev.finishedGoods];
      let updatedMaterials = [...prev.materials];
      let updatedMovements = [...prev.stockMovements];

      if (action === 'RESTOCK') {
        // Masuk kembali ke stok barang jadi
        const fgIndex = updatedFinishedGoods.findIndex(
          fg => fg.productId === item.productId && (!item.variantId || fg.variantId === item.variantId)
        );
        let fgName = item.productName + (item.variantLabel ? ` (${item.variantLabel})` : '');
        let fgId = '';

        if (fgIndex >= 0) {
          updatedFinishedGoods[fgIndex] = {
            ...updatedFinishedGoods[fgIndex],
            stock: updatedFinishedGoods[fgIndex].stock + item.qty,
          };
          fgId = updatedFinishedGoods[fgIndex].id;
        } else {
          const newFG: FinishedGoodStock = {
            id: `fg-${Date.now()}`,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
            stock: item.qty,
            minStock: 0,
            unit: 'unit',
          };
          updatedFinishedGoods = [newFG, ...updatedFinishedGoods];
          fgId = newFG.id;
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
        const variant = product?.variants.find(v => v.id === item.variantId);
        const bomItems = variant?.bom || [];

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
      };

      const updatedReturnedGoods = (prev.returnedGoods || []).map(rg =>
        rg.id === returnId
          ? {
              ...rg,
              status: statusMap[action],
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

  const processOrder = useCallback((orderId: string): { success: boolean; error?: string } => {
    const order = state.salesOrders.find(o => o.id === orderId);
    if (!order || order.status !== 'PENDING') {
      return { success: false, error: 'Order not found or not in PENDING state.' };
    }

    // Check all materials required
    const allMaterialsNeeded = new Map<string, number>();

    order.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (!product) return;
      const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : product.variants[0];
      if (!variant) return;

      variant.bom.forEach(b => {
        allMaterialsNeeded.set(b.materialId, (allMaterialsNeeded.get(b.materialId) || 0) + (b.qty * item.qty));
      });

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        item.selectedModifiers.forEach(group => {
          group.selectedOptions.forEach(opt => {
            opt.bom.forEach(b => {
              allMaterialsNeeded.set(b.materialId, (allMaterialsNeeded.get(b.materialId) || 0) + (b.qty * item.qty));
            });
          });
        });
      }
    });

    // Calculate active reserved demand for Sub-Assemblies from active uncompleted Product WOs
    const activeReservedSubAssemblyMap = new Map<string, number>();
    state.workOrders
      .filter(w => w.status !== 'COMPLETED' && !w.isSubAssembly)
      .forEach(w => {
        w.materialsConsumed.forEach(b => {
          const mat = state.materials.find(m => m.id === b.materialId);
          if (mat?.isSubAssembly) {
            activeReservedSubAssemblyMap.set(b.materialId, (activeReservedSubAssemblyMap.get(b.materialId) || 0) + b.qty);
          }
        });
      });

    // Verify stock (with MRP Bahan Setengah Jadi auto-expansion or strict mode check)
    for (const [matId, qtyNeeded] of allMaterialsNeeded.entries()) {
      const mat = state.materials.find(m => m.id === matId);
      if (!mat) {
        return { success: false, error: `Bahan baku tidak ditemukan: ${matId}.` };
      }

      if (state.strictSOStockCheck) {
        if (mat.stock < qtyNeeded) {
          return {
            success: false,
            error: `Stok ${mat.isSubAssembly ? 'bahan setengah jadi' : 'bahan baku'} "${mat.name}" tidak mencukupi. Stok tersedia: ${mat.stock} ${mat.unit}, kebutuhan: ${qtyNeeded} ${mat.unit}.`,
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

    const now = new Date().toISOString();

    setState(prev => {
      const newWorkOrders: WorkOrder[] = [];
      const newMovements: StockMovement[] = [];
      const subAssemblyDemands: { subMat: RawMaterial; deficit: number }[] = [];

      const updatedMaterialsMap = new Map<string, RawMaterial>(prev.materials.map(m => [m.id, { ...m }]));

      for (const [matId, qtyNeeded] of allMaterialsNeeded.entries()) {
        const mat = updatedMaterialsMap.get(matId);
        if (!mat) continue;

        if (prev.strictSOStockCheck) {
          newMovements.push({
            id: generateId(),
            materialId: mat.id,
            materialName: mat.name,
            type: 'OUT',
            qty: qtyNeeded,
            date: now,
            reference: `SO-${order.orderNumber}`,
          });
          mat.stock = parseFloat((mat.stock - qtyNeeded).toFixed(4));
        } else if (mat.isSubAssembly) {
          const reservedQty = activeReservedSubAssemblyMap.get(matId) || 0;
          const availableEffective = Math.max(0, mat.stock - reservedQty);
          const deficit = Math.max(0, qtyNeeded - availableEffective);
          if (deficit > 0) {
            subAssemblyDemands.push({ subMat: mat, deficit });
          }
        } else {
          newMovements.push({
            id: generateId(),
            materialId: mat.id,
            materialName: mat.name,
            type: 'OUT',
            qty: qtyNeeded,
            date: now,
            reference: `SO-${order.orderNumber}`,
          });
          mat.stock = parseFloat((mat.stock - qtyNeeded).toFixed(4));
        }
      }

      // Process subAssemblyDemands: deduct child raw materials & create Bahan Setengah Jadi Work Orders
      subAssemblyDemands.forEach(({ subMat, deficit }) => {
        const childBom = subMat.childBom || [];

        childBom.forEach(child => {
          const childQtyNeeded = child.qty * deficit;
          const childMat = updatedMaterialsMap.get(child.materialId);
          if (childMat) {
            childMat.stock = parseFloat((childMat.stock - childQtyNeeded).toFixed(4));
            newMovements.push({
              id: generateId(),
              materialId: childMat.id,
              materialName: childMat.name,
              type: 'OUT',
              qty: childQtyNeeded,
              date: now,
              reference: `SO-${order.orderNumber} (Child BOM ${subMat.code})`,
            });
          }
        });

        const woId = `wo-sa-${generateId()}`;
        const spkNumber = `SPK-SA-${String(prev.workOrders.length + newWorkOrders.length + 1).padStart(4, '0')}`;
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
          variantName: `${deficit} ${subMat.unit} (Bahan Setengah Jadi Otomatis SO-${order.orderNumber})`,
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

          const jobCards: JobCard[] = routing ? routing.steps.sort((a, b) => a.sequence - b.sequence).map(step => {
            const op = prev.operations.find(o => o.id === step.operationId);
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
              plannedMinutes: op?.durationMinutes || 0,
            };
          }) : [];

          let plannedLaborCost = 0;
          if (routing) {
            routing.steps.forEach(step => {
              const op = prev.operations.find(o => o.id === step.operationId);
              if (!op) return;
              if (op.costingMethod === 'fixed') {
                plannedLaborCost += (op.fixedLaborCost || 0);
              } else {
                const hours = (op.durationMinutes || 0) / 60;
                plannedLaborCost += hours * (op.laborCostPerHour || 0);
              }
            });
          }

          let materialCost = 0;
          const materialsConsumed: { materialId: string; qty: number }[] = [];

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

          const spkNum = `SPK-${order.orderNumber}-${spkCounter}`;
          spkCounter++;

          newWorkOrders.push({
            id: woId,
            spkNumber: spkNum,
            salesOrderId: order.id,
            salesOrderNumber: order.orderNumber,
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
            isCustom: item.isCustom || false,
            customNotes: item.customNotes,
          });
        }
      });

      return {
        ...prev,
        materials: Array.from(updatedMaterialsMap.values()),
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
            }
            : o
        ),
      };
    });

    return { success: true };
  }, [state, currentUser.name]);

  // ---- Production ----

  // Helper: update WO status and check SO completion / Bahan Setengah Jadi stock mutation
  // Compute SO status based on item-level fulfillment counters
  const computeSOStatus = (so: SalesOrder): OrderStatus => {
    if (so.status === 'CANCELED') return 'CANCELED';
    if (so.status === 'PENDING') return 'PENDING';

    const items = so.items;
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const totalDelivered = items.reduce((s, i) => s + (i.deliveredQty || 0), 0);
    const totalShipped = items.reduce((s, i) => s + (i.shippedQty || 0), 0);
    const totalProduced = items.reduce((s, i) => s + (i.producedQty || 0), 0);

    if (totalDelivered >= totalQty) return 'SENT';
    if (totalShipped > 0) return 'PARTIALLY_SHIPPED';
    if (totalProduced >= totalQty) return 'READY';
    if (totalProduced > 0) return 'PARTIALLY_READY';
    return 'PROCESSING';
  };

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

          // If manual internal Bahan Setengah Jadi WO, deduct Child BOM raw materials
          if (targetWO.salesOrderId === 'INTERNAL-SA') {
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
                reference: targetWO.spkNumber,
                date: now,
              });
            });
          }

          updatedMovements = [...newMovements, ...updatedMovements];
        }
      }
      // 2. Product WO completion: Deduct consumed Bahan Setengah Jadi stock (Stock OUT) & update SO status
      else if (!targetWO.isSubAssembly && prevWO && prevWO.status !== 'COMPLETED') {
        const saMaterialsMap = new Map<string, number>();
        targetWO.materialsConsumed.forEach(b => {
          const mat = prev.materials.find(m => m.id === b.materialId);
          if (mat?.isSubAssembly) {
            saMaterialsMap.set(b.materialId, (saMaterialsMap.get(b.materialId) || 0) + b.qty);
          }
        });

        if (saMaterialsMap.size > 0) {
          const newMovements: StockMovement[] = [];
          updatedMaterials = updatedMaterials.map(m => {
            const consumedQty = saMaterialsMap.get(m.id);
            if (consumedQty) {
              return { ...m, stock: parseFloat((m.stock - consumedQty).toFixed(4)) };
            }
            return m;
          });

          saMaterialsMap.forEach((qty, matId) => {
            const saMat = prev.materials.find(m => m.id === matId);
            newMovements.push({
              id: generateId(),
              materialId: matId,
              materialName: saMat?.name || matId,
              type: 'OUT',
              qty,
              reference: `${targetWO.spkNumber} (Penggunaan Bahan Setengah Jadi)`,
              date: now,
            });
          });

          updatedMovements = [...newMovements, ...updatedMovements];
        }

        // Item-level fulfillment: increment producedQty for the matching SO item
        const soId = targetWO.salesOrderId;
        updatedFinishedGoods = prev.finishedGoods;
        const matchingSO = prev.salesOrders.find(s => s.id === soId);
        const matchingSOItem = matchingSO?.items.find(item =>
          targetWO.productName === item.productName ||
          targetWO.productName.includes(item.productName) ||
          item.productName.includes(targetWO.productName)
        );

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
          if (so.id !== soId) return so;
          // Find matching SO item by productName
          const updatedItems = so.items.map(item => {
            const isMatch = targetWO.productName === item.productName ||
              targetWO.productName.includes(item.productName) ||
              item.productName.includes(targetWO.productName);
            if (isMatch && (item.producedQty || 0) < item.qty) {
              return { ...item, producedQty: (item.producedQty || 0) + 1 };
            }
            return item;
          });
          const updatedSO = { ...so, items: updatedItems };
          return { ...updatedSO, status: computeSOStatus(updatedSO) };
        });
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

  const createSubAssemblyWorkOrder = useCallback((subAssemblyId: string, targetQty: number) => {
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

      // Check stock availability
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

      const woId = `wo-sa-${generateId()}`;
      const spkNumber = `SPK-SA-${String(prev.workOrders.length + 1).padStart(4, '0')}`;
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
        variantName: `${targetQty} ${subMat.unit} (Bahan Setengah Jadi)`,
        status: 'PENDING',
        jobCards,
        materialsConsumed,
        materialCost,
        plannedLaborCost,
        actualLaborCost: 0,
        issuedAt: now,
        isCustom: false,
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

  const addOperation = useCallback((op: Omit<ProductionOperation, 'id'>) => {
    setState(prev => ({ ...prev, operations: [...prev.operations, { ...op, id: generateId() }] }));
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

      const year = new Date().getFullYear();
      const existingTripNumbers = new Set(prev.deliveryOrders.map(d => d.tripNumber).filter(Boolean));
      const tripNumber = `KLT-${year}-${String(existingTripNumbers.size + 1).padStart(3, '0')}`;
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
        const doNumber = `DO-${year}-${String(doIndex).padStart(3, '0')}`;

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
        };

        newDOs.push(dOrder);
      });

      // Update shippedQty for each SO item included in this delivery
      let updatedSalesOrders = prev.salesOrders;
      if (selectedItems && selectedItems.length > 0) {
        updatedSalesOrders = prev.salesOrders.map(so => {
          if (!salesOrderIds.includes(so.id)) return so;
          const relevantItems = selectedItems!.filter(si => si.orderId === so.id);
          if (relevantItems.length === 0) return so;
          const updatedItems = so.items.map((item, idx) => {
            const matchingItems = relevantItems.filter(si =>
              si.itemIndex === idx || (
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
          const updatedSO = { ...so, items: updatedItems };
          return { ...updatedSO, status: computeSOStatus(updatedSO) };
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
    proofData: {
      receiverName: string;
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
        receiverName = 'Penerima di Lokasi';
      } else {
        receiverName = proofData.receiverName || '';
        proofNote = proofData.proofNote || '';
        proofPhoto = proofData.proofPhoto;
      }

      const fullProofNote = proofNote
        ? `Diterima oleh: ${receiverName}. ${proofNote}`
        : `Diterima oleh: ${receiverName}. Barang lengkap dan tidak ada kerusakan.`;

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
          const updatedItems = so.items.map((item, idx) => {
            const matchingItems = relevantItems.filter(di =>
              di.itemIndex === idx || (
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
          const updatedSO = { ...so, items: updatedItems };
          const newStatus = computeSOStatus(updatedSO);
          return {
            ...updatedSO,
            status: newStatus,
            deliveredAt: newStatus === 'SENT' ? now : so.deliveredAt,
          };
        }
        // Fallback for legacy DOs without orderItems: mark fully delivered
        return { ...so, status: 'SENT' as const, deliveredAt: now };
      });

      let updatedInvoices = [...prev.invoices];
      let newJournalEntries = [...prev.journalEntries];

      // Only create invoice when SO becomes fully delivered (SENT)
      for (const soId of targetSOIds) {
        const updatedSO = updatedSOs.find(o => o.id === soId);
        if (!updatedSO || updatedSO.status !== 'SENT') continue;

        const existingInv = updatedInvoices.find(i => i.salesOrderId === soId);
        if (!existingInv) {
          const originalSO = prev.salesOrders.find(o => o.id === soId);
          const newInvoice: Invoice = {
            id: generateId(),
            invoiceNumber: `INV-${new Date().getFullYear()}-${String(updatedInvoices.length + 1).padStart(3, '0')}`,
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

      // Deduct delivered items from Finished Goods stock
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
            updatedFinishedGoods[idx] = {
              ...updatedFinishedGoods[idx],
              stock: Math.max(0, updatedFinishedGoods[idx].stock - qty),
            };
            newFGMovs.push({
              id: generateId(),
              materialId: updatedFinishedGoods[idx].id,
              materialName: `${updatedFinishedGoods[idx].productName}${updatedFinishedGoods[idx].variantLabel ? ` (${updatedFinishedGoods[idx].variantLabel})` : ''}`,
              type: 'OUT',
              qty,
              reference: `${dOrder.doNumber} (Pengiriman Selesai)`,
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

      // Estimate material cost from variant BOM
      variant.bom.forEach(b => {
        const mat = state.materials.find(m => m.id === b.materialId);
        estMaterialCost += (mat?.unitCost || 0) * b.qty * item.qty;
      });

      // Estimate material cost from selected modifiers BOM
      if (item.selectedModifiers) {
        item.selectedModifiers.forEach(group => {
          group.selectedOptions.forEach(opt => {
            opt.bom.forEach(b => {
              const mat = state.materials.find(m => m.id === b.materialId);
              estMaterialCost += (mat?.unitCost || 0) * b.qty * item.qty;
            });
          });
        });
      }

      // Estimate labor cost from routing (per unit x qty)
      const routing = variant.routingId ? state.routings.find(r => r.id === variant.routingId) : null;
      if (routing) {
        let laborPerUnit = 0;
        routing.steps.forEach(step => {
          const op = state.operations.find(o => o.id === step.operationId);
          if (!op) return;
          if (op.costingMethod === 'fixed') {
            laborPerUnit += op.fixedLaborCost || 0;
          } else {
            const hours = (op.durationMinutes || 0) / 60;
            laborPerUnit += hours * (op.laborCostPerHour || 0);
          }
        });
        estLaborCost += laborPerUnit * item.qty;
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
    recordAssetService,
    deleteAssetServiceLog,

    createPO,
    createDirectPurchase,
    receivePO,
    orderPO,
    rejectPO,
    deletePO,
    createSalesOrder,
    updateSalesOrder,
    processOrder,
    cancelOrder,
    submitOrderComplaint,
    resolveOrderComplaint,
    returnedGoods: state.returnedGoods || [],
    processReturnedGoodAction,
    updateJobCardProgress,
    startJobCard,
    pauseJobCard,
    completeJobCard,
    createSubAssemblyWorkOrder,
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
    strictSOStockCheck: state.strictSOStockCheck ?? false,
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
