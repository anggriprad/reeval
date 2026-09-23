import type {
  AccountCode,
  AccountType,
  JournalEntry,
  JournalEntryLine,
  Invoice,
  PurchaseOrder,
  Expense,
  OtherIncome,
  BankAccount,
  RawMaterial,
  CompanyAsset,
} from './types';
import { generateId } from './utils';

// ============================================================================
// 1. DEFAULT CHART OF ACCOUNTS (Standard PSAK / Manufacturing Indonesia)
// ============================================================================

export const DEFAULT_CHART_OF_ACCOUNTS: AccountCode[] = [
  // ── 1-0000: ASET ──
  {
    id: 'coa-10000',
    code: '1-0000',
    name: 'Aset',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    isHeader: true,
    level: 1,
    description: 'Seluruh sumber daya ekonomi yang dimiliki perusahaan',
    isSystem: true,
  },
  {
    id: 'coa-11000',
    code: '1-1000',
    name: 'Aset Lancar',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-10000',
    isHeader: true,
    level: 2,
    description: 'Aset yang dapat dicairkan dalam waktu kurang dari satu tahun',
    isSystem: true,
  },
  {
    id: 'coa-11100',
    code: '1-1100',
    name: 'Kas & Bank',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-11000',
    isHeader: false,
    level: 3,
    description: 'Saldo kas fisik dan rekening bank operasional',
    isSystem: true,
  },
  {
    id: 'coa-11200',
    code: '1-1200',
    name: 'Piutang Dagang',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-11000',
    isHeader: false,
    level: 3,
    description: 'Tagihan penjualan kepada pelanggan yang belum terbayar',
    isSystem: true,
  },
  {
    id: 'coa-11300',
    code: '1-1300',
    name: 'Persediaan Bahan Baku',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-11000',
    isHeader: false,
    level: 3,
    description: 'Nilai inventaris stok bahan baku di gudang',
    isSystem: true,
  },
  {
    id: 'coa-12000',
    code: '1-2000',
    name: 'Aset Tetap & Peralatan',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-10000',
    isHeader: true,
    level: 2,
    description: 'Aset berwujud jangka panjang untuk kegiatan produksi dan operasional',
    isSystem: true,
  },
  {
    id: 'coa-12100',
    code: '1-2100',
    name: 'Mesin & Peralatan Pabrik',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-12000',
    isHeader: false,
    level: 3,
    description: 'Nilai perolehan mesin potong, jahit, rakit, dan peralatan kerja',
    isSystem: false,
  },
  {
    id: 'coa-12200',
    code: '1-2200',
    name: 'Kendaraan Operasional',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: 'coa-12000',
    isHeader: false,
    level: 3,
    description: 'Mobil box dan armada logistik pengiriman',
    isSystem: false,
  },
  {
    id: 'coa-12900',
    code: '1-2900',
    name: 'Akumulasi Penyusutan Aset Tetap',
    type: 'ASSET',
    normalBalance: 'CREDIT',
    parentId: 'coa-12000',
    isHeader: false,
    level: 3,
    description: 'Akumulasi depresiasi mesin dan peralatan (kontra aset)',
    isSystem: false,
  },

  // ── 2-0000: LIABILITAS ──
  {
    id: 'coa-20000',
    code: '2-0000',
    name: 'Liabilitas',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    isHeader: true,
    level: 1,
    description: 'Kewajiban finansial perusahaan kepada pihak eksternal',
    isSystem: true,
  },
  {
    id: 'coa-21000',
    code: '2-1000',
    name: 'Liabilitas Jangka Pendek',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentId: 'coa-20000',
    isHeader: true,
    level: 2,
    description: 'Kewajiban jatuh tempo dalam waktu satu tahun',
    isSystem: true,
  },
  {
    id: 'coa-21100',
    code: '2-1100',
    name: 'Hutang Dagang (AP)',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentId: 'coa-21000',
    isHeader: false,
    level: 3,
    description: 'Kewajiban tagihan Purchase Order supplier bahan baku',
    isSystem: true,
  },
  {
    id: 'coa-21200',
    code: '2-1200',
    name: 'Hutang Beban Operasional',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentId: 'coa-21000',
    isHeader: false,
    level: 3,
    description: 'Beban yang sudah terjadi namun belum dibayarkan',
    isSystem: false,
  },
  {
    id: 'coa-21300',
    code: '2-1300',
    name: 'Hutang Pinjaman',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentId: 'coa-21000',
    isHeader: false,
    level: 3,
    description: 'Pinjaman dari pihak ketiga (individu, lembaga keuangan)',
    isSystem: false,
  },

  // ── 3-0000: EKUITAS ──
  {
    id: 'coa-30000',
    code: '3-0000',
    name: 'Ekuitas',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    isHeader: true,
    level: 1,
    description: 'Hak residual pemilik atas aset perusahaan setelah dikurangi liabilitas',
    isSystem: true,
  },
  {
    id: 'coa-31000',
    code: '3-1000',
    name: 'Modal Disetor',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    parentId: 'coa-30000',
    isHeader: false,
    level: 2,
    description: 'Modal awal dan setoran modal tambahan dari pemilik',
    isSystem: true,
  },
  {
    id: 'coa-32000',
    code: '3-2000',
    name: 'Laba Ditahan',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    parentId: 'coa-30000',
    isHeader: false,
    level: 2,
    description: 'Akumulasi laba bersih periode sebelumnya yang ditahan perusahaan',
    isSystem: true,
  },

  // ── 4-0000: PENDAPATAN ──
  {
    id: 'coa-40000',
    code: '4-0000',
    name: 'Pendapatan Usaha',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    isHeader: true,
    level: 1,
    description: 'Arus masuk kas/piutang dari aktivitas penjualan produk manufaktur',
    isSystem: true,
  },
  {
    id: 'coa-41000',
    code: '4-1000',
    name: 'Pendapatan Penjualan Produk',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    parentId: 'coa-40000',
    isHeader: false,
    level: 2,
    description: 'Hasil omzet penjualan pesanan barang jadi (Sales Order)',
    isSystem: true,
  },
  {
    id: 'coa-42000',
    code: '4-2000',
    name: 'Pendapatan Lain-lain',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    parentId: 'coa-40000',
    isHeader: false,
    level: 2,
    description: 'Pendapatan di luar penjualan produk (limbah, bunga bank, dll.)',
    isSystem: false,
  },

  // ── 5-0000: HARGA POKOK PENJUALAN (HPP / COGS) ──
  {
    id: 'coa-50000',
    code: '5-0000',
    name: 'Harga Pokok Penjualan (HPP)',
    type: 'COGS',
    normalBalance: 'DEBIT',
    isHeader: true,
    level: 1,
    description: 'Biaya langsung yang timbul dalam proses manufaktur produk jadi',
    isSystem: true,
  },
  {
    id: 'coa-51000',
    code: '5-1000',
    name: 'Biaya Bahan Baku Terpakai (BOM)',
    type: 'COGS',
    normalBalance: 'DEBIT',
    parentId: 'coa-50000',
    isHeader: false,
    level: 2,
    description: 'Biaya material yang dikonsumsi langsung dalam proses produksi SPK',
    isSystem: true,
  },
  {
    id: 'coa-52000',
    code: '5-2000',
    name: 'Upah Tenaga Kerja Langsung',
    type: 'COGS',
    normalBalance: 'DEBIT',
    parentId: 'coa-50000',
    isHeader: false,
    level: 2,
    description: 'Upah operator produksi per jam/SPK di lantai pabrik',
    isSystem: true,
  },
  {
    id: 'coa-53000',
    code: '5-3000',
    name: 'Biaya Overhead Pabrik',
    type: 'COGS',
    normalBalance: 'DEBIT',
    parentId: 'coa-50000',
    isHeader: false,
    level: 2,
    description: 'Beban utilitas mesin, pemeliharaan alat, dan consumables produksi',
    isSystem: true,
  },

  // ── 6-0000: BEBAN OPERASIONAL (OPEX) ──
  {
    id: 'coa-60000',
    code: '6-0000',
    name: 'Beban Operasional & Umum',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    isHeader: true,
    level: 1,
    description: 'Biaya non-produksi untuk menjalankan kegiatan operasional kantor & administrasi',
    isSystem: true,
  },
  {
    id: 'coa-61000',
    code: '6-1000',
    name: 'Beban Gaji Staf & Administrasi',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'Gaji staf kantor, sales, admin, dan manajemen non-pabrik',
    isSystem: false,
  },
  {
    id: 'coa-62000',
    code: '6-2000',
    name: 'Beban Listrik, Air & Internet',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'Tagihan PLN, PDAM, internet, dan utilitas kantor',
    isSystem: false,
  },
  {
    id: 'coa-63000',
    code: '6-3000',
    name: 'Beban Sewa Gudang & Tempat',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'Biaya sewa ruang kantor, workshop, atau gudang',
    isSystem: false,
  },
  {
    id: 'coa-64000',
    code: '6-4000',
    name: 'Beban BBM, Logistik & Transportasi',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'BBM armada pengiriman, tol, parkir, dan ekspedisi luar',
    isSystem: false,
  },
  {
    id: 'coa-65000',
    code: '6-5000',
    name: 'Beban ATK & Perlengkapan Kantor',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'Kertas, printer ink, stationary, dan perkakas kecil kantor',
    isSystem: false,
  },
  {
    id: 'coa-66000',
    code: '6-6000',
    name: 'Beban Perawatan & Servis Aset',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'Biaya servis berkala dan reparasi mesin/kendaraan',
    isSystem: false,
  },
  {
    id: 'coa-69000',
    code: '6-9000',
    name: 'Beban Operasional Lain-lain',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentId: 'coa-60000',
    isHeader: false,
    level: 2,
    description: 'Pengeluaran insidental operasional yang tidak terkategori khusus',
    isSystem: false,
  },
];

// ============================================================================
// 2. ACCOUNT FINDER & MAPPER HELPERS
// ============================================================================

export function getAccountByCode(code: string, coa: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS): AccountCode | undefined {
  return coa.find(a => a.code === code);
}

export function getAccountById(id: string, coa: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS): AccountCode | undefined {
  return coa.find(a => a.id === id);
}

export function mapExpenseCategoryToCoa(category: Expense['category']): { code: string; name: string } {
  switch (category) {
    case 'GAJI':
      return { code: '6-1000', name: 'Beban Gaji Staf & Administrasi' };
    case 'LISTRIK_AIR':
      return { code: '6-2000', name: 'Beban Listrik, Air & Internet' };
    case 'SEWA':
      return { code: '6-3000', name: 'Beban Sewa Gudang & Tempat' };
    case 'TRANSPORT':
      return { code: '6-4000', name: 'Beban BBM, Logistik & Transportasi' };
    case 'ATK':
      return { code: '6-5000', name: 'Beban ATK & Perlengkapan Kantor' };
    case 'LAINNYA':
    default:
      return { code: '6-9000', name: 'Beban Operasional Lain-lain' };
  }
}

// ============================================================================
// 3. AUTO JOURNAL ENTRY GENERATOR HELPERS (Double-Entry Bookkeeping)
// ============================================================================

function generateEntryNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  return `JE-${year}-${String(existingCount + 1).padStart(4, '0')}`;
}

// Helper to resolve account from dynamic COA with robust fallback matching
export function resolveAccount(
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS,
  targetId: string,
  fallbackCode: string,
  fallbackCategory?: AccountType
): { id: string; code: string; name: string } {
  // 1. Try finding exact ID match
  const byId = chartOfAccounts.find(a => a.id === targetId);
  if (byId) return { id: byId.id, code: byId.code, name: byId.name };

  // 2. Try finding exact code match
  const byCode = chartOfAccounts.find(a => a.code === fallbackCode);
  if (byCode) return { id: byCode.id, code: byCode.code, name: byCode.name };

  // 3. Try finding by category match (non-header)
  if (fallbackCategory) {
    const byCategory = chartOfAccounts.find(a => a.type === fallbackCategory && !a.isHeader);
    if (byCategory) return { id: byCategory.id, code: byCategory.code, name: byCategory.name };
  }

  // 4. Fallback default representation
  return { id: targetId, code: fallbackCode, name: `Akun (${fallbackCode})` };
}

/**
 * 1. Opening Balance Journal for a newly created bank account
 * Debit: Kas & Bank (1-1100)
 * Credit: Modal Disetor (3-1000)
 */
export function createOpeningBalanceJournal(
  bankAccount: BankAccount,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');
  const modalDisetor = resolveAccount(chartOfAccounts, 'coa-31000', '3-1000', 'EQUITY');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Saldo Awal ${bankAccount.name}`,
    sourceType: 'OPENING_BALANCE',
    sourceId: bankAccount.id,
    lines: [
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: bankAccount.balance,
        credit: 0,
      },
      {
        accountId: modalDisetor.id,
        accountCode: modalDisetor.code,
        accountName: modalDisetor.name,
        debit: 0,
        credit: bankAccount.balance,
      },
    ],
    createdAt: date,
  };
}

/**
 * 2. Invoice Issued Journal (Revenue Recognition on Delivery)
 * Debit: Piutang Dagang (1-1200)
 * Credit: Pendapatan Penjualan (4-1000)
 */
export function createInvoiceIssuedJournal(
  invoice: Invoice,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const piutang = resolveAccount(chartOfAccounts, 'coa-11200', '1-1200', 'ASSET');
  const pendapatan = resolveAccount(chartOfAccounts, 'coa-41000', '4-1000', 'REVENUE');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Penjualan ${invoice.customerName} #${invoice.invoiceNumber}`,
    sourceType: 'INVOICE_ISSUED',
    sourceId: invoice.id,
    lines: [
      {
        accountId: piutang.id,
        accountCode: piutang.code,
        accountName: piutang.name,
        debit: invoice.totalAmount,
        credit: 0,
      },
      {
        accountId: pendapatan.id,
        accountCode: pendapatan.code,
        accountName: pendapatan.name,
        debit: 0,
        credit: invoice.totalAmount,
      },
    ],
    createdAt: date,
  };
}

/**
 * 3. Invoice Payment Receipt Journal (AR Settlement)
 * Debit: Kas & Bank (1-1100)
 * Credit: Piutang Dagang (1-1200)
 */
export function createInvoicePaymentJournal(
  invoice: Invoice,
  amount: number,
  bankAccountName: string,
  existingEntriesCount: number,
  note?: string,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');
  const piutang = resolveAccount(chartOfAccounts, 'coa-11200', '1-1200', 'ASSET');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Pembayaran Penjualan ${invoice.customerName} #${invoice.invoiceNumber}${note ? ` (${note})` : ''}`,
    sourceType: 'INVOICE_PAYMENT',
    sourceId: invoice.id,
    lines: [
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: amount,
        credit: 0,
      },
      {
        accountId: piutang.id,
        accountCode: piutang.code,
        accountName: piutang.name,
        debit: 0,
        credit: amount,
      },
    ],
    createdAt: date,
  };
}

/**
 * 4. Purchase Order Received Journal (Inventory Asset & AP Recognition)
 * Debit: Persediaan Bahan Baku (1-1300)
 * Credit: Hutang Dagang Supplier (2-1100)
 */
export function createPOReceivedJournal(
  po: PurchaseOrder,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const persediaan = resolveAccount(chartOfAccounts, 'coa-11300', '1-1300', 'ASSET');
  const hutang = resolveAccount(chartOfAccounts, 'coa-21100', '2-1100', 'LIABILITY');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Pembelanjaan ${po.supplier} #${po.poNumber}`,
    sourceType: 'PO_RECEIVED',
    sourceId: po.id,
    lines: [
      {
        accountId: persediaan.id,
        accountCode: persediaan.code,
        accountName: persediaan.name,
        debit: po.totalAmount,
        credit: 0,
      },
      {
        accountId: hutang.id,
        accountCode: hutang.code,
        accountName: hutang.name,
        debit: 0,
        credit: po.totalAmount,
      },
    ],
    createdAt: date,
  };
}

/**
 * Reversal PO Received Journal (Pembatalan Penerimaan PO)
 * Debit: Hutang Dagang Supplier (2-1100) -> Menghapus Hutang
 * Credit: Persediaan Bahan Baku (1-1300) -> Menghapus Persediaan
 */
export function createReversalPOReceivedJournal(
  po: PurchaseOrder,
  existingEntriesCount: number,
  reason?: string,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const persediaan = resolveAccount(chartOfAccounts, 'coa-11300', '1-1300', 'ASSET');
  const hutang = resolveAccount(chartOfAccounts, 'coa-21100', '2-1100', 'LIABILITY');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Pembatalan/Retur PO #${po.poNumber}${reason ? `: ${reason}` : ''}`,
    sourceType: 'REVERSAL_PO_RECEIVED',
    sourceId: po.id,
    lines: [
      {
        accountId: hutang.id,
        accountCode: hutang.code,
        accountName: hutang.name,
        debit: po.totalAmount,
        credit: 0,
      },
      {
        accountId: persediaan.id,
        accountCode: persediaan.code,
        accountName: persediaan.name,
        debit: 0,
        credit: po.totalAmount,
      },
    ],
    createdAt: date,
  };
}

/**
 * Reversal Direct Purchase Journal (Pembatalan Pembelian Langsung Cash)
 * Debit: Kas & Bank (1-1100) -> Pengembalian Kas
 * Credit: Persediaan Bahan Baku (1-1300) -> Menghapus Persediaan
 */
export function createReversalDirectPurchaseJournal(
  po: PurchaseOrder,
  existingEntriesCount: number,
  reason?: string,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const persediaan = resolveAccount(chartOfAccounts, 'coa-11300', '1-1300', 'ASSET');
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Pembatalan Pembelian Langsung #${po.poNumber}${reason ? `: ${reason}` : ''}`,
    sourceType: 'REVERSAL_DIRECT_PURCHASE',
    sourceId: po.id,
    lines: [
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: po.totalAmount,
        credit: 0,
      },
      {
        accountId: persediaan.id,
        accountCode: persediaan.code,
        accountName: persediaan.name,
        debit: 0,
        credit: po.totalAmount,
      },
    ],
    createdAt: date,
  };
}

/**
 * 5. Purchase Order Settlement Journal (AP Payment)
 * Debit: Hutang Dagang Supplier (2-1100)
 * Credit: Kas & Bank (1-1100)
 */
export function createPOPaymentJournal(
  po: PurchaseOrder,
  bankAccountName: string,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const hutang = resolveAccount(chartOfAccounts, 'coa-21100', '2-1100', 'LIABILITY');
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Pelunasan Pembelanjaan ${po.supplier} #${po.poNumber}`,
    sourceType: 'PO_PAYMENT',
    sourceId: po.id,
    lines: [
      {
        accountId: hutang.id,
        accountCode: hutang.code,
        accountName: hutang.name,
        debit: po.totalAmount,
        credit: 0,
      },
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: 0,
        credit: po.totalAmount,
      },
    ],
    createdAt: date,
  };
}

/**
 * Direct Purchase Journal (Pembelian Langsung - Tanpa PO & Tanpa AP)
 * Debit: Persediaan Bahan Baku (1-1300) -> Nilai Item
 * Debit (jika ada): Biaya Operasional / Kirim (6-1900 atau 6-1000) -> Biaya Tambahan
 * Credit: Kas & Bank (1-1100) -> Total Pembayaran
 */
export function createDirectPurchaseJournal(
  po: PurchaseOrder,
  bankAccountName: string,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const persediaan = resolveAccount(chartOfAccounts, 'coa-11300', '1-1300', 'ASSET');
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');
  const itemsTotal = po.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
  const additional = po.additionalCost || 0;

  const lines: JournalEntryLine[] = [
    {
      accountId: persediaan.id,
      accountCode: persediaan.code,
      accountName: persediaan.name,
      debit: itemsTotal,
      credit: 0,
    },
  ];

  if (additional > 0) {
    const biayaLain = resolveAccount(chartOfAccounts, 'coa-61900', '6-1900', 'EXPENSE');
    lines.push({
      accountId: biayaLain.id,
      accountCode: biayaLain.code,
      accountName: biayaLain.name,
      debit: additional,
      credit: 0,
    });
  }

  lines.push({
    accountId: kasBank.id,
    accountCode: kasBank.code,
    accountName: kasBank.name,
    debit: 0,
    credit: po.totalAmount,
  });

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Pembelian Langsung ${po.supplier} #${po.poNumber} (${bankAccountName})`,
    sourceType: 'PO_PAYMENT',
    sourceId: po.id,
    lines,
    createdAt: date,
  };
}

/**
 * 6. Operational Expense Journal
 * Debit: Beban Operasional 6-xxxx
 * Credit: Kas & Bank (1-1100)
 */
export function createExpenseJournal(
  expense: Expense,
  bankAccountName: string,
  existingEntriesCount: number,
  date: string = expense.date || new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const coaMap = mapExpenseCategoryToCoa(expense.category);
  const targetId = `coa-${coaMap.code.replace('-', '')}`;
  const bebanAccount = resolveAccount(chartOfAccounts, targetId, coaMap.code, 'EXPENSE');
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: expense.note?.trim() ? expense.note.trim() : bebanAccount.name,
    sourceType: 'EXPENSE',
    sourceId: expense.id,
    lines: [
      {
        accountId: bebanAccount.id,
        accountCode: bebanAccount.code,
        accountName: bebanAccount.name,
        debit: expense.amount,
        credit: 0,
      },
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: 0,
        credit: expense.amount,
      },
    ],
    createdAt: date,
  };
}

/**
 * 7. Bank Transfer Journal (Inter-account transfer)
 * Debit: Kas & Bank [Tujuan] (1-1100)
 * Credit: Kas & Bank [Asal] (1-1100)
 */
export function createBankTransferJournal(
  fromBank: BankAccount,
  toBank: BankAccount,
  amount: number,
  existingEntriesCount: number,
  note?: string,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const kasBankTo = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');
  const kasBankFrom = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Transfer Kas: Dari ${fromBank.name} ke ${toBank.name}${note ? ` (${note})` : ''}`,
    sourceType: 'BANK_TRANSFER',
    sourceId: `${fromBank.id}-${toBank.id}`,
    lines: [
      {
        accountId: kasBankTo.id,
        accountCode: kasBankTo.code,
        accountName: kasBankTo.name,
        debit: amount,
        credit: 0,
      },
      {
        accountId: kasBankFrom.id,
        accountCode: kasBankFrom.code,
        accountName: kasBankFrom.name,
        debit: 0,
        credit: amount,
      },
    ],
    createdAt: date,
  };
}

/**
 * 8. Cash Inflow Journal (Other Income / Loan Received)
 * Debit: Kas & Bank (1-1100)
 * Credit: Selected account from CoA (e.g. 4-2000 Pendapatan Lain-lain, 2-1300 Hutang Pinjaman)
 */
export function createCashInflowJournal(
  income: OtherIncome,
  bankAccountName: string,
  existingEntriesCount: number,
  date: string = income.date || new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');
  const targetAccount = resolveAccount(
    chartOfAccounts,
    `coa-${income.accountCode.replace('-', '')}`,
    income.accountCode
  );

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Penerimaan Kas — ${targetAccount.name}${income.note ? ` (${income.note})` : ''}`,
    sourceType: 'CASH_INFLOW',
    sourceId: income.id,
    lines: [
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: income.amount,
        credit: 0,
      },
      {
        accountId: targetAccount.id,
        accountCode: targetAccount.code,
        accountName: targetAccount.name,
        debit: 0,
        credit: income.amount,
      },
    ],
    createdAt: date,
  };
}

/**
 * 9. Manual Journal Entry (Adjusting Entries, etc.)
 */
export function createManualJournal(
  description: string,
  lines: Omit<JournalEntryLine, 'accountName'>[],
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const fullLines: JournalEntryLine[] = lines.map(line => {
    const acc = resolveAccount(chartOfAccounts, line.accountId, line.accountCode);
    return {
      ...line,
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
    };
  });

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description,
    sourceType: 'MANUAL_JOURNAL',
    lines: fullLines,
    createdAt: date,
  };
}

/**
 * 10. Closing Entry (Tutup Buku)
 * Transfers net profit/loss to Retained Earnings (3-2000)
 */
export function createClosingJournal(
  totalRevenue: number,
  totalCOGS: number,
  totalExpense: number,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const retainedEarnings = resolveAccount(chartOfAccounts, 'coa-32000', '3-2000', 'EQUITY');
  const revenueAccount = resolveAccount(chartOfAccounts, 'coa-41000', '4-1000', 'REVENUE');
  const cogsAccount = resolveAccount(chartOfAccounts, 'coa-50000', '5-0000', 'COGS');
  const expenseAccount = resolveAccount(chartOfAccounts, 'coa-60000', '6-0000', 'EXPENSE');

  const netProfit = totalRevenue - (totalCOGS + totalExpense);
  const isLoss = netProfit < 0;

  const lines: JournalEntryLine[] = [
    {
      accountId: revenueAccount.id,
      accountCode: revenueAccount.code,
      accountName: revenueAccount.name,
      debit: totalRevenue, // Close revenue (normal credit) by debiting
      credit: 0,
    },
    {
      accountId: cogsAccount.id,
      accountCode: cogsAccount.code,
      accountName: cogsAccount.name,
      debit: 0,
      credit: totalCOGS, // Close COGS (normal debit) by crediting
    },
    {
      accountId: expenseAccount.id,
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      debit: 0,
      credit: totalExpense, // Close Expense (normal debit) by crediting
    },
  ];

  if (isLoss) {
    // Loss: debit retained earnings
    lines.push({
      accountId: retainedEarnings.id,
      accountCode: retainedEarnings.code,
      accountName: retainedEarnings.name,
      debit: Math.abs(netProfit),
      credit: 0,
    });
  } else {
    // Profit: credit retained earnings
    lines.push({
      accountId: retainedEarnings.id,
      accountCode: retainedEarnings.code,
      accountName: retainedEarnings.name,
      debit: 0,
      credit: netProfit,
    });
  }

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: `Tutup Buku Periode ${new Date(date).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
    sourceType: 'CLOSING_ENTRY',
    lines,
    createdAt: date,
  };
}

/**
 * 11. Dividend Distribution Journal
 * Debit: Laba Ditahan (3-2000)
 * Credit: Kas & Bank (1-1100)
 */
export function createDividendJournal(
  amount: number,
  bankAccountId: string,
  existingEntriesCount: number,
  date: string = new Date().toISOString(),
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): JournalEntry {
  const retainedEarnings = resolveAccount(chartOfAccounts, 'coa-32000', '3-2000', 'EQUITY');
  const kasBank = resolveAccount(chartOfAccounts, 'coa-11100', '1-1100', 'ASSET');

  return {
    id: `je-${generateId()}`,
    entryNumber: generateEntryNumber(existingEntriesCount),
    date,
    description: 'Pembagian Dividen',
    sourceType: 'DIVIDEND',
    sourceId: bankAccountId,
    lines: [
      {
        accountId: retainedEarnings.id,
        accountCode: retainedEarnings.code,
        accountName: retainedEarnings.name,
        debit: amount,
        credit: 0,
      },
      {
        accountId: kasBank.id,
        accountCode: kasBank.code,
        accountName: kasBank.name,
        debit: 0,
        credit: amount,
      },
    ],
    createdAt: date,
  };
}

// ============================================================================
// 4. FINANCIAL STATEMENTS COMPUTATION ENGINES
// ============================================================================

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: 'DEBIT' | 'CREDIT';
  totalDebit: number;
  totalCredit: number;
  netBalance: number; // Positive if balance aligns with normalBalance
}

/**
 * Compute Trial Balance (Neraca Saldo) from all Journal Entries
 */
export function computeTrialBalance(
  journalEntries: JournalEntry[],
  chartOfAccounts: AccountCode[] = DEFAULT_CHART_OF_ACCOUNTS
): { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; isBalanced: boolean } {
  const accountTotals: Record<string, { totalDebit: number; totalCredit: number }> = {};

  // Accumulate debits and credits per account code
  journalEntries.forEach(je => {
    je.lines.forEach(line => {
      if (!accountTotals[line.accountCode]) {
        accountTotals[line.accountCode] = { totalDebit: 0, totalCredit: 0 };
      }
      accountTotals[line.accountCode].totalDebit += line.debit;
      accountTotals[line.accountCode].totalCredit += line.credit;
    });
  });

  let grandDebit = 0;
  let grandCredit = 0;

  // Build target list of accounts to display (all non-header accounts + any account that has journal activity)
  const activeAccounts = chartOfAccounts.filter(a => !a.isHeader);
  const includedCodes = new Set(activeAccounts.map(a => a.code));

  Object.keys(accountTotals).forEach(code => {
    if (!includedCodes.has(code)) {
      const match = chartOfAccounts.find(a => a.code === code);
      activeAccounts.push({
        id: match?.id || `coa-${code}`,
        code,
        name: match?.name || `Akun ${code}`,
        type: match?.type || 'ASSET',
        normalBalance: match?.normalBalance || 'DEBIT',
        isHeader: false,
        level: match?.level || 3,
        description: match?.description || '',
      });
      includedCodes.add(code);
    }
  });

  const rows: TrialBalanceRow[] = activeAccounts.map(acc => {
    const totals = accountTotals[acc.code] || { totalDebit: 0, totalCredit: 0 };
    grandDebit += totals.totalDebit;
    grandCredit += totals.totalCredit;

    const netBalance =
      acc.normalBalance === 'DEBIT'
        ? totals.totalDebit - totals.totalCredit
        : totals.totalCredit - totals.totalDebit;

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normalBalance: acc.normalBalance,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      netBalance,
    };
  });

  return {
    rows,
    totalDebit: grandDebit,
    totalCredit: grandCredit,
    isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
  };
}

/**
 * AR & AP Aging Breakdown
 */
export interface AgingBracket {
  current: number;    // 0-30 days
  days31to60: number; // 31-60 days
  days61to90: number; // 61-90 days
  over90: number;     // >90 days
  total: number;
}

export function computeARAging(invoices: Invoice[]): AgingBracket {
  const now = new Date().getTime();
  const res: AgingBracket = { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 };

  invoices.forEach(inv => {
    const outstanding = inv.totalAmount - inv.paidAmount;
    if (outstanding <= 0) return;

    const ageDays = Math.floor((now - new Date(inv.issuedAt || inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    res.total += outstanding;

    if (ageDays <= 30) {
      res.current += outstanding;
    } else if (ageDays <= 60) {
      res.days31to60 += outstanding;
    } else if (ageDays <= 90) {
      res.days61to90 += outstanding;
    } else {
      res.over90 += outstanding;
    }
  });

  return res;
}

export function computeAPAging(purchaseOrders: PurchaseOrder[]): AgingBracket {
  const now = new Date().getTime();
  const res: AgingBracket = { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 };

  purchaseOrders
    .filter(po => po.status === 'RECEIVED' && po.paymentStatus !== 'PAID')
    .forEach(po => {
      const ageDays = Math.floor((now - new Date(po.receivedAt || po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      res.total += po.totalAmount;

      if (ageDays <= 30) {
        res.current += po.totalAmount;
      } else if (ageDays <= 60) {
        res.days31to60 += po.totalAmount;
      } else if (ageDays <= 90) {
        res.days61to90 += po.totalAmount;
      } else {
        res.over90 += po.totalAmount;
      }
    });

  return res;
}
