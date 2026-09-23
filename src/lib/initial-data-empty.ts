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
export const initialArmadas: Armada[] = [];
export const initialDrivers: Driver[] = [];
export const initialDeliveryOrders: DeliveryOrder[] = [];
export const initialInvoices: Invoice[] = [];
export const initialAssets: CompanyAsset[] = [];
export const initialAssetServiceLogs: CompanyAssetServiceLog[] = [];
export const initialModifierGroups: ProductModifierGroup[] = [];
export const initialBankAccounts: BankAccount[] = [];
export const initialExpenses: Expense[] = [];
export const initialChartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS;
export const initialJournalEntries: JournalEntry[] = [];
export const initialCategories: string[] = [];
export const initialAssetCategories: string[] = [];

