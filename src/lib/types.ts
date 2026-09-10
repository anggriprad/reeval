// ========================================
// Reeval ERP — Core Type Definitions
// ========================================

// --- Enums ---

export type OrderStatus =
  | 'PENDING'    // Menunggu (Order masuk)
  | 'PROCESSING' // Diproses (Admin memproses & SPK dibuat)
  | 'READY'      // Siap Kirim (Semua SPK selesai)
  | 'SENT'       // Terkirim (Delivery selesai, invoice terbentuk)
  | 'CANCELED';  // Dibatalkan

export type SPKStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED';

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type POStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'REJECTED';

export type StockMovementType = 'IN' | 'OUT';

export type DeliveryStatus = 'PENDING' | 'DELIVERED';

// --- Dynamic Form Builder Types ---

export type FormFieldType = 'text' | 'number' | 'textarea' | 'product_list' | 'date' | 'dropdown' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  isRequired: boolean;
  placeholder?: string;
  options?: string[]; // Used for dropdown, radio, checkbox
  order: number;
}

export interface FormContainer {
  id: string;
  title: string;
  order: number;
  fields: FormField[];
}

// --- Raw Material ---

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  stock: number;
  minStock: number;
}

// --- BOM (Bill of Materials) Item ---

export interface BOMItem {
  materialId: string;
  qty: number;
}

// --- Attribute Master (Global) ---

export interface AttributeMaster {
  id: string;
  name: string;          // e.g. "Ukuran", "Bahan Cover", "Ketebalan"
  values: string[];      // e.g. ["120x200 cm", "160x200 cm", "180x200 cm"]
}

// --- Product Attribute (Product-level reference to global attribute) ---

export interface ProductAttribute {
  attributeId: string;         // references AttributeMaster.id
  selectedValues: string[];    // subset of AttributeMaster.values relevant to this product
}

// --- Variant Types (derived/compat) ---

export interface VariantType {
  name: string;     // e.g. "Warna", "Ukuran"
  values: string[]; // e.g. ["Hitam", "Putih", "Abu"]
}

export interface ProductVariantSKU {
  id: string;
  sku: string;
  combination: Record<string, string>; // { "Warna": "Hitam", "Ukuran": "M" }
  price: number;
  estimatedHours: number;
  bom: BOMItem[];
  presetId?: string;      // ID of Master Preset BOM template
  isCustomBOM?: boolean;  // false = Inherit live from Master Preset; true = Custom overridden BOM
  routingId?: string;  // referensi ke ProductionRouting
  isActive: boolean;
}

// --- Dynamic Pricing: Pricing Rules ---

export interface PricingRuleCondition {
  attribute: string;                   // attribute name, e.g. "Ukuran"
  operator: 'IN' | '==' | '!=' | 'ANY';
  value: string | string[];            // single value or array for IN operator
}

export interface PricingRule {
  id: string;
  label: string;                       // description, e.g. "Surcharge ukuran besar"
  conditions: PricingRuleCondition[];  // AND logic — all must match
  surchargeAmount: number;             // price adjustment (can be negative for discount)
  isActive: boolean;
}

// --- Reusable BOM Templates (Preset BOM) & Variant-Level Overrides ---

export interface BOMTemplate {
  id: string;
  name: string;
  description?: string;
}

export interface BOMTemplateItem {
  id: string;
  templateId: string;
  materialId: string;
  defaultQty: number;
}

export interface VariantBOMItem {
  materialId: string;
  qty: number;
}

export interface VariantBOM {
  variantId: string;
  items: VariantBOMItem[];
}

// Legacy conditional types (kept for compatibility)
export interface BOMTemplateCondition {
  attribute: string;
  operator: 'IN' | '==' | '!=' | 'ANY';
  value: string | string[];
}

// --- Production: Operation Master ---

export interface ProductionOperation {
  id: string;
  name: string;            // e.g., 'Potong Kayu Rangka'
  costingMethod?: 'hourly' | 'fixed'; // 'hourly' = waktu, 'fixed' = borongan. Default ke 'fixed'
  durationMinutes?: number; // durasi standar per unit (opsional)
  laborCostPerHour?: number; // tarif upah / jam (jika hourly)
  fixedLaborCost?: number; // Nominal upah borongan jika costingMethod = 'fixed'
  description?: string;
}

// --- Production: Routing ---

export interface RoutingStep {
  sequence: number;    // urutan ke-1, ke-2, ...
  operationId: string; // referensi ke ProductionOperation
}

export interface ProductionRouting {
  id: string;
  name: string;           // e.g., 'Alur Standar Dipan'
  steps: RoutingStep[];   // langkah-langkah berurutan
}

export interface ProductionOperator {
  id: string;
  name: string;
  roleSpecialization?: string; // e.g. "Potong", "Rakit", "Finishing", "Upholstery", "Umum"
  status: 'ACTIVE' | 'INACTIVE';
}


// --- Modifier Types ---

export interface ProductModifierOption {
  id: string;
  name: string;
  additionalPrice: number;
  bom: BOMItem[];
}

export interface ProductModifierGroup {
  id: string;
  name: string; // e.g. "Add-on"
  selectType: 'SINGLE' | 'MULTI';
  options: ProductModifierOption[];
}

export interface SelectedModifierOption {
  optionId: string;
  name: string;
  additionalPrice: number;
  bom: BOMItem[];
}

export interface SelectedModifierGroup {
  groupId: string;
  groupName: string;
  selectedOptions: SelectedModifierOption[];
}

// --- Product ---

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;             // Dynamic category string
  imageIcon: string;

  // --- Dynamic Pricing & BOM Engine ---
  useFormulaPricing?: boolean;            // Toggles formula-based pricing
  useFormulaBOM?: boolean;                // Toggles formula-based BOM
  variantTypes?: VariantType[];
  productAttributes?: ProductAttribute[];  // Which attributes apply to this product
  basePrice?: number;                      // Base price before surcharges
  pricingRules?: PricingRule[];            // Conditional surcharge rules
  bomTemplates?: any[];                    // Legacy conditional material list
  defaultRoutingId?: string;              // Default production routing for all variants
  defaultEstimatedHours?: number;         // Default estimated hours per unit

  // --- Auto-generated (cache from resolver, NOT manually edited) ---
  variants: ProductVariantSKU[];          // Auto-populated from resolver

  // --- Modifiers ---
  modifierGroupIds?: string[];
}

// --- Customer ---

export interface Customer {
  name: string;
  phone: string;
  address: string;
}

// --- Sales Order Item ---

export interface SalesOrderItem {
  productId: string;
  variantId?: string;       // ID of the specific ProductVariantSKU selected
  productName: string;      // Pure product title
  variantLabel?: string;    // Variant attribute sub-line (e.g. "Ukuran: 160x200 cm • Cover: Midili")
  qty: number;
  unitPrice: number;
  selectedModifiers?: SelectedModifierGroup[];
  isCustom: boolean;
  customNotes?: string;
}

// --- Sales Order ---

export interface SalesOrder {
  id: string;
  orderNumber: string;
  createdBy: string;        // Name of sales who created this order
  customer: Customer;
  items: SalesOrderItem[];
  status: OrderStatus;
  totalAmount: number;
  shippingCost?: number;
  orderNotes?: string;      // Optional overall order notes
  cancelReason?: string;    // Mandatory note when order is canceled
  cancelledByRole?: string; // Role label of user who canceled (e.g. "admin" | "sales")
  createdAt: string;
  submittedAt?: string;     // When sales submitted to admin
  confirmedAt?: string;     // When admin approved
  spkIssuedAt?: string;     // When admin issued SPK
  salesPhone?: string;     // Phone of sales for contact (e.g. 6281234567890)
  updatedAt?: string;      // Last update timestamp (ISO)
  updatedBy?: string;      // Name/role of user who last updated this order
  deliveredAt?: string;
  paidAt?: string;
  adminNotes?: string;      // Admin notes on review
}

export interface JobCard {
  id: string;
  workOrderId: string;
  operationId: string;
  operationName: string;
  sequence: number;              // urutan langkah (dari routing)
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  targetQty: number;
  completedQty: number;
  operatorId?: string;
  picName?: string;
  startedAt?: string;            // waktu mulai kerja (ISO)
  completedAt?: string;          // waktu selesai kerja (ISO)
  actualMinutes?: number;        // durasi aktual (menit)
  plannedMinutes: number;        // durasi standar (dari operasi master)
}

export interface WorkOrder {
  id: string;
  spkNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  productName: string;
  variantName?: string;
  selectedModifiers?: SelectedModifierGroup[];
  status: SPKStatus;
  jobCards: JobCard[];
  materialsConsumed: BOMItem[];
  materialCost: number;
  plannedLaborCost: number;      // biaya rencana labor
  actualLaborCost: number;       // biaya aktual labor
  issuedAt: string;
  completedAt?: string;
  isCustom: boolean;
  customNotes?: string;
}

// --- Purchase Order ---

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  createdBy: string;
  items: PurchaseOrderItem[];
  status: POStatus;
  totalAmount: number;
  createdAt: string;
  receivedAt?: string;
  paymentStatus: 'UNPAID' | 'PAID';
  bankAccountId?: string;
  paidAt?: string;
}

export interface PurchaseOrderItem {
  materialId: string;
  materialName: string;
  qty: number;
  unitCost: number;
}

// --- Stock Movement ---

export interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  type: StockMovementType;
  qty: number;
  reference: string;
  date: string;
}

// --- Delivery Order ---

export interface DeliveryOrder {
  id: string;
  doNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  customerAddress: string;
  items: string[];
  assignedDriverName: string;
  vehiclePlate: string;
  scheduledDate: string;
  status: DeliveryStatus;
  deliveryProofNote?: string;   // Driver's confirmation note / photo description
  deliveredAt?: string;
  createdAt: string;
}

// --- Delivery Configuration ---

export interface Armada {
  id: string;
  name: string;
  plateNumber: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
}

export interface ShippingRate {
  id: string;
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId?: string;
  districtName?: string;
  rate: number;
  isFlatCityRate: boolean;
}

// --- Invoice ---

export interface Invoice {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  salesName: string;          // Which sales to notify
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  payments: Payment[];
  issuedAt: string;           // Auto-issued at delivery
  createdAt: string;
}

// --- Payment ---

export interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
  note: string;
  confirmedBy: string;        // Name of sales who confirmed
}

// --- HPP Analysis ---

export interface HPPAnalysis {
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  sellingPrice: number;
  materialCost: number;
  plannedLaborCost: number;
  plannedOverheadCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  totalHPP: number;
  grossProfit: number;
  grossMarginPercent: number;
}

// --- Company Asset ---

export interface CompanyAsset {
  id: string;
  code: string;
  name: string;
  category: string; // e.g. "Mesin", "Peralatan", "Kendaraan", "Alat Kerja", "Lainnya"
  purchaseDate: string; // YYYY-MM-DD
  purchaseCost: number;
  usefulLifeYears: number; // useful life in years
  monthlyDepreciation: number; // purchaseCost / (usefulLifeYears * 12)
  accumulatedServiceCost: number; // accumulated service/maintenance cost
  status: 'AKTIF' | 'MAINTENANCE' | 'RUSAK';
}

// --- Company Asset Service Log ---

export interface CompanyAssetServiceLog {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  serviceDate: string; // YYYY-MM-DD
  cost: number;
  description: string;
}

// --- Accounting: Chart of Accounts & Journal Entries ---

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE';
export type AccountNormalBalance = 'DEBIT' | 'CREDIT';

export interface AccountCode {
  id: string;
  code: string;           // e.g. "1-1100"
  name: string;           // e.g. "Kas & Bank"
  type: AccountType;
  normalBalance: AccountNormalBalance;
  parentId?: string;      // for tree hierarchy
  isHeader: boolean;      // true = group header, false = postable
  level: number;          // nesting depth (1, 2, 3)
  description?: string;
  isSystem?: boolean;     // true = core default system account, protected from deletion
}

export interface JournalEntryLine {
  accountId: string;      // reference to AccountCode.id or code
  accountCode: string;    // denormalized for display (e.g. "1-1100")
  accountName: string;    // denormalized for display (e.g. "Kas & Bank")
  debit: number;
  credit: number;
}

export type JournalSourceType =
  | 'INVOICE_ISSUED'
  | 'INVOICE_PAYMENT'
  | 'PO_RECEIVED'
  | 'PO_PAYMENT'
  | 'EXPENSE'
  | 'BANK_TRANSFER'
  | 'OPENING_BALANCE'
  | 'MANUAL';

export interface JournalEntry {
  id: string;
  entryNumber: string;    // e.g. "JE-2026-001"
  date: string;           // ISO date string
  description: string;
  lines: JournalEntryLine[];
  sourceType: JournalSourceType;
  sourceId?: string;      // ID of originating doc (invoice, PO, expense, etc.)
  createdAt: string;
}

// --- App State ---

export interface AppState {
  materials: RawMaterial[];
  products: Product[];
  attributes: AttributeMaster[];    // Global attribute master data
  bomTemplates: BOMTemplate[];          // Master preset BOM (Keys: id, name, description)
  bomTemplateItems: BOMTemplateItem[];  // Material bawaan preset (Keys: id, templateId, materialId, defaultQty)
  variantBoms: VariantBOM[];            // BOM aktual menempel ke varian fisik (Keys: variantId, items)
  salesOrders: SalesOrder[];
  workOrders: WorkOrder[];
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  currentUserId: string;      // Active simulated user
  categories: string[];       // Dynamic raw material categories
  assetCategories: string[];  // Dynamic asset categories
  productCategories: string[]; // Dynamic product categories
  assets: CompanyAsset[];     // Master data for assets
  assetServiceLogs: CompanyAssetServiceLog[]; // Service logs for assets
  masterModifierGroups: ProductModifierGroup[];
  operations: ProductionOperation[];
  routings: ProductionRouting[];
  operators: ProductionOperator[];
  bankAccounts: BankAccount[];
  expenses: Expense[];
  chartOfAccounts: AccountCode[];
  journalEntries: JournalEntry[];
  orderFormConfiguration: FormContainer[];
  showAllOrdersTab?: boolean;
  isCustomOrderFormEnabled?: boolean;
  armadas: Armada[];
  drivers: Driver[];
  shippingRates: ShippingRate[];
  isShippingRateEnabled: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  balance: number;
}

export interface Expense {
  id: string;
  category: 'GAJI' | 'LISTRIK_AIR' | 'SEWA' | 'TRANSPORT' | 'ATK' | 'LAINNYA';
  amount: number;
  date: string;
  bankAccountId: string;
  note?: string;
}


