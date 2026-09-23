'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Card, KPICard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { DateRangePicker, DateRange, getThisMonthRange } from '@/components/ui/DateRangePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency, formatDateTime, getInvoiceStatusLabel } from '@/lib/utils';
import {
  DEFAULT_CHART_OF_ACCOUNTS,
  computeTrialBalance,
  computeARAging,
  computeAPAging,
  mapExpenseCategoryToCoa,
} from '@/lib/accounting';
import type { HPPAnalysis, Expense, OtherIncome, AccountType, AccountNormalBalance } from '@/lib/types';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Receipt,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CheckCircle,
  Plus,
  Building2,
  AlertTriangle,
  FileText,
  LayoutDashboard,
  BookOpen,
  Scale,
  ArrowLeftRight,
  Search,
  FolderTree,
  ListFilter,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  Trash2,
  Edit2,
  Lock,
  ClipboardList,
} from 'lucide-react';

function FinanceContent() {
  const { toast, confirm } = useToast();
  const {
    invoices,
    salesOrders,
    workOrders,
    purchaseOrders,
    bankAccounts,
    expenses,
    materials,
    assets,
    chartOfAccounts = DEFAULT_CHART_OF_ACCOUNTS,
    journalEntries = [],
    recordPayment,
    recordExpense,
    paySupplierPO,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    transferBankFunds,
    addAccount,
    updateAccount,
    deleteAccount,
    getPendingOrderEstHPP,
    otherIncomes,
    recordOtherIncome,
    addManualJournal,
    closePeriod,
    distributeDividend,
  } = useApp();

  // ── Main Tabs Navigation ──
  const [urlTab, setUrlTab] = useUrlTab(
    ['overview', 'cash_bank', 'invoices', 'transactions', 'accounting', 'reports'] as const,
    'overview'
  );
  const activeTab = urlTab === 'transactions' ? 'invoices' : urlTab;
  const setActiveTab = (t: 'overview' | 'cash_bank' | 'invoices' | 'accounting' | 'reports') => {
    setUrlTab(t as any);
  };

  // ── Sub-tabs for Invoices & Bills (Tagihan & Faktur) ──
  const [txSubTab, setTxSubTab] = useState<'ar' | 'ap'>('ar');

  // ── Sub-tabs for Accounting ──
  const [accSubTab, setAccSubTab] = useState<'journal' | 'general_ledger' | 'coa'>('journal');
  const [ledgerMutasiModal, setLedgerMutasiModal] = useState<string | null>(null);

  // ── Sub-tabs for Reports ──
  const [reportSubTab, setReportSubTab] = useState<'income' | 'balance_sheet' | 'cashflow' | 'hpp_analysis'>('income');

  // ── Modals State ──
  // 1. Payment modal (Invoices)
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payNote, setPayNote] = useState('');

  // 2. PO Payment modal
  const [showPOPaymentModal, setShowPOPaymentModal] = useState<string | null>(null);
  const [poPayAccountId, setPoPayAccountId] = useState('');
  const [poPayError, setPoPayError] = useState('');

  // 3. Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<Expense['category']>('GAJI');
  const [expAmount, setExpAmount] = useState('');
  const [expAccountId, setExpAccountId] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expenseFormError, setExpenseFormError] = useState('');

  // 4. Bank Account CRUD modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankInitialBalance, setBankInitialBalance] = useState('');
  const [bankError, setBankError] = useState('');
  const [showLedgerModal, setShowLedgerModal] = useState<string | null>(null);

  // 5. Transfer Funds modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromBankId, setFromBankId] = useState('');
  const [toBankId, setToBankId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferError, setTransferError] = useState('');

  // 6. COA CRUD modal
  const [showCOAModal, setShowCOAModal] = useState(false);
  const [editingCOAId, setEditingCOAId] = useState<string | null>(null);
  const [coaCode, setCoaCode] = useState('');
  const [coaName, setCoaName] = useState('');
  const [coaType, setCoaType] = useState<AccountType>('ASSET');
  const [coaNormalBalance, setCoaNormalBalance] = useState<AccountNormalBalance>('DEBIT');
  const [coaParentId, setCoaParentId] = useState<string>('');
  const [coaIsHeader, setCoaIsHeader] = useState<boolean>(false);
  const [coaDescription, setCoaDescription] = useState('');
  const [coaError, setCoaError] = useState('');

  // Helper to get CoA account name dynamically from chartOfAccounts
  const getCoaName = (code: string, fallback: string) => {
    const acc = chartOfAccounts.find(a => a.code === code);
    return acc ? acc.name : fallback;
  };

  // ── Filters & Expanded Rows ──
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [arStatusFilter, setArStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');
  const [arSearchQuery, setArSearchQuery] = useState('');
  const [journalFilterAccount, setJournalFilterAccount] = useState<string>('ALL');
  const [selectedHPPOrder, setSelectedHPPOrder] = useState<any>(null);
  const [hppPeriodRange, setHppPeriodRange] = useState<DateRange>(() => getThisMonthRange());
  const [hppSearch, setHppSearch] = useState('');
  const [hppStatusFilter, setHppStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PRODUCTION' | 'SENT'>('ALL');

  // ── Filters for Kas & Bank Mutasi Terpadu ──
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [cashMutationSearch, setCashMutationSearch] = useState<string>('');
  const [cashMutationTypeFilter, setCashMutationTypeFilter] = useState<string>('ALL');
  const [cashMutationDateRange, setCashMutationDateRange] = useState<DateRange>(() => ({ from: null, to: null }));

  // ── Unified Transaction Modal ──
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txType, setTxType] = useState<'inflow' | 'outflow' | 'transfer'>('outflow');
  const [txAccountCode, setTxAccountCode] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txBankId, setTxBankId] = useState('');
  const [txToBankId, setTxToBankId] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txError, setTxError] = useState('');

  // ── General Ledger state ──
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('1-1100');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // ── Manual Journal Modal ──
  const [showManualJournalModal, setShowManualJournalModal] = useState(false);
  const [manualJournalDesc, setManualJournalDesc] = useState('');
  const [manualJournalLines, setManualJournalLines] = useState<Array<{ accountId: string; accountCode: string; debit: string; credit: string }>>([
    { accountId: '', accountCode: '', debit: '', credit: '' },
    { accountId: '', accountCode: '', debit: '', credit: '' },
  ]);
  const [manualJournalError, setManualJournalError] = useState('');

  // ── Closing Entry Modal ──
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [closingError, setClosingError] = useState('');

  // ── Dividend Modal ──
  const [showDividendModal, setShowDividendModal] = useState(false);
  const [dividendAmount, setDividendAmount] = useState('');
  const [dividendBankId, setDividendBankId] = useState('');
  const [dividendError, setDividendError] = useState('');

  // Selected records for modals
  const selectedInvoice = invoices.find(i => i.id === showPaymentModal);
  const selectedPO = purchaseOrders.find(p => p.id === showPOPaymentModal);

  // ─────────────────────────────────────────────────────────────
  // ── COMPUTED METRICS & FINANCIAL ENGINE ──────────────────────
  // ─────────────────────────────────────────────────────────────

  // Total Liquidity across all Bank Accounts
  const totalCashBank = useMemo(() => bankAccounts.reduce((sum, ba) => sum + ba.balance, 0), [bankAccounts]);

  // Accounts Receivable (Piutang)
  const totalReceivable = useMemo(() => invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0), [invoices]);
  const totalCollected = useMemo(() => invoices.reduce((s, i) => s + i.paidAmount, 0), [invoices]);
  const arAging = useMemo(() => computeARAging(invoices), [invoices]);

  // Accounts Payable (Hutang PO)
  const unpaidPOs = useMemo(() => purchaseOrders.filter(p => p.status === 'RECEIVED' && p.paymentStatus !== 'PAID'), [purchaseOrders]);
  const totalPayable = useMemo(() => unpaidPOs.reduce((s, p) => s + p.totalAmount, 0), [unpaidPOs]);
  const apAging = useMemo(() => computeAPAging(purchaseOrders), [purchaseOrders]);

  // Total Operational Expenses
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  // HPP / COGS Analysis per completed Sales Order
  const hppAnalysis: HPPAnalysis[] = useMemo(() => {
    return salesOrders
      .filter(so => so.status === 'SENT')
      .map(so => {
        const relatedWOs = workOrders.filter(wo => wo.salesOrderId === so.id);
        const materialCost = relatedWOs.reduce((sum, wo) => sum + wo.materialCost, 0);
        const plannedLaborCost = relatedWOs.reduce((sum, wo) => sum + wo.plannedLaborCost, 0);
        const plannedOverheadCost = relatedWOs.reduce((sum, wo) => sum + 0, 0);
        const actualLaborCost = relatedWOs.reduce((sum, wo) => sum + (wo.actualLaborCost || wo.plannedLaborCost), 0);
        const actualOverheadCost = relatedWOs.reduce((sum, wo) => sum + (0 || 0), 0);
        const totalHPP = materialCost + actualLaborCost + actualOverheadCost;
        const grossProfit = so.totalAmount - totalHPP;
        const grossMarginPercent = so.totalAmount > 0 ? (grossProfit / so.totalAmount) * 100 : 0;

        return {
          salesOrderId: so.id,
          salesOrderNumber: so.orderNumber,
          customerName: so.customer.name,
          sellingPrice: so.totalAmount,
          materialCost,
          plannedLaborCost,
          plannedOverheadCost,
          actualLaborCost,
          actualOverheadCost,
          totalHPP,
          grossProfit,
          grossMarginPercent,
        };
      });
  }, [salesOrders, workOrders]);

  const inProductionHPP: HPPAnalysis[] = useMemo(() => {
    return salesOrders
      .filter(so => so.status === 'PROCESSING' || so.status === 'READY')
      .map(so => {
        const relatedWOs = workOrders.filter(wo => wo.salesOrderId === so.id);
        const materialCost = relatedWOs.reduce((sum, wo) => sum + wo.materialCost, 0);
        const plannedLaborCost = relatedWOs.reduce((sum, wo) => sum + wo.plannedLaborCost, 0);
        const plannedOverheadCost = relatedWOs.reduce((sum, wo) => sum + 0, 0);
        const actualLaborCost = relatedWOs.reduce((sum, wo) => sum + (wo.actualLaborCost || wo.plannedLaborCost), 0);
        const actualOverheadCost = relatedWOs.reduce((sum, wo) => sum + (0 || 0), 0);
        const totalHPP = materialCost + plannedLaborCost + plannedOverheadCost;
        const grossProfit = so.totalAmount - totalHPP;
        const grossMarginPercent = so.totalAmount > 0 ? (grossProfit / so.totalAmount) * 100 : 0;

        return {
          salesOrderId: so.id,
          salesOrderNumber: so.orderNumber,
          customerName: so.customer.name,
          sellingPrice: so.totalAmount,
          materialCost,
          plannedLaborCost,
          plannedOverheadCost,
          actualLaborCost,
          actualOverheadCost,
          totalHPP,
          grossProfit,
          grossMarginPercent,
        };
      });
  }, [salesOrders, workOrders]);

  // Data Terpadu Khusus untuk Tabel Analisis HPP & Margin
  const allOrderHPPData = useMemo(() => {
    return salesOrders.map(so => {
      let materialCost = 0;
      let laborCost = 0;
      let totalHPP = 0;
      let statusLabel = '';

      if (so.status === 'PENDING') {
        statusLabel = 'Belum Diproses';
        if (getPendingOrderEstHPP) {
          const est = getPendingOrderEstHPP(so.id);
          materialCost = est?.estMaterialCost || 0;
          laborCost = est?.estLaborCost || 0;
          totalHPP = est?.totalEstHPP || 0;
        }
      } else {
        statusLabel = so.status === 'SENT' ? 'Selesai' : 'Sedang Berjalan';
        const relatedWOs = workOrders.filter(wo => wo.salesOrderId === so.id);
        materialCost = relatedWOs.reduce((sum, wo) => sum + wo.materialCost, 0);
        laborCost = relatedWOs.reduce((sum, wo) => sum + (wo.actualLaborCost || wo.plannedLaborCost), 0);
        totalHPP = materialCost + laborCost;
      }

      const grossProfit = so.totalAmount - totalHPP;
      const grossMarginPercent = so.totalAmount > 0 ? (grossProfit / so.totalAmount) * 100 : 0;

      return {
        id: so.id,
        orderNumber: so.orderNumber,
        customerName: so.customer.name,
        createdAt: so.createdAt,
        sellingPrice: so.totalAmount,
        materialCost,
        laborCost,
        totalHPP,
        grossProfit,
        grossMarginPercent,
        statusLabel,
        rawStatus: so.status
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [salesOrders, workOrders, getPendingOrderEstHPP]);

  // Filtered HPP data (by period, search, status)
  const filteredHPPData = useMemo(() => {
    return allOrderHPPData.filter(row => {
      // Period filter
      if (hppPeriodRange.from || hppPeriodRange.to) {
        const orderDate = new Date(row.createdAt);
        if (hppPeriodRange.from && orderDate < hppPeriodRange.from) return false;
        if (hppPeriodRange.to && orderDate > hppPeriodRange.to) return false;
      }
      // Search filter
      if (hppSearch.trim()) {
        const q = hppSearch.toLowerCase();
        const matchName = row.customerName.toLowerCase().includes(q);
        const matchOrder = row.orderNumber.toLowerCase().includes(q);
        if (!matchName && !matchOrder) return false;
      }
      // Status filter
      if (hppStatusFilter !== 'ALL') {
        if (hppStatusFilter === 'PENDING' && row.rawStatus !== 'PENDING') return false;
        if (hppStatusFilter === 'SENT' && row.rawStatus !== 'SENT') return false;
        if (hppStatusFilter === 'IN_PRODUCTION' && (row.rawStatus === 'PENDING' || row.rawStatus === 'SENT')) return false;
      }
      return true;
    });
  }, [allOrderHPPData, hppPeriodRange, hppSearch, hppStatusFilter]);

  // Income Statement Totals
  const totalRevenue = useMemo(() => hppAnalysis.reduce((s, h) => s + h.sellingPrice, 0), [hppAnalysis]);
  const totalMaterialCost = useMemo(() => hppAnalysis.reduce((s, h) => s + h.materialCost, 0), [hppAnalysis]);
  const totalLaborCost = useMemo(() => hppAnalysis.reduce((s, h) => s + h.actualLaborCost, 0), [hppAnalysis]);
  const totalOverheadCost = useMemo(() => hppAnalysis.reduce((s, h) => s + h.actualOverheadCost, 0), [hppAnalysis]);
  const totalCOGS = totalMaterialCost + totalLaborCost + totalOverheadCost;
  const totalGrossProfit = totalRevenue - totalCOGS;
  const grossMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  // Calculate only actual revenue from otherIncomes (exclude loans 2-1300)
  const totalOtherIncome = useMemo(() =>
    otherIncomes
      .filter(inc => !inc.accountCode.startsWith('2-'))
      .reduce((s, inc) => s + inc.amount, 0)
    , [otherIncomes]);

  const totalNetProfit = totalGrossProfit + totalOtherIncome - totalExpenses;
  const netMarginPercent = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  // Balance Sheet Totals
  const inventoryAssetValue = useMemo(() => materials.reduce((s, m) => s + m.stock * m.unitCost, 0), [materials]);
  const fixedAssetCost = useMemo(() => assets.reduce((s, a) => s + a.purchaseCost, 0), [assets]);
  const totalCurrentAssets = totalCashBank + totalReceivable + inventoryAssetValue;
  const totalFixedAssets = fixedAssetCost;
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalPayableLiabilities = totalPayable;

  // Calculate total loans from otherIncomes (liabilities starts with 2-)
  const totalLoans = useMemo(() =>
    otherIncomes
      .filter(inc => inc.accountCode.startsWith('2-'))
      .reduce((s, inc) => s + inc.amount, 0)
    , [otherIncomes]);

  const totalCurrentLiabilities = totalPayableLiabilities;
  const totalLiabilities = totalCurrentLiabilities + totalLoans;

  // Initial Capital (Modal) is computed from Bank starting balances + initial assets
  const initialCapital = useMemo(() => {
    // Opening balance from journal entries for active bank accounts
    const activeBankIds = new Set(bankAccounts.map(b => b.id));
    const openingJE = journalEntries.filter(
      j => j.sourceType === 'OPENING_BALANCE' && (!j.sourceId || activeBankIds.has(j.sourceId))
    );
    const fromJE = openingJE.reduce((sum, j) => {
      const modalLine = j.lines.find(l => l.accountCode === '3-1000');
      return sum + (modalLine?.credit || 0);
    }, 0);
    return fromJE > 0 ? fromJE : Math.max(0, totalCashBank - totalNetProfit + totalPayable);
  }, [journalEntries, bankAccounts, totalCashBank, totalNetProfit, totalPayable]);

  const totalEquity = totalAssets - totalLiabilities; // Balanced by standard accounting equation
  const isBalanceSheetBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  // Cash Flow Calculations
  const cashFromCustomers = totalCollected;
  const cashPaidToSuppliers = useMemo(() => {
    return purchaseOrders
      .filter(p => p.paymentStatus === 'PAID')
      .reduce((sum, p) => sum + p.totalAmount, 0);
  }, [purchaseOrders]);
  const cashPaidForExpenses = totalExpenses;
  const netOperatingCashFlow = cashFromCustomers - cashPaidToSuppliers - cashPaidForExpenses;
  const netInvestingCashFlow = -fixedAssetCost; // CapEx
  const netFinancingCashFlow = initialCapital > 0 ? initialCapital : 0;
  const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

  // Trial Balance from Journal
  const trialBalance = useMemo(() => computeTrialBalance(journalEntries, chartOfAccounts), [journalEntries, chartOfAccounts]);

  // ── General Ledger (Buku Besar) Computation ──
  const ledgerAvailableAccounts = useMemo(() => {
    return chartOfAccounts.filter(a => !a.isHeader);
  }, [chartOfAccounts]);

  const currentLedgerAccount = useMemo(() => {
    return chartOfAccounts.find(a => a.code === selectedLedgerAccount) || ledgerAvailableAccounts[0];
  }, [chartOfAccounts, selectedLedgerAccount, ledgerAvailableAccounts]);

  const accountActivityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    journalEntries.forEach(je => {
      je.lines.forEach(l => {
        counts[l.accountCode] = (counts[l.accountCode] || 0) + 1;
      });
    });
    return counts;
  }, [journalEntries]);

  const ledgerData = useMemo(() => {
    if (!currentLedgerAccount) {
      return { entries: [], totalDebit: 0, totalCredit: 0, endingBalance: 0 };
    }

    // Sort all journals chronologically (oldest to newest)
    const sorted = [...journalEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const allEntries: Array<{
      id: string;
      date: string;
      entryNumber: string;
      sourceType: string;
      description: string;
      debit: number;
      credit: number;
      contraAccount: string;
      runningBalance: number;
    }> = [];

    sorted.forEach(je => {
      const matchingLines = je.lines.filter(l => l.accountCode === currentLedgerAccount.code);
      if (matchingLines.length === 0) return;

      const otherLines = je.lines.filter(l => l.accountCode !== currentLedgerAccount.code);
      const contraAccount = otherLines.length > 0
        ? otherLines.map(l => `${l.accountCode} - ${l.accountName}`).join(', ')
        : '-';

      matchingLines.forEach((line, idx) => {
        totalDebit += line.debit;
        totalCredit += line.credit;

        if (currentLedgerAccount.normalBalance === 'DEBIT') {
          running += line.debit - line.credit;
        } else {
          running += line.credit - line.debit;
        }

        allEntries.push({
          id: `${je.id}-${idx}`,
          date: je.date,
          entryNumber: je.entryNumber,
          sourceType: je.sourceType,
          description: je.description,
          debit: line.debit,
          credit: line.credit,
          contraAccount,
          runningBalance: running,
        });
      });
    });

    return {
      entries: allEntries,
      totalDebit,
      totalCredit,
      endingBalance: running,
    };
  }, [journalEntries, currentLedgerAccount]);

  const filteredLedgerEntries = useMemo(() => {
    if (!ledgerSearch.trim()) return ledgerData.entries;
    const q = ledgerSearch.toLowerCase();
    return ledgerData.entries.filter(e =>
      e.entryNumber.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.contraAccount.toLowerCase().includes(q) ||
      e.sourceType.toLowerCase().includes(q)
    );
  }, [ledgerData.entries, ledgerSearch]);

  // ── Helper Date Normalizers for Filter ──
  const getStartOfDay = (d: Date) => {
    const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
  };
  const getEndOfDay = (d: Date) => {
    const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
  };

  // ── Unified Cash & Bank Mutations Engine (Single Source of Truth) ──
  const unifiedCashMutations = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      bankAccountId: string;
      bankName: string;
      type: 'INFLOW' | 'OUTFLOW';
      amount: number;
      description: string;
      categoryOrMemo: string;
      sourceType: 'DIRECT_CASH' | 'AR_PAYMENT' | 'AP_PAYMENT' | 'TRANSFER' | 'DIVIDEND';
      sourceBadgeLabel: string;
      sourceBadgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
      refType?: 'INVOICE' | 'PO';
      refId?: string;
      refNumber?: string;
      runningBalance?: number;
    }> = [];

    // 1. AR Payments (Inflow from Customers)
    invoices.forEach(inv => {
      inv.payments.forEach(pay => {
        const matchedBank = bankAccounts.find(
          b => b.name.toLowerCase() === pay.method.toLowerCase() || b.id === pay.method
        );
        list.push({
          id: `ar-${pay.id || `${inv.id}-${pay.date}`}`,
          date: pay.date,
          bankAccountId: matchedBank?.id || '',
          bankName: matchedBank?.name || pay.method || 'Kas & Bank',
          type: 'INFLOW',
          amount: pay.amount,
          description: `Pelunasan Faktur ${inv.invoiceNumber} — ${inv.customerName}`,
          categoryOrMemo: pay.note || 'Penerimaan Piutang Usaha',
          sourceType: 'AR_PAYMENT',
          sourceBadgeLabel: 'Pelunasan AR',
          sourceBadgeVariant: 'info',
          refType: 'INVOICE',
          refId: inv.id,
          refNumber: inv.invoiceNumber,
        });
      });
    });

    // 2. AP Payments (Outflow to Suppliers)
    purchaseOrders.forEach(po => {
      if (po.paymentStatus === 'PAID') {
        const matchedBank = bankAccounts.find(b => b.id === po.bankAccountId);
        list.push({
          id: `ap-${po.id}`,
          date: po.paidAt || po.receivedAt || po.createdAt,
          bankAccountId: po.bankAccountId || matchedBank?.id || '',
          bankName: matchedBank?.name || 'Kas & Bank',
          type: 'OUTFLOW',
          amount: po.totalAmount,
          description: `Pembayaran Tagihan Supplier — ${po.poNumber} (${po.supplier})`,
          categoryOrMemo: 'Pelunasan Hutang Bahan Baku',
          sourceType: 'AP_PAYMENT',
          sourceBadgeLabel: 'Pembayaran AP',
          sourceBadgeVariant: 'danger',
          refType: 'PO',
          refId: po.id,
          refNumber: po.poNumber,
        });
      }
    });

    // 3. Operational Expenses (Direct Cash Outflow)
    expenses.forEach(exp => {
      const matchedBank = bankAccounts.find(b => b.id === exp.bankAccountId);
      const coa = mapExpenseCategoryToCoa(exp.category);
      list.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        bankAccountId: exp.bankAccountId,
        bankName: matchedBank?.name || 'Kas',
        type: 'OUTFLOW',
        amount: exp.amount,
        description: `Beban ${coa.name}`,
        categoryOrMemo: exp.note || coa.name,
        sourceType: 'DIRECT_CASH',
        sourceBadgeLabel: 'Direct Cash',
        sourceBadgeVariant: 'purple',
      });
    });

    // 4. Other Direct Incomes (Direct Cash Inflow)
    otherIncomes.forEach(inc => {
      const matchedBank = bankAccounts.find(b => b.id === inc.bankAccountId);
      list.push({
        id: `inc-${inc.id}`,
        date: inc.date,
        bankAccountId: inc.bankAccountId,
        bankName: matchedBank?.name || 'Kas',
        type: 'INFLOW',
        amount: inc.amount,
        description: inc.accountName || 'Pemasukan Lain-lain',
        categoryOrMemo: inc.note || `${inc.accountCode} - ${inc.accountName}`,
        sourceType: 'DIRECT_CASH',
        sourceBadgeLabel: 'Direct Cash',
        sourceBadgeVariant: 'purple',
      });
    });

    // 5. Bank Transfers from Journal Entries
    journalEntries.forEach(je => {
      if (je.sourceType === 'BANK_TRANSFER') {
        const parts = (je.sourceId || '').split('-');
        const fromId = parts[0];
        const toId = parts[1];
        const fromBank = bankAccounts.find(b => b.id === fromId);
        const toBank = bankAccounts.find(b => b.id === toId);
        const amt = je.lines[0]?.debit || 0;

        list.push({
          id: `${je.id}-out`,
          date: je.date,
          bankAccountId: fromId,
          bankName: fromBank?.name || 'Rekening Asal',
          type: 'OUTFLOW',
          amount: amt,
          description: `Transfer Kas ke ${toBank?.name || 'Rekening Lain'}`,
          categoryOrMemo: je.description,
          sourceType: 'TRANSFER',
          sourceBadgeLabel: 'Transfer',
          sourceBadgeVariant: 'default',
        });
        list.push({
          id: `${je.id}-in`,
          date: je.date,
          bankAccountId: toId,
          bankName: toBank?.name || 'Rekening Tujuan',
          type: 'INFLOW',
          amount: amt,
          description: `Transfer Kas dari ${fromBank?.name || 'Rekening Asal'}`,
          categoryOrMemo: je.description,
          sourceType: 'TRANSFER',
          sourceBadgeLabel: 'Transfer',
          sourceBadgeVariant: 'default',
        });
      } else if (je.sourceType === 'DIVIDEND') {
        const bankId = je.sourceId || '';
        const matchedBank = bankAccounts.find(b => b.id === bankId);
        const amt = je.lines.find(l => l.credit > 0)?.credit || 0;
        list.push({
          id: `div-${je.id}`,
          date: je.date,
          bankAccountId: bankId,
          bankName: matchedBank?.name || 'Kas',
          type: 'OUTFLOW',
          amount: amt,
          description: 'Pembagian Dividen kepada Pemegang Saham',
          categoryOrMemo: 'Distribusi Laba Ditahan',
          sourceType: 'DIVIDEND',
          sourceBadgeLabel: 'Dividen',
          sourceBadgeVariant: 'warning',
        });
      }
    });

    // Sort chronologically ascending to compute accurate historical running balance
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [invoices, purchaseOrders, expenses, otherIncomes, journalEntries, bankAccounts]);

  // Compute running balance based on selected bank account filter
  const mutationsWithRunningBalance = useMemo(() => {
    const isSingleBank = selectedBankFilter !== 'ALL';
    const targetBank = isSingleBank ? bankAccounts.find(b => b.id === selectedBankFilter) : null;

    const scopedMutations = isSingleBank
      ? unifiedCashMutations.filter(m => m.bankAccountId === selectedBankFilter)
      : unifiedCashMutations;

    const currentScopeBalance = isSingleBank
      ? (targetBank?.balance || 0)
      : bankAccounts.reduce((sum, b) => sum + b.balance, 0);

    const netChange = scopedMutations.reduce(
      (sum, m) => sum + (m.type === 'INFLOW' ? m.amount : -m.amount),
      0
    );
    const startBalance = currentScopeBalance - netChange;

    let running = startBalance;
    return scopedMutations.map(m => {
      running += (m.type === 'INFLOW' ? m.amount : -m.amount);
      return {
        ...m,
        runningBalance: running,
      };
    });
  }, [unifiedCashMutations, selectedBankFilter, bankAccounts]);

  // Filtered list for display (DateRange, Search, TypeFilter) sorted descending (newest first)
  const filteredCashMutations = useMemo(() => {
    let result = mutationsWithRunningBalance;

    if (cashMutationDateRange.from) {
      const fromTime = getStartOfDay(cashMutationDateRange.from).getTime();
      result = result.filter(m => new Date(m.date).getTime() >= fromTime);
    }
    if (cashMutationDateRange.to) {
      const toTime = getEndOfDay(cashMutationDateRange.to).getTime();
      result = result.filter(m => new Date(m.date).getTime() <= toTime);
    }

    if (cashMutationTypeFilter !== 'ALL') {
      result = result.filter(m => m.sourceType === cashMutationTypeFilter);
    }

    if (cashMutationSearch.trim()) {
      const q = cashMutationSearch.toLowerCase();
      result = result.filter(m =>
        m.description.toLowerCase().includes(q) ||
        m.categoryOrMemo.toLowerCase().includes(q) ||
        m.bankName.toLowerCase().includes(q) ||
        (m.refNumber && m.refNumber.toLowerCase().includes(q))
      );
    }

    return [...result].reverse();
  }, [mutationsWithRunningBalance, cashMutationDateRange, cashMutationTypeFilter, cashMutationSearch]);

  // Backwards compatibility for overview tab
  const allTransactions = useMemo(() => {
    return [...unifiedCashMutations].reverse().map(m => ({
      date: m.date,
      bankName: m.bankName,
      type: m.type,
      description: m.description,
      amount: m.amount,
    }));
  }, [unifiedCashMutations]);

  // Drill-down handlers
  const handleDrillDownInvoice = (invoiceId: string) => {
    setActiveTab('invoices');
    setTxSubTab('ar');
    setExpandedInvoiceId(invoiceId);
  };

  const handleDrillDownPO = (poId: string) => {
    setActiveTab('invoices');
    setTxSubTab('ap');
  };

  // ─────────────────────────────────────────────────────────────
  // ── ACTION HANDLERS ──────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────

  const submitPayment = () => {
    if (!showPaymentModal || !payAmount || Number(payAmount) <= 0 || !payAccountId) return;
    recordPayment(showPaymentModal, Number(payAmount), payAccountId, payNote);
    setPayAmount('');
    setPayAccountId('');
    setPayNote('');
    setShowPaymentModal(null);
  };

  const submitPOPayment = () => {
    if (!showPOPaymentModal || !poPayAccountId) return;
    const po = purchaseOrders.find(p => p.id === showPOPaymentModal);
    const bank = bankAccounts.find(b => b.id === poPayAccountId);

    if (po && bank && bank.balance < po.totalAmount) {
      setPoPayError(`Saldo rekening ${bank.name} tidak mencukupi untuk pembayaran ini.`);
      return;
    }

    paySupplierPO(showPOPaymentModal, poPayAccountId);
    setPoPayAccountId('');
    setPoPayError('');
    setShowPOPaymentModal(null);
  };

  const submitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) {
      setTxError('Nominal transaksi harus lebih besar dari 0.');
      return;
    }
    if (!txBankId) {
      setTxError('Harap pilih rekening kas/bank utama.');
      return;
    }

    const amt = Number(txAmount);
    const bank = bankAccounts.find(ba => ba.id === txBankId);

    if (txType === 'outflow') {
      if (!txAccountCode) {
        setTxError('Harap pilih kategori beban operasional.');
        return;
      }
      if (bank && bank.balance < amt) {
        setTxError(`Saldo ${bank.name} tidak mencukupi (Saldo saat ini: ${formatCurrency(bank.balance)}).`);
        return;
      }
      recordExpense(txAccountCode as any, amt, txBankId, txNote.trim() || undefined);
    } else if (txType === 'inflow') {
      if (!txAccountCode) {
        setTxError('Harap pilih kategori pemasukan / akun penerimaan.');
        return;
      }
      const accountInfo = chartOfAccounts.find(a => a.code === txAccountCode);
      if (!accountInfo) {
        setTxError('Akun tidak ditemukan.');
        return;
      }
      recordOtherIncome(accountInfo.code, accountInfo.name, amt, txBankId, txNote.trim() || undefined);
    } else if (txType === 'transfer') {
      if (!txToBankId) {
        setTxError('Harap pilih rekening tujuan.');
        return;
      }
      if (txBankId === txToBankId) {
        setTxError('Rekening asal dan tujuan tidak boleh sama.');
        return;
      }
      if (bank && bank.balance < amt) {
        setTxError(`Saldo ${bank.name} tidak mencukupi (Saldo: ${formatCurrency(bank.balance)}).`);
        return;
      }
      const ok = transferBankFunds(txBankId, txToBankId, amt, txNote.trim() || undefined);
      if (!ok) {
        setTxError('Gagal memproses transfer dana. Cek kembali saldo rekening.');
        return;
      }
    }

    // Success reset
    setTxAmount('');
    setTxNote('');
    setTxError('');
    setShowTransactionModal(false);
  };

  const handleSaveBankAccount = () => {
    if (!bankName.trim()) {
      setBankError('Nama rekening wajib diisi.');
      return;
    }
    if (!editBankId && (!bankInitialBalance || Number(bankInitialBalance) < 0)) {
      setBankError('Saldo awal wajib diisi dan tidak boleh negatif.');
      return;
    }

    if (editBankId) {
      updateBankAccount(editBankId, {
        name: bankName.trim(),
        accountNumber: bankNumber.trim() || undefined,
      });
    } else {
      addBankAccount({
        name: bankName.trim(),
        accountNumber: bankNumber.trim() || undefined,
        balance: Number(bankInitialBalance),
      });
    }

    setBankName('');
    setBankNumber('');
    setBankInitialBalance('');
    setBankError('');
    setShowBankModal(false);
  };

  // ── COA Handlers ──
  const suggestNextCode = (parentId: string, type: AccountType): string => {
    if (!parentId) {
      const typeRootMap: Record<AccountType, string> = {
        ASSET: '1-0000',
        LIABILITY: '2-0000',
        EQUITY: '3-0000',
        REVENUE: '4-0000',
        COGS: '5-0000',
        EXPENSE: '6-0000',
      };
      return typeRootMap[type] || '1-0000';
    }
    const parent = chartOfAccounts.find(a => a.id === parentId);
    if (!parent) return '';

    const children = chartOfAccounts.filter(a => a.parentId === parentId);
    const prefix = parent.code.split('-')[0] || '1';

    if (children.length === 0) {
      if (parent.level === 1) return `${prefix}-1000`;
      if (parent.level === 2) return `${prefix}-1100`;
      return `${prefix}-1110`;
    }

    const numCodes = children
      .map(c => {
        const parts = c.code.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    if (numCodes.length > 0) {
      const maxVal = Math.max(...numCodes);
      const step = parent.level === 1 ? 1000 : parent.level === 2 ? 100 : 10;
      const nextVal = maxVal + step;
      return `${prefix}-${String(nextVal).padStart(4, '0')}`;
    }

    return `${parent.code}-1`;
  };

  const handleParentSelectChange = (newParentId: string) => {
    setCoaParentId(newParentId);
    if (newParentId) {
      const parent = chartOfAccounts.find(a => a.id === newParentId);
      if (parent) {
        setCoaType(parent.type);
        setCoaNormalBalance(parent.normalBalance);
        setCoaIsHeader(false);
        if (!editingCOAId) {
          setCoaCode(suggestNextCode(newParentId, parent.type));
        }
      }
    } else {
      setCoaIsHeader(true);
      if (!editingCOAId) {
        setCoaCode(suggestNextCode('', coaType));
      }
    }
  };

  const handleTypeSelectChange = (newType: AccountType) => {
    setCoaType(newType);
    const defaultNormal: Record<AccountType, AccountNormalBalance> = {
      ASSET: 'DEBIT',
      LIABILITY: 'CREDIT',
      EQUITY: 'CREDIT',
      REVENUE: 'CREDIT',
      COGS: 'DEBIT',
      EXPENSE: 'DEBIT',
    };
    setCoaNormalBalance(defaultNormal[newType] || 'DEBIT');
    if (!editingCOAId && !coaParentId) {
      setCoaCode(suggestNextCode('', newType));
    }
  };

  const openCOAModal = () => {
    setEditingCOAId(null);
    setCoaName('');
    setCoaDescription('');
    setCoaError('');

    // Default to Kas & Bank (1-1100) or first header as parent for smart auto-fill
    const defaultParent = chartOfAccounts.find(a => a.code === '1-1100') || chartOfAccounts.find(a => a.level === 2) || chartOfAccounts[0];
    if (defaultParent) {
      setCoaParentId(defaultParent.id);
      setCoaType(defaultParent.type);
      setCoaNormalBalance(defaultParent.normalBalance);
      setCoaIsHeader(false);
      setCoaCode(suggestNextCode(defaultParent.id, defaultParent.type));
    } else {
      setCoaParentId('');
      setCoaType('ASSET');
      setCoaNormalBalance('DEBIT');
      setCoaIsHeader(true);
      setCoaCode('1-0000');
    }

    setShowCOAModal(true);
  };

  const openExpenseModal = () => {
    setTxType('outflow');
    setTxAccountCode('');
    setTxAmount('');
    setTxBankId(bankAccounts[0]?.id || '');
    setTxToBankId(bankAccounts[1]?.id || '');
    setTxNote('');
    setTxError('');
    setShowTransactionModal(true);
  };

  const openIncomeModal = () => {
    setTxType('inflow');
    setTxAccountCode('');
    setTxAmount('');
    setTxBankId(bankAccounts[0]?.id || '');
    setTxToBankId(bankAccounts[1]?.id || '');
    setTxNote('');
    setTxError('');
    setShowTransactionModal(true);
  };

  const openTransferModal = () => {
    setTxType('transfer');
    setTxAccountCode('');
    setTxAmount('');
    setTxBankId(bankAccounts[0]?.id || '');
    setTxToBankId(bankAccounts[1]?.id || '');
    setTxNote('');
    setTxError('');
    setShowTransactionModal(true);
  };

  const openManualJournalModal = () => {
    setManualJournalDesc('');
    setManualJournalLines([
      { accountId: '', accountCode: '', debit: '', credit: '' },
      { accountId: '', accountCode: '', debit: '', credit: '' },
    ]);
    setManualJournalError('');
    setShowManualJournalModal(true);
  };

  const openClosingModal = () => {
    setClosingDate(new Date().toISOString().substring(0, 10));
    setClosingError('');
    setShowClosingModal(true);
  };

  const openDividendModal = () => {
    setDividendAmount('');
    setDividendBankId(bankAccounts[0]?.id || '');
    setDividendError('');
    setShowDividendModal(true);
  };

  const handleManualJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJournalDesc.trim()) {
      setManualJournalError('Keterangan jurnal wajib diisi.');
      return;
    }

    const validLines = manualJournalLines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      setManualJournalError('Jurnal manual minimal harus memiliki 2 baris akun yang terisi nominal.');
      return;
    }

    const totalDebit = validLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = validLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

    if (totalDebit !== totalCredit) {
      setManualJournalError(`Jurnal tidak seimbang (Unbalanced). Total Debit: ${formatCurrency(totalDebit)} | Total Kredit: ${formatCurrency(totalCredit)}`);
      return;
    }

    const payload = validLines.map(l => ({
      accountId: l.accountId,
      accountCode: l.accountCode,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }));

    // @ts-ignore
    addManualJournal(manualJournalDesc, payload);
    setShowManualJournalModal(false);
    toast.success('Jurnal Manual Disimpan', 'Jurnal manual berhasil ditambahkan.');
  };

  const handleClosingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use the already calculated values from the page
    closePeriod(totalRevenue, totalCOGS, totalExpenses, new Date(closingDate).toISOString());
    setShowClosingModal(false);
    toast.success('Tutup Buku Berhasil', 'Proses penutupan buku periode ini telah selesai dan laba/rugi dipindahkan ke Laba Ditahan.');
  };

  const handleDividendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(dividendAmount);
    if (!amt || amt <= 0) {
      setDividendError('Nominal dividen harus lebih dari 0.');
      return;
    }
    if (!dividendBankId) {
      setDividendError('Pilih rekening sumber pembayaran dividen.');
      return;
    }
    const bank = bankAccounts.find(b => b.id === dividendBankId);
    if (bank && bank.balance < amt) {
      setDividendError(`Saldo ${bank.name} tidak mencukupi.`);
      return;
    }

    distributeDividend(amt, dividendBankId);
    setShowDividendModal(false);
    toast.success('Dividen Dibagikan', `Dividen sebesar ${formatCurrency(amt)} berhasil didistribusikan.`);
  };

  const handleEditCOA = (id: string) => {
    const acc = chartOfAccounts.find(a => a.id === id);
    if (!acc) return;
    setEditingCOAId(acc.id);
    setCoaCode(acc.code);
    setCoaName(acc.name);
    setCoaType(acc.type);
    setCoaNormalBalance(acc.normalBalance);
    setCoaParentId(acc.parentId || '');
    setCoaIsHeader(acc.isHeader);
    setCoaDescription(acc.description || '');
    setCoaError('');
    setShowCOAModal(true);
  };

  const handleDeleteCOA = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Akun COA',
      message: `Apakah Anda yakin ingin menghapus akun "${name}"?`,
      confirmText: 'Hapus Akun',
      variant: 'danger',
    });
    if (isOk) {
      const res = deleteAccount(id);
      if (!res.success) {
        toast.error('Gagal Menghapus Akun', res.reason || 'Gagal menghapus akun.');
      } else {
        toast.success('Akun Dihapus', `Akun "${name}" berhasil dihapus.`);
      }
    }
  };

  const handleSubmitCOA = (e: React.FormEvent) => {
    e.preventDefault();
    setCoaError('');

    const cleanCode = coaCode.trim();
    const cleanName = coaName.trim();

    if (!cleanCode || !cleanName) {
      setCoaError('Kode Akun dan Nama Akun wajib diisi.');
      return;
    }

    // Check duplicate code
    const isDuplicate = chartOfAccounts.some(a => a.code === cleanCode && a.id !== editingCOAId);
    if (isDuplicate) {
      setCoaError(`Kode akun "${cleanCode}" sudah digunakan oleh akun lain. Gunakan kode unik.`);
      return;
    }

    let finalType = coaType;
    let finalNormalBalance = coaNormalBalance;
    let finalLevel = 1;

    if (coaParentId) {
      const parent = chartOfAccounts.find(a => a.id === coaParentId);
      if (parent) {
        finalType = parent.type;
        finalNormalBalance = parent.normalBalance;
        finalLevel = parent.level + 1;
        if (!parent.isHeader) {
          updateAccount(parent.id, { isHeader: true });
        }
      }
    }

    const payload = {
      code: cleanCode,
      name: cleanName,
      type: finalType,
      normalBalance: finalNormalBalance,
      parentId: coaParentId || undefined,
      isHeader: coaIsHeader,
      level: finalLevel,
      description: coaDescription.trim() || undefined,
    };

    if (editingCOAId) {
      updateAccount(editingCOAId, payload);
    } else {
      addAccount(payload);
    }

    setShowCOAModal(false);
  };

  // ── Tab Config ──
  const tabs = [
    { key: 'overview' as const, label: 'Ringkasan', icon: LayoutDashboard },
    { key: 'cash_bank' as const, label: 'Kas & Bank', icon: Building2 },
    { key: 'invoices' as const, label: 'Tagihan & Faktur', icon: Receipt },
    { key: 'accounting' as const, label: 'Pembukuan', icon: BookOpen },
    { key: 'reports' as const, label: 'Laporan Keuangan', icon: FileText },
  ];

  // ─────────────────────────────────────────────────────────────
  // ── RENDER COMPONENT ─────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="Keuangan"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openDividendModal}
          >
            <Wallet className="h-4 w-4 mr-1.5" /> Bagi Dividen
          </Button>
          <Button onClick={() => {
            setTxType('outflow');
            setTxAccountCode('');
            setTxAmount('');
            setTxBankId(bankAccounts[0]?.id || '');
            setTxToBankId(bankAccounts[1]?.id || '');
            setTxNote('');
            setTxError('');
            setShowTransactionModal(true);
          }} disabled={bankAccounts.length === 0}>
            <Plus className="h-4 w-4" /> Catat Transaksi
          </Button>
        </div>
      </PageHeader>

      {/* Reusable Segmented Control */}
      <SegmentedControl
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        options={tabs.map(t => ({ key: t.key, label: t.label, icon: t.icon }))}
      />

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: RINGKASAN (Dashboard Overview) ─────────────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <KPICard
              title="Kas & Bank"
              value={formatCurrency(totalCashBank)}
              icon={<Wallet className="h-5 w-5 text-indigo-500" />}
              subtitle={`${bankAccounts.length} rekening terdaftar`}
            />
            <KPICard
              title="Piutang Usaha"
              value={formatCurrency(totalReceivable)}
              icon={<Receipt className="h-5 w-5 text-blue-500" />}
              subtitle={`${invoices.filter(i => i.status !== 'PAID').length} invoice belum lunas`}
            />
            <KPICard
              title="Hutang Supplier"
              value={formatCurrency(totalPayable)}
              icon={<CreditCard className="h-5 w-5 text-amber-500" />}
              subtitle={`${unpaidPOs.length} PO belum dibayar`}
            />
            <KPICard
              title="Pendapatan (Omzet)"
              value={formatCurrency(totalRevenue)}
              icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
              subtitle={`${hppAnalysis.length} pesanan terkirim`}
            />
            <KPICard
              title="Beban Operasional"
              value={formatCurrency(totalExpenses)}
              icon={<ArrowUpRight className="h-5 w-5 text-red-500" />}
              subtitle={`${expenses.length} transaksi beban`}
            />
            <KPICard
              title="Laba Bersih Aktual"
              value={formatCurrency(totalNetProfit)}
              icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
              subtitle={`Margin: ${netMarginPercent.toFixed(1)}%`}
              trend={totalNetProfit >= 0 ? 'up' : 'down'}
              trendValue={totalNetProfit >= 0 ? 'Surplus' : 'Defisit'}
            />
          </div>

          {/* 2-Column Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Left: Recent Cash Inflow / Outflow (3/5) */}
            <Card className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <DollarSign className="h-4 w-4 text-indigo-500" />
                  Arus Kas Terkini (Real-time Mutasi)
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab('cash_bank')}>
                  Lihat Rekening →
                </Button>
              </div>

              {allTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center">Belum ada mutasi kas tercatat.</p>
              ) : (
                <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {allTransactions.slice(0, 7).map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 px-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tx.type === 'INFLOW'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                            : 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50'
                            }`}
                        >
                          {tx.type === 'INFLOW' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(tx.date)} · Akun: <span className="font-medium text-slate-600 dark:text-slate-300">{tx.bankName}</span></p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold whitespace-nowrap ${tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                          }`}
                      >
                        {tx.type === 'INFLOW' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Right: Quick Financial Health & Aging Summary (2/5) */}
            <div className="space-y-6 lg:col-span-2">
              {/* Piutang Summary Card */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status Piutang (AR)
                  </h3>
                  <button onClick={() => { setActiveTab('invoices'); setTxSubTab('ar'); }} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                    Kelola →
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Outstanding Tagihan</span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalReceivable)}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">0 - 30 Hari</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(arAging.current)}</strong>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg">
                      <span className="text-amber-700 dark:text-amber-400 block text-[10px]">&gt; 30 Hari (Jatuh Tempo)</span>
                      <strong className="text-amber-800 dark:text-amber-300 font-semibold">
                        {formatCurrency(arAging.days31to60 + arAging.days61to90 + arAging.over90)}
                      </strong>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Hutang Summary Card */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status Hutang Supplier (AP)
                  </h3>
                  <button onClick={() => { setActiveTab('invoices'); setTxSubTab('ap'); }} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                    Kelola →
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Tagihan PO Belum Lunas</span>
                    <strong className="text-xl font-black text-red-600 dark:text-red-400">{formatCurrency(totalPayable)}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">0 - 30 Hari</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(apAging.current)}</strong>
                    </div>
                    <div className="bg-red-50/50 dark:bg-red-950/20 p-2 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 block text-[10px]">&gt; 30 Hari</span>
                      <strong className="text-red-700 dark:text-red-300 font-semibold">
                        {formatCurrency(apAging.days31to60 + apAging.days61to90 + apAging.over90)}
                      </strong>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: KAS & BANK (Pusat Arus Kas Riil & Kas Kecil) ── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'cash_bank' && (
        <div className="space-y-6">
          {bankAccounts.length === 0 ? (
            <Card className="p-4">
              <EmptyState
                icon={<Building2 className="h-8 w-8 text-slate-400" />}
                title="Belum Ada Rekening"
                description="Tambahkan rekening untuk mulai mencatat transaksi dan mutasi keuangan."
                action={
                  <Button
                    onClick={() => {
                      setEditBankId(null);
                      setBankName('');
                      setBankNumber('');
                      setBankInitialBalance('');
                      setBankError('');
                      setShowBankModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Tambah Rekening
                  </Button>
                }
              />
            </Card>
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
                {bankAccounts.map(ba => {
                  const isSelected = selectedBankFilter === ba.id;
                  return (
                    <Card
                      key={ba.id}
                      onClick={() => setSelectedBankFilter(isSelected ? 'ALL' : ba.id)}
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
                              <p className="text-xs font-mono text-slate-400 mt-0.5">{ba.accountNumber}</p>
                            ) : (
                              <p className="text-xs text-slate-400 italic mt-0.5">Kas Fisik / Kas Kecil</p>
                            )}
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditBankId(ba.id);
                                setBankName(ba.name);
                                setBankNumber(ba.accountNumber || '');
                                setBankError('');
                                setShowBankModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Rekening"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const isOk = await confirm({
                                  title: 'Hapus Rekening Bank',
                                  message: `Apakah Anda yakin ingin menghapus rekening "${ba.name}"?`,
                                  confirmText: 'Hapus Rekening',
                                  variant: 'danger',
                                });
                                if (isOk) {
                                  const deleted = deleteBankAccount(ba.id);
                                  if (!deleted) {
                                    toast.error('Gagal Menghapus Rekening', 'Rekening ini sudah memiliki riwayat transaksi.');
                                  } else {
                                    toast.success('Rekening Dihapus', `Rekening "${ba.name}" berhasil dihapus.`);
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Hapus Rekening"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                    </Card>
                  );
                })}

                {/* Card Action Tambah Rekening (Rightmost item, half width) */}
                <div
                  onClick={() => {
                    setEditBankId(null);
                    setBankName('');
                    setBankNumber('');
                    setBankInitialBalance('');
                    setBankError('');
                    setShowBankModal(true);
                  }}
                  className="w-36 shrink-0 border-2 border-dashed border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/40 dark:bg-slate-800/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all cursor-pointer p-4 flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-1.5">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Tambah Rekening
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Tabel Mutasi Kas & Bank Terpadu (Selalu Tampil) */}
          <Card>
            {/* Filter Bar: Search Input & Date Range (Periode) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="w-full sm:w-64">
                <Input
                  icon={Search}
                  value={cashMutationSearch}
                  onChange={e => setCashMutationSearch(e.target.value)}
                  placeholder="Cari transaksi, nomor faktur/PO..."
                  inputSize="sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <DateRangePicker
                  value={cashMutationDateRange}
                  onChange={setCashMutationDateRange}
                  align="right"
                  defaultShortcut="thisMonth"
                />
                {(cashMutationDateRange.from || cashMutationDateRange.to) && (
                  <button
                    type="button"
                    onClick={() => setCashMutationDateRange({ from: null, to: null })}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline whitespace-nowrap cursor-pointer"
                  >
                    Reset Tgl
                  </button>
                )}
              </div>
            </div>

            <Table
              data={filteredCashMutations}
              emptyTitle="Belum ada transaksi mutasi kas"
              emptyDescription="Catat pengeluaran operasional, kas masuk, atau pelunasan tagihan untuk melihat catatan mutasi di sini."
              columns={[
                {
                  key: 'date',
                  header: 'Tanggal',
                  cell: (tx) => <span className="font-mono text-xs text-slate-500 whitespace-nowrap">{formatDateTime(tx.date)}</span>,
                },
                {
                  key: 'bankName',
                  header: 'Rekening',
                  cell: (tx) => <Badge variant="default" className="font-medium">{tx.bankName}</Badge>,
                },
                {
                  key: 'description',
                  header: 'Deskripsi / Kategori Transaksi',
                  cell: (tx) => (
                    <div className="min-w-[200px]">
                      <p className="font-semibold text-slate-900 dark:text-white text-xs">{tx.description}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 italic">{tx.categoryOrMemo}</p>
                    </div>
                  ),
                },
                {
                  key: 'sourceType',
                  header: 'Tipe Sumber',
                  align: 'center',
                  cell: (tx) => <Badge variant={tx.sourceBadgeVariant}>{tx.sourceBadgeLabel}</Badge>,
                },
                {
                  key: 'amount',
                  header: 'Mutasi Kas (Rp)',
                  align: 'right',
                  cell: (tx) => (
                    <span className={`font-mono font-bold text-xs whitespace-nowrap ${tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {tx.type === 'INFLOW' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  ),
                },
                {
                  key: 'runningBalance',
                  header: 'Saldo Berjalan',
                  align: 'right',
                  cell: (tx) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatCurrency(tx.runningBalance || 0)}</span>,
                },
                {
                  key: 'actions',
                  header: 'Aksi',
                  align: 'center',
                  cell: (tx) => (
                    tx.refType === 'INVOICE' && tx.refId ? (
                      <button
                        type="button"
                        onClick={() => handleDrillDownInvoice(tx.refId!)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Faktur #{tx.refNumber} <ArrowUpRight className="h-3 w-3" />
                      </button>
                    ) : tx.refType === 'PO' && tx.refId ? (
                      <button
                        type="button"
                        onClick={() => handleDrillDownPO(tx.refId!)}
                        className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        PO #{tx.refNumber} <ArrowUpRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">-</span>
                    )
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: TAGIHAN & FAKTUR (Piutang AR & Hutang AP) ───── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* Sub Navigation for Invoices & Bills */}
          <SegmentedControl
            value={txSubTab}
            onChange={(t) => setTxSubTab(t as 'ar' | 'ap')}
            options={[
              { key: 'ar', label: 'Piutang Usaha (AR)' },
              { key: 'ap', label: 'Hutang Supplier (AP)' },
            ]}
          />

          {/* ── Sub-tab: Piutang Usaha (AR) ── */}
          {txSubTab === 'ar' && (
            <div className="space-y-6">
              {/* AR Aging Metric Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">0 - 30 Hari</span>
                  <strong className="text-base font-bold text-slate-800 dark:text-slate-200">{formatCurrency(arAging.current)}</strong>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">31 - 60 Hari</span>
                  <strong className="text-base font-bold text-amber-600">{formatCurrency(arAging.days31to60)}</strong>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">61 - 90 Hari</span>
                  <strong className="text-base font-bold text-orange-600">{formatCurrency(arAging.days61to90)}</strong>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">&gt; 90 Hari (Macet)</span>
                  <strong className="text-base font-bold text-red-600">{formatCurrency(arAging.over90)}</strong>
                </div>
                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3.5 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-semibold">Total Piutang (AR)</span>
                  <strong className="text-base font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalReceivable)}</strong>
                </div>
              </div>

              {/* Invoices List with Filter & Search */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={arSearchQuery}
                        onChange={e => setArSearchQuery(e.target.value)}
                        placeholder="Cari invoice / pelanggan..."
                        className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-56"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setArStatusFilter(st)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${arStatusFilter === st
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                      >
                        {st === 'ALL' ? 'Semua' : st === 'UNPAID' ? 'Belum Bayar' : st === 'PARTIAL' ? 'Cicilan / DP' : 'Lunas'}
                      </button>
                    ))}
                  </div>
                </div>

                <Table
                  data={[...invoices]
                    .filter(inv => {
                      if (arStatusFilter !== 'ALL' && inv.status !== arStatusFilter) return false;
                      if (arSearchQuery.trim()) {
                        const q = arSearchQuery.toLowerCase();
                        return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .reverse()}
                  emptyTitle="Belum ada invoice piutang"
                  emptyDescription="Invoice otomatis terbit saat pengiriman barang pesanan diselesaikan driver."
                  onRowClick={(inv) => setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)}
                  columns={[
                    {
                      key: 'invoiceNumber',
                      header: 'No. Invoice',
                      cell: (inv) => (
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {inv.invoiceNumber}
                        </span>
                      ),
                    },
                    {
                      key: 'salesOrderNumber',
                      header: 'No. Order',
                      cell: (inv) => <span className="font-mono text-slate-500">{inv.salesOrderNumber}</span>,
                    },
                    {
                      key: 'customerName',
                      header: 'Pelanggan',
                      cell: (inv) => <span className="font-semibold text-slate-800 dark:text-slate-200">{inv.customerName}</span>,
                    },
                    {
                      key: 'totalAmount',
                      header: 'Total Tagihan',
                      align: 'right',
                      cell: (inv) => <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount)}</span>,
                    },
                    {
                      key: 'paidAmount',
                      header: 'Terbayar',
                      align: 'right',
                      cell: (inv) => <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.paidAmount)}</span>,
                    },
                    {
                      key: 'sisaPiutang',
                      header: 'Sisa Piutang',
                      align: 'right',
                      cell: (inv) => <span className="font-mono font-bold text-red-600">{formatCurrency(inv.totalAmount - inv.paidAmount)}</span>,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      align: 'center',
                      cell: (inv) => (
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PARTIAL' ? 'warning' : 'danger'}>
                          {getInvoiceStatusLabel(inv.status)}
                        </Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'Aksi',
                      align: 'center',
                      cell: (inv) => (
                        <div onClick={(e) => e.stopPropagation()}>
                          {inv.status !== 'PAID' ? (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => {
                                setShowPaymentModal(inv.id);
                                setPayAmount(String(inv.totalAmount - inv.paidAmount));
                                setPayAccountId(bankAccounts[0]?.id || '');
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Input Bayar
                            </Button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Lunas
                            </span>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  expandedRowRender={(inv) => {
                    if (expandedInvoiceId !== inv.id) return null;
                    return (
                      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/30 space-y-3">
                        <div className="flex justify-between items-center text-xs border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
                          <div>
                            <span className="text-slate-400 mr-2">Tanggal Terbit:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateTime(inv.issuedAt)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 mr-2">Sales PIC:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{inv.salesName}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Riwayat Pembayaran Masuk</h4>
                          {inv.payments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">Belum ada cicilan atau pembayaran masuk untuk invoice ini.</p>
                          ) : (
                            <Table
                              dense
                              data={inv.payments}
                              columns={[
                                {
                                  key: 'date',
                                  header: 'Tanggal Pelunasan',
                                  cell: (p) => <span className="text-slate-500 font-mono">{formatDateTime(p.date)}</span>,
                                },
                                {
                                  key: 'method',
                                  header: 'Disetor ke Rekening',
                                  cell: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.method}</span>,
                                },
                                {
                                  key: 'note',
                                  header: 'Catatan / Memo',
                                  cell: (p) => <span className="text-slate-500 italic">{p.note || '-'}</span>,
                                },
                                {
                                  key: 'amount',
                                  header: 'Jumlah Masuk',
                                  align: 'right',
                                  cell: (p) => (
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                      +{formatCurrency(p.amount)}
                                    </span>
                                  ),
                                },
                              ]}
                            />
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              </Card>
            </div>
          )}

          {/* ── Sub-tab: Hutang Supplier (AP) ── */}
          {txSubTab === 'ap' && (
            <div className="space-y-8">
              {/* Section A: Tagihan Supplier (Purchase Order) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tagihan Supplier (Purchase Order)</h3>
                    <p className="text-xs text-slate-500">PO bahan baku yang sudah diterima di gudang dan memerlukan pelunasan hutang.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="px-2.5 py-1 text-xs">
                      Total Hutang PO: {formatCurrency(totalPayable)}
                    </Badge>
                  </div>
                </div>

                <Card>
                  <Table
                    data={[...purchaseOrders].filter(p => p.status === 'RECEIVED').reverse()}
                    emptyTitle="Belum ada tagihan supplier"
                    emptyDescription="Tagihan hutang muncul otomatis saat kiriman bahan baku PO diterima di modul Inventaris."
                    columns={[
                      {
                        key: 'poNumber',
                        header: 'No. PO',
                        cell: (po) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{po.poNumber}</span>,
                      },
                      {
                        key: 'supplier',
                        header: 'Supplier',
                        cell: (po) => <span className="font-semibold text-slate-800 dark:text-slate-200">{po.supplier}</span>,
                      },
                      {
                        key: 'totalAmount',
                        header: 'Total Tagihan',
                        align: 'right',
                        cell: (po) => <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(po.totalAmount)}</span>,
                      },
                      {
                        key: 'receivedAt',
                        header: 'Tgl Diterima',
                        cell: (po) => <span className="text-slate-500">{po.receivedAt ? formatDateTime(po.receivedAt) : '-'}</span>,
                      },
                      {
                        key: 'paymentStatus',
                        header: 'Status Bayar',
                        align: 'center',
                        cell: (po) => (
                          <Badge variant={po.paymentStatus === 'PAID' ? 'success' : 'danger'}>
                            {po.paymentStatus === 'PAID' ? 'Lunas' : 'Belum Bayar'}
                          </Badge>
                        ),
                      },
                      {
                        key: 'actions',
                        header: 'Aksi',
                        align: 'center',
                        cell: (po) => {
                          const payBank = po.bankAccountId ? bankAccounts.find(b => b.id === po.bankAccountId) : null;
                          return po.paymentStatus === 'UNPAID' ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setShowPOPaymentModal(po.id);
                                setPoPayAccountId(bankAccounts[0]?.id || '');
                              }}
                            >
                              <Wallet className="h-3.5 w-3.5" /> Bayar Sekarang
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">
                              via <strong>{payBank?.name || 'Bank'}</strong>
                            </span>
                          );
                        },
                      },
                    ]}
                  />
                </Card>
              </section>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: LAPORAN KEUANGAN (Financial Reports) ───────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Sub Navigation for Reports */}
          <SegmentedControl
            value={reportSubTab}
            onChange={(t) => setReportSubTab(t as 'income' | 'balance_sheet' | 'cashflow' | 'hpp_analysis')}
            options={[
              { key: 'income', label: 'Laba Rugi' },
              { key: 'balance_sheet', label: 'Neraca Keuangan' },
              { key: 'cashflow', label: 'Arus Kas' },
              { key: 'hpp_analysis', label: 'Analisis HPP & Margin' },
            ]}
          />

          {/* ── 5.1: Income Statement (Laba Rugi) ── */}
          {reportSubTab === 'income' && (
            <Card className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Laporan Laba Rugi (Profit & Loss Statement)
                </h2>
                <p className="text-xs text-slate-500 mt-1">Standar Manufaktur PSAK — Akumulasi Periode Berjalan</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Pendapatan Usaha */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>1. PENDAPATAN USAHA (REVENUE)</span>
                    <span className="font-mono">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>{getCoaName('4-1000', 'Pendapatan Penjualan Produk')}</span>
                    <span className="font-mono">{formatCurrency(totalRevenue)}</span>
                  </div>
                </div>

                {/* 2. Harga Pokok Penjualan (HPP) */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>2. HARGA POKOK PENJUALAN (HPP / COGS)</span>
                    <span className="font-mono text-red-600 dark:text-red-400">({formatCurrency(totalCOGS)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>{getCoaName('5-1000', 'Biaya Bahan Baku Terpakai (BOM)')}</span>
                    <span className="font-mono text-red-600">({formatCurrency(totalMaterialCost)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>{getCoaName('5-2000', 'Upah Tenaga Kerja Langsung')}</span>
                    <span className="font-mono text-red-600">({formatCurrency(totalLaborCost)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>{getCoaName('5-3000', 'Biaya Overhead Pabrik')}</span>
                    <span className="font-mono text-red-600">({formatCurrency(totalOverheadCost)})</span>
                  </div>
                </div>

                {/* 3. Laba Kotor */}
                <div className="flex justify-between py-2.5 px-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-sm font-black text-indigo-900 dark:text-indigo-200">
                  <span>LABA KOTOR (GROSS PROFIT) — Margin: {grossMarginPercent.toFixed(1)}%</span>
                  <span className="font-mono">{formatCurrency(totalGrossProfit)}</span>
                </div>

                {/* 4. Pendapatan Lain-lain */}
                {totalOtherIncome > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                      <span>4. PENDAPATAN LAIN-LAIN (OTHER INCOME)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(totalOtherIncome)}</span>
                    </div>
                    {otherIncomes.filter(inc => !inc.accountCode.startsWith('2-')).map(inc => (
                      <div key={inc.id} className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                        <span>{inc.accountName}</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(inc.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Beban Operasional */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>5. BEBAN OPERASIONAL & UMUM (OPEX)</span>
                    <span className="font-mono text-red-600 dark:text-red-400">({formatCurrency(totalExpenses)})</span>
                  </div>
                  {(['GAJI', 'LISTRIK_AIR', 'SEWA', 'TRANSPORT', 'ATK', 'LAINNYA'] as const).map(cat => {
                    const amount = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                    if (amount === 0) return null;
                    const coa = mapExpenseCategoryToCoa(cat);
                    return (
                      <div key={cat} className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                        <span>{coa.name}</span>
                        <span className="font-mono text-red-600">({formatCurrency(amount)})</span>
                      </div>
                    );
                  })}
                </div>

                {/* 6. Laba Bersih */}
                <div
                  className={`flex justify-between py-3.5 px-4 rounded-xl text-base font-black border ${totalNetProfit >= 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                    }`}
                >
                  <span>LABA BERSIH BERJALAN (NET PROFIT)</span>
                  <span className="font-mono">{formatCurrency(totalNetProfit)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* ── 5.2: Balance Sheet (Neraca) ── */}
          {reportSubTab === 'balance_sheet' && (
            <Card className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Neraca Keuangan (Balance Sheet)
                </h2>
                <p className="text-xs text-slate-500 mt-1">Posisi Keuangan Per Tanggal Hari Ini</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {isBalanceSheetBalanced ? 'Status: Neraca Seimbang (ASET = LIABILITAS + EKUITAS)' : 'Status: Penyesuaian'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Sisi Kiri: ASET */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                      {getCoaName('1-0000', 'Aset')} (ASSETS)
                    </h3>

                    {/* Aset Lancar */}
                    <div className="space-y-2 mb-4">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        {getCoaName('1-1000', 'Aset Lancar')}
                      </p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>{getCoaName('1-1100', 'Kas & Bank')}</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalCashBank)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>{getCoaName('1-1200', 'Piutang Dagang')}</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalReceivable)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>{getCoaName('1-1300', 'Persediaan Bahan Baku')}</span>
                        <span className="font-mono font-semibold">{formatCurrency(inventoryAssetValue)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total {getCoaName('1-1000', 'Aset Lancar')}</span>
                        <span className="font-mono">{formatCurrency(totalCurrentAssets)}</span>
                      </div>
                    </div>

                    {/* Aset Tetap */}
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        {getCoaName('1-2000', 'Aset Tetap & Peralatan')}
                      </p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>{getCoaName('1-2100', 'Mesin & Peralatan Pabrik')}</span>
                        <span className="font-mono font-semibold">{formatCurrency(fixedAssetCost)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total {getCoaName('1-2000', 'Aset Tetap')}</span>
                        <span className="font-mono">{formatCurrency(totalFixedAssets)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-sm font-black text-indigo-900 dark:text-indigo-200">
                    <span>TOTAL {getCoaName('1-0000', 'Aset').toUpperCase()}</span>
                    <span className="font-mono">{formatCurrency(totalAssets)}</span>
                  </div>
                </div>

                {/* Sisi Kanan: LIABILITAS & EKUITAS */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                      {getCoaName('2-0000', 'Liabilitas')} & {getCoaName('3-0000', 'Ekuitas')}
                    </h3>

                    {/* Liabilitas */}
                    <div className="space-y-2 mb-4">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        {getCoaName('2-1000', 'Liabilitas Jangka Pendek')}
                      </p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>{getCoaName('2-1100', 'Hutang Dagang (AP)')}</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalPayable)}</span>
                      </div>
                      {totalLoans > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                          <span>{getCoaName('2-1300', 'Hutang Pinjaman')}</span>
                          <span className="font-mono font-semibold">{formatCurrency(totalLoans)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total {getCoaName('2-0000', 'Liabilitas')}</span>
                        <span className="font-mono">{formatCurrency(totalLiabilities)}</span>
                      </div>
                    </div>

                    {/* Ekuitas */}
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        {getCoaName('3-0000', 'Ekuitas')}
                      </p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>{getCoaName('3-1000', 'Modal Disetor')}</span>
                        <span className="font-mono font-semibold">{formatCurrency(initialCapital)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Laba Bersih Berjalan ({getCoaName('3-2000', 'Laba Ditahan')})</span>
                        <span className="font-mono font-semibold text-emerald-600">{formatCurrency(totalNetProfit)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total {getCoaName('3-0000', 'Ekuitas')}</span>
                        <span className="font-mono">{formatCurrency(totalEquity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-sm font-black text-purple-900 dark:text-purple-200">
                    <span>TOTAL {getCoaName('2-0000', 'Liabilitas').toUpperCase()} & {getCoaName('3-0000', 'Ekuitas').toUpperCase()}</span>
                    <span className="font-mono">{formatCurrency(totalLiabilities + totalEquity)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── 5.3: Cash Flow Statement (Arus Kas) ── */}
          {reportSubTab === 'cashflow' && (
            <Card className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Laporan Arus Kas (Cash Flow Statement)
                </h2>
                <p className="text-xs text-slate-500 mt-1">Metode Langsung (Direct Method) — Arus Kas Masuk & Keluar Riil</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Aktivitas Operasi */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>A. ARUS KAS DARI AKTIVITAS OPERASI</span>
                    <span className="font-mono">{formatCurrency(netOperatingCashFlow)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>(+) Penerimaan Kas dari Pelanggan (Pelunasan Piutang)</span>
                    <span className="font-mono text-emerald-600">+{formatCurrency(cashFromCustomers)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>(-) Pembayaran Kas ke Supplier Bahan Baku (PO)</span>
                    <span className="font-mono text-red-600">-{formatCurrency(cashPaidToSuppliers)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>(-) Pembayaran Beban Operasional & Gaji</span>
                    <span className="font-mono text-red-600">-{formatCurrency(cashPaidForExpenses)}</span>
                  </div>
                </div>

                {/* 2. Aktivitas Investasi */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>B. ARUS KAS DARI AKTIVITAS INVESTASI</span>
                    <span className="font-mono">{formatCurrency(netInvestingCashFlow)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>(-) Pengeluaran Pembelian Mesin & Peralatan (CapEx)</span>
                    <span className="font-mono text-red-600">({formatCurrency(fixedAssetCost)})</span>
                  </div>
                </div>

                {/* 3. Aktivitas Pendanaan */}
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>C. ARUS KAS DARI AKTIVITAS PENDANAAN</span>
                    <span className="font-mono">+{formatCurrency(netFinancingCashFlow)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>(+) Setoran Modal Awal Pemilik</span>
                    <span className="font-mono text-emerald-600">+{formatCurrency(initialCapital)}</span>
                  </div>
                </div>

                {/* Rekonsiliasi Kas */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                    <span>KENAIKAN / (PENURUNAN) BERSIH KAS</span>
                    <span className="font-mono">{formatCurrency(netCashFlow)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-emerald-900 dark:text-emerald-200 text-sm">
                    <span>SALDO KAS & BANK AKHIR RIIL</span>
                    <span className="font-mono">{formatCurrency(totalCashBank)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── 5.4: Analisis HPP & Margin per Order ── */}
          {reportSubTab === 'hpp_analysis' && (
            <div className="space-y-4">
              {/* ── Toolbar Filter ── */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 max-w-xs">
                  <Input
                    icon={Search}
                    placeholder="Cari pelanggan atau no. order..."
                    value={hppSearch}
                    onChange={e => setHppSearch(e.target.value)}
                  />
                </div>
                {/* Status Dropdown */}
                <Select
                  icon={ListFilter}
                  value={hppStatusFilter}
                  onChange={e => setHppStatusFilter(e.target.value as any)}
                  activeHighlight
                  options={[
                    { value: 'ALL', label: 'Semua Status' },
                    { value: 'PENDING', label: 'Belum Diproses' },
                    { value: 'IN_PRODUCTION', label: 'Sedang Berjalan' },
                    { value: 'SENT', label: 'Selesai' },
                  ]}
                />
                <div className="ml-auto">
                  <DateRangePicker
                    value={hppPeriodRange}
                    onChange={setHppPeriodRange}
                    placeholder="Pilih Periode"
                    defaultShortcut="thisMonth"
                    align="right"
                  />
                </div>
              </div>

              {/* Item count */}
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Menampilkan {filteredHPPData.length} dari {allOrderHPPData.length} pesanan
              </div>

              <Card>
                <Table
                  data={filteredHPPData}
                  emptyTitle="Tidak ada pesanan ditemukan"
                  emptyDescription={allOrderHPPData.length === 0 ? 'Data analisis margin akan muncul otomatis saat ada pesanan baru masuk.' : 'Coba ubah filter periode, pencarian, atau status untuk menemukan pesanan.'}
                  onRowClick={(row) => setSelectedHPPOrder(row)}
                  columns={[
                    {
                      key: 'createdAt',
                      header: 'Tgl Pesanan',
                      cell: (row) => <span className="font-mono text-slate-500 whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
                    },
                    {
                      key: 'customerName',
                      header: 'Nama Pelanggan',
                      cell: (row) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.customerName}</span>,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      align: 'center',
                      cell: (row) => (
                        <Badge
                          variant={
                            row.rawStatus === 'PENDING' ? 'warning' :
                              row.rawStatus === 'SENT' ? 'success' : 'default'
                          }
                        >
                          {row.statusLabel}
                        </Badge>
                      ),
                    },
                    {
                      key: 'sellingPrice',
                      header: 'Harga Jual',
                      align: 'right',
                      cell: (row) => <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(row.sellingPrice)}</span>,
                    },
                    {
                      key: 'grossMarginPercent',
                      header: 'Margin (%)',
                      align: 'center',
                      cell: (row) => (
                        <Badge
                          variant={row.grossMarginPercent >= 20 ? 'success' : row.grossMarginPercent >= 10 ? 'warning' : 'danger'}
                          className="font-mono text-[11px]"
                        >
                          {row.grossMarginPercent.toFixed(1)}%
                        </Badge>
                      ),
                    },
                  ]}
                />
              </Card>

              {/* Modal Detail Analisis HPP */}
              <Modal
                isOpen={!!selectedHPPOrder}
                onClose={() => setSelectedHPPOrder(null)}
                title="Detail Analisis HPP & Margin"
                size="md"
                actions={<Button variant="outline" size="sm" onClick={() => setSelectedHPPOrder(null)}>Tutup Rincian</Button>}
              >
                {selectedHPPOrder && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800 text-xs space-y-4">

                      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                        <span className="text-slate-500 font-semibold">Nomor Sales Order</span>
                        <a
                          href={`/order/${selectedHPPOrder.id}`}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                          title="Buka Halaman Detail Order"
                        >
                          {selectedHPPOrder.orderNumber} <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider text-[10px]">Rincian Komponen HPP</h4>
                        <div className="space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Biaya Material (BOM)</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(selectedHPPOrder.materialCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Biaya Upah (Labor)</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(selectedHPPOrder.laborCost)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">Total Harga Jual</span>
                          <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(selectedHPPOrder.sellingPrice)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">Total HPP Produksi</span>
                          <span className="font-mono text-red-600 dark:text-red-400">-{formatCurrency(selectedHPPOrder.totalHPP)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Laba Kotor (Margin)</span>
                        <div className="text-right">
                          <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                            +{formatCurrency(selectedHPPOrder.grossProfit)}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                            Persentase: <span className={selectedHPPOrder.grossMarginPercent >= 20 ? 'text-emerald-600' : 'text-amber-600'}>{selectedHPPOrder.grossMarginPercent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </Modal>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: PEMBUKUAN (Accounting) ──────────────────────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          {/* Sub Navigation for Accounting */}
          <SegmentedControl
            value={accSubTab}
            onChange={(t) => setAccSubTab(t as 'journal' | 'general_ledger' | 'coa')}
            options={[
              { key: 'journal', label: 'Jurnal Umum' },
              { key: 'general_ledger', label: 'Buku Besar' },
              { key: 'coa', label: 'Bagan Akun (CoA)' },
            ]}
          />

          {/* ── Sub-tab: Jurnal Umum (General Ledger) ── */}
          {accSubTab === 'journal' && (
            <Card>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Jurnal Umum</h3>
                      <Badge variant="purple" className="text-[10px] px-2 py-0.5 font-semibold">
                        Double-Entry Log
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Seluruh postingan jurnal otomatis & manual dari transaksi operasional.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                  <div className="w-full sm:w-64">
                    <Select
                      icon={ListFilter}
                      value={journalFilterAccount}
                      onChange={e => setJournalFilterAccount(e.target.value)}
                      activeHighlight
                      options={[
                        { value: 'ALL', label: 'Semua Akun Rekening' },
                        ...chartOfAccounts
                          .filter(a => !a.isHeader)
                          .map(a => ({
                            value: a.code,
                            label: `${a.code} — ${a.name}`,
                          })),
                      ]}
                    />
                  </div>

                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={openClosingModal}>
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      Tutup Buku
                    </Button>
                    <Button size="sm" onClick={openManualJournalModal}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Tambah Jurnal Manual
                    </Button>
                  </div>
                </div>
              </div>

              {journalEntries.length === 0 ? (
                <EmptyState
                  title="Belum ada jurnal transaksi"
                  description="Jurnal otomatis terbentuk saat Anda mencatat pembayaran, invoice, PO, atau biaya operasional."
                />
              ) : (
                <div className="space-y-4">
                  {journalEntries
                    .filter(je => {
                      if (journalFilterAccount === 'ALL') return true;
                      return je.lines.some(l => l.accountCode === journalFilterAccount);
                    })
                    .map(je => {
                      const totalEntryAmount = je.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
                      const getCleanAccountName = (line: { accountId: string; accountCode: string; accountName: string }) => {
                        const coa = chartOfAccounts.find(a => a.code === line.accountCode || a.id === line.accountId);
                        return coa ? coa.name : line.accountName.replace(/\s*\(.*?\)$/, '').trim();
                      };

                      return (
                        <div
                          key={je.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden"
                        >
                          {/* Entry Header */}
                          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                {je.entryNumber || je.id}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="font-mono text-xs text-slate-500">
                                {formatDateTime(je.date)}
                              </span>
                              {je.sourceType && (
                                <Badge
                                  variant={
                                    je.sourceType === 'CLOSING_ENTRY'
                                      ? 'warning'
                                      : je.sourceType === 'DIVIDEND'
                                        ? 'danger'
                                        : je.sourceType === 'MANUAL_JOURNAL' || je.sourceType === 'MANUAL'
                                          ? 'purple'
                                          : 'info'
                                  }
                                >
                                  {je.sourceType === 'CLOSING_ENTRY'
                                    ? 'Tutup Buku'
                                    : je.sourceType === 'DIVIDEND'
                                      ? 'Dividen'
                                      : je.sourceType === 'MANUAL_JOURNAL' || je.sourceType === 'MANUAL'
                                        ? 'Jurnal Manual'
                                        : je.sourceType === 'INVOICE_ISSUED' || je.sourceType === 'INVOICE_PAYMENT'
                                          ? 'Penjualan'
                                          : je.sourceType === 'PO_RECEIVED' || je.sourceType === 'PO_PAYMENT'
                                            ? 'Pembelian'
                                            : je.sourceType === 'EXPENSE'
                                              ? 'Beban Ops'
                                              : je.sourceType}
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              Total: {formatCurrency(totalEntryAmount)}
                            </div>
                          </div>

                          {/* Memo / Description */}
                          <div className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/40">
                            {je.description}
                          </div>

                          {/* Lines Breakdown Table */}
                          <Table
                            dense
                            data={je.lines}
                            columns={[
                              {
                                key: 'accountCode',
                                header: 'Kode Akun',
                                width: '8rem',
                                cell: (line) => (
                                  <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                                    {line.accountCode}
                                  </span>
                                ),
                              },
                              {
                                key: 'accountName',
                                header: 'Nama Akun',
                                cell: (line) => (
                                  <span className={line.debit > 0 ? 'font-medium text-slate-900 dark:text-white' : 'pl-4 text-slate-700 dark:text-slate-300'}>
                                    {getCleanAccountName(line)}
                                  </span>
                                ),
                              },
                              {
                                key: 'debit',
                                header: 'Debit (Rp)',
                                align: 'right',
                                width: '9rem',
                                cell: (line) => (
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                  </span>
                                ),
                              },
                              {
                                key: 'credit',
                                header: 'Kredit (Rp)',
                                align: 'right',
                                width: '9rem',
                                cell: (line) => (
                                  <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">
                                    {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                  </span>
                                ),
                              },
                            ]}
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          )}

          {/* ── Sub-tab: Buku Besar (General Ledger) ── */}
          {accSubTab === 'general_ledger' && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Buku Besar (Daftar Akun)</h3>
                  <p className="text-xs text-slate-500">Daftar saldo akhir dan mutasi untuk semua akun aktif.</p>
                </div>
                <Badge variant={trialBalance.isBalanced ? 'success' : 'danger'}>
                  {trialBalance.isBalanced ? '✓ Balanced (Seimbang)' : 'Tidak Seimbang'}
                </Badge>
              </div>

              <Table
                data={trialBalance.rows}
                onRowClick={(row) => setLedgerMutasiModal(row.code)}
                columns={[
                  {
                    key: 'type',
                    header: 'Kategori',
                    width: '7rem',
                    cell: (row) => (
                      <Badge variant={
                        row.type === 'ASSET' ? 'default' :
                          row.type === 'LIABILITY' ? 'danger' :
                            row.type === 'EQUITY' ? 'warning' :
                              row.type === 'REVENUE' ? 'success' : 'default'
                      } className="text-[10px]">
                        {row.type}
                      </Badge>
                    ),
                  },
                  {
                    key: 'code',
                    header: 'Kode Akun',
                    width: '6rem',
                    cell: (row) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.code}</span>,
                  },
                  {
                    key: 'name',
                    header: 'Nama Akun',
                    cell: (row) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>,
                  },
                  {
                    key: 'totalDebit',
                    header: 'Total Debit (Rp)',
                    align: 'right',
                    cell: (row) => <span className="font-mono text-slate-500 dark:text-slate-400">{row.totalDebit > 0 ? formatCurrency(row.totalDebit) : '-'}</span>,
                  },
                  {
                    key: 'totalCredit',
                    header: 'Total Kredit (Rp)',
                    align: 'right',
                    cell: (row) => <span className="font-mono text-slate-500 dark:text-slate-400">{row.totalCredit > 0 ? formatCurrency(row.totalCredit) : '-'}</span>,
                  },
                  {
                    key: 'netBalance',
                    header: 'Saldo Akhir (Rp)',
                    align: 'right',
                    cell: (row) => <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(row.netBalance)}</span>,
                  },
                  {
                    key: 'actions',
                    header: 'Aksi',
                    align: 'center',
                    width: '7rem',
                    cell: (row) => (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2.5 text-[11px] font-normal"
                        onClick={(e) => { e.stopPropagation(); setLedgerMutasiModal(row.code); }}
                      >
                        Lihat Mutasi
                      </Button>
                    ),
                  },
                ]}
                footer={
                  <tr>
                    <td colSpan={3} className="py-3 px-3.5 font-bold">TOTAL TRIAL BALANCE</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(trialBalance.totalDebit)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(trialBalance.totalCredit)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                }
              />
            </Card>
          )}

          {/* ── Sub-tab: Bagan Akun (Chart of Accounts) ── */}
          {accSubTab === 'coa' && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bagan Akun Standar (Chart of Accounts Tree)</h3>
                  <p className="text-xs text-slate-500">Struktur hierarki akun akuntansi terkonfigurasi untuk manufaktur Indonesia.</p>
                </div>
                <Button size="sm" onClick={openCOAModal} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Akun
                </Button>
              </div>

              <div className="space-y-1">
                {chartOfAccounts.map(acc => {
                  const isH1 = acc.level === 1;
                  const isH2 = acc.level === 2 && acc.isHeader;
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors group ${isH1
                        ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white mt-3'
                        : isH2
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 font-semibold text-slate-800 dark:text-slate-200 pl-6'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-300 pl-10 border-b border-slate-100 dark:border-slate-800/40'
                        }`}
                    >
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{acc.code}</span>
                        <span>{acc.name}</span>
                        {acc.description && (
                          <span className="text-[11px] text-slate-400 hidden md:inline">— {acc.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {acc.isSystem && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Akun sistem bawaan (permanen)">
                            <Lock className="w-2.5 h-2.5" />
                            Sistem
                          </span>
                        )}
                        <Badge
                          variant={
                            acc.type === 'ASSET'
                              ? 'default'
                              : acc.type === 'LIABILITY'
                                ? 'danger'
                                : acc.type === 'EQUITY'
                                  ? 'warning'
                                  : acc.type === 'REVENUE'
                                    ? 'success'
                                    : 'default'
                          }
                          className="text-[10px]"
                        >
                          {acc.type}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
                          {acc.normalBalance}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button onClick={() => handleEditCOA(acc.id)} className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit Akun"><Edit2 className="w-3.5 h-3.5" /></button>
                          {acc.isSystem ? (
                            <button
                              onClick={() => toast.info('Akun Sistem Bawaan', `Akun "${acc.code} - ${acc.name}" merupakan Akun Sistem Bawaan yang wajib ada di setiap perusahaan dan tidak boleh dihapus.`)}
                              className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Akun Sistem (Permanen / Tidak dapat dihapus)"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleDeleteCOA(acc.id, acc.name)} className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700" title="Hapus Akun"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── MODALS SECTION ───────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════ */}

      {/* Modal 1: Input Pembayaran Invoice (AR Receipt) */}
      <Modal
        isOpen={!!showPaymentModal}
        onClose={() => setShowPaymentModal(null)}
        title={`Penerimaan Pembayaran Piutang — ${selectedInvoice?.invoiceNumber || ''}`}
        size="md"
        actions={
          selectedInvoice ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(null)}>Batal</Button>
              <Button variant="success" size="sm" onClick={submitPayment} disabled={!payAmount || Number(payAmount) <= 0 || !payAccountId}>
                <CheckCircle className="h-4 w-4" /> Simpan Pembayaran
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Pelanggan:</span><strong className="text-slate-900 dark:text-white">{selectedInvoice.customerName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Tagihan Invoice:</span><strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(selectedInvoice.totalAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Sudah Terbayar:</span><span className="text-emerald-600 font-mono font-semibold">{formatCurrency(selectedInvoice.paidAmount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700">
                <span className="text-slate-500">Sisa Piutang:</span>
                <strong className="text-red-600 font-mono font-bold">{formatCurrency(selectedInvoice.totalAmount - selectedInvoice.paidAmount)}</strong>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Pembayaran Masuk (Rp) *</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Masukkan nominal"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setPayAmount(String(selectedInvoice.totalAmount - selectedInvoice.paidAmount))}
                className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Set Pelunasan 100% ({formatCurrency(selectedInvoice.totalAmount - selectedInvoice.paidAmount)})
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Setor ke Rekening Kas / Bank *</label>
              <select
                value={payAccountId}
                onChange={e => setPayAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Rekening Kas / Bank --</option>
                {bankAccounts.map(ba => (
                  <option key={ba.id} value={ba.id}>
                    {ba.name} {ba.accountNumber ? `(${ba.accountNumber})` : ''} — Saldo: {formatCurrency(ba.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Catatan / Memo Transaksi</label>
              <input
                type="text"
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                placeholder="Contoh: Transfer via BCA / Mandiri"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: Pelunasan Tagihan PO Supplier (AP Payment) */}
      <Modal
        isOpen={!!showPOPaymentModal}
        onClose={() => {
          setShowPOPaymentModal(null);
          setPoPayError('');
        }}
        title={`Pelunasan Tagihan Supplier — ${selectedPO?.poNumber || ''}`}
        size="md"
        actions={
          selectedPO ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowPOPaymentModal(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={submitPOPayment} disabled={!poPayAccountId}>
                <CheckCircle className="h-4 w-4" /> Bayar Sekarang
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedPO && (
          <div className="space-y-4">
            {poPayError && (
              <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{poPayError}</span>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Supplier:</span><strong className="text-slate-900 dark:text-white">{selectedPO.supplier}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Tagihan PO:</span><strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(selectedPO.totalAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Metode:</span><span className="font-semibold text-slate-700 dark:text-slate-300">Pelunasan Tunai 100%</span></div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Bayar Menggunakan Rekening Asal *</label>
              <select
                value={poPayAccountId}
                onChange={e => {
                  const val = e.target.value;
                  const bank = bankAccounts.find(b => b.id === val);
                  if (bank && bank.balance < selectedPO.totalAmount) {
                    setPoPayError(`Saldo ${bank.name} tidak mencukupi.`);
                    return;
                  }
                  setPoPayError('');
                  setPoPayAccountId(val);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Rekening Asal --</option>
                {bankAccounts.map(ba => (
                  <option key={ba.id} value={ba.id} disabled={ba.balance < selectedPO.totalAmount}>
                    {ba.name} — Saldo: {formatCurrency(ba.balance)} {ba.balance < selectedPO.totalAmount ? '(Saldo Kurang)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Unified Transaction (Pemasukan, Pengeluaran, Transfer) */}
      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Buat Transaksi Baru"
        size="md"
        actions={
          <>
            <Button variant="outline" size="sm" type="button" onClick={() => setShowTransactionModal(false)}>Batal</Button>
            <Button size="sm" type="button" onClick={submitTransaction}>
              <CheckCircle className="h-4 w-4" /> Simpan Transaksi
            </Button>
          </>
        }
      >
        <form onSubmit={submitTransaction} className="space-y-4">
          {txError && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{txError}</span>
            </div>
          )}

          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['outflow', 'inflow', 'transfer'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setTxType(type)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${txType === type
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
              >
                {type === 'outflow' ? 'Pengeluaran' : type === 'inflow' ? 'Pemasukan' : 'Transfer'}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {txType === 'outflow' ? 'Kategori Beban (CoA Terkait) *' : txType === 'inflow' ? 'Kategori Pemasukan (CoA Terkait) *' : 'Kosong'}
            </label>
            {txType === 'transfer' ? (
              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                Transfer antar rekening tidak memerlukan klasifikasi akun pendapatan/beban.
              </div>
            ) : (
              <select
                value={txAccountCode}
                onChange={e => setTxAccountCode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Kategori --</option>
                {chartOfAccounts
                  .filter(a => !a.isHeader && (txType === 'outflow' ? a.type === 'EXPENSE' : a.type === 'REVENUE' || a.id === 'coa-21300'))
                  .map(a => (
                    <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                  ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Transaksi (Rp) *</label>
            <input
              type="number"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              placeholder="Contoh: 500000"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {txType === 'outflow' || txType === 'transfer' ? 'Dari Rekening Kas / Bank *' : 'Ke Rekening Kas / Bank (Penerima) *'}
            </label>
            <select
              value={txBankId}
              onChange={e => setTxBankId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Pilih Rekening Kas / Bank --</option>
              {bankAccounts.map(ba => (
                <option key={ba.id} value={ba.id}>
                  {ba.name} — Saldo: {formatCurrency(ba.balance)}
                </option>
              ))}
            </select>
          </div>

          {txType === 'transfer' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Ke Rekening Tujuan *</label>
              <select
                value={txToBankId}
                onChange={e => setTxToBankId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Rekening Tujuan --</option>
                {bankAccounts.map(ba => (
                  <option key={ba.id} value={ba.id} disabled={ba.id === txBankId}>
                    {ba.name} — Saldo: {formatCurrency(ba.balance)} {ba.id === txBankId ? '(Sama dengan asal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Keterangan / Memo</label>
            <input
              type="text"
              value={txNote}
              onChange={e => setTxNote(e.target.value)}
              placeholder="Opsional, misal: Bayar listrik, pencairan pinjaman, dll"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      {/* Modal 5: Tambah/Edit Rekening Bank */}
      <Modal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        title={editBankId ? 'Edit Rekening' : 'Tambah Rekening Baru'}
        size="md"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowBankModal(false)}>Batal</Button>
            <Button onClick={handleSaveBankAccount}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          {bankError && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{bankError}</span>
            </div>
          )}

          <Input
            label="Nama Rekening / Kas"
            required
            type="text"
            value={bankName}
            onChange={e => setBankName(e.target.value)}
          />

          <Input
            label="Nomor Rekening"
            type="text"
            value={bankNumber}
            onChange={e => setBankNumber(e.target.value)}
          />

          {!editBankId && (
            <div>
              <CurrencyInput
                label="Saldo Awal"
                required
                value={bankInitialBalance}
                onChange={val => setBankInitialBalance(val === '' ? '' : String(val))}
                placeholder="0"
              />
              <p className="text-[10px] text-slate-400 mt-1">Saldo awal akan otomatis dicatat sebagai 'Modal Disetor'.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 6: Buku Mutasi Kas Spesifik Rekening */}
      <Modal
        isOpen={!!showLedgerModal}
        onClose={() => setShowLedgerModal(null)}
        title={`Buku Mutasi — ${bankAccounts.find(b => b.id === showLedgerModal)?.name || ''}`}
        size="lg"
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowLedgerModal(null)}>Tutup</Button>
        }
      >
        {(() => {
          const bank = bankAccounts.find(b => b.id === showLedgerModal);
          if (!bank) return null;

          const txs: Array<{ date: string; type: 'INFLOW' | 'OUTFLOW'; description: string; amount: number }> = [];

          invoices.forEach(inv => {
            inv.payments.forEach(pay => {
              if (pay.method === bank.name) {
                txs.push({
                  date: pay.date,
                  type: 'INFLOW',
                  description: `Penerimaan Piutang — ${inv.invoiceNumber} (${inv.customerName})`,
                  amount: pay.amount,
                });
              }
            });
          });

          purchaseOrders.forEach(po => {
            if (po.bankAccountId === bank.id && po.paymentStatus === 'PAID') {
              txs.push({
                date: po.paidAt || po.receivedAt || po.createdAt,
                type: 'OUTFLOW',
                description: `Pelunasan PO — ${po.poNumber} (${po.supplier})`,
                amount: po.totalAmount,
              });
            }
          });

          expenses.forEach(exp => {
            if (exp.bankAccountId === bank.id) {
              const coa = mapExpenseCategoryToCoa(exp.category);
              txs.push({
                date: exp.date,
                type: 'OUTFLOW',
                description: `Beban ${coa.name}${exp.note ? ` — ${exp.note}` : ''}`,
                amount: exp.amount,
              });
            }
          });

          txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const totalInflows = txs.filter(t => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0);
          const totalOutflows = txs.filter(t => t.type === 'OUTFLOW').reduce((sum, t) => sum + t.amount, 0);
          const startingBalance = bank.balance - totalInflows + totalOutflows;

          let running = startingBalance;
          const ledgerTxs = txs.map(t => {
            running = running + (t.type === 'INFLOW' ? t.amount : -t.amount);
            return { ...t, runningBalance: running };
          });

          ledgerTxs.reverse();

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                  <span className="text-slate-400 block mb-0.5">Saldo Awal</span>
                  <strong className="text-slate-900 dark:text-slate-200 font-mono">{formatCurrency(startingBalance)}</strong>
                </div>
                <div className="rounded-lg bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20">
                  <span className="text-emerald-600 dark:text-emerald-400 block mb-0.5">Total Masuk</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+{formatCurrency(totalInflows)}</strong>
                </div>
                <div className="rounded-lg bg-red-50/50 p-2.5 dark:bg-red-950/20">
                  <span className="text-red-500 block mb-0.5">Total Keluar</span>
                  <strong className="text-red-500 font-mono">-{formatCurrency(totalOutflows)}</strong>
                </div>
              </div>

              {ledgerTxs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada riwayat mutasi untuk rekening ini.</p>
              ) : (
                <Table
                  dense
                  containerClassName="max-h-[350px] overflow-y-auto"
                  data={ledgerTxs}
                  columns={[
                    {
                      key: 'date',
                      header: 'Tanggal',
                      cell: (tx) => <span className="text-slate-400 font-mono">{formatDateTime(tx.date)}</span>,
                    },
                    {
                      key: 'description',
                      header: 'Keterangan',
                      cell: (tx) => <span className="text-slate-800 dark:text-slate-200 font-medium">{tx.description}</span>,
                    },
                    {
                      key: 'amount',
                      header: 'Mutasi (Rp)',
                      align: 'right',
                      cell: (tx) => (
                        <span className={`font-mono font-bold ${tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {tx.type === 'INFLOW' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      ),
                    },
                    {
                      key: 'runningBalance',
                      header: 'Saldo (Rp)',
                      align: 'right',
                      cell: (tx) => (
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(tx.runningBalance)}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Modal: Mutasi Akun Buku Besar (Trial Balance -> Mutation) */}
      <Modal
        isOpen={!!ledgerMutasiModal}
        onClose={() => setLedgerMutasiModal(null)}
        title={`Rincian Mutasi Akun — ${chartOfAccounts.find(a => a.code === ledgerMutasiModal)?.name || ''}`}
        size="lg"
        actions={
          <Button variant="outline" size="sm" onClick={() => setLedgerMutasiModal(null)}>Tutup</Button>
        }
      >
        {(() => {
          const acc = chartOfAccounts.find(a => a.code === ledgerMutasiModal);
          if (!acc) return null;

          const sorted = [...journalEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          let running = 0;
          const txs: any[] = [];

          sorted.forEach(je => {
            const matchingLines = je.lines.filter(l => l.accountCode === acc.code);
            if (matchingLines.length === 0) return;

            const otherLines = je.lines.filter(l => l.accountCode !== acc.code);
            const contraAccount = otherLines.length > 0
              ? otherLines.map(l => {
                const coa = chartOfAccounts.find(a => a.code === l.accountCode || a.id === l.accountId);
                const cleanName = coa ? coa.name : l.accountName.replace(/\s*\(.*?\)$/, '').trim();
                return `${l.accountCode} - ${cleanName}`;
              }).join(', ')
              : '-';

            matchingLines.forEach((line) => {
              if (acc.normalBalance === 'DEBIT') {
                running += line.debit - line.credit;
              } else {
                running += line.credit - line.debit;
              }

              txs.push({
                date: je.date,
                entryNumber: je.entryNumber,
                sourceType: je.sourceType,
                description: je.description,
                debit: line.debit,
                credit: line.credit,
                contraAccount,
                runningBalance: running,
              });
            });
          });

          txs.reverse();

          if (txs.length === 0) {
            return <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada riwayat mutasi untuk akun ini.</p>;
          }

          return (
            <div className="space-y-4">
              <Table
                dense
                containerClassName="max-h-[400px] overflow-y-auto"
                data={txs}
                columns={[
                  {
                    key: 'date',
                    header: 'Tanggal',
                    cell: (tx) => <span className="text-slate-500 font-mono whitespace-nowrap">{formatDateTime(tx.date)}</span>,
                  },
                  {
                    key: 'entryNumber',
                    header: 'No. Bukti',
                    cell: (tx) => <span className="text-indigo-600 dark:text-indigo-400 font-mono">{tx.entryNumber}</span>,
                  },
                  {
                    key: 'description',
                    header: 'Keterangan',
                    cell: (tx) => (
                      <div>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{tx.description}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{tx.sourceType}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'contraAccount',
                    header: 'Lawan Akun',
                    cell: (tx) => <span className="text-slate-500 text-[11px] truncate max-w-[150px]" title={tx.contraAccount}>{tx.contraAccount}</span>,
                  },
                  {
                    key: 'debit',
                    header: 'Debit',
                    align: 'right',
                    cell: (tx) => <span className="font-mono">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</span>,
                  },
                  {
                    key: 'credit',
                    header: 'Kredit',
                    align: 'right',
                    cell: (tx) => <span className="font-mono">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</span>,
                  },
                  {
                    key: 'runningBalance',
                    header: 'Saldo',
                    align: 'right',
                    cell: (tx) => <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(tx.runningBalance)}</span>,
                  },
                ]}
              />
            </div>
          );
        })()}
      </Modal>

      {/* Modal 6: COA Form (Smart Zero-Headache ERP Form) */}
      <Modal
        isOpen={showCOAModal}
        onClose={() => setShowCOAModal(false)}
        title={editingCOAId ? 'Edit Akun' : 'Tambah Akun Baru'}
        size="md"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCOAModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSubmitCOA} variant="primary">{editingCOAId ? 'Simpan Perubahan' : 'Tambah Akun'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmitCOA} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              1. Pilih Induk / Sub-Akun Dari
            </label>
            <select
              value={coaParentId}
              onChange={e => handleParentSelectChange(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">-- Tidak Ada (Akun Utama / Root) --</option>
              {chartOfAccounts
                .filter(a => a.id !== editingCOAId)
                .map(h => (
                  <option key={h.id} value={h.id}>
                    {h.level === 1 ? '📁 ' : h.level === 2 ? '  ↳ ' : '    • '}{h.code} - {h.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">2. Kode Akun *</label>
                <button
                  type="button"
                  onClick={() => setCoaCode(suggestNextCode(coaParentId, coaType))}
                  className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
                >
                  ↺ Auto-Hitung Kode
                </button>
              </div>
              <input
                type="text"
                value={coaCode}
                onChange={e => setCoaCode(e.target.value)}
                placeholder="Contoh: 1-1110"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                required
              />
              {coaCode.trim() && chartOfAccounts.some(a => a.code === coaCode.trim() && a.id !== editingCOAId) && (
                <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                  ⚠️ Kode "{coaCode.trim()}" sudah terpakai. Klik 'Auto-Hitung Kode' di atas.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">3. Nama Akun *</label>
              <input
                type="text"
                value={coaName}
                onChange={e => setCoaName(e.target.value)}
                placeholder="Contoh: Kas Kecil Operasional"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Kategori Akun
                <span className="text-[10px] font-normal text-indigo-500">(Otomatis Terisi)</span>
              </label>
              <select
                value={coaType}
                onChange={e => handleTypeSelectChange(e.target.value as AccountType)}
                disabled={!!coaParentId}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 font-semibold"
              >
                <option value="ASSET">Aset (Harta)</option>
                <option value="LIABILITY">Kewajiban (Hutang)</option>
                <option value="EQUITY">Ekuitas (Modal)</option>
                <option value="REVENUE">Pendapatan Usaha</option>
                <option value="COGS">Harga Pokok Penjualan (HPP)</option>
                <option value="EXPENSE">Beban Operasional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Saldo Normal
                <span className="text-[10px] font-normal text-indigo-500">(Otomatis Sesuai Aturan)</span>
              </label>
              <select
                value={coaNormalBalance}
                onChange={e => setCoaNormalBalance(e.target.value as AccountNormalBalance)}
                disabled={!!coaParentId}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 font-semibold"
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Kredit</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
            💡 <strong>Sistem Otomatis:</strong> Kategori dan Saldo Normal ({coaNormalBalance}) disesuaikan secara akurat berdasarkan standar akuntansi. Pengguna tidak perlu membingungkan debit atau kredit.
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Deskripsi (Opsional)</label>
            <input
              type="text"
              value={coaDescription}
              onChange={e => setCoaDescription(e.target.value)}
              placeholder="Catatan tambahan fungsi akun..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {coaError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100 dark:bg-red-900/20 dark:border-red-900/30">
              {coaError}
            </div>
          )}
        </form>
      </Modal>

      {/* ── Modal: Manual Journal ── */}
      <Modal
        isOpen={showManualJournalModal}
        onClose={() => setShowManualJournalModal(false)}
        title="Tambah Jurnal Manual"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setShowManualJournalModal(false)}>Batal</Button>
            <Button type="button" onClick={handleManualJournalSubmit} variant="primary">Simpan Jurnal</Button>
          </>
        }
      >
        <form onSubmit={handleManualJournalSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Keterangan / Memo Jurnal</label>
            <input
              type="text"
              value={manualJournalDesc}
              onChange={e => setManualJournalDesc(e.target.value)}
              placeholder="Contoh: Penyesuaian beban sewa bulan ini"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center">
              <span>Baris Jurnal</span>
              <button
                type="button"
                onClick={() => setManualJournalLines([...manualJournalLines, { accountId: '', accountCode: '', debit: '', credit: '' }])}
                className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px]"
              >
                + Tambah Baris
              </button>
            </label>
            <div className="space-y-2">
              {manualJournalLines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      value={line.accountId}
                      onChange={(e) => {
                        const newLines = [...manualJournalLines];
                        const acc = chartOfAccounts.find(a => a.id === e.target.value);
                        newLines[idx].accountId = e.target.value;
                        newLines[idx].accountCode = acc?.code || '';
                        setManualJournalLines(newLines);
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Pilih Akun...</option>
                      {chartOfAccounts.filter(a => !a.isHeader).map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={line.debit}
                      onChange={e => {
                        const newLines = [...manualJournalLines];
                        newLines[idx].debit = e.target.value;
                        if (e.target.value) newLines[idx].credit = '';
                        setManualJournalLines(newLines);
                      }}
                      placeholder="Debit"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                      min="0"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={line.credit}
                      onChange={e => {
                        const newLines = [...manualJournalLines];
                        newLines[idx].credit = e.target.value;
                        if (e.target.value) newLines[idx].debit = '';
                        setManualJournalLines(newLines);
                      }}
                      placeholder="Kredit"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                      min="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (manualJournalLines.length <= 2) return;
                      setManualJournalLines(manualJournalLines.filter((_, i) => i !== idx));
                    }}
                    disabled={manualJournalLines.length <= 2}
                    className="p-2.5 text-slate-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {(() => {
              const td = manualJournalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
              const tc = manualJournalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
              return (
                <div className="flex justify-between items-center text-[10px] font-mono px-1">
                  <span>Total Debit: <span className={td !== tc ? 'text-red-500 font-bold' : 'text-slate-500'}>{formatCurrency(td)}</span></span>
                  <span>Total Kredit: <span className={td !== tc ? 'text-red-500 font-bold' : 'text-slate-500'}>{formatCurrency(tc)}</span></span>
                </div>
              );
            })()}
          </div>

          {manualJournalError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
              {manualJournalError}
            </div>
          )}
        </form>
      </Modal>

      {/* ── Modal: Tutup Buku ── */}
      <Modal
        isOpen={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        title="Tutup Buku (Akhir Periode)"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setShowClosingModal(false)}>Batal</Button>
            <Button type="button" onClick={handleClosingSubmit} variant="primary">Proses Tutup Buku</Button>
          </>
        }
      >
        <form onSubmit={handleClosingSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs rounded-lg border border-amber-200 dark:border-amber-800">
            <strong>Peringatan:</strong> Proses Tutup Buku akan memindahkan saldo akun nominal (Pendapatan, HPP, Beban) ke akun <strong>Laba Ditahan (3-2000)</strong>. Pastikan semua transaksi pada periode ini telah dicatat dengan benar sebelum melakukan proses ini.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Total Pendapatan</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Total HPP & Beban</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">{formatCurrency(totalCOGS + totalExpenses)}</span>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
            <span className="text-xs text-indigo-600/80 dark:text-indigo-400 block mb-1 font-semibold uppercase tracking-widest">
              Laba Bersih yang Dipindahkan
            </span>
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono tracking-tight">
              {formatCurrency(totalRevenue - totalCOGS - totalExpenses)}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal Penutupan Buku</label>
            <input
              type="date"
              value={closingDate}
              onChange={e => setClosingDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </form>
      </Modal>

      {/* ── Modal: Pembagian Dividen ── */}
      <Modal
        isOpen={showDividendModal}
        onClose={() => setShowDividendModal(false)}
        title="Pembagian Dividen"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setShowDividendModal(false)}>Batal</Button>
            <Button type="button" onClick={handleDividendSubmit} variant="primary">Bagikan Dividen</Button>
          </>
        }
      >
        <form onSubmit={handleDividendSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-[11px] rounded-lg border border-blue-200 dark:border-blue-800">
            Pencatatan ini akan mengurangi saldo <strong>Laba Ditahan (3-2000)</strong> dan mengurangi saldo <strong>Kas & Bank</strong> yang dipilih.
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rekening Sumber (Kas/Bank)</label>
            <select
              value={dividendBankId}
              onChange={e => setDividendBankId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
              required
            >
              <option value="" disabled>Pilih rekening sumber dana...</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} (Saldo: {formatCurrency(b.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Dividen (Rp)</label>
            <input
              type="number"
              value={dividendAmount}
              onChange={e => setDividendAmount(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-lg"
              required
            />
          </div>

          {dividendError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
              {dividendError}
            </div>
          )}
        </form>
      </Modal>

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
