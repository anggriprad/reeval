import type {
  RawMaterial,
  Product,
  ProductionOperation,
  ProductionRouting,
  SalesOrder,
  WorkOrder,
  PurchaseOrder,
  StockMovement,
  DeliveryOrder,
  Invoice,
  CompanyAsset,
  CompanyAssetServiceLog,
  AssetDepreciation,
  ProductModifierGroup,
  ProductionOperator,
  BankAccount,
  Expense,
  AccountCode,
  JournalEntry,
  AttributeMaster,
  BOMTemplate,
  BOMTemplateItem,
  VariantBOM,
  Armada,
  Driver,
  FinishedGoodStock,
  ReturnedGood,
} from './types';
import { DEFAULT_CHART_OF_ACCOUNTS } from './accounting';

// ========================================
// BLANK SLATE INITIAL DATA
// ========================================

export const initialOperations: ProductionOperation[] = [];
export const initialRoutings: ProductionRouting[] = [];
export const initialOperators: ProductionOperator[] = [];
export const initialMaterials: RawMaterial[] = [];
export const initialAttributes: AttributeMaster[] = [];
export const initialProducts: Product[] = [];
export const initialProductCategories: string[] = [];
export const initialBomTemplates: BOMTemplate[] = [];
export const initialBomTemplateItems: BOMTemplateItem[] = [];
export const initialVariantBoms: VariantBOM[] = [];
export const initialSalesOrders: SalesOrder[] = [];
export const initialWorkOrders: WorkOrder[] = [];
export const initialPurchaseOrders: PurchaseOrder[] = [];
export const initialStockMovements: StockMovement[] = [];
export const initialFinishedGoods: FinishedGoodStock[] = [];
export const initialReturnedGoods: ReturnedGood[] = [];
export const initialArmadas: Armada[] = [
  { id: 'arm-1', name: 'Engkel Box', plateNumber: 'B 1234 CD' },
  { id: 'arm-2', name: 'Grand Max Blind Van', plateNumber: 'B 5678 EF' },
  { id: 'arm-3', name: 'L300 Pickup', plateNumber: 'B 9012 GH' },
];
export const initialDrivers: Driver[] = [
  { id: 'drv-1', name: 'Hasan Basri', phone: '081234567890' },
  { id: 'drv-2', name: 'Budi Santoso', phone: '081298765432' },
  { id: 'drv-3', name: 'Asep Supriyatna', phone: '081211223344' },
];
export const initialDeliveryOrders: DeliveryOrder[] = [];
export const initialInvoices: Invoice[] = [];
export const initialAssets: CompanyAsset[] = [];
export const initialAssetServiceLogs: CompanyAssetServiceLog[] = [];
export const initialAssetDepreciations: AssetDepreciation[] = [];
export const initialModifierGroups: ProductModifierGroup[] = [];
export const initialBankAccounts: BankAccount[] = [];
export const initialExpenses: Expense[] = [];
export const initialChartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS;
export const initialJournalEntries: JournalEntry[] = [];
export const initialCategories: string[] = [];
export const initialAssetCategories: string[] = [];

