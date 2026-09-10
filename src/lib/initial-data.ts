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
} from './types';
import { DEFAULT_CHART_OF_ACCOUNTS } from './accounting';
import { generateVariantsFromRules } from './product-resolver';


// ========================================
// RAW MATERIALS (Bahan Baku)
// ========================================
export const initialMaterials: RawMaterial[] = [
  { id: 'mat-1', code: 'MAT-PLY-18MM', name: 'Multiplek / Plywood 18mm', category: 'Papan', unit: 'lembar', unitCost: 220000, stock: 80, minStock: 15 },
  { id: 'mat-2', code: 'MAT-KAYU-MAHONI', name: 'Kayu Rangka Mahoni Kering', category: 'Kayu', unit: 'm³', unitCost: 3500000, stock: 12.5, minStock: 3 },
  { id: 'mat-3', code: 'MAT-FOAM-D24-3CM', name: 'Busa Royal D24 Tebal 3cm', category: 'Busa', unit: 'lembar', unitCost: 110000, stock: 60, minStock: 10 },
  { id: 'mat-4', code: 'MAT-FOAM-D24-5CM', name: 'Busa Royal D24 Tebal 5cm', category: 'Busa', unit: 'lembar', unitCost: 175000, stock: 40, minStock: 8 },
  { id: 'mat-5', code: 'MAT-FABRIC-MIDILI', name: 'Kain Jok Midili Grey/Beige', category: 'Kain', unit: 'meter', unitCost: 45000, stock: 150, minStock: 20 },
  { id: 'mat-6', code: 'MAT-LEATHER-OSCAR', name: 'Kulit Sintetis Oscar Premium', category: 'Kain', unit: 'meter', unitCost: 55000, stock: 120, minStock: 20 },
  { id: 'mat-7', code: 'MAT-ACC-KAKI10CM', name: 'Kaki Dipan Kayu Bubut 10cm', category: 'Aksesoris', unit: 'pcs', unitCost: 15000, stock: 300, minStock: 40 },
  { id: 'mat-8', code: 'MAT-LEM-FOAM', name: 'Lem Kuning Busa Aica', category: 'Lem', unit: 'kaleng', unitCost: 65000, stock: 35, minStock: 8 },
  { id: 'mat-9', code: 'MAT-HARDWARE-SET', name: 'Bracket Ranjang & Baut Joint', category: 'Hardware', unit: 'set', unitCost: 25000, stock: 90, minStock: 15 },
  { id: 'mat-10', code: 'MAT-REL-LACI50CM', name: 'Rel Laci Double Track 50cm', category: 'Hardware', unit: 'pasang', unitCost: 45000, stock: 40, minStock: 8 },
  { id: 'mat-11', code: 'MAT-REBOUNDED-D50', name: 'Busa Kasur Rebounded D50', category: 'Busa', unit: 'blok', unitCost: 850000, stock: 20, minStock: 5 },
  { id: 'mat-12', code: 'MAT-KNITTING-QUILT', name: 'Kain Cover Knitted Kasur', category: 'Kain', unit: 'meter', unitCost: 65000, stock: 80, minStock: 15 },
];

// ========================================
// PRODUCT CATALOG with VARIANTS
// ========================================

// Helper to generate a simple variant ID
const vid = (prefix: string) => prefix;


// ========================================
// PRODUCTION OPERATIONS (Master Data)
// ========================================
export const initialOperations: ProductionOperation[] = [
  { id: 'op-1', name: 'Potong Kayu Rangka', costingMethod: 'fixed', fixedLaborCost: 20000 },
  { id: 'op-2', name: 'Potong Busa & Kain', costingMethod: 'fixed', fixedLaborCost: 15000 },
  { id: 'op-3', name: 'Rakit Rangka Besi/Kayu', costingMethod: 'fixed', fixedLaborCost: 25000 },
  { id: 'op-4', name: 'Jahit & Pasang Jok', costingMethod: 'fixed', fixedLaborCost: 35000 },
  { id: 'op-5', name: 'QC & Packing', costingMethod: 'fixed', fixedLaborCost: 10000 },
];

export const initialOperators: ProductionOperator[] = [
  { id: 'op-1', name: 'Slamet Riyadi', roleSpecialization: 'Potong Kayu & Busa', status: 'ACTIVE' },
  { id: 'op-2', name: 'Agus Setiawan', roleSpecialization: 'Rakit Rangka', status: 'ACTIVE' },
  { id: 'op-3', name: 'Budi Santoso', roleSpecialization: 'Amplas & Finishing', status: 'ACTIVE' },
  { id: 'op-4', name: 'Rudi Hermawan', roleSpecialization: 'Jahit & Pasang Jok', status: 'ACTIVE' },
  { id: 'op-5', name: 'Eko Prasetyo', roleSpecialization: 'QC & Packing', status: 'ACTIVE' },
];

// ========================================
// ROUTINGS (Template Alur Produksi)
// ========================================
export const initialRoutings: ProductionRouting[] = [
  {
    id: 'rt-1',
    name: 'Alur Standar Dipan',
    steps: [
      { sequence: 1, operationId: 'op-1' }, // Potong Kayu
      { sequence: 2, operationId: 'op-3' }, // Rakit Rangka
      { sequence: 3, operationId: 'op-4' }, // Jahit & Pasang Jok
      { sequence: 4, operationId: 'op-5' }, // QC & Packing
    ],
  },
  {
    id: 'rt-2',
    name: 'Alur Kasur',
    steps: [
      { sequence: 1, operationId: 'op-2' }, // Potong Busa & Kain
      { sequence: 2, operationId: 'op-4' }, // Jahit & Pasang Cover
      { sequence: 3, operationId: 'op-5' }, // QC & Packing
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
    values: ['120x200 cm', '160x200 cm', '180x200 cm'],
  },
  {
    id: 'attr-2',
    name: 'Bahan Cover',
    values: ['Midili (Kain)', 'Oscar (Kulit Sintetis)'],
  },
  {
    id: 'attr-3',
    name: 'Ketebalan',
    values: ['15 cm', '20 cm', '25 cm'],
  },
];

// Helper to seed existing variant IDs and SKUs so seed sales/work orders match
// Helper to seed existing variant IDs and SKUs so seed sales/work orders match
const existingDipan1Variants: ProductVariantSKU[] = [
  {
    id: 'pv-1-1',
    sku: 'DPN-MIN-120-MDL',
    combination: { 'Ukuran': '120x200 cm', 'Bahan Cover': 'Midili (Kain)' },
    price: 1750000,
    estimatedHours: 6,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 1.5 },
      { materialId: 'mat-2', qty: 0.06 },
      { materialId: 'mat-3', qty: 1.0 },
      { materialId: 'mat-5', qty: 5.0 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 0.5 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
  {
    id: 'pv-1-2',
    sku: 'DPN-MIN-120-OSC',
    combination: { 'Ukuran': '120x200 cm', 'Bahan Cover': 'Oscar (Kulit Sintetis)' },
    price: 1950000,
    estimatedHours: 6,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 1.5 },
      { materialId: 'mat-2', qty: 0.06 },
      { materialId: 'mat-3', qty: 1.0 },
      { materialId: 'mat-6', qty: 5.0 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 0.5 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
  {
    id: 'pv-1-3',
    sku: 'DPN-MIN-160-MDL',
    combination: { 'Ukuran': '160x200 cm', 'Bahan Cover': 'Midili (Kain)' },
    price: 2650000,
    estimatedHours: 8,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.0 },
      { materialId: 'mat-2', qty: 0.08 },
      { materialId: 'mat-3', qty: 2.0 },
      { materialId: 'mat-5', qty: 6.5 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 1.0 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
  {
    id: 'pv-1-4',
    sku: 'DPN-MIN-160-OSC',
    combination: { 'Ukuran': '160x200 cm', 'Bahan Cover': 'Oscar (Kulit Sintetis)' },
    price: 2850000,
    estimatedHours: 8,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.0 },
      { materialId: 'mat-2', qty: 0.08 },
      { materialId: 'mat-3', qty: 2.0 },
      { materialId: 'mat-6', qty: 6.5 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 1.0 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
  {
    id: 'pv-1-5',
    sku: 'DPN-MIN-180-MDL',
    combination: { 'Ukuran': '180x200 cm', 'Bahan Cover': 'Midili (Kain)' },
    price: 3100000,
    estimatedHours: 10,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.5 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-3', qty: 2.5 },
      { materialId: 'mat-5', qty: 8.0 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 1.5 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
  {
    id: 'pv-1-6',
    sku: 'DPN-MIN-180-OSC',
    combination: { 'Ukuran': '180x200 cm', 'Bahan Cover': 'Oscar (Kulit Sintetis)' },
    price: 3350000,
    estimatedHours: 10,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 2.5 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-3', qty: 2.5 },
      { materialId: 'mat-6', qty: 8.0 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 1.5 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
];

const existingDipan2Variants: ProductVariantSKU[] = [
  {
    id: 'pv-2-1',
    sku: 'DPN-STOR-160-MDL',
    combination: { 'Ukuran': '160x200 cm', 'Bahan Cover': 'Midili (Kain)' },
    price: 3200000,
    estimatedHours: 12,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 3.0 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-4', qty: 2.0 },
      { materialId: 'mat-5', qty: 7.0 },
      { materialId: 'mat-7', qty: 6 },
      { materialId: 'mat-8', qty: 1.0 },
      { materialId: 'mat-9', qty: 1 },
      { materialId: 'mat-10', qty: 2 },
    ],
  },
  {
    id: 'pv-2-2',
    sku: 'DPN-STOR-160-OSC',
    combination: { 'Ukuran': '160x200 cm', 'Bahan Cover': 'Oscar (Kulit Sintetis)' },
    price: 3500000,
    estimatedHours: 12,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 3.0 },
      { materialId: 'mat-2', qty: 0.10 },
      { materialId: 'mat-4', qty: 2.0 },
      { materialId: 'mat-6', qty: 7.0 },
      { materialId: 'mat-7', qty: 6 },
      { materialId: 'mat-8', qty: 1.0 },
      { materialId: 'mat-9', qty: 1 },
      { materialId: 'mat-10', qty: 2 },
    ],
  },
  {
    id: 'pv-2-3',
    sku: 'DPN-STOR-180-OSC',
    combination: { 'Ukuran': '180x200 cm', 'Bahan Cover': 'Oscar (Kulit Sintetis)' },
    price: 3950000,
    estimatedHours: 14,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 3.5 },
      { materialId: 'mat-2', qty: 0.12 },
      { materialId: 'mat-4', qty: 2.0 },
      { materialId: 'mat-6', qty: 8.0 },
      { materialId: 'mat-7', qty: 6 },
      { materialId: 'mat-8', qty: 1.5 },
      { materialId: 'mat-9', qty: 1 },
      { materialId: 'mat-10', qty: 2 },
    ],
  },
  {
    id: 'pv-2-4',
    sku: 'DPN-STOR-180-MDL',
    combination: { 'Ukuran': '180x200 cm', 'Bahan Cover': 'Midili (Kain)' },
    price: 3650000,
    estimatedHours: 14,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 3.5 },
      { materialId: 'mat-2', qty: 0.12 },
      { materialId: 'mat-4', qty: 2.0 },
      { materialId: 'mat-5', qty: 8.0 },
      { materialId: 'mat-7', qty: 6 },
      { materialId: 'mat-8', qty: 1.5 },
      { materialId: 'mat-9', qty: 1 },
      { materialId: 'mat-10', qty: 2 },
    ],
  },
];

const existingDipan3Variants: ProductVariantSKU[] = [
  {
    id: 'pv-3-1',
    sku: 'DPN-CHEST-160',
    combination: { 'Ukuran': '160x200 cm' },
    price: 4000000,
    estimatedHours: 16,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 3.0 },
      { materialId: 'mat-2', qty: 0.12 },
      { materialId: 'mat-4', qty: 2.5 },
      { materialId: 'mat-6', qty: 9.0 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 1.5 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
  {
    id: 'pv-3-2',
    sku: 'DPN-CHEST-180',
    combination: { 'Ukuran': '180x200 cm' },
    price: 4450000,
    estimatedHours: 18,
    isActive: true,
    routingId: 'rt-1',
    bom: [
      { materialId: 'mat-1', qty: 3.5 },
      { materialId: 'mat-2', qty: 0.14 },
      { materialId: 'mat-4', qty: 3.0 },
      { materialId: 'mat-6', qty: 10.0 },
      { materialId: 'mat-7', qty: 4 },
      { materialId: 'mat-8', qty: 2.0 },
      { materialId: 'mat-9', qty: 1 },
    ],
  },
];

const existingKasurVariants: ProductVariantSKU[] = [
  { id: 'pv-4-1', sku: 'KSR-REB-120-15', combination: { 'Ukuran': '120x200 cm', 'Ketebalan': '15 cm' }, price: 850000, estimatedHours: 3, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.4 }, { materialId: 'mat-11', qty: 0.6 }, { materialId: 'mat-12', qty: 4 }] },
  { id: 'pv-4-2', sku: 'KSR-REB-120-20', combination: { 'Ukuran': '120x200 cm', 'Ketebalan': '20 cm' }, price: 1100000, estimatedHours: 4, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.4 }, { materialId: 'mat-11', qty: 0.8 }, { materialId: 'mat-12', qty: 4 }] },
  { id: 'pv-4-3', sku: 'KSR-REB-120-25', combination: { 'Ukuran': '120x200 cm', 'Ketebalan': '25 cm' }, price: 1350000, estimatedHours: 4, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.4 }, { materialId: 'mat-11', qty: 1.0 }, { materialId: 'mat-12', qty: 4 }] },
  { id: 'pv-4-4', sku: 'KSR-REB-160-15', combination: { 'Ukuran': '160x200 cm', 'Ketebalan': '15 cm' }, price: 1200000, estimatedHours: 4, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.5 }, { materialId: 'mat-11', qty: 0.8 }, { materialId: 'mat-12', qty: 5.5 }] },
  { id: 'pv-4-5', sku: 'KSR-REB-160-20', combination: { 'Ukuran': '160x200 cm', 'Ketebalan': '20 cm' }, price: 1550000, estimatedHours: 5, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.5 }, { materialId: 'mat-11', qty: 1.0 }, { materialId: 'mat-12', qty: 5.5 }] },
  { id: 'pv-4-6', sku: 'KSR-REB-160-25', combination: { 'Ukuran': '160x200 cm', 'Ketebalan': '25 cm' }, price: 1950000, estimatedHours: 5, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.5 }, { materialId: 'mat-11', qty: 1.3 }, { materialId: 'mat-12', qty: 5.5 }] },
  { id: 'pv-4-7', sku: 'KSR-REB-180-15', combination: { 'Ukuran': '180x200 cm', 'Ketebalan': '15 cm' }, price: 1400000, estimatedHours: 4, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.6 }, { materialId: 'mat-11', qty: 0.9 }, { materialId: 'mat-12', qty: 6.5 }] },
  { id: 'pv-4-8', sku: 'KSR-REB-180-20', combination: { 'Ukuran': '180x200 cm', 'Ketebalan': '20 cm' }, price: 1800000, estimatedHours: 5, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.6 }, { materialId: 'mat-11', qty: 1.2 }, { materialId: 'mat-12', qty: 6.5 }] },
  { id: 'pv-4-9', sku: 'KSR-REB-180-25', combination: { 'Ukuran': '180x200 cm', 'Ketebalan': '25 cm' }, price: 2200000, estimatedHours: 6, isActive: true, routingId: 'rt-2', bom: [{ materialId: 'mat-8', qty: 0.6 }, { materialId: 'mat-11', qty: 1.5 }, { materialId: 'mat-12', qty: 6.5 }] },
];

export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Dipan Minimalis Fabric',
    description: 'Dipan minimalis desain Skandinavia, balutan kain berkualitas.',
    category: 'Dipan',
    imageIcon: 'BedDouble',
    defaultRoutingId: 'rt-1',
    defaultEstimatedHours: 6,
    variantTypes: [
      { name: 'Ukuran', values: ['120x200 cm', '160x200 cm', '180x200 cm'] },
      { name: 'Bahan Cover', values: ['Midili (Kain)', 'Oscar (Kulit Sintetis)'] },
    ],
    variants: existingDipan1Variants,
    modifierGroupIds: ['pmg-1'],
  },
  {
    id: 'prod-2',
    name: 'Dipan Storage 2-Laci',
    description: 'Dipan multifungsi dengan 2 laci besar untuk kebutuhan penyimpanan ekstra.',
    category: 'Dipan',
    imageIcon: 'BedDouble',
    defaultRoutingId: 'rt-1',
    defaultEstimatedHours: 12,
    variantTypes: [
      { name: 'Ukuran', values: ['160x200 cm', '180x200 cm'] },
      { name: 'Bahan Cover', values: ['Midili (Kain)', 'Oscar (Kulit Sintetis)'] },
    ],
    variants: existingDipan2Variants,
    modifierGroupIds: ['pmg-1'],
  },
  {
    id: 'prod-3',
    name: 'Dipan Headboard Chesterfield',
    description: 'Dipan mewah bergaya Chesterfield dengan headboard tinggi dan kancing dekoratif.',
    category: 'Dipan',
    imageIcon: 'BedDouble',
    defaultRoutingId: 'rt-1',
    defaultEstimatedHours: 16,
    variantTypes: [
      { name: 'Ukuran', values: ['160x200 cm', '180x200 cm'] },
    ],
    variants: existingDipan3Variants,
    modifierGroupIds: ['pmg-1'],
  },
  {
    id: 'prod-4',
    name: 'Kasur Rebounded Orthopedic',
    description: 'Kasur rebounded kepadatan tinggi D50. Cover knitted premium.',
    category: 'Kasur',
    imageIcon: 'Layers',
    defaultRoutingId: 'rt-2',
    defaultEstimatedHours: 3,
    variantTypes: [
      { name: 'Ukuran', values: ['120x200 cm', '160x200 cm', '180x200 cm'] },
      { name: 'Ketebalan', values: ['15 cm', '20 cm', '25 cm'] },
    ],
    variants: existingKasurVariants,
  },
];

export const initialProductCategories: string[] = ['Dipan', 'Kasur', 'Lemari', 'Sofa & Bench', 'Aksesoris'];

// ========================================
// REUSABLE BOM TEMPLATES (PRESET BOM)
// ========================================
export const initialBomTemplates: BOMTemplate[] = [
  {
    id: 'tmpl-dipan-120',
    name: 'Preset Dipan Standar 120x200 (Single)',
    description: 'Bahan baku standar rangka dipan single bed 120x200 cm',
  },
  {
    id: 'tmpl-dipan-160',
    name: 'Preset Dipan Standar 160x200 (Queen)',
    description: 'Bahan baku standar rangka dipan queen bed 160x200 cm',
  },
  {
    id: 'tmpl-dipan-180',
    name: 'Preset Dipan Standar 180x200 (King)',
    description: 'Bahan baku standar rangka dipan king bed 180x200 cm',
  },
  {
    id: 'tmpl-storage-160',
    name: 'Preset Dipan Storage 160x200 (2-Laci)',
    description: 'Rangka dipan storage queen lengkap rel laci & busa',
  },
  {
    id: 'tmpl-kasur-120',
    name: 'Preset Kasur Busa Rebounded 120x200',
    description: 'Standar material kasur busa rebounded single',
  },
  {
    id: 'tmpl-kasur-160',
    name: 'Preset Kasur Busa Rebounded 160x200',
    description: 'Standar material kasur busa rebounded queen',
  },
];

export const initialBomTemplateItems: BOMTemplateItem[] = [
  // tmpl-dipan-120
  { id: 'bti-1', templateId: 'tmpl-dipan-120', materialId: 'mat-1', defaultQty: 1.5 },
  { id: 'bti-2', templateId: 'tmpl-dipan-120', materialId: 'mat-2', defaultQty: 0.06 },
  { id: 'bti-3', templateId: 'tmpl-dipan-120', materialId: 'mat-3', defaultQty: 1.0 },
  { id: 'bti-4', templateId: 'tmpl-dipan-120', materialId: 'mat-7', defaultQty: 4 },
  { id: 'bti-5', templateId: 'tmpl-dipan-120', materialId: 'mat-8', defaultQty: 0.5 },
  { id: 'bti-6', templateId: 'tmpl-dipan-120', materialId: 'mat-9', defaultQty: 1 },

  // tmpl-dipan-160
  { id: 'bti-7', templateId: 'tmpl-dipan-160', materialId: 'mat-1', defaultQty: 2.0 },
  { id: 'bti-8', templateId: 'tmpl-dipan-160', materialId: 'mat-2', defaultQty: 0.08 },
  { id: 'bti-9', templateId: 'tmpl-dipan-160', materialId: 'mat-3', defaultQty: 2.0 },
  { id: 'bti-10', templateId: 'tmpl-dipan-160', materialId: 'mat-7', defaultQty: 4 },
  { id: 'bti-11', templateId: 'tmpl-dipan-160', materialId: 'mat-8', defaultQty: 1.0 },
  { id: 'bti-12', templateId: 'tmpl-dipan-160', materialId: 'mat-9', defaultQty: 1 },

  // tmpl-dipan-180
  { id: 'bti-13', templateId: 'tmpl-dipan-180', materialId: 'mat-1', defaultQty: 2.5 },
  { id: 'bti-14', templateId: 'tmpl-dipan-180', materialId: 'mat-2', defaultQty: 0.10 },
  { id: 'bti-15', templateId: 'tmpl-dipan-180', materialId: 'mat-3', defaultQty: 2.5 },
  { id: 'bti-16', templateId: 'tmpl-dipan-180', materialId: 'mat-7', defaultQty: 4 },
  { id: 'bti-17', templateId: 'tmpl-dipan-180', materialId: 'mat-8', defaultQty: 1.5 },
  { id: 'bti-18', templateId: 'tmpl-dipan-180', materialId: 'mat-9', defaultQty: 1 },

  // tmpl-storage-160
  { id: 'bti-19', templateId: 'tmpl-storage-160', materialId: 'mat-1', defaultQty: 3.0 },
  { id: 'bti-20', templateId: 'tmpl-storage-160', materialId: 'mat-2', defaultQty: 0.10 },
  { id: 'bti-21', templateId: 'tmpl-storage-160', materialId: 'mat-4', defaultQty: 2.0 },
  { id: 'bti-22', templateId: 'tmpl-storage-160', materialId: 'mat-7', defaultQty: 6 },
  { id: 'bti-23', templateId: 'tmpl-storage-160', materialId: 'mat-8', defaultQty: 1.0 },
  { id: 'bti-24', templateId: 'tmpl-storage-160', materialId: 'mat-9', defaultQty: 1 },
  { id: 'bti-25', templateId: 'tmpl-storage-160', materialId: 'mat-10', defaultQty: 2 },

  // tmpl-kasur-120
  { id: 'bti-26', templateId: 'tmpl-kasur-120', materialId: 'mat-11', defaultQty: 1.0 },
  { id: 'bti-27', templateId: 'tmpl-kasur-120', materialId: 'mat-12', defaultQty: 4.0 },
  { id: 'bti-28', templateId: 'tmpl-kasur-120', materialId: 'mat-8', defaultQty: 0.5 },

  // tmpl-kasur-160
  { id: 'bti-29', templateId: 'tmpl-kasur-160', materialId: 'mat-11', defaultQty: 1.5 },
  { id: 'bti-30', templateId: 'tmpl-kasur-160', materialId: 'mat-12', defaultQty: 5.5 },
  { id: 'bti-31', templateId: 'tmpl-kasur-160', materialId: 'mat-8', defaultQty: 1.0 },
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
// SEED SALES ORDERS
// ========================================

// SO-1: Hotel Grand Mahakam — SENT
const so1Items = [
  {
    productId: 'prod-1',
    variantId: 'pv-1-3',
    productName: 'Dipan Minimalis Fabric',
    variantLabel: '160x200 cm • Midili (Kain)',
    qty: 2,
    unitPrice: 2650000,
    isCustom: false,
    selectedModifiers: [
      {
        groupId: 'pmg-1',
        groupName: 'Layanan & Garansi Tambahan',
        selectedOptions: [
          { optionId: 'pmo-1', name: 'Garansi Busa 5 Tahun', additionalPrice: 0, bom: [] },
          { optionId: 'pmo-2', name: 'Packaging Kayu Ekstra', additionalPrice: 0, bom: [] },
        ],
      },
    ],
  },
  { productId: 'prod-4', variantId: 'pv-4-6', productName: 'Kasur Rebounded Orthopedic', variantLabel: '160x200 cm • 25 cm', qty: 2, unitPrice: 1950000, isCustom: false },
];

// SO-2: Bpk. Hendra Gunawan — PROCESSING
const so2Items = [
  { productId: 'prod-2', variantId: 'pv-2-3', productName: 'Dipan Storage 2-Laci', variantLabel: '180x200 cm • Oscar (Kulit Sintetis)', qty: 1, unitPrice: 4250000, isCustom: true, customNotes: 'Ganti jok kulit Oscar warna Hitam Doff, tambah sandaran samping kiri.' },
];

// SO-3: Toko Mebel Jaya — PENDING
const so3Items = [
  { productId: 'prod-3', variantId: 'pv-3-2', productName: 'Dipan Headboard Chesterfield', variantLabel: '180x200 cm', qty: 1, unitPrice: 4450000, isCustom: false },
];

// SO-4: CV Fortuna — PENDING
const so4Items = [
  { productId: 'prod-1', variantId: 'pv-1-1', productName: 'Dipan Minimalis Fabric', variantLabel: '120x200 cm • Midili (Kain)', qty: 3, unitPrice: 1750000, isCustom: false },
];

export const initialSalesOrders: SalesOrder[] = [
  {
    id: 'so-1',
    orderNumber: 'SO-2026-001',
    createdBy: 'Budi Santoso',
    salesPhone: '6281298765432',
    customer: { name: 'Hotel Grand Mahakam', phone: '628115551234', address: 'Jl. Mahakam No. 6, Jakarta Selatan' },
    items: so1Items,
    status: 'SENT',
    totalAmount: (2650000 * 2) + (1950000 * 2),
    orderNotes: 'Pengiriman via armada box, mohon konfirmasi H-1 ke pihak penerima hotel.',
    createdAt: '2026-07-01T09:00:00',
    submittedAt: '2026-07-01T09:30:00',
    confirmedAt: '2026-07-02T10:00:00',
    spkIssuedAt: '2026-07-03T08:00:00',
    deliveredAt: '2026-07-22T14:00:00',
    paidAt: '2026-07-22T16:00:00',
    updatedAt: '2026-07-22T14:00:00',
    updatedBy: 'Hasan Basri',
  },
  {
    id: 'so-2',
    orderNumber: 'SO-2026-002',
    createdBy: 'Budi Santoso',
    salesPhone: '6281298765432',
    customer: { name: 'Bpk. Hendra Gunawan', phone: '6281287654321', address: 'Jl. Cipete Raya No. 17, Jakarta Selatan' },
    items: so2Items,
    status: 'PROCESSING',
    totalAmount: 4250000,
    orderNotes: 'Harap pastikan finishing dipan mulus sebelum serah terima.',
    createdAt: '2026-08-05T11:00:00',
    submittedAt: '2026-08-05T11:30:00',
    confirmedAt: '2026-08-06T09:00:00',
    spkIssuedAt: '2026-08-07T08:00:00',
    updatedAt: '2026-08-06T09:00:00',
    updatedBy: 'Dewi Handayani',
  },
  {
    id: 'so-3',
    orderNumber: 'SO-2026-003',
    createdBy: 'Sari Wulandari',
    salesPhone: '6281222243282',
    customer: { name: 'Toko Mebel Jaya - Bp. Agus', phone: '6285612345678', address: 'Jl. Boulevard Raya Blok QJ No. 1, Kelapa Gading, Jakarta Utara' },
    items: so3Items,
    status: 'PENDING',
    totalAmount: 4450000,
    orderNotes: 'Unit pesanan sampel display showroom toko mebel.',
    createdAt: '2026-08-15T08:30:00',
    submittedAt: '2026-08-15T09:00:00',
    confirmedAt: '2026-08-16T10:00:00',
    updatedAt: '2026-08-16T10:00:00',
    updatedBy: 'Dewi Handayani',
  },
  {
    id: 'so-4',
    orderNumber: 'SO-2026-004',
    createdBy: 'Sari Wulandari',
    salesPhone: '6281222243282',
    customer: { name: 'CV Fortuna Properti', phone: '6282198765432', address: 'Jl. Sudirman Kav. 52, Jakarta Pusat' },
    items: so4Items,
    status: 'PENDING',
    totalAmount: 1750000 * 3,
    createdAt: '2026-08-19T14:00:00',
    submittedAt: '2026-08-19T14:30:00',
  },
];

// Helper: Calculate planned production cost from a routing
function calcRoutingCost(routingId: string, qty: number): { labor: number } {
  const routing = initialRoutings.find(r => r.id === routingId);
  if (!routing) return { labor: 0 };
  let labor = 0;
  routing.steps.forEach(step => {
    const op = initialOperations.find(o => o.id === step.operationId);
    if (!op) return;
    if (op.costingMethod === 'fixed') {
      labor += (op.fixedLaborCost || 0) * qty;
    } else {
      const hours = (op.durationMinutes || 0) / 60;
      labor += hours * (op.laborCostPerHour || 0) * qty;
    }
  });
  return { labor };
}

const so1DipanVariant = initialProducts.find(p => p.id === 'prod-1')!.variants.find(v => v.id === 'pv-1-3')!;
const so1KasurVariant = initialProducts.find(p => p.id === 'prod-4')!.variants.find(v => v.id === 'pv-4-5')!;
const so2Variant = initialProducts.find(p => p.id === 'prod-2')!.variants.find(v => v.id === 'pv-2-3')!;

const wo1Cost = calcRoutingCost('rt-1', 2);
const wo2Cost = calcRoutingCost('rt-2', 2);
const wo3Cost = calcRoutingCost('rt-1', 1);

export const initialWorkOrders: WorkOrder[] = [
  {
    id: 'wo-1-1',
    spkNumber: 'SPK-SO-2026-001-1',
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-001',
    productName: 'Dipan Minimalis Fabric',
    variantName: '160x200 cm • Midili (Kain)',
    status: 'COMPLETED',
    jobCards: [
      { id: 'jc-1-1-1', workOrderId: 'wo-1-1', operationId: 'op-1', operationName: 'Potong Kayu Rangka', sequence: 1, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Slamet Riyadi', operatorId: 'op-1', plannedMinutes: 45, startedAt: '2026-07-03T08:00:00', completedAt: '2026-07-03T08:45:00', actualMinutes: 45 },
      { id: 'jc-1-1-2', workOrderId: 'wo-1-1', operationId: 'op-3', operationName: 'Rakit Rangka Besi/Kayu', sequence: 2, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Agus Setiawan', operatorId: 'op-2', plannedMinutes: 60, startedAt: '2026-07-04T08:00:00', completedAt: '2026-07-04T09:00:00', actualMinutes: 60 },
      { id: 'jc-1-1-3', workOrderId: 'wo-1-1', operationId: 'op-4', operationName: 'Jahit & Pasang Jok', sequence: 3, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Rudi Hermawan', operatorId: 'op-4', plannedMinutes: 90, startedAt: '2026-07-05T08:00:00', completedAt: '2026-07-05T09:30:00', actualMinutes: 90 },
      { id: 'jc-1-1-4', workOrderId: 'wo-1-1', operationId: 'op-5', operationName: 'QC & Packing', sequence: 4, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Eko Prasetyo', operatorId: 'op-5', plannedMinutes: 30, startedAt: '2026-07-18T14:00:00', completedAt: '2026-07-18T14:30:00', actualMinutes: 30 },
    ],
    materialsConsumed: so1DipanVariant.bom.map(b => ({ materialId: b.materialId, qty: b.qty })),
    materialCost: calcBOMCost(so1DipanVariant.bom),
    plannedLaborCost: wo1Cost.labor / 2,
    actualLaborCost: wo1Cost.labor / 2,
    issuedAt: '2026-07-03T08:00:00',
    completedAt: '2026-07-18T16:00:00',
    isCustom: false,
  },
  {
    id: 'wo-1-2',
    spkNumber: 'SPK-SO-2026-001-2',
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-001',
    productName: 'Dipan Minimalis Fabric',
    variantName: '160x200 cm • Midili (Kain)',
    status: 'COMPLETED',
    jobCards: [
      { id: 'jc-1-2-1', workOrderId: 'wo-1-2', operationId: 'op-1', operationName: 'Potong Kayu Rangka', sequence: 1, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Slamet Riyadi', operatorId: 'op-1', plannedMinutes: 45, startedAt: '2026-07-03T09:00:00', completedAt: '2026-07-03T09:50:00', actualMinutes: 50 },
      { id: 'jc-1-2-2', workOrderId: 'wo-1-2', operationId: 'op-3', operationName: 'Rakit Rangka Besi/Kayu', sequence: 2, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Agus Setiawan', operatorId: 'op-2', plannedMinutes: 60, startedAt: '2026-07-04T09:30:00', completedAt: '2026-07-04T10:40:00', actualMinutes: 70 },
      { id: 'jc-1-2-3', workOrderId: 'wo-1-2', operationId: 'op-4', operationName: 'Jahit & Pasang Jok', sequence: 3, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Rudi Hermawan', operatorId: 'op-4', plannedMinutes: 90, startedAt: '2026-07-05T10:00:00', completedAt: '2026-07-05T11:30:00', actualMinutes: 90 },
      { id: 'jc-1-2-4', workOrderId: 'wo-1-2', operationId: 'op-5', operationName: 'QC & Packing', sequence: 4, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Eko Prasetyo', operatorId: 'op-5', plannedMinutes: 30, startedAt: '2026-07-18T15:00:00', completedAt: '2026-07-18T15:30:00', actualMinutes: 30 },
    ],
    materialsConsumed: so1DipanVariant.bom.map(b => ({ materialId: b.materialId, qty: b.qty })),
    materialCost: calcBOMCost(so1DipanVariant.bom),
    plannedLaborCost: wo1Cost.labor / 2,
    actualLaborCost: wo1Cost.labor / 2,
    issuedAt: '2026-07-03T08:00:00',
    completedAt: '2026-07-18T16:00:00',
    isCustom: false,
  },
  {
    id: 'wo-3',
    spkNumber: 'SPK-SO-2026-002-1',
    salesOrderId: 'so-2',
    salesOrderNumber: 'SO-2026-002',
    productName: 'Dipan Storage 2-Laci',
    variantName: '180x200 cm • Oscar (Kulit Sintetis)',
    status: 'PROCESSING',
    jobCards: [
      { id: 'jc-3-1', workOrderId: 'wo-3', operationId: 'op-1', operationName: 'Potong Kayu Rangka', sequence: 1, status: 'COMPLETED', targetQty: 1, completedQty: 1, picName: 'Slamet Riyadi', operatorId: 'op-1', plannedMinutes: 45, startedAt: '2026-08-07T08:00:00', completedAt: '2026-08-07T08:50:00', actualMinutes: 50 },
      { id: 'jc-3-2', workOrderId: 'wo-3', operationId: 'op-3', operationName: 'Rakit Rangka Besi/Kayu', sequence: 2, status: 'IN_PROGRESS', targetQty: 1, completedQty: 0, picName: 'Agus Setiawan', operatorId: 'op-2', plannedMinutes: 60, startedAt: '2026-08-08T08:00:00' },
      { id: 'jc-3-3', workOrderId: 'wo-3', operationId: 'op-4', operationName: 'Jahit & Pasang Jok', sequence: 3, status: 'PENDING', targetQty: 1, completedQty: 0, picName: '', plannedMinutes: 90 },
      { id: 'jc-3-4', workOrderId: 'wo-3', operationId: 'op-5', operationName: 'QC & Packing', sequence: 4, status: 'PENDING', targetQty: 1, completedQty: 0, picName: '', plannedMinutes: 30 },
    ],
    materialsConsumed: so2Variant.bom.map(b => ({ ...b })),
    materialCost: calcBOMCost(so2Variant.bom),
    plannedLaborCost: wo3Cost.labor,
    actualLaborCost: 0,
    issuedAt: '2026-08-07T08:00:00',
    isCustom: true,
    customNotes: 'Ganti jok kulit Oscar warna Hitam Doff, tambah sandaran samping kiri.',
  },
];

// ========================================
// SEED PURCHASE ORDERS
// ========================================
export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-001',
    supplier: 'UD Kayu Makmur Jaya',
    createdBy: 'Pak Joko',
    items: [
      { materialId: 'mat-2', materialName: 'Kayu Rangka Mahoni Kering', qty: 5, unitCost: 3500000 },
      { materialId: 'mat-1', materialName: 'Multiplek / Plywood 18mm', qty: 30, unitCost: 220000 },
    ],
    status: 'RECEIVED',
    totalAmount: (5 * 3500000) + (30 * 220000),
    createdAt: '2026-06-20T10:00:00',
    receivedAt: '2026-06-28T09:00:00',
    paymentStatus: 'PAID',
    bankAccountId: 'ba-1',
    paidAt: '2026-06-28T10:00:00',
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-002',
    supplier: 'PT Oscar Leather Indonesia',
    createdBy: 'Pak Joko',
    items: [
      { materialId: 'mat-6', materialName: 'Kulit Sintetis Oscar Premium', qty: 50, unitCost: 55000 },
      { materialId: 'mat-5', materialName: 'Kain Jok Midili Grey/Beige', qty: 60, unitCost: 45000 },
    ],
    status: 'RECEIVED',
    totalAmount: (50 * 55000) + (60 * 45000),
    createdAt: '2026-07-05T11:00:00',
    receivedAt: '2026-07-12T10:00:00',
    paymentStatus: 'UNPAID',
  },
];

// ========================================
// SEED STOCK MOVEMENTS
// ========================================
export const initialStockMovements: StockMovement[] = [
  { id: 'sm-1', materialId: 'mat-2', materialName: 'Kayu Rangka Mahoni Kering', type: 'IN', qty: 5, reference: 'PO-2026-001', date: '2026-06-28T09:00:00' },
  { id: 'sm-2', materialId: 'mat-1', materialName: 'Multiplek / Plywood 18mm', type: 'IN', qty: 30, reference: 'PO-2026-001', date: '2026-06-28T09:00:00' },
  { id: 'sm-3', materialId: 'mat-6', materialName: 'Kulit Sintetis Oscar Premium', type: 'IN', qty: 50, reference: 'PO-2026-002', date: '2026-07-12T10:00:00' },
  { id: 'sm-4', materialId: 'mat-5', materialName: 'Kain Jok Midili Grey/Beige', type: 'IN', qty: 60, reference: 'PO-2026-002', date: '2026-07-12T10:00:00' },
  // Stock OUT for SO-1 production
  { id: 'sm-5', materialId: 'mat-1', materialName: 'Multiplek / Plywood 18mm', type: 'OUT', qty: 4, reference: 'SPK-SO-2026-001-1', date: '2026-07-03T08:30:00' },
  { id: 'sm-6', materialId: 'mat-2', materialName: 'Kayu Rangka Mahoni Kering', type: 'OUT', qty: 0.16, reference: 'SPK-SO-2026-001-1', date: '2026-07-03T08:30:00' },
  { id: 'sm-7', materialId: 'mat-5', materialName: 'Kain Jok Midili Grey/Beige', type: 'OUT', qty: 13, reference: 'SPK-SO-2026-001-1', date: '2026-07-03T08:30:00' },
  { id: 'sm-8', materialId: 'mat-11', materialName: 'Busa Kasur Rebounded D50', type: 'OUT', qty: 2, reference: 'SPK-SO-2026-001-2', date: '2026-07-03T08:30:00' },
  { id: 'sm-9', materialId: 'mat-12', materialName: 'Kain Cover Knitted Kasur', type: 'OUT', qty: 11, reference: 'SPK-SO-2026-001-2', date: '2026-07-03T08:30:00' },
  // Stock OUT for SO-2 production
  { id: 'sm-10', materialId: 'mat-1', materialName: 'Multiplek / Plywood 18mm', type: 'OUT', qty: 3.5, reference: 'SPK-SO-2026-002-1', date: '2026-08-07T08:30:00' },
  { id: 'sm-11', materialId: 'mat-6', materialName: 'Kulit Sintetis Oscar Premium', type: 'OUT', qty: 8, reference: 'SPK-SO-2026-002-1', date: '2026-08-07T08:30:00' },
];

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
// SEED DELIVERY ORDERS
// ========================================
export const initialDeliveryOrders: DeliveryOrder[] = [
  {
    id: 'do-1',
    doNumber: 'DO-2026-001',
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-001',
    customerName: 'Hotel Grand Mahakam',
    customerAddress: 'Jl. Mahakam No. 6, Jakarta Selatan',
    items: ['Dipan Minimalis Fabric (160x200 cm • Bahan Cover: Midili (Kain)) x2', 'Kasur Rebounded Orthopedic (160x200 cm • Ketebalan: 25 cm) x2'],
    assignedDriverName: 'Hasan (Driver)',
    vehiclePlate: 'B 9876 KLM',
    scheduledDate: '2026-07-22',
    status: 'DELIVERED',
    deliveryProofNote: 'Barang diterima oleh Resepsionis Hotel (Ibu Ratna). Kondisi baik, tidak ada kerusakan.',
    deliveredAt: '2026-07-22T14:00:00',
    createdAt: '2026-07-21T10:00:00',
  },
];

// ========================================
// SEED INVOICES (generated at delivery time)
// ========================================
export const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-001',
    salesName: 'Budi Santoso',
    customerName: 'Hotel Grand Mahakam',
    totalAmount: 9200000,
    paidAmount: 9200000,
    status: 'PAID',
    payments: [
      { id: 'pay-1', amount: 4600000, method: 'Bank BCA', date: '2026-07-02T14:00:00', note: 'DP 50%', confirmedBy: 'Budi Santoso' },
      { id: 'pay-2', amount: 4600000, method: 'Bank BCA', date: '2026-07-22T16:00:00', note: 'Pelunasan', confirmedBy: 'Budi Santoso' },
    ],
    issuedAt: '2026-07-22T14:30:00',
    createdAt: '2026-07-22T14:30:00',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    salesOrderId: 'so-2',
    salesOrderNumber: 'SO-2026-002',
    salesName: 'Budi Santoso',
    customerName: 'Bpk. Hendra Gunawan',
    totalAmount: 4250000,
    paidAmount: 2125000,
    status: 'PARTIAL',
    payments: [
      { id: 'pay-3', amount: 2125000, method: 'Bank Mandiri', date: '2026-08-06T11:00:00', note: 'DP 50%', confirmedBy: 'Budi Santoso' },
    ],
    issuedAt: '2026-08-06T09:30:00',
    createdAt: '2026-08-06T09:30:00',
  },
];

// ========================================
// SEED COMPANY ASSETS (Overhead components)
// ========================================
export const initialAssets: CompanyAsset[] = [
  {
    id: 'ast-1',
    code: 'AST-MSN-001',
    name: 'Mesin Potong Busa Vertical Band',
    category: 'Mesin',
    purchaseDate: '2024-01-15',
    purchaseCost: 18000000,
    usefulLifeYears: 5,
    monthlyDepreciation: 18000000 / (5 * 12), // Rp 300,000
    accumulatedServiceCost: 850000,
    status: 'AKTIF',
  },
  {
    id: 'ast-2',
    code: 'AST-KND-001',
    name: 'Pickup Suzuki Carry Box Pengiriman',
    category: 'Kendaraan',
    purchaseDate: '2023-06-10',
    purchaseCost: 144000000,
    usefulLifeYears: 8,
    monthlyDepreciation: 144000000 / (8 * 12), // Rp 1,500,000
    accumulatedServiceCost: 4500000,
    status: 'AKTIF',
  },
  {
    id: 'ast-3',
    code: 'AST-PLT-001',
    name: 'Kompresor Udara Screw Krisbow 5HP',
    category: 'Peralatan',
    purchaseDate: '2024-03-20',
    purchaseCost: 9600000,
    usefulLifeYears: 4,
    monthlyDepreciation: 9600000 / (4 * 12), // Rp 200,000
    accumulatedServiceCost: 350000,
    status: 'AKTIF',
  },
  {
    id: 'ast-4',
    code: 'AST-ALT-001',
    name: 'Mesin Jahit Singer Heavy Duty Industrial',
    category: 'Alat Kerja',
    purchaseDate: '2024-02-05',
    purchaseCost: 5400000,
    usefulLifeYears: 3,
    monthlyDepreciation: 5400000 / (3 * 12), // Rp 150,000
    accumulatedServiceCost: 150000,
    status: 'MAINTENANCE',
  },
];

// ========================================
// SEED COMPANY ASSET SERVICE LOGS
// ========================================
export const initialAssetServiceLogs: CompanyAssetServiceLog[] = [
  {
    id: 'asl-1',
    assetId: 'ast-1',
    assetCode: 'AST-MSN-001',
    assetName: 'Mesin Potong Busa Vertical Band',
    serviceDate: '2024-03-10',
    cost: 350000,
    description: 'Ganti pisau gergaji vertical band',
  },
  {
    id: 'asl-2',
    assetId: 'ast-1',
    assetCode: 'AST-MSN-001',
    assetName: 'Mesin Potong Busa Vertical Band',
    serviceDate: '2024-07-15',
    cost: 500000,
    description: 'Servis dinamo motor utama dan kelistrikan',
  },
  {
    id: 'asl-3',
    assetId: 'ast-2',
    assetCode: 'AST-KND-001',
    assetName: 'Pickup Suzuki Carry Box Pengiriman',
    serviceDate: '2023-12-12',
    cost: 1500000,
    description: 'Servis rutin berkala 10.000 km dan ganti oli mesin',
  },
  {
    id: 'asl-4',
    assetId: 'ast-2',
    assetCode: 'AST-KND-001',
    assetName: 'Pickup Suzuki Carry Box Pengiriman',
    serviceDate: '2024-05-20',
    cost: 3000000,
    description: 'Ganti 4 buah ban luar baru & wheel balancing',
  },
  {
    id: 'asl-5',
    assetId: 'ast-3',
    assetCode: 'AST-PLT-001',
    assetName: 'Kompresor Udara Screw Krisbow 5HP',
    serviceDate: '2024-06-01',
    cost: 350000,
    description: 'Penggantian filter udara dan oli kompresor',
  },
  {
    id: 'asl-6',
    assetId: 'ast-4',
    assetCode: 'AST-ALT-001',
    assetName: 'Mesin Jahit Singer Heavy Duty Industrial',
    serviceDate: '2024-08-01',
    cost: 150000,
    description: 'Kalibrasi jarum jahit dan ganti suku cadang gear kecil',
  },
];

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
  { id: 'ba-2', name: 'Bank Mandiri', accountNumber: '1370012345678', balance: 25000000 },
  { id: 'ba-3', name: 'Kas Kecil', balance: 5000000 },
];

export const initialExpenses: Expense[] = [
  { id: 'exp-1', category: 'SEWA', amount: 5000000, date: '2026-05-01T08:00:00.000Z', bankAccountId: 'ba-2', note: 'Sewa ruko pabrik bulanan' },
  { id: 'exp-2', category: 'LISTRIK_AIR', amount: 850000, date: '2026-05-10T10:30:00.000Z', bankAccountId: 'ba-3', note: 'Tagihan listrik & air pabrik' },
  { id: 'exp-3', category: 'GAJI', amount: 15000000, date: '2026-05-25T17:00:00.000Z', bankAccountId: 'ba-1', note: 'Gaji karyawan admin & operational' },
  { id: 'exp-4', category: 'ATK', amount: 250000, date: '2026-06-02T11:00:00.000Z', bankAccountId: 'ba-3', note: 'Beli kertas HVS, pulpen & tinta printer' },
];

// ========================================
// CHART OF ACCOUNTS & SEED JOURNAL ENTRIES
// ========================================
export const initialChartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS;

export const initialJournalEntries: JournalEntry[] = [
  // 1. Opening Balances
  {
    id: 'je-seed-1',
    entryNumber: 'JE-2026-0001',
    date: '2026-01-01T00:00:00.000Z',
    description: 'Saldo Awal Rekening: Bank BCA (8000456123)',
    sourceType: 'OPENING_BALANCE',
    sourceId: 'ba-1',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank BCA)', debit: 50000000, credit: 0 },
      { accountId: 'coa-31000', accountCode: '3-1000', accountName: 'Modal Disetor', debit: 0, credit: 50000000 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'je-seed-2',
    entryNumber: 'JE-2026-0002',
    date: '2026-01-01T00:00:00.000Z',
    description: 'Saldo Awal Rekening: Bank Mandiri (1370012345678)',
    sourceType: 'OPENING_BALANCE',
    sourceId: 'ba-2',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank Mandiri)', debit: 25000000, credit: 0 },
      { accountId: 'coa-31000', accountCode: '3-1000', accountName: 'Modal Disetor', debit: 0, credit: 25000000 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'je-seed-3',
    entryNumber: 'JE-2026-0003',
    date: '2026-01-01T00:00:00.000Z',
    description: 'Saldo Awal Rekening: Kas Kecil',
    sourceType: 'OPENING_BALANCE',
    sourceId: 'ba-3',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Kas Kecil)', debit: 5000000, credit: 0 },
      { accountId: 'coa-31000', accountCode: '3-1000', accountName: 'Modal Disetor', debit: 0, credit: 5000000 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },

  // 2. PO Seed Journals
  {
    id: 'je-seed-4',
    entryNumber: 'JE-2026-0004',
    date: '2026-06-28T09:00:00.000Z',
    description: 'Penerimaan Bahan Baku Masuk Gudang — PO #PO-2026-001 (UD Kayu Makmur Jaya)',
    sourceType: 'PO_RECEIVED',
    sourceId: 'po-1',
    lines: [
      { accountId: 'coa-11300', accountCode: '1-1300', accountName: 'Persediaan Bahan Baku', debit: 24100000, credit: 0 },
      { accountId: 'coa-21100', accountCode: '2-1100', accountName: 'Hutang Dagang (UD Kayu Makmur Jaya)', debit: 0, credit: 24100000 },
    ],
    createdAt: '2026-06-28T09:00:00.000Z',
  },
  {
    id: 'je-seed-5',
    entryNumber: 'JE-2026-0005',
    date: '2026-06-28T10:00:00.000Z',
    description: 'Pelunasan Hutang Supplier — PO #PO-2026-001 (UD Kayu Makmur Jaya)',
    sourceType: 'PO_PAYMENT',
    sourceId: 'po-1',
    lines: [
      { accountId: 'coa-21100', accountCode: '2-1100', accountName: 'Hutang Dagang (UD Kayu Makmur Jaya)', debit: 24100000, credit: 0 },
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank BCA)', debit: 0, credit: 24100000 },
    ],
    createdAt: '2026-06-28T10:00:00.000Z',
  },
  {
    id: 'je-seed-6',
    entryNumber: 'JE-2026-0006',
    date: '2026-07-12T10:00:00.000Z',
    description: 'Penerimaan Bahan Baku Masuk Gudang — PO #PO-2026-002 (PT Oscar Leather Indonesia)',
    sourceType: 'PO_RECEIVED',
    sourceId: 'po-2',
    lines: [
      { accountId: 'coa-11300', accountCode: '1-1300', accountName: 'Persediaan Bahan Baku', debit: 5450000, credit: 0 },
      { accountId: 'coa-21100', accountCode: '2-1100', accountName: 'Hutang Dagang (PT Oscar Leather Indonesia)', debit: 0, credit: 5450000 },
    ],
    createdAt: '2026-07-12T10:00:00.000Z',
  },

  // 3. Invoice Seed Journals
  {
    id: 'je-seed-7',
    entryNumber: 'JE-2026-0007',
    date: '2026-07-22T14:30:00.000Z',
    description: 'Pengakuan Piutang & Pendapatan — Invoice #INV-2026-001 (Hotel Grand Mahakam)',
    sourceType: 'INVOICE_ISSUED',
    sourceId: 'inv-1',
    lines: [
      { accountId: 'coa-11200', accountCode: '1-1200', accountName: 'Piutang Dagang', debit: 9200000, credit: 0 },
      { accountId: 'coa-41000', accountCode: '4-1000', accountName: 'Pendapatan Penjualan Produk', debit: 0, credit: 9200000 },
    ],
    createdAt: '2026-07-22T14:30:00.000Z',
  },
  {
    id: 'je-seed-8',
    entryNumber: 'JE-2026-0008',
    date: '2026-07-02T14:00:00.000Z',
    description: 'Penerimaan Kas Piutang — Invoice #INV-2026-001 (Hotel Grand Mahakam) - DP 50%',
    sourceType: 'INVOICE_PAYMENT',
    sourceId: 'inv-1',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank BCA)', debit: 4600000, credit: 0 },
      { accountId: 'coa-11200', accountCode: '1-1200', accountName: 'Piutang Dagang', debit: 0, credit: 4600000 },
    ],
    createdAt: '2026-07-02T14:00:00.000Z',
  },
  {
    id: 'je-seed-9',
    entryNumber: 'JE-2026-0009',
    date: '2026-07-22T16:00:00.000Z',
    description: 'Penerimaan Kas Piutang — Invoice #INV-2026-001 (Hotel Grand Mahakam) - Pelunasan',
    sourceType: 'INVOICE_PAYMENT',
    sourceId: 'inv-1',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank BCA)', debit: 4600000, credit: 0 },
      { accountId: 'coa-11200', accountCode: '1-1200', accountName: 'Piutang Dagang', debit: 0, credit: 4600000 },
    ],
    createdAt: '2026-07-22T16:00:00.000Z',
  },
  {
    id: 'je-seed-10',
    entryNumber: 'JE-2026-0010',
    date: '2026-08-06T09:30:00.000Z',
    description: 'Pengakuan Piutang & Pendapatan — Invoice #INV-2026-002 (Bpk. Hendra Gunawan)',
    sourceType: 'INVOICE_ISSUED',
    sourceId: 'inv-2',
    lines: [
      { accountId: 'coa-11200', accountCode: '1-1200', accountName: 'Piutang Dagang', debit: 4250000, credit: 0 },
      { accountId: 'coa-41000', accountCode: '4-1000', accountName: 'Pendapatan Penjualan Produk', debit: 0, credit: 4250000 },
    ],
    createdAt: '2026-08-06T09:30:00.000Z',
  },
  {
    id: 'je-seed-11',
    entryNumber: 'JE-2026-0011',
    date: '2026-08-06T11:00:00.000Z',
    description: 'Penerimaan Kas Piutang — Invoice #INV-2026-002 (Bpk. Hendra Gunawan) - DP 50%',
    sourceType: 'INVOICE_PAYMENT',
    sourceId: 'inv-2',
    lines: [
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank Mandiri)', debit: 2125000, credit: 0 },
      { accountId: 'coa-11200', accountCode: '1-1200', accountName: 'Piutang Dagang', debit: 0, credit: 2125000 },
    ],
    createdAt: '2026-08-06T11:00:00.000Z',
  },

  // 4. Expenses Seed Journals
  {
    id: 'je-seed-12',
    entryNumber: 'JE-2026-0012',
    date: '2026-05-01T08:00:00.000Z',
    description: 'Beban Beban Sewa Gudang & Tempat — Sewa ruko pabrik bulanan',
    sourceType: 'EXPENSE',
    sourceId: 'exp-1',
    lines: [
      { accountId: 'coa-63000', accountCode: '6-3000', accountName: 'Beban Sewa Gudang & Tempat', debit: 5000000, credit: 0 },
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank Mandiri)', debit: 0, credit: 5000000 },
    ],
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'je-seed-13',
    entryNumber: 'JE-2026-0013',
    date: '2026-05-10T10:30:00.000Z',
    description: 'Beban Beban Listrik, Air & Internet — Tagihan listrik & air pabrik',
    sourceType: 'EXPENSE',
    sourceId: 'exp-2',
    lines: [
      { accountId: 'coa-62000', accountCode: '6-2000', accountName: 'Beban Listrik, Air & Internet', debit: 850000, credit: 0 },
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Kas Kecil)', debit: 0, credit: 850000 },
    ],
    createdAt: '2026-05-10T10:30:00.000Z',
  },
  {
    id: 'je-seed-14',
    entryNumber: 'JE-2026-0014',
    date: '2026-05-25T17:00:00.000Z',
    description: 'Beban Beban Gaji Staf & Administrasi — Gaji karyawan admin & operational',
    sourceType: 'EXPENSE',
    sourceId: 'exp-3',
    lines: [
      { accountId: 'coa-61000', accountCode: '6-1000', accountName: 'Beban Gaji Staf & Administrasi', debit: 15000000, credit: 0 },
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Bank BCA)', debit: 0, credit: 15000000 },
    ],
    createdAt: '2026-05-25T17:00:00.000Z',
  },
  {
    id: 'je-seed-15',
    entryNumber: 'JE-2026-0015',
    date: '2026-06-02T11:00:00.000Z',
    description: 'Beban Beban ATK & Perlengkapan Kantor — Beli kertas HVS, pulpen & tinta printer',
    sourceType: 'EXPENSE',
    sourceId: 'exp-4',
    lines: [
      { accountId: 'coa-65000', accountCode: '6-5000', accountName: 'Beban ATK & Perlengkapan Kantor', debit: 250000, credit: 0 },
      { accountId: 'coa-11100', accountCode: '1-1100', accountName: 'Kas & Bank (Kas Kecil)', debit: 0, credit: 250000 },
    ],
    createdAt: '2026-06-02T11:00:00.000Z',
  },
];



