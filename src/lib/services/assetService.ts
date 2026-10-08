import type {
  AppState,
  CompanyAsset,
  AssetAcquisitionType,
  AssetStatus,
  Expense,
  BankAccount,
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { createAssetPurchaseJournal } from '@/lib/accounting';

export interface CreateAssetPayload {
  code: string;
  name: string;
  category: string;
  acquisitionType: AssetAcquisitionType;
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLifeMonths: number;
  salvageValue?: number;
  status?: AssetStatus;
  cashAccountId?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 1. Validasi Pembuatan Aset
 */
export function validateCreateAsset(
  state: Pick<AppState, 'assets' | 'bankAccounts'>,
  payload: CreateAssetPayload
): { isValid: boolean; error?: string } {
  if (!payload.code?.trim() || !payload.name?.trim()) {
    return { isValid: false, error: 'Kode dan Nama Aset wajib diisi.' };
  }

  if (!payload.category?.trim()) {
    return { isValid: false, error: 'Kategori aset wajib dipilih.' };
  }

  if (!payload.acquisitionDate) {
    return { isValid: false, error: 'Tanggal perolehan wajib diisi.' };
  }

  if (Number(payload.acquisitionCost) <= 0) {
    return { isValid: false, error: 'Harga perolehan harus lebih besar dari 0.' };
  }

  if (Number(payload.usefulLifeMonths) <= 0) {
    return { isValid: false, error: 'Masa manfaat (umur ekonomis) harus lebih besar dari 0 bulan.' };
  }

  const salvage = Number(payload.salvageValue || 0);
  if (salvage < 0) {
    return { isValid: false, error: 'Nilai sisa / residual value tidak boleh negatif.' };
  }

  if (salvage >= Number(payload.acquisitionCost)) {
    return { isValid: false, error: 'Nilai sisa tidak boleh lebih besar atau sama dengan harga perolehan.' };
  }

  // Check duplicate code
  const isDuplicate = state.assets.some(
    a => a.code.trim().toUpperCase() === payload.code.trim().toUpperCase()
  );
  if (isDuplicate) {
    return { isValid: false, error: `Aset dengan kode "${payload.code.trim().toUpperCase()}" sudah terdaftar.` };
  }

  // Khusus Pembelian Baru (NEW_PURCHASE): Wajib pilih akun kas
  if (payload.acquisitionType === 'NEW_PURCHASE') {
    if (!payload.cashAccountId) {
      return { isValid: false, error: 'Pilih akun kas / bank asal dana untuk pembelian baru.' };
    }
    const cashAccount = state.bankAccounts.find(ba => ba.id === payload.cashAccountId);
    if (!cashAccount) {
      return { isValid: false, error: 'Akun kas / bank yang dipilih tidak ditemukan.' };
    }
  }

  return { isValid: true };
}

/**
 * 2. Transaksi Pembuatan Aset (Atomic / ACID simulation)
 * Menangani logic EXISTING vs NEW_PURCHASE
 */
export function executeCreateAsset(
  state: AppState,
  payload: CreateAssetPayload
): ServiceResult<{ newAsset: CompanyAsset; updatedState: AppState }> {
  const validation = validateCreateAsset(state, payload);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const assetId = `ast-${generateId()}`;
  const normalizedCode = payload.code.trim().toUpperCase();
  const acquisitionCost = Number(payload.acquisitionCost);
  const usefulLifeMonths = Number(payload.usefulLifeMonths);
  const salvageValue = Math.max(0, Number(payload.salvageValue || 0));
  const usefulLifeYears = Math.round((usefulLifeMonths / 12) * 10) / 10;
  const monthlyDepreciation = (acquisitionCost - salvageValue) / usefulLifeMonths;
  const status: AssetStatus = payload.status || 'ACTIVE';

  let createdExpense: Expense | undefined;
  let updatedBankAccounts = [...state.bankAccounts];
  let updatedExpenses = [...state.expenses];
  let updatedJournalEntries = [...state.journalEntries];
  let financeTransactionId: string | undefined;

  // Jika Pembelian Baru: Potong saldo kas dan buat Expense serta Jurnal Kas Keluar
  if (payload.acquisitionType === 'NEW_PURCHASE' && payload.cashAccountId) {
    const cashAccount = state.bankAccounts.find(ba => ba.id === payload.cashAccountId);
    if (!cashAccount) {
      return { success: false, error: 'Akun kas tidak valid.' };
    }

    const expenseId = generateId();
    createdExpense = {
      id: expenseId,
      category: 'ASET',
      amount: acquisitionCost,
      date: payload.acquisitionDate || new Date().toISOString(),
      bankAccountId: payload.cashAccountId,
      note: `Pembelian Aset: ${payload.name.trim()} (${normalizedCode})`,
    };

    // Deduct cash account balance
    updatedBankAccounts = updatedBankAccounts.map(ba =>
      ba.id === payload.cashAccountId
        ? { ...ba, balance: ba.balance - acquisitionCost }
        : ba
    );

    // Create journal entry
    const journalEntry = createAssetPurchaseJournal(
      {
        name: payload.name.trim(),
        code: normalizedCode,
        purchaseCost: acquisitionCost,
        category: payload.category,
      },
      expenseId,
      cashAccount.name,
      updatedJournalEntries.length,
      payload.acquisitionDate || new Date().toISOString(),
      state.chartOfAccounts
    );

    updatedExpenses = [createdExpense, ...updatedExpenses];
    updatedJournalEntries = [journalEntry, ...updatedJournalEntries];
    financeTransactionId = expenseId;
  }

  // Master asset record
  const newAsset: CompanyAsset = {
    id: assetId,
    code: normalizedCode,
    name: payload.name.trim(),
    category: payload.category,
    acquisitionType: payload.acquisitionType,
    purchaseDate: payload.acquisitionDate,
    purchaseCost: acquisitionCost,
    usefulLifeMonths,
    usefulLifeYears,
    salvageValue,
    currentBookValue: acquisitionCost,
    monthlyDepreciation,
    accumulatedServiceCost: 0,
    status,
    cashAccountId: payload.acquisitionType === 'NEW_PURCHASE' ? payload.cashAccountId : undefined,
    financeTransactionId,
  };

  const updatedState: AppState = {
    ...state,
    assets: [newAsset, ...state.assets],
    bankAccounts: updatedBankAccounts,
    expenses: updatedExpenses,
    journalEntries: updatedJournalEntries,
  };

  return {
    success: true,
    data: {
      newAsset,
      updatedState,
    },
  };
}

/**
 * 3. Validasi Penghapusan Aset (Hard Delete Constraint Check)
 * Aturan:
 * 1. COUNT(asset_maintenance_logs WHERE asset_id = :id) == 0
 * 2. COUNT(asset_depreciations WHERE asset_id = :id) == 0
 */
export function validateDeleteAsset(
  state: Pick<AppState, 'assets' | 'assetServiceLogs' | 'assetDepreciations'>,
  assetId: string
): { canDelete: boolean; reason?: string; asset?: CompanyAsset } {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset) {
    return { canDelete: false, reason: 'Aset tidak ditemukan di sistem.' };
  }

  // 1. Cek riwayat servis / pemeliharaan
  const serviceLogsCount = (state.assetServiceLogs || []).filter(l => l.assetId === assetId).length;
  if (serviceLogsCount > 0) {
    return {
      canDelete: false,
      reason: `Aset memiliki ${serviceLogsCount} catatan pemeliharaan/servis. Tidak dapat dihapus untuk menjaga integritas data audit operasional.`,
      asset,
    };
  }

  // 2. Cek riwayat penyusutan bulanan
  const depreciationsCount = (state.assetDepreciations || []).filter(d => d.assetId === assetId).length;
  if (depreciationsCount > 0) {
    return {
      canDelete: false,
      reason: `Aset telah memiliki ${depreciationsCount} catatan amortisasi/penyusutan buku. Tidak dapat dihapus.`,
      asset,
    };
  }

  return { canDelete: true, asset };
}

/**
 * 4. Transaksi Penghapusan Aset (Atomic Rollback jika NEW_PURCHASE)
 */
export function executeDeleteAsset(
  state: AppState,
  assetId: string
): ServiceResult<{ deletedAssetId: string; updatedState: AppState }> {
  const validation = validateDeleteAsset(state, assetId);
  if (!validation.canDelete || !validation.asset) {
    return { success: false, error: validation.reason || 'Aset tidak dapat dihapus.' };
  }

  const asset = validation.asset;
  let updatedBankAccounts = [...state.bankAccounts];
  let updatedExpenses = [...state.expenses];
  let updatedJournalEntries = [...state.journalEntries];

  // Evaluasi tipe perolehan:
  // Jika NEW_PURCHASE dan ada financeTransactionId, rollback catatan kas keluar secara atomik
  if (asset.acquisitionType === 'NEW_PURCHASE' && asset.financeTransactionId) {
    const linkedExpense = state.expenses.find(e => e.id === asset.financeTransactionId);
    if (linkedExpense) {
      // Kembalikan saldo kas
      updatedBankAccounts = updatedBankAccounts.map(ba =>
        ba.id === linkedExpense.bankAccountId
          ? { ...ba, balance: ba.balance + linkedExpense.amount }
          : ba
      );

      // Hapus expense terkait
      updatedExpenses = updatedExpenses.filter(e => e.id !== linkedExpense.id);

      // Hapus jurnal terkait
      updatedJournalEntries = updatedJournalEntries.filter(
        j => !(j.sourceType === 'EXPENSE' && j.sourceId === linkedExpense.id)
      );
    }
  }

  // Hapus master aset
  const updatedAssets = state.assets.filter(a => a.id !== assetId);

  const updatedState: AppState = {
    ...state,
    assets: updatedAssets,
    bankAccounts: updatedBankAccounts,
    expenses: updatedExpenses,
    journalEntries: updatedJournalEntries,
  };

  return {
    success: true,
    data: {
      deletedAssetId: assetId,
      updatedState,
    },
  };
}
