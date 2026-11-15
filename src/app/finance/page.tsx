'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { canViewFinance } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { BankAccount } from '@/lib/types';
import {
  COASection,
  BankAccountsSection,
  JournalSection,
  GeneralLedgerSection,
  CashMutationsSection,
  CashTransactionModal,
  DividendModal,
  ManualJournalModal,
  ClosingModal,
  FinanceOverviewSection,
  InvoicesSection,
  FinancialReportsSection,
  type ReportSubTab,
} from './components';
import {
  bankAccountService,
  mapBankAccountResponseToBankAccount,
  mapBankAccountOptionToBankAccount,
} from '@/services/bank-account.service';
import {
  Receipt,
  Wallet,
  Plus,
  Building2,
  FileText,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react';

function FinanceContent() {
  const { currentUser } = useApp();
  const { can, permissions } = usePermission();
  const hasRoleFallback =
    permissions.length === 0 &&
    canViewFinance(
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : currentUser.role
    );

  const canBankRead = can(PERMISSIONS.FINANCE.BANK_READ) || hasRoleFallback;
  const canCashTxRead = can(PERMISSIONS.FINANCE.CASH_TX_READ) || hasRoleFallback;
  const canCashTxCreate = can(PERMISSIONS.FINANCE.CASH_TX_CREATE) || hasRoleFallback;
  const canTransferCreate = can(PERMISSIONS.FINANCE.CASH_TRANSFER_CREATE) || hasRoleFallback;
  const canDividend = can(PERMISSIONS.FINANCE.DIVIDEND) || hasRoleFallback;
  const canInvoiceRead = can(PERMISSIONS.FINANCE.INVOICE_READ) || hasRoleFallback;
  const canPaymentAR = can(PERMISSIONS.FINANCE.PAYMENT_AR) || hasRoleFallback;
  const canPaymentAP = can(PERMISSIONS.FINANCE.PAYMENT_AP) || hasRoleFallback;
  const canJournalRead = can(PERMISSIONS.FINANCE.JOURNAL_READ) || hasRoleFallback;
  const canJournalCreate = can(PERMISSIONS.FINANCE.JOURNAL_CREATE) || hasRoleFallback;
  const canLedgerRead = can(PERMISSIONS.FINANCE.LEDGER_READ) || hasRoleFallback;
  const canCoaRead = can(PERMISSIONS.FINANCE.COA_READ) || hasRoleFallback;
  const canClosing = can(PERMISSIONS.FINANCE.CLOSING) || hasRoleFallback;
  const canReport = can(PERMISSIONS.FINANCE.REPORT) || hasRoleFallback;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [liveBankAccounts, setLiveBankAccounts] = useState<BankAccount[]>([]);
  const bankAccounts = liveBankAccounts;

  const syncLiveBankAccounts = useCallback(
    (isMountedRef?: { current: boolean }) => {
      const bankPromise = canBankRead
        ? bankAccountService.getAccounts({ page: 1, per_page: 500 }).then((res) => {
            if (isMountedRef && !isMountedRef.current) return;
            if (!Array.isArray(res.data)) return;
            setLiveBankAccounts(res.data.map(mapBankAccountResponseToBankAccount));
          })
        : bankAccountService.getOptions().then((res) => {
            if (isMountedRef && !isMountedRef.current) return;
            if (!Array.isArray(res.data)) return;
            setLiveBankAccounts(res.data.map(mapBankAccountOptionToBankAccount));
          });
      return bankPromise.catch(() => {
        // Fallback to context bankAccounts when offline/unauthenticated
      });
    },
    [canBankRead]
  );

  useEffect(() => {
    const isMountedRef = { current: true };
    void syncLiveBankAccounts(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [syncLiveBankAccounts]);

  // ── Main Tabs Navigation ──
  const [urlTab] = useUrlTab(
    ['overview', 'cash_bank', 'invoices', 'transactions', 'accounting', 'reports'] as const,
    'overview'
  );
  const activeTab = urlTab === 'transactions' ? 'invoices' : urlTab;

  const setActiveTab = useCallback(
    (
      nextTab: 'overview' | 'cash_bank' | 'invoices' | 'accounting' | 'reports',
      nextSubTab?: string
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', nextTab);
      }
      if (nextSubTab) {
        params.set('subtab', nextSubTab);
      } else if (nextTab !== activeTab) {
        params.delete('subtab');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [activeTab, pathname, router, searchParams]
  );

  // ── Sub-tabs for Invoices & Bills (synced with ?subtab= or ap_* params) ──
  const txSubTab = useMemo<'ar' | 'ap'>(() => {
    const sub = searchParams.get('subtab');
    if (sub === 'ar' || sub === 'ap') return sub;
    if (
      searchParams.get('ap_search') ||
      searchParams.get('ap_status') ||
      searchParams.get('ap_page')
    ) {
      return 'ap';
    }
    return 'ar';
  }, [searchParams]);

  const setTxSubTab = useCallback(
    (nextSubTab: 'ar' | 'ap') => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'invoices');
      if (nextSubTab === 'ar') {
        params.delete('subtab');
      } else {
        params.set('subtab', nextSubTab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // ── Sub-tabs for Accounting (synced with ?subtab= or active ledger/COA filter params) ──
  const accSubTab = useMemo<'journal' | 'general_ledger' | 'coa'>(() => {
    const sub = searchParams.get('subtab');
    if (sub === 'journal' || sub === 'general_ledger' || sub === 'coa') return sub;
    if (
      searchParams.get('ledger_search') ||
      searchParams.get('ledger_type') ||
      searchParams.get('ledger_page') ||
      searchParams.get('ledger_per_page')
    ) {
      return 'general_ledger';
    }
    if (
      searchParams.get('coa_search') ||
      searchParams.get('coa_type') ||
      searchParams.get('coa_created_by_id')
    ) {
      return 'coa';
    }
    return 'journal';
  }, [searchParams]);

  const setAccSubTab = useCallback(
    (nextSubTab: 'journal' | 'general_ledger' | 'coa') => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'accounting');
      if (nextSubTab === 'journal') {
        params.delete('subtab');
      } else {
        params.set('subtab', nextSubTab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // ── Sub-tabs for Reports (synced with ?subtab=) ──
  const reportSubTab = useMemo<ReportSubTab>(() => {
    const sub = searchParams.get('subtab');
    if (
      sub === 'income' ||
      sub === 'balance_sheet' ||
      sub === 'cashflow' ||
      sub === 'hpp_analysis'
    ) {
      return sub;
    }
    if (
      searchParams.get('hpp_search') ||
      searchParams.get('hpp_status') ||
      searchParams.get('hpp_costing') ||
      searchParams.get('hpp_page')
    ) {
      return 'hpp_analysis';
    }
    if (searchParams.get('bs_as_of_date')) {
      return 'balance_sheet';
    }
    if (searchParams.get('cf_start_date') || searchParams.get('cf_end_date')) {
      return 'cashflow';
    }
    return 'income';
  }, [searchParams]);

  const setReportSubTab = useCallback(
    (nextSubTab: ReportSubTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'reports');
      if (nextSubTab === 'income') {
        params.delete('subtab');
      } else {
        params.set('subtab', nextSubTab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const [bankRefreshTick, setBankRefreshTick] = useState(0);
  const [journalRefreshTick, setJournalRefreshTick] = useState(0);

  const handleBankAccountsSynced = useCallback((accounts: BankAccount[]) => {
    setLiveBankAccounts(accounts);
  }, []);

  const handleBankAccountMutated = useCallback(() => {
    setJournalRefreshTick((t) => t + 1);
  }, []);

  const selectedBankFilter = searchParams.get('cash_bank_id') || 'ALL';
  const handleSelectBankFilter = useCallback(
    (bankId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!bankId || bankId === 'ALL') {
        params.delete('cash_bank_id');
      } else {
        params.set('cash_bank_id', bankId);
      }
      params.set('cash_page', '1');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // ── Native Finance Modals ──
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showManualJournalModal, setShowManualJournalModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showDividendModal, setShowDividendModal] = useState(false);

  const handleFinanceMutationSuccess = useCallback(() => {
    setBankRefreshTick((t) => t + 1);
    setJournalRefreshTick((t) => t + 1);
    if (activeTab !== 'cash_bank' || !canBankRead) {
      void syncLiveBankAccounts();
    }
  }, [activeTab, canBankRead, syncLiveBankAccounts]);

  // ── Tab Config ──
  const canAccessCashBank = canBankRead || canCashTxRead;
  const canAccessAccounting = canJournalRead || canLedgerRead || canCoaRead;
  const tabs = [
    { key: 'overview' as const, label: 'Ringkasan', icon: LayoutDashboard },
    ...(canAccessCashBank
      ? [{ key: 'cash_bank' as const, label: 'Kas & Bank', icon: Building2 }]
      : []),
    ...(canInvoiceRead
      ? [{ key: 'invoices' as const, label: 'Tagihan & Faktur', icon: Receipt }]
      : []),
    ...(canAccessAccounting
      ? [{ key: 'accounting' as const, label: 'Pembukuan', icon: BookOpen }]
      : []),
    ...(canReport
      ? [{ key: 'reports' as const, label: 'Laporan Keuangan', icon: FileText }]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Keuangan">
        {(canDividend || canCashTxCreate || canTransferCreate) && (
          <div className="flex items-center gap-2">
            {canDividend && (
              <Button variant="outline" onClick={() => setShowDividendModal(true)}>
                <Wallet className="h-4 w-4 mr-1.5" /> Bagi Dividen
              </Button>
            )}
            {(canCashTxCreate || canTransferCreate) && (
              <Button
                onClick={() => setShowTransactionModal(true)}
                disabled={bankAccounts.length === 0}
              >
                <Plus className="h-4 w-4" /> Catat Transaksi
              </Button>
            )}
          </div>
        )}
      </PageHeader>

      <SegmentedControl
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as 'overview' | 'cash_bank' | 'invoices' | 'accounting' | 'reports')}
        options={tabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))}
      />

      {activeTab === 'overview' && (
        <FinanceOverviewSection
          refreshTick={journalRefreshTick}
          onNavigateTab={(tab, subTab) =>
            setActiveTab(tab, subTab === 'ap' ? 'ap' : undefined)
          }
        />
      )}

      {activeTab === 'cash_bank' && canAccessCashBank && (
        <div className="space-y-6">
          {canBankRead && (
            <BankAccountsSection
              selectedBankFilter={selectedBankFilter}
              onSelectBank={handleSelectBankFilter}
              refreshTrigger={bankRefreshTick}
              onAccountsSynced={handleBankAccountsSynced}
              onAccountMutated={handleBankAccountMutated}
            />
          )}

          {canCashTxRead && (
            <CashMutationsSection
              refreshTrigger={journalRefreshTick}
              onDrillDownInvoice={() => setActiveTab('invoices', 'ar')}
              onDrillDownPO={() => setActiveTab('invoices', 'ap')}
            />
          )}
        </div>
      )}

      {activeTab === 'invoices' && canInvoiceRead && (
        <InvoicesSection
          subTab={txSubTab}
          onSubTabChange={setTxSubTab}
          bankAccounts={bankAccounts}
          canPaymentAR={canPaymentAR}
          canPaymentAP={canPaymentAP}
          refreshTick={journalRefreshTick}
          onSuccess={handleFinanceMutationSuccess}
        />
      )}

      {activeTab === 'reports' && canReport && (
        <FinancialReportsSection
          subTab={reportSubTab}
          onSubTabChange={setReportSubTab}
          refreshTick={journalRefreshTick}
        />
      )}

      {activeTab === 'accounting' &&
        canAccessAccounting &&
        (() => {
          const effectiveAccSubTab =
            (accSubTab === 'journal' && canJournalRead) ||
            (accSubTab === 'general_ledger' && canLedgerRead) ||
            (accSubTab === 'coa' && canCoaRead)
              ? accSubTab
              : canJournalRead
                ? 'journal'
                : canLedgerRead
                  ? 'general_ledger'
                  : 'coa';

          return (
            <div className="space-y-6">
              <SegmentedControl
                value={effectiveAccSubTab}
                onChange={(t) =>
                  setAccSubTab(t as 'journal' | 'general_ledger' | 'coa')
                }
                options={[
                  ...(canJournalRead ? [{ key: 'journal', label: 'Jurnal Umum' }] : []),
                  ...(canLedgerRead ? [{ key: 'general_ledger', label: 'Buku Besar' }] : []),
                  ...(canCoaRead ? [{ key: 'coa', label: 'Bagan Akun (CoA)' }] : []),
                ]}
              />

              {effectiveAccSubTab === 'journal' && canJournalRead && (
                <JournalSection
                  refreshTrigger={journalRefreshTick}
                  onOpenClosingModal={() => setShowClosingModal(true)}
                  onOpenManualJournalModal={() => setShowManualJournalModal(true)}
                />
              )}

              {effectiveAccSubTab === 'general_ledger' && canLedgerRead && (
                <GeneralLedgerSection refreshTrigger={journalRefreshTick} />
              )}

              {effectiveAccSubTab === 'coa' && canCoaRead && <COASection />}
            </div>
          );
        })()}

      {(canCashTxCreate || canTransferCreate) && (
        <CashTransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          bankAccounts={bankAccounts}
          canCashTxCreate={canCashTxCreate}
          canTransferCreate={canTransferCreate}
          onSuccess={handleFinanceMutationSuccess}
        />
      )}

      {canJournalCreate && (
        <ManualJournalModal
          isOpen={showManualJournalModal}
          onClose={() => setShowManualJournalModal(false)}
          bankAccounts={bankAccounts}
          onSuccess={handleFinanceMutationSuccess}
        />
      )}

      {canClosing && (
        <ClosingModal
          isOpen={showClosingModal}
          onClose={() => setShowClosingModal(false)}
          onSuccess={handleFinanceMutationSuccess}
        />
      )}

      {canDividend && (
        <DividendModal
          isOpen={showDividendModal}
          onClose={() => setShowDividendModal(false)}
          bankAccounts={bankAccounts}
          onSuccess={handleFinanceMutationSuccess}
        />
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Finance...</div>}>
      <FinanceContent />
    </Suspense>
  );
}
