'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PERMISSIONS } from '@/lib/permissions';
import { canViewFinance } from '@/lib/roles';
import { formatCurrency } from '@/lib/utils';
import { resolveAuthorName, type BankAccount } from '@/lib/types';
import {
  bankAccountService,
  mapBankAccountResponseToBankAccount,
} from '@/services/bank-account.service';
import { BankAccountModal } from './BankAccountModal';
import { Building2, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';

interface BankAccountsSectionProps {
  selectedBankFilter: string;
  onSelectBank: (bankId: string) => void;
  onAccountsSynced?: (accounts: BankAccount[]) => void;
}

export function BankAccountsSection({
  selectedBankFilter,
  onSelectBank,
  onAccountsSynced,
}: BankAccountsSectionProps) {
  const { toast, confirm } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const { currentUser } = useApp();
  const { can, permissions } = usePermission();
  const hasRoleFallback =
    permissions.length === 0 &&
    canViewFinance(
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : currentUser.role
    );
  const canBankCreate = can(PERMISSIONS.FINANCE.BANK_CREATE) || hasRoleFallback;
  const canBankUpdate = can(PERMISSIONS.FINANCE.BANK_UPDATE) || hasRoleFallback;
  const canBankDelete = can(PERMISSIONS.FINANCE.BANK_DELETE) || hasRoleFallback;

  const { filters } = useTableFilters({
    bank_search: '',
    bank_created_by_id: '',
  });

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const createdByIdNum = filters.bank_created_by_id
        ? Number(filters.bank_created_by_id)
        : undefined;
      const res = await bankAccountService.getAccounts({
        page: 1,
        per_page: 500,
        search: filters.bank_search?.trim() || undefined,
        created_by_id:
          createdByIdNum && !Number.isNaN(createdByIdNum)
            ? createdByIdNum
            : undefined,
      });

      const mapped = Array.isArray(res.data)
        ? res.data.map(mapBankAccountResponseToBankAccount)
        : [];
      setAccounts(mapped);

      const hasActiveFilter = Boolean(
        filters.bank_search?.trim() || filters.bank_created_by_id
      );
      if (!hasActiveFilter) {
        onAccountsSynced?.(mapped);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Gagal memuat daftar rekening bank.';
      toastRef.current.error('Gagal Memuat Rekening', msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters.bank_search, filters.bank_created_by_id, onAccountsSynced]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalCashBank = useMemo(
    () => accounts.reduce((sum, ba) => sum + (ba.balance || 0), 0),
    [accounts]
  );

  const openCreateModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = async (account: BankAccount) => {
    const isOk = await confirm({
      title: 'Hapus Rekening Bank',
      message: `Apakah Anda yakin ingin menghapus rekening "${account.name}"?`,
      confirmText: 'Hapus Rekening',
      variant: 'danger',
    });
    if (!isOk) return;

    setDeletingId(account.id);
    try {
      await bankAccountService.deleteAccount(account.id);
      toast.success(
        'Rekening Dihapus',
        `Rekening "${account.name}" berhasil dihapus.`
      );
      if (selectedBankFilter === account.id) {
        onSelectBank('ALL');
      }
      await fetchAccounts();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Rekening ini sudah memiliki riwayat transaksi.';
      toast.error('Gagal Menghapus Rekening', msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {isLoading && accounts.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Memuat data rekening bank...</span>
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-slate-400" />}
          title="Belum Ada Rekening"
          description="Tambahkan rekening untuk mulai mencatat transaksi dan mutasi keuangan."
          action={
            canBankCreate ? (
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-1.5" /> Tambah Rekening
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Total Likuiditas Berjalan */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Total Likuiditas:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalCashBank)}
            </span>
          </div>

          {/* Bank Accounts Horizontal Scroll Container (Hidden Scrollbar) */}
          <div className="flex p-1 gap-4 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {accounts.map((ba) => {
              const isSelected = selectedBankFilter === ba.id;
              const isDeleting = deletingId === ba.id;
              const authorName = resolveAuthorName(ba);
              return (
                // <Card
                //   key={ba.id}
                //   onClick={() => onSelectBank(isSelected ? 'ALL' : ba.id)}
                //   className={`relative overflow-hidden cursor-pointer transition-all p-5 flex flex-col justify-between w-72 shrink-0 ${
                //     isSelected
                //       ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/15 dark:bg-indigo-950/30 shadow-md'
                //       : 'hover:border-slate-300 dark:hover:border-slate-600 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm'
                //   }`}
                // >
                <Card
                  key={ba.id}
                  onClick={() => onSelectBank(isSelected ? 'ALL' : ba.id)}
                  className={`relative overflow-hidden cursor-pointer transition-all p-5 flex flex-col justify-between w-72 shrink-0 ${isSelected
                    ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/15 dark:bg-indigo-950/30 shadow-md'
                    : 'hover:border-slate-300 dark:hover:border-slate-600 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm'
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {ba.name}
                          </h4>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded shrink-0">
                              Dipilih
                            </span>
                          )}
                        </div>
                        {ba.accountNumber ? (
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            {ba.accountNumber}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic mt-0.5">
                            Kas Fisik / Kas Kecil
                          </p>
                        )}
                      </div>
                      {(canBankUpdate || canBankDelete) && (
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canBankUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(ba)}
                              disabled={isDeleting}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                              title="Edit Rekening"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canBankDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(ba)}
                              disabled={isDeleting || ba.canDelete === false}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                ba.canDelete === false
                                  ? 'Rekening sudah memiliki transaksi'
                                  : 'Hapus Rekening'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Saldo Berjalan
                      </span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(ba.balance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    Oleh: {authorName}
                  </div>
                </Card>
              );
            })}

            {/* Card Action Tambah Rekening (Rightmost item, half width) */}
            {canBankCreate && (
              <div
                onClick={openCreateModal}
                className="w-42 shrink-0 border-2 border-dashed border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/40 dark:bg-slate-800/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all cursor-pointer p-4 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-1.5">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Tambah Rekening
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <BankAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingAccount={editingAccount}
        onSaved={fetchAccounts}
      />
    </>
  );
}
