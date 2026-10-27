import type {
  RawMaterial,
  Product,
  ProductVariantSKU,
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
  ShippingRate,
  FinishedGoodStock,
  ReturnedGood,
} from './types';
import { DEFAULT_CHART_OF_ACCOUNTS } from './accounting';
import { generateVariantsFromRules } from './product-resolver';
import { syncFinishedGoodsWithProducts } from './utils';


// ========================================
// RAW MATERIALS (Bahan Baku)
// ========================================
export const initialMaterials: RawMaterial[] = [
  { id: 'mat-1', code: 'MAT-PLY-18MM', name: 'Multiplek 18mm', category: 'Papan', unit: 'lembar', unitCost: 220000, stock: 80, minStock: 15 },
  { id: 'mat-2', code: 'MAT-KAYU-MAHONI', name: 'Kayu Rangka Mahoni Kering', category: 'Kayu', unit: 'm³', unitCost: 3500000, stock: 12.5, minStock: 3 },
  { id: 'mat-3', code: 'MAT-FOAM-D24-3CM', name: 'Busa Royal D24 Tebal 3cm', category: 'Busa', unit: 'lembar', unitCost: 110000, stock: 60, minStock: 10 },
  { id: 'mat-4', code: 'MAT-FOAM-D24-5CM', name: 'Busa Royal D24 Tebal 5cm', category: 'Busa', unit: 'lembar', unitCost: 175000, stock: 0, minStock: 8 },
  { id: 'mat-5', code: 'MAT-FABRIC-MIDILI', name: 'Kain Jok Midili Beige', category: 'Kain', unit: 'meter', unitCost: 45000, stock: 0, minStock: 20 },
  { id: 'mat-6', code: 'MAT-LEATHER-OSCAR', name: 'Kulit Sintetis Oscar Premium', category: 'Kain', unit: 'meter', unitCost: 55000, stock: 0, minStock: 20 },
  { id: 'mat-7', code: 'MAT-ACC-KAKI10CM', name: 'Kaki Dipan Kayu Bubut 10cm', category: 'Aksesoris', unit: 'pcs', unitCost: 15000, stock: 0, minStock: 40 },
  { id: 'mat-8', code: 'MAT-LEM-FOAM', name: 'Lem Kuning Busa Aica', category: 'Lem', unit: 'kaleng', unitCost: 65000, stock: 0, minStock: 8 },
  { id: 'mat-9', code: 'MAT-HARDWARE-SET', name: 'Bracket Ranjang & Baut Joint', category: 'Hardware', unit: 'set', unitCost: 25000, stock: 0, minStock: 15 },
  { id: 'mat-10', code: 'MAT-REL-LACI50CM', name: 'Rel Laci Double Track 50cm', category: 'Hardware', unit: 'pasang', unitCost: 45000, stock: 0, minStock: 8 },
  { id: 'mat-11', code: 'MAT-REBOUNDED-D50', name: 'Busa Kasur Rebounded D50', category: 'Busa', unit: 'blok', unitCost: 850000, stock: 0, minStock: 5 },
  { id: 'mat-12', code: 'MAT-KNITTING-QUILT', name: 'Kain Cover Knitted Kasur', category: 'Kain', unit: 'meter', unitCost: 65000, stock: 0, minStock: 15 },
  {
    id: 'mat-sub-laci',
    code: 'SA-LACI-50CM',
    name: 'Laci Tarik Storage 50cm',
    category: 'Aksesoris',
    unit: 'unit',
    unitCost: 185000,
    stock: 0,
    minStock: 5,
    isSubAssembly: true,
    routingId: 'rt-1',
    childBom: [
      { materialId: 'mat-1', qty: 0.5 },
      { materialId: 'mat-2', qty: 0.01 },
      { materialId: 'mat-10', qty: 1 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
];

// ========================================
// PRODUCT CATALOG with VARIANTS
// ========================================

// Helper to generate a simple variant ID
const vid = (prefix: string) => prefix;


// ========================================
// PRODUCTION OPERATIONS (Master Data: 2 Operasi)
// ========================================
export const initialOperations: ProductionOperation[] = [
  { id: 'op-1', name: 'Potong & Rakit Rangka', costingMethod: 'fixed', fixedLaborCost: 35000 },
  { id: 'op-2', name: 'Finishing & QC', costingMethod: 'fixed', fixedLaborCost: 25000 },
];

export const initialOperators: ProductionOperator[] = [
  { id: 'op-1', name: 'Slamet Riyadi', roleSpecialization: 'Potong & Rakit Rangka', status: 'ACTIVE' },
  { id: 'op-2', name: 'Budi Santoso', roleSpecialization: 'Finishing & QC', status: 'ACTIVE' },
];

// ========================================
// ROUTINGS (Template Alur Produksi Standar)
// ========================================
export const initialRoutings: ProductionRouting[] = [
  {
    id: 'rt-1',
    name: 'Alur Produksi Standar',
    steps: [
      { sequence: 1, operationId: 'op-1' }, // Potong & Rakit Rangka
      { sequence: 2, operationId: 'op-2' }, // Finishing & QC
    ],
  },
];

// ========================================
// GLOBAL ATTRIBUTE MASTER
// ========================================
export const initialAttributes: AttributeMaster[] = [
  {
    id: 'attr-1',
    name: 'Ukuran',
    values: ['120x200', '160x200', '180x200'],
  },
  {
    id: 'attr-2',
    name: 'Warna',
    values: ['hitam', 'putih', 'cream'],
  },
];

// ========================================
// PRODUCT VARIANTS: DIPAN STANDAR (9 Varian)
// ========================================
const dipanStandarVariants: ProductVariantSKU[] = [
  // Ukuran 120x200
  {
    id: 'pv-dpn-120-hitam',
    sku: 'DPN-STD-120-HTM',
    combination: { 'Ukuran': '120x200', 'Warna': 'hitam' },
    price: 1600000,
    estimatedHours: 6,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 1.5 },
      { materialId: 'mat-2', qty: 0.06 },
      { materialId: 'mat-3', qty: 1.0 },
    ],
  },
  {
    id: 'pv-dpn-120-putih',
    sku: 'DPN-STD-120-PTH',
    combination: { 'Ukuran': '120x200', 'Warna': 'putih' },
    price: 1600000,
    estimatedHours: 6,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 1.5 },
      { materialId: 'mat-2', qty: 0.06 },
      { materialId: 'mat-3', qty: 1.0 },
    ],
  },
  {
    id: 'pv-dpn-120-cream',
    sku: 'DPN-STD-120-CRM',
    combination: { 'Ukuran': '120x200', 'Warna': 'cream' },
    price: 1600000,
    estimatedHours: 6,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 1.5 },
      { materialId: 'mat-2', qty: 0.06 },
      { materialId: 'mat-3', qty: 1.0 },
    ],
  },
  // Ukuran 160x200
  {
    id: 'pv-dpn-160-hitam',
    sku: 'DPN-STD-160-HTM',
    combination: { 'Ukuran': '160x200', 'Warna': 'hitam' },
    price: 2200000,
    estimatedHours: 8,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.0 },
      { materialId: 'mat-2', qty: 0.08 },
      { materialId: 'mat-3', qty: 2.0 },
    ],
  },
  {
    id: 'pv-dpn-160-putih',
    sku: 'DPN-STD-160-PTH',
    combination: { 'Ukuran': '160x200', 'Warna': 'putih' },
    price: 2200000,
    estimatedHours: 8,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.0 },
      { materialId: 'mat-2', qty: 0.08 },
      { materialId: 'mat-3', qty: 2.0 },
    ],
  },
  {
    id: 'pv-dpn-160-cream',
    sku: 'DPN-STD-160-CRM',
    combination: { 'Ukuran': '160x200', 'Warna': 'cream' },
    price: 2200000,
    estimatedHours: 8,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.0 },
      { materialId: 'mat-2', qty: 0.08 },
      { materialId: 'mat-3', qty: 2.0 },
    ],
  },
  // Ukuran 180x200
  {
    id: 'pv-dpn-180-hitam',
    sku: 'DPN-STD-180-HTM',
    combination: { 'Ukuran': '180x200', 'Warna': 'hitam' },
    price: 2600000,
    estimatedHours: 9,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.5 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-3', qty: 2.5 },
    ],
  },
  {
    id: 'pv-dpn-180-putih',
    sku: 'DPN-STD-180-PTH',
    combination: { 'Ukuran': '180x200', 'Warna': 'putih' },
    price: 2600000,
    estimatedHours: 9,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.5 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-3', qty: 2.5 },
    ],
  },
  {
    id: 'pv-dpn-180-cream',
    sku: 'DPN-STD-180-CRM',
    combination: { 'Ukuran': '180x200', 'Warna': 'cream' },
    price: 2600000,
    estimatedHours: 9,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.5 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-3', qty: 2.5 },
    ],
  },
];

// ========================================
// PRODUCT VARIANTS: KASUR BUSA (Tanpa Varian)
// ========================================
const kasurBusaVariants: ProductVariantSKU[] = [
  {
    id: 'pv-ksr-std',
    sku: 'KSR-BUSA-STD',
    combination: {},
    price: 1250000,
    estimatedHours: 4,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-3', qty: 2.0 },
    ],
  },
];

// ========================================
// PRODUCT CATALOG (2 Produk)
// ========================================
export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Dipan Standar',
    description: 'Dipan tempat tidur kayu minimalis dengan pilihan ukuran dan warna elegan.',
    category: 'Dipan',
    imageIcon: 'BedDouble',
    defaultRoutingId: 'rt-1',
    defaultEstimatedHours: 8,
    variantTypes: [
      { name: 'Ukuran', values: ['120x200', '160x200', '180x200'] },
      { name: 'Warna', values: ['hitam', 'putih', 'cream'] },
    ],
    variants: dipanStandarVariants,
  },
  {
    id: 'prod-2',
    name: 'Kasur Busa',
    description: 'Kasur busa standar nyaman dan tahan lama.',
    category: 'Kasur',
    imageIcon: 'Layers',
    defaultRoutingId: 'rt-1',
    defaultEstimatedHours: 4,
    variantTypes: [],
    variants: kasurBusaVariants,
  },
];

export const initialProductCategories: string[] = ['Dipan', 'Kasur'];

// ========================================
// REUSABLE BOM TEMPLATES (PRESET BOM: 1 Template)
// ========================================
export const initialBomTemplates: BOMTemplate[] = [
  {
    id: 'tmpl-standar-1',
    name: 'BOM Standar Manufaktur',
    description: 'Resep bahan baku dasar untuk produksi mebel standar',
  },
];

export const initialBomTemplateItems: BOMTemplateItem[] = [
  { id: 'bti-1', templateId: 'tmpl-standar-1', materialId: 'mat-1', defaultQty: 2.0 },
  { id: 'bti-2', templateId: 'tmpl-standar-1', materialId: 'mat-2', defaultQty: 0.08 },
  { id: 'bti-3', templateId: 'tmpl-standar-1', materialId: 'mat-3', defaultQty: 1.5 },
];

// ========================================
// VARIANT-LEVEL ACTUAL PHYSICAL BOMS
// ========================================
export const initialVariantBoms: VariantBOM[] = initialProducts.flatMap(p =>
  p.variants.map(v => ({
    variantId: v.id,
    items: v.bom.map(b => ({ materialId: b.materialId, qty: b.qty })),
  }))
);

// ========================================
// Helper: Calculate BOM cost
// ========================================
function calcBOMCost(bom: { materialId: string; qty: number }[]): number {
  return bom.reduce((total, item) => {
    const mat = initialMaterials.find(m => m.id === item.materialId);
    return total + (mat ? mat.unitCost * item.qty : 0);
  }, 0);
}


// ========================================
// SEED SALES ORDERS (Transactions: Empty)
// ========================================
export const initialSalesOrders: SalesOrder[] = [];

// ========================================
// SEED WORK ORDERS / SPK (Transactions: Empty)
// ========================================
export const initialWorkOrders: WorkOrder[] = [];

// ========================================
// SEED PURCHASE ORDERS (Transactions: Empty)
// ========================================
export const initialPurchaseOrders: PurchaseOrder[] = [];

// ========================================
// SEED STOCK MOVEMENTS (Transactions: Empty)
// ========================================
export const initialStockMovements: StockMovement[] = [];

// ========================================
// SEED DELIVERY CONFIG (Armada & Driver)
// ========================================
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

// ========================================
// SEED FINISHED GOODS (Barang Jadi)
// ========================================
export const initialFinishedGoods: FinishedGoodStock[] = syncFinishedGoodsWithProducts(initialProducts, []);
export const initialReturnedGoods: ReturnedGood[] = [];

// ========================================
// SEED DELIVERY ORDERS (Transactions: Empty)
// ========================================
export const initialDeliveryOrders: DeliveryOrder[] = [];

// ========================================
// SEED INVOICES (Transactions: Empty)
// ========================================
export const initialInvoices: Invoice[] = [];

// ========================================
// SEED COMPANY ASSETS (Overhead components)
// ========================================
export const initialAssets: CompanyAsset[] = [
  {
    id: 'ast-1',
    code: 'AST-MSN-001',
    name: 'Mesin Potong Busa Vertical Band',
    category: 'Mesin',
    acquisitionType: 'EXISTING',
    purchaseDate: '2024-01-15',
    purchaseCost: 18000000,
    usefulLifeYears: 5,
    usefulLifeMonths: 60,
    salvageValue: 0,
    currentBookValue: 18000000,
    monthlyDepreciation: 18000000 / (5 * 12), // Rp 300,000
    accumulatedServiceCost: 0,
    status: 'ACTIVE',
  },
  {
    id: 'ast-2',
    code: 'AST-KND-001',
    name: 'Pickup Suzuki Carry Box Pengiriman',
    category: 'Kendaraan',
    acquisitionType: 'EXISTING',
    purchaseDate: '2023-06-10',
    purchaseCost: 144000000,
    usefulLifeYears: 8,
    usefulLifeMonths: 96,
    salvageValue: 0,
    currentBookValue: 144000000,
    monthlyDepreciation: 144000000 / (8 * 12), // Rp 1,500,000
    accumulatedServiceCost: 0,
    status: 'ACTIVE',
  },
  {
    id: 'ast-3',
    code: 'AST-PLT-001',
    name: 'Kompresor Udara Screw Krisbow 5HP',
    category: 'Peralatan',
    acquisitionType: 'EXISTING',
    purchaseDate: '2024-03-20',
    purchaseCost: 9600000,
    usefulLifeYears: 4,
    usefulLifeMonths: 48,
    salvageValue: 0,
    currentBookValue: 9600000,
    monthlyDepreciation: 9600000 / (4 * 12), // Rp 200,000
    accumulatedServiceCost: 0,
    status: 'ACTIVE',
  },
  {
    id: 'ast-4',
    code: 'AST-ALT-001',
    name: 'Mesin Jahit Singer Heavy Duty Industrial',
    category: 'Alat Kerja',
    acquisitionType: 'EXISTING',
    purchaseDate: '2024-02-05',
    purchaseCost: 5400000,
    usefulLifeYears: 3,
    usefulLifeMonths: 36,
    salvageValue: 0,
    currentBookValue: 5400000,
    monthlyDepreciation: 5400000 / (3 * 12), // Rp 150,000
    accumulatedServiceCost: 0,
    status: 'ACTIVE',
  },
];

export const initialAssetDepreciations: AssetDepreciation[] = [];

// ========================================
// SEED COMPANY ASSET SERVICE LOGS (Transactions: Empty)
// ========================================
export const initialAssetServiceLogs: CompanyAssetServiceLog[] = [];

export const initialModifierGroups: ProductModifierGroup[] = [
  {
    id: 'pmg-1',
    name: 'Laci Standar 60x40',
    selectType: 'SINGLE',
    options: [
      {
        id: 'pmo-1',
        name: '1 Laci',
        additionalPrice: 125000,
        bom: [
          { materialId: 'mat-10', qty: 2 },
          { materialId: 'mat-1', qty: 0.5 },
        ],
      },
      {
        id: 'pmo-2',
        name: '2 Laci',
        additionalPrice: 250000,
        bom: [
          { materialId: 'mat-10', qty: 4 },
          { materialId: 'mat-1', qty: 1 },
        ],
      },
      {
        id: 'pmo-3',
        name: '3 Laci',
        additionalPrice: 375000,
        bom: [
          { materialId: 'mat-10', qty: 6 },
          { materialId: 'mat-1', qty: 1.5 },
        ],
      },
      {
        id: 'pmo-4',
        name: '4 Laci',
        additionalPrice: 500000,
        bom: [
          { materialId: 'mat-10', qty: 8 },
          { materialId: 'mat-1', qty: 2 },
        ],
      },
    ],
  },
];

export const initialBankAccounts: BankAccount[] = [
  { id: 'ba-1', name: 'Bank BCA', accountNumber: '8000456123', balance: 50000000 },
];

export const initialExpenses: Expense[] = [];

// ========================================
// CHART OF ACCOUNTS & SEED JOURNAL ENTRIES
// ========================================
export const initialChartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS;

export const initialJournalEntries: JournalEntry[] = [
  {
    id: 'je-seed-1',
    entryNumber: 'JE-2026-0001',
    date: '2026-01-01T00:00:00.000Z',
    description: 'Saldo Awal Bank BCA',
    sourceType: 'OPENING_BALANCE',
    sourceId: 'ba-1',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank', debit: 50000000, credit: 0 },
      { accountId: 'coa-31000', accountCode: '3-1000', accountName: 'Modal Disetor', debit: 0, credit: 50000000 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const initialCategories: string[] = ['Papan', 'Kayu', 'Busa', 'Kain', 'Aksesoris', 'Lem', 'Hardware'];
export const initialAssetCategories: string[] = ['Kendaraan', 'Mesin & Peralatan', 'Elektronik & IT'];



