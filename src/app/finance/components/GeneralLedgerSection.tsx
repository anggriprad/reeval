'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import CustomTable from '@/components/ui/CustomTable';
import { useToast } from '@/context/ToastContext';
import { useTableFilters } from '@/hooks/useTableFilters';
import { usePermission } from '@/hooks/usePermission';
import { useApp } from '@/context/AppContext';
import { PERMISSIONS } from '@/lib/permissions';
import { canViewFinance } from '@/lib/roles';
import { formatCurrency } from '@/lib/utils';
import { journalService, mapLedgerTrialBalanceDTO } from '@/services/journal.service';
import type { LedgerAccountRow, LedgerTrialBalance } from '@/lib/types';
import { LedgerMutationModal } from './LedgerMutationModal';

interface GeneralLedgerSectionProps {
  refreshTrigger?: number;
}

export function GeneralLedgerSection({
  refreshTrigger = 0,
}: GeneralLedgerSectionProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const { currentUser } = useApp();
  const { can, permissions } = usePermission();
  const hasRoleFallback =
    permissions.length === 0 &&
    canViewFinance(
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : currentUser.role
    );
  const canLedgerRead = can(PERMISSIONS.FINANCE.LEDGER_READ) || hasRoleFallback;

  const { filters, setFilter, setFilters } = useTableFilters({
    ledger_page: '1',
    ledger_per_page: '40',
  });

  const [trialBalance, setTrialBalance] = useState<LedgerTrialBalance>({
    items: [],
    totalDebit: 0,
    totalCredit: 0,
    isBalanced: true,
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const currentPage = Math.max(1, Number(filters.ledger_page) || 1);
  const perPage = Math.max(1, Number(filters.ledger_per_page) || 40);

  const fetchLedger = useCallback(async () => {
    if (!canLedgerRead) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await journalService.getLedger({
        page: currentPage,
        per_page: perPage,
      });
      const mapped = res.data
        ? mapLedgerTrialBalanceDTO(res.data)
        : { items: [], totalDebit: 0, totalCredit: 0, isBalanced: true };
      const nextTotal = res.meta?.total ?? mapped.items.length;
      const nextLastPage = Math.max(1, res.meta?.total_pages ?? 1);
      if (nextTotal > 0 && currentPage > nextLastPage) {
        setFilter('ledger_page', String(nextLastPage));
        return;
      }
      setTrialBalance(mapped);
      setTotal(nextTotal);
      setLastPage(nextLastPage);
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = apiMsg || (err instanceof Error ? err.message : 'Gagal memuat buku besar.');
      toastRef.current.error('Gagal Memuat Buku Besar', msg);
    } finally {
      setIsLoading(false);
    }
  }, [canLedgerRead, currentPage, perPage, setFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchLedger();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchLedger, refreshTrigger]);

  if (!canLedgerRead) {
    return null;
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Buku Besar (Daftar Akun)
            </h3>
            <p className="text-xs text-slate-500">
              Daftar saldo akhir dan mutasi untuk semua akun aktif.
            </p>
          </div>
          <Badge variant={trialBalance.isBalanced ? 'success' : 'danger'}>
            {trialBalance.isBalanced ? '✓ Balanced (Seimbang)' : 'Tidak Seimbang'}
          </Badge>
        </div>

        <CustomTable<LedgerAccountRow>
          data={trialBalance.items}
          loading={isLoading}
          pagination={true}
          currentPage={currentPage}
          perPage={perPage}
          total={total}
          lastPage={lastPage}
          onPageChange={(p) => setFilter('ledger_page', String(p))}
          onPerPageChange={(pp) =>
            setFilters((prev) => ({ ...prev, ledger_per_page: String(pp), ledger_page: '1' }))
          }
          onRowClick={(row) =>
            setSelectedAccount({ id: row.accountId, name: row.name })
          }
          emptyTitle="Belum ada data buku besar"
          emptyDescription="Mutasi buku besar akan tampil setelah jurnal transaksi tercatat."
          columns={[
            {
              id: 'type',
              key: 'type',
              header: 'Kategori',
              className: 'w-28',
              cell: ({ row }) => (
                <Badge
                  variant={
                    row.type === 'ASSET'
                      ? 'default'
                      : row.type === 'LIABILITY'
                        ? 'danger'
                        : row.type === 'EQUITY'
                          ? 'warning'
                          : row.type === 'REVENUE'
                            ? 'success'
                            : 'default'
                  }
                  className="text-[10px]"
                >
                  {row.type}
                </Badge>
              ),
            },
            {
              id: 'code',
              key: 'code',
              header: 'Kode Akun',
              className: 'w-24',
              cell: ({ row }) => (
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {row.code}
                </span>
              ),
            },
            {
              id: 'name',
              key: 'name',
              header: 'Nama Akun',
              cell: ({ row }) => (
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {row.name}
                </span>
              ),
            },
            {
              id: 'totalDebit',
              key: 'totalDebit',
              header: 'Total Debit (Rp)',
              align: 'right',
              cell: ({ row }) => (
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {row.totalDebit > 0 ? formatCurrency(row.totalDebit) : '-'}
                </span>
              ),
            },
            {
              id: 'totalCredit',
              key: 'totalCredit',
              header: 'Total Kredit (Rp)',
              align: 'right',
              cell: ({ row }) => (
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {row.totalCredit > 0 ? formatCurrency(row.totalCredit) : '-'}
                </span>
              ),
            },
            {
              id: 'endingBalance',
              key: 'endingBalance',
              header: 'Saldo Akhir (Rp)',
              align: 'right',
              cell: ({ row }) => (
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(row.endingBalance)}
                </span>
              ),
            },
            {
              id: 'actions',
              key: 'actions',
              header: 'Aksi',
              align: 'center',
              className: 'w-28',
              cell: ({ row }) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2.5 text-[11px] font-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAccount({ id: row.accountId, name: row.name });
                  }}
                >
                  Lihat Mutasi
                </Button>
              ),
            },
          ]}
          footer={
            <tr>
              <td colSpan={3} className="py-3 px-4 font-bold">
                TOTAL TRIAL BALANCE
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(trialBalance.totalDebit)}
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(trialBalance.totalCredit)}
              </td>
              <td colSpan={2} />
            </tr>
          }
        />
      </Card>

      <LedgerMutationModal
        accountId={selectedAccount?.id || null}
        accountName={selectedAccount?.name}
        onClose={() => setSelectedAccount(null)}
      />
    </>
  );
}
