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
import { formatCurrency, formatDateTime, getInvoiceStatusLabel } from '@/lib/utils';
import {
  DEFAULT_CHART_OF_ACCOUNTS,
  computeTrialBalance,
  computeARAging,
  computeAPAging,
  mapExpenseCategoryToCoa,
} from '@/lib/accounting';
import type { HPPAnalysis, Expense, AccountType, AccountNormalBalance } from '@/lib/types';
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
  } = useApp();

  // ── Main Tabs Navigation ──
  const [activeTab, setActiveTab] = useUrlTab(
    ['overview', 'cash_bank', 'invoices', 'payables', 'reports', 'ledger'] as const,
    'overview'
  );

  // ── Sub-tabs for Reports ──
  const [reportSubTab, setReportSubTab] = useState<'income' | 'balance_sheet' | 'cashflow' | 'hpp_analysis'>('income');

  // ── Sub-tabs for Ledger ──
  const [ledgerSubTab, setLedgerSubTab] = useState<'journal' | 'trial_balance' | 'coa'>('journal');

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

  // ── Filters & Expanded Rows ──
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [arStatusFilter, setArStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');
  const [arSearchQuery, setArSearchQuery] = useState('');
  const [journalFilterAccount, setJournalFilterAccount] = useState<string>('ALL');

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

  // Income Statement Totals
  const totalRevenue = useMemo(() => hppAnalysis.reduce((s, h) => s + h.sellingPrice, 0), [hppAnalysis]);
  const totalMaterialCost = useMemo(() => hppAnalysis.reduce((s, h) => s + h.materialCost, 0), [hppAnalysis]);
  const totalLaborCost = useMemo(() => hppAnalysis.reduce((s, h) => s + h.actualLaborCost, 0), [hppAnalysis]);
  const totalOverheadCost = useMemo(() => hppAnalysis.reduce((s, h) => s + h.actualOverheadCost, 0), [hppAnalysis]);
  const totalCOGS = totalMaterialCost + totalLaborCost + totalOverheadCost;
  const totalGrossProfit = totalRevenue - totalCOGS;
  const grossMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const totalNetProfit = totalGrossProfit - totalExpenses;
  const netMarginPercent = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  // Balance Sheet Totals
  const inventoryAssetValue = useMemo(() => materials.reduce((s, m) => s + m.stock * m.unitCost, 0), [materials]);
  const fixedAssetCost = useMemo(() => assets.reduce((s, a) => s + a.purchaseCost, 0), [assets]);
  const totalCurrentAssets = totalCashBank + totalReceivable + inventoryAssetValue;
  const totalFixedAssets = fixedAssetCost;
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = totalPayable;
  const totalLiabilities = totalCurrentLiabilities;

  // Initial Capital (Modal) is computed from Bank starting balances + initial assets
  const initialCapital = useMemo(() => {
    // Opening balance from journal entries or bank starting balances
    const openingJE = journalEntries.filter(j => j.sourceType === 'OPENING_BALANCE');
    const fromJE = openingJE.reduce((sum, j) => {
      const modalLine = j.lines.find(l => l.accountCode === '3-1000');
      return sum + (modalLine?.credit || 0);
    }, 0);
    return fromJE > 0 ? fromJE : totalCashBank - totalNetProfit + totalPayable;
  }, [journalEntries, totalCashBank, totalNetProfit, totalPayable]);

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

  // Unified Transaction Inflow/Outflow List
  const buildAllTransactions = () => {
    const allTxs: Array<{ date: string; bankName: string; type: 'INFLOW' | 'OUTFLOW'; description: string; amount: number }> = [];

    invoices.forEach(inv => {
      inv.payments.forEach(pay => {
        allTxs.push({
          date: pay.date,
          bankName: pay.method,
          type: 'INFLOW',
          description: `Penerimaan Piutang — ${inv.invoiceNumber} (${inv.customerName})`,
          amount: pay.amount,
        });
      });
    });

    purchaseOrders.forEach(po => {
      if (po.paymentStatus === 'PAID') {
        const bank = bankAccounts.find(b => b.id === po.bankAccountId);
        allTxs.push({
          date: po.paidAt || po.receivedAt || po.createdAt,
          bankName: bank?.name || 'Kas',
          type: 'OUTFLOW',
          description: `Pelunasan PO Supplier — ${po.poNumber} (${po.supplier})`,
          amount: po.totalAmount,
        });
      }
    });

    expenses.forEach(exp => {
      const bank = bankAccounts.find(b => b.id === exp.bankAccountId);
      const coa = mapExpenseCategoryToCoa(exp.category);
      allTxs.push({
        date: exp.date,
        bankName: bank?.name || 'Kas',
        type: 'OUTFLOW',
        description: `Beban ${coa.name}${exp.note ? ` — ${exp.note}` : ''}`,
        amount: exp.amount,
      });
    });

    allTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allTxs;
  };

  const allTransactions = useMemo(() => buildAllTransactions(), [invoices, purchaseOrders, expenses, bankAccounts]);

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

  const submitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) {
      setExpenseFormError('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }
    if (!expAccountId) {
      setExpenseFormError('Harap pilih rekening kas/bank asal.');
      return;
    }

    const bank = bankAccounts.find(ba => ba.id === expAccountId);
    if (bank && bank.balance < Number(expAmount)) {
      setExpenseFormError(`Saldo ${bank.name} tidak mencukupi (Saldo saat ini: ${formatCurrency(bank.balance)}).`);
      return;
    }

    recordExpense(expCategory, Number(expAmount), expAccountId, expNote.trim() || undefined);
    setExpAmount('');
    setExpNote('');
    setExpenseFormError('');
    setShowExpenseModal(false);
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

  const handleTransferFunds = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');

    if (!fromBankId || !toBankId) {
      setTransferError('Harap pilih rekening asal dan rekening tujuan.');
      return;
    }
    if (fromBankId === toBankId) {
      setTransferError('Rekening asal dan tujuan tidak boleh sama.');
      return;
    }
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      setTransferError('Nominal transfer harus lebih besar dari 0.');
      return;
    }
    const sourceBank = bankAccounts.find(b => b.id === fromBankId);
    if (sourceBank && sourceBank.balance < amt) {
      setTransferError(`Saldo ${sourceBank.name} tidak mencukupi (Saldo: ${formatCurrency(sourceBank.balance)}).`);
      return;
    }

    const ok = transferBankFunds(fromBankId, toBankId, amt, transferNote.trim() || undefined);
    if (ok) {
      setTransferAmount('');
      setTransferNote('');
      setFromBankId('');
      setToBankId('');
      setShowTransferModal(false);
    } else {
      setTransferError('Gagal memproses transfer dana. Cek kembali saldo rekening.');
    }
  };

  const openExpenseModal = () => {
    setExpCategory('GAJI');
    setExpAmount('');
    setExpAccountId(bankAccounts[0]?.id || '');
    setExpNote('');
    setExpenseFormError('');
    setShowExpenseModal(true);
  };

  const openTransferModal = () => {
    setFromBankId(bankAccounts[0]?.id || '');
    setToBankId(bankAccounts[1]?.id || '');
    setTransferAmount('');
    setTransferNote('');
    setTransferError('');
    setShowTransferModal(true);
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
    { key: 'invoices' as const, label: 'Piutang (AR)', icon: Receipt },
    { key: 'payables' as const, label: 'Hutang & Beban (AP)', icon: CreditCard },
    { key: 'reports' as const, label: 'Laporan Keuangan', icon: BarChart3 },
    { key: 'ledger' as const, label: 'Buku Besar & CoA', icon: BookOpen },
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
        <Button variant="outline" onClick={openTransferModal} disabled={bankAccounts.length < 2}>
          <ArrowLeftRight className="h-4 w-4" /> Transfer Kas
        </Button>
        <Button onClick={openExpenseModal} disabled={bankAccounts.length === 0}>
          <Plus className="h-4 w-4" /> Catat Beban
        </Button>
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
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            tx.type === 'INFLOW'
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
                        className={`text-xs font-mono font-bold whitespace-nowrap ${
                          tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
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
                  <button onClick={() => setActiveTab('invoices')} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
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
                  <button onClick={() => setActiveTab('payables')} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
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
      {/* ── TAB 2: KAS & BANK ─────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'cash_bank' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Rekening Kas & Bank Perusahaan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Likuiditas Berjalan: <strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(totalCashBank)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openTransferModal} disabled={bankAccounts.length < 2}>
                <ArrowLeftRight className="h-4 w-4" /> Transfer Antar Rekening
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditBankId(null);
                  setBankName('');
                  setBankNumber('');
                  setBankInitialBalance('');
                  setBankError('');
                  setShowBankModal(true);
                }}
              >
                <Plus className="h-4 w-4" /> Tambah Rekening
              </Button>
            </div>
          </div>

          {/* Bank Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map(ba => (
              <Card
                key={ba.id}
                className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between h-48"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {ba.name}
                      </h4>
                      {ba.accountNumber ? (
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{ba.accountNumber}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Kas Fisik / Kas Kecil</p>
                      )}
                    </div>
                    <div className="rounded-lg bg-indigo-50/70 p-1 dark:bg-slate-800 flex gap-1 items-center shrink-0 border border-indigo-100/50 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setShowLedgerModal(ba.id)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Lihat Mutasi Rekening"
                      >
                        Mutasi
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditBankId(ba.id);
                          setBankName(ba.name);
                          setBankNumber(ba.accountNumber || '');
                          setBankError('');
                          setShowBankModal(true);
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        title="Edit Rekening"
                      >
                        Edit
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
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
                        className="text-[11px] text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Hapus Rekening"
                      >
                        Hapus
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
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">Aktif</strong></span>
                  <span className="font-mono">Akun ID: {ba.id}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Jurnal Mutasi Kas Global */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Jurnal Mutasi Kas Terintegrasi</h3>
                <p className="text-xs text-slate-500">Log seluruh transaksi kas masuk & keluar dari semua rekening bank.</p>
              </div>
            </div>

            {allTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">Belum ada riwayat transaksi kas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                      <th className="pb-3 font-semibold">Tanggal</th>
                      <th className="pb-3 font-semibold">Rekening Asal / Tujuan</th>
                      <th className="pb-3 font-semibold">Keterangan Transaksi</th>
                      <th className="pb-3 text-right font-semibold">Mutasi (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {allTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                        <td className="py-3 text-slate-500 font-mono whitespace-nowrap">{formatDateTime(tx.date)}</td>
                        <td className="py-3">
                          <Badge variant="default" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                            {tx.bankName}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-800 dark:text-slate-200 font-medium">{tx.description}</td>
                        <td className={`py-3 text-right font-mono font-bold ${tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {tx.type === 'INFLOW' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: PIUTANG DAGANG (Accounts Receivable / AR) ─── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
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
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      arStatusFilter === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st === 'UNPAID' ? 'Belum Bayar' : st === 'PARTIAL' ? 'Cicilan / DP' : 'Lunas'}
                  </button>
                ))}
              </div>
            </div>

            {invoices.length === 0 ? (
              <EmptyState
                title="Belum ada invoice piutang"
                description="Invoice otomatis terbit saat pengiriman barang pesanan diselesaikan driver."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                      <th className="pb-3 pr-3 font-semibold">No. Invoice</th>
                      <th className="pb-3 pr-3 font-semibold">No. Order</th>
                      <th className="pb-3 pr-3 font-semibold">Pelanggan</th>
                      <th className="pb-3 pr-3 text-right font-semibold">Total Tagihan</th>
                      <th className="pb-3 pr-3 text-right font-semibold">Terbayar</th>
                      <th className="pb-3 pr-3 text-right font-semibold">Sisa Piutang</th>
                      <th className="pb-3 pr-3 text-center font-semibold">Status</th>
                      <th className="pb-3 text-center font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {[...invoices]
                      .filter(inv => {
                        if (arStatusFilter !== 'ALL' && inv.status !== arStatusFilter) return false;
                        if (arSearchQuery.trim()) {
                          const q = arSearchQuery.toLowerCase();
                          return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .reverse()
                      .map(inv => {
                        const isExpanded = expandedInvoiceId === inv.id;
                        return (
                          <React.Fragment key={inv.id}>
                            <tr
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 cursor-pointer"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            >
                              <td className="py-3 pr-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-3 pr-3 font-mono text-slate-500">{inv.salesOrderNumber}</td>
                              <td className="py-3 pr-3 font-semibold text-slate-800 dark:text-slate-200">{inv.customerName}</td>
                              <td className="py-3 pr-3 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                              <td className="py-3 pr-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(inv.paidAmount)}
                              </td>
                              <td className="py-3 pr-3 text-right font-mono font-bold text-red-600">
                                {formatCurrency(inv.totalAmount - inv.paidAmount)}
                              </td>
                              <td className="py-3 pr-3 text-center">
                                <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PARTIAL' ? 'warning' : 'danger'}>
                                  {getInvoiceStatusLabel(inv.status)}
                                </Badge>
                              </td>
                              <td className="py-3 text-center" onClick={e => e.stopPropagation()}>
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
                              </td>
                            </tr>

                            {/* Expanded Payment History */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                <td colSpan={8} className="p-4 border-b border-slate-200 dark:border-slate-700">
                                  <div className="space-y-3">
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
                                        <div className="overflow-x-auto max-h-[200px] border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                                          <table className="w-full text-xs text-left">
                                            <thead>
                                              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                                <th className="p-2.5 font-medium">Tanggal Pelunasan</th>
                                                <th className="p-2.5 font-medium">Disetor ke Rekening</th>
                                                <th className="p-2.5 font-medium">Catatan / Memo</th>
                                                <th className="p-2.5 text-right font-medium">Jumlah Masuk</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                              {inv.payments.map((p, pidx) => (
                                                <tr key={pidx}>
                                                  <td className="p-2.5 text-slate-500 font-mono">{formatDateTime(p.date)}</td>
                                                  <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{p.method}</td>
                                                  <td className="p-2.5 text-slate-500 italic">{p.note || '-'}</td>
                                                  <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                    +{formatCurrency(p.amount)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: HUTANG & BEBAN (Accounts Payable & OpEx) ────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'payables' && (
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
              {purchaseOrders.filter(p => p.status === 'RECEIVED').length === 0 ? (
                <EmptyState
                  title="Belum ada tagihan supplier"
                  description="Tagihan hutang muncul otomatis saat kiriman bahan baku PO diterima di modul Inventaris."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                        <th className="pb-3 pr-3 font-semibold">No. PO</th>
                        <th className="pb-3 pr-3 font-semibold">Supplier</th>
                        <th className="pb-3 pr-3 text-right font-semibold">Total Tagihan</th>
                        <th className="pb-3 pr-3 font-semibold">Tgl Diterima</th>
                        <th className="pb-3 pr-3 text-center font-semibold">Status Bayar</th>
                        <th className="pb-3 text-center font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {[...purchaseOrders]
                        .filter(p => p.status === 'RECEIVED')
                        .reverse()
                        .map(po => {
                          const payBank = po.bankAccountId ? bankAccounts.find(b => b.id === po.bankAccountId) : null;
                          return (
                            <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <td className="py-3 pr-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{po.poNumber}</td>
                              <td className="py-3 pr-3 font-semibold text-slate-800 dark:text-slate-200">{po.supplier}</td>
                              <td className="py-3 pr-3 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(po.totalAmount)}</td>
                              <td className="py-3 pr-3 text-slate-500">{po.receivedAt ? formatDateTime(po.receivedAt) : '-'}</td>
                              <td className="py-3 pr-3 text-center">
                                <Badge variant={po.paymentStatus === 'PAID' ? 'success' : 'danger'}>
                                  {po.paymentStatus === 'PAID' ? 'Lunas' : 'Belum Bayar'}
                                </Badge>
                              </td>
                              <td className="py-3 text-center">
                                {po.paymentStatus === 'UNPAID' ? (
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
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          {/* Section B: Beban Operasional (OpEx) */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Beban Operasional & Umum (OpEx)</h3>
                <p className="text-xs text-slate-500">Pencatatan pengeluaran non-produksi: Gaji staf, sewa workshop, listrik, internet, dsb.</p>
              </div>
              <Button size="sm" onClick={openExpenseModal}>
                <Plus className="h-4 w-4" /> Catat Beban Baru
              </Button>
            </div>

            <Card>
              {expenses.length === 0 ? (
                <EmptyState
                  title="Belum ada pencatatan beban operasional"
                  description="Klik 'Catat Beban Baru' untuk mencatat pengeluaran operasional perusahaan."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                        <th className="pb-3 font-semibold">Tanggal</th>
                        <th className="pb-3 font-semibold">Kategori & Akun CoA</th>
                        <th className="pb-3 font-semibold">Rekening Asal</th>
                        <th className="pb-3 font-semibold">Keterangan / Memo</th>
                        <th className="pb-3 text-right font-semibold">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {[...expenses].reverse().map(exp => {
                        const bank = bankAccounts.find(b => b.id === exp.bankAccountId);
                        const coa = mapExpenseCategoryToCoa(exp.category);
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-3 text-slate-500 font-mono whitespace-nowrap">{formatDateTime(exp.date)}</td>
                            <td className="py-3">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">{coa.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">Kode: {coa.code}</span>
                            </td>
                            <td className="py-3 font-medium text-slate-600 dark:text-slate-300">{bank?.name || 'Kas'}</td>
                            <td className="py-3 text-slate-500 italic">{exp.note || '-'}</td>
                            <td className="py-3 text-right font-mono font-bold text-red-600">
                              -{formatCurrency(exp.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: LAPORAN KEUANGAN (Financial Statements) ─────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Sub Navigation for Reports */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setReportSubTab('income')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                reportSubTab === 'income'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Laporan Laba Rugi (Income Statement)
            </button>
            <button
              onClick={() => setReportSubTab('balance_sheet')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                reportSubTab === 'balance_sheet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Neraca Keuangan (Balance Sheet)
            </button>
            <button
              onClick={() => setReportSubTab('cashflow')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                reportSubTab === 'cashflow'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Laporan Arus Kas (Cash Flow)
            </button>
            <button
              onClick={() => setReportSubTab('hpp_analysis')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                reportSubTab === 'hpp_analysis'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Analisis HPP & Margin per Order
            </button>
          </div>

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
                    <span>Pendapatan Penjualan Produk (Sales Orders)</span>
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
                    <span>Biaya Bahan Baku Terpakai (BOM)</span>
                    <span className="font-mono text-red-600">({formatCurrency(totalMaterialCost)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>Upah Tenaga Kerja Langsung (Labor)</span>
                    <span className="font-mono text-red-600">({formatCurrency(totalLaborCost)})</span>
                  </div>
                  <div className="flex justify-between py-1.5 pl-6 pr-3 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    <span>Biaya Overhead Pabrik</span>
                    <span className="font-mono text-red-600">({formatCurrency(totalOverheadCost)})</span>
                  </div>
                </div>

                {/* 3. Laba Kotor */}
                <div className="flex justify-between py-2.5 px-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-sm font-black text-indigo-900 dark:text-indigo-200">
                  <span>LABA KOTOR (GROSS PROFIT) — Margin: {grossMarginPercent.toFixed(1)}%</span>
                  <span className="font-mono">{formatCurrency(totalGrossProfit)}</span>
                </div>

                {/* 4. Beban Operasional */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded">
                    <span>3. BEBAN OPERASIONAL & UMUM (OPEX)</span>
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

                {/* 5. Laba Bersih */}
                <div
                  className={`flex justify-between py-3.5 px-4 rounded-xl text-base font-black border ${
                    totalNetProfit >= 0
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
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">ASET (ASSETS)</h3>

                    {/* Aset Lancar */}
                    <div className="space-y-2 mb-4">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Aset Lancar</p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Kas & Bank</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalCashBank)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Piutang Dagang (AR)</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalReceivable)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Persediaan Bahan Baku (Gudang)</span>
                        <span className="font-mono font-semibold">{formatCurrency(inventoryAssetValue)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Aset Lancar</span>
                        <span className="font-mono">{formatCurrency(totalCurrentAssets)}</span>
                      </div>
                    </div>

                    {/* Aset Tetap */}
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Aset Tetap & Peralatan</p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Mesin, Peralatan & Armada</span>
                        <span className="font-mono font-semibold">{formatCurrency(fixedAssetCost)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Aset Tetap</span>
                        <span className="font-mono">{formatCurrency(totalFixedAssets)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-sm font-black text-indigo-900 dark:text-indigo-200">
                    <span>TOTAL ASET</span>
                    <span className="font-mono">{formatCurrency(totalAssets)}</span>
                  </div>
                </div>

                {/* Sisi Kanan: LIABILITAS & EKUITAS */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">LIABILITAS & EKUITAS</h3>

                    {/* Liabilitas */}
                    <div className="space-y-2 mb-4">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Liabilitas Jangka Pendek</p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Hutang Dagang Supplier (PO)</span>
                        <span className="font-mono font-semibold">{formatCurrency(totalPayable)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Liabilitas</span>
                        <span className="font-mono">{formatCurrency(totalLiabilities)}</span>
                      </div>
                    </div>

                    {/* Ekuitas */}
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Ekuitas Pemilik</p>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Modal Disetor / Modal Awal</span>
                        <span className="font-mono font-semibold">{formatCurrency(initialCapital)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                        <span>Laba Bersih Periode Berjalan</span>
                        <span className="font-mono font-semibold text-emerald-600">{formatCurrency(totalNetProfit)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>Total Ekuitas</span>
                        <span className="font-mono">{formatCurrency(totalEquity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-sm font-black text-purple-900 dark:text-purple-200">
                    <span>TOTAL LIABILITAS & EKUITAS</span>
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
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Analisis Realisasi HPP & Margin per Sales Order</h3>
                <p className="text-xs text-slate-500">Kalkulasi biaya langsung (BOM, Upah Kerja, Overhead) terhadap harga jual per pesanan.</p>
              </div>

              {hppAnalysis.length === 0 && inProductionHPP.length === 0 ? (
                <Card>
                  <EmptyState
                    title="Belum ada data HPP pesanan"
                    description="Data HPP otomatis terkalkulasi saat pesanan diproduksi dan dikirimkan ke pelanggan."
                  />
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Realized Orders */}
                  {hppAnalysis.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pesanan Selesai (Realisasi Aktual)</p>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {hppAnalysis.map(hpp => (
                          <Card key={hpp.salesOrderId}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{hpp.salesOrderNumber}</p>
                                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{hpp.customerName}</p>
                              </div>
                              <Badge variant={hpp.grossMarginPercent > 30 ? 'success' : hpp.grossMarginPercent > 15 ? 'warning' : 'danger'}>
                                Margin: {hpp.grossMarginPercent.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="border-t border-slate-100 pt-2 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                              <div className="flex justify-between"><span>Harga Jual:</span><strong className="text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(hpp.sellingPrice)}</strong></div>
                              <div className="flex justify-between"><span>Biaya Bahan Baku (BOM):</span><span className="font-mono">{formatCurrency(hpp.materialCost)}</span></div>
                              <div className="flex justify-between"><span>Upah Tenaga Kerja:</span><span className="font-mono">{formatCurrency(hpp.actualLaborCost)}</span></div>
                              <div className="flex justify-between"><span>Biaya Overhead:</span><span className="font-mono">{formatCurrency(hpp.actualOverheadCost)}</span></div>
                              <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                                <span>Total HPP Produksi:</span>
                                <span className="font-mono">{formatCurrency(hpp.totalHPP)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                <span>Laba Kotor (Gross Profit):</span>
                                <span className="font-mono">+{formatCurrency(hpp.grossProfit)}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders In Production */}
                  {inProductionHPP.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pesanan Sedang Berjalan (Estimasi HPP)</p>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {inProductionHPP.map(hpp => (
                          <Card key={hpp.salesOrderId} className="border-dashed bg-slate-50/40 dark:bg-slate-800/20">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{hpp.salesOrderNumber}</p>
                                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{hpp.customerName}</p>
                              </div>
                              <Badge variant="default" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Est. Margin: {hpp.grossMarginPercent.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="border-t border-slate-100 pt-2 dark:border-slate-800 text-xs space-y-1 text-slate-500 dark:text-slate-400">
                              <div className="flex justify-between"><span>Harga Jual:</span><strong className="font-mono">{formatCurrency(hpp.sellingPrice)}</strong></div>
                              <div className="flex justify-between"><span>Est. Material:</span><span className="font-mono">{formatCurrency(hpp.materialCost)}</span></div>
                              <div className="flex justify-between"><span>Est. Upah:</span><span className="font-mono">{formatCurrency(hpp.plannedLaborCost)}</span></div>
                              <div className="flex justify-between"><span>Est. Overhead:</span><span className="font-mono">{formatCurrency(hpp.plannedOverheadCost)}</span></div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── TAB 6: BUKU BESAR & COA (General Ledger & CoA) ─────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Sub Navigation for Ledger */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setLedgerSubTab('journal')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                ledgerSubTab === 'journal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Jurnal Umum (General Ledger)
            </button>
            <button
              onClick={() => setLedgerSubTab('trial_balance')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                ledgerSubTab === 'trial_balance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Neraca Saldo (Trial Balance)
            </button>
            <button
              onClick={() => setLedgerSubTab('coa')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                ledgerSubTab === 'coa'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Bagan Akun (Chart of Accounts)
            </button>
          </div>

          {/* ── 6.1: General Ledger / Journal Entries ── */}
          {ledgerSubTab === 'journal' && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Jurnal Umum (Double-Entry Log)</h3>
                  <p className="text-xs text-slate-500">Seluruh postingan jurnal otomatis dari transaksi operasional.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={journalFilterAccount}
                    onChange={e => setJournalFilterAccount(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
                  >
                    <option value="ALL">Semua Akun Rekening</option>
                    {chartOfAccounts
                      .filter(a => !a.isHeader)
                      .map(a => (
                        <option key={a.id} value={a.code}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                  </select>
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
                    .map(je => (
                      <div
                        key={je.id}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                              {je.entryNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{je.description}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>Tgl: <strong className="text-slate-600 dark:text-slate-300 font-mono">{formatDateTime(je.date)}</strong></span>
                            <Badge variant="default" className="text-[10px]">
                              {je.sourceType}
                            </Badge>
                          </div>
                        </div>

                        {/* Journal Lines Table */}
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800/40">
                              <th className="pb-1.5 font-medium">Kode Akun</th>
                              <th className="pb-1.5 font-medium">Nama Rekening Akuntansi</th>
                              <th className="pb-1.5 text-right font-medium">Debit (Rp)</th>
                              <th className="pb-1.5 text-right font-medium">Kredit (Rp)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/20">
                            {je.lines.map((line, lidx) => (
                              <tr key={lidx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10">
                                <td className="py-1.5 font-mono text-slate-500">{line.accountCode}</td>
                                <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300">{line.accountName}</td>
                                <td className="py-1.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                  {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                </td>
                                <td className="py-1.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                  {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {/* ── 6.2: Trial Balance / Neraca Saldo ── */}
          {ledgerSubTab === 'trial_balance' && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Neraca Saldo (Trial Balance)</h3>
                  <p className="text-xs text-slate-500">Pemeriksaan keseimbangan seluruh mutasi Debit dan Kredit per akun.</p>
                </div>
                <Badge variant={trialBalance.isBalanced ? 'success' : 'danger'}>
                  {trialBalance.isBalanced ? '✓ Balanced (Seimbang)' : 'Tidak Seimbang'}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                      <th className="pb-3 font-semibold">Kode</th>
                      <th className="pb-3 font-semibold">Nama Akun</th>
                      <th className="pb-3 font-semibold">Tipe</th>
                      <th className="pb-3 font-semibold">Posisi Normal</th>
                      <th className="pb-3 text-right font-semibold">Total Debit (Rp)</th>
                      <th className="pb-3 text-right font-semibold">Total Kredit (Rp)</th>
                      <th className="pb-3 text-right font-semibold">Saldo Akhir (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {trialBalance.rows.map(row => (
                      <tr key={row.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.code}</td>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{row.name}</td>
                        <td className="py-2.5">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400">
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 font-medium">{row.normalBalance}</td>
                        <td className="py-2.5 text-right font-mono">{row.totalDebit > 0 ? formatCurrency(row.totalDebit) : '-'}</td>
                        <td className="py-2.5 text-right font-mono">{row.totalCredit > 0 ? formatCurrency(row.totalCredit) : '-'}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(row.netBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                      <td colSpan={4} className="py-3 font-semibold">TOTAL NERACA SALDO</td>
                      <td className="py-3 text-right font-mono">{formatCurrency(trialBalance.totalDebit)}</td>
                      <td className="py-3 text-right font-mono">{formatCurrency(trialBalance.totalCredit)}</td>
                      <td className="py-3 text-right font-mono text-emerald-600">✓ Ok</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* ── 6.3: Chart of Accounts Hierarchy Viewer ── */}
          {ledgerSubTab === 'coa' && (
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
                      className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors group ${
                        isH1
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(null)}>Batal</Button>
              <Button variant="success" size="sm" onClick={submitPayment} disabled={!payAmount || Number(payAmount) <= 0 || !payAccountId}>
                <CheckCircle className="h-4 w-4" /> Simpan Pembayaran
              </Button>
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setShowPOPaymentModal(null)}>Batal</Button>
              <Button variant="danger" size="sm" onClick={submitPOPayment} disabled={!poPayAccountId}>
                <CheckCircle className="h-4 w-4" /> Bayar Sekarang
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 3: Catat Pengeluaran Beban Operasional */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Catat Beban Operasional Baru" size="md">
        <form onSubmit={submitExpense} className="space-y-4">
          {expenseFormError && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{expenseFormError}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori Beban (CoA Terkait) *</label>
            <select
              value={expCategory}
              onChange={e => setExpCategory(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="GAJI">6-1000 — Beban Gaji Staf & Administrasi</option>
              <option value="LISTRIK_AIR">6-2000 — Beban Listrik, Air & Internet</option>
              <option value="SEWA">6-3000 — Beban Sewa Gudang & Tempat</option>
              <option value="TRANSPORT">6-4000 — Beban BBM & Transportasi Logistik</option>
              <option value="ATK">6-5000 — Beban ATK & Perlengkapan Kantor</option>
              <option value="LAINNYA">6-9000 — Beban Operasional Lain-lain</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Beban (Rp) *</label>
            <input
              type="number"
              value={expAmount}
              onChange={e => setExpAmount(e.target.value)}
              placeholder="Contoh: 500000"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Rekening Kas / Bank Asal *</label>
            <select
              value={expAccountId}
              onChange={e => setExpAccountId(e.target.value)}
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

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Keterangan / Memo</label>
            <input
              type="text"
              value={expNote}
              onChange={e => setExpNote(e.target.value)}
              placeholder="Contoh: Bayar tagihan PLN bulan Agustus"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowExpenseModal(false)}>Batal</Button>
            <Button size="sm" type="submit">
              <Plus className="h-4 w-4" /> Simpan Beban
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Transfer Antar Rekening */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Dana Antar Rekening" size="md">
        <form onSubmit={handleTransferFunds} className="space-y-4">
          {transferError && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Dari Rekening Asal *</label>
            <select
              value={fromBankId}
              onChange={e => setFromBankId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Pilih Rekening Asal --</option>
              {bankAccounts.map(ba => (
                <option key={ba.id} value={ba.id}>
                  {ba.name} — Saldo: {formatCurrency(ba.balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Ke Rekening Tujuan *</label>
            <select
              value={toBankId}
              onChange={e => setToBankId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Pilih Rekening Tujuan --</option>
              {bankAccounts.map(ba => (
                <option key={ba.id} value={ba.id} disabled={ba.id === fromBankId}>
                  {ba.name} — Saldo: {formatCurrency(ba.balance)} {ba.id === fromBankId ? '(Sama dengan asal)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Transfer (Rp) *</label>
            <input
              type="number"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              placeholder="Contoh: 1000000"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Catatan Transfer</label>
            <input
              type="text"
              value={transferNote}
              onChange={e => setTransferNote(e.target.value)}
              placeholder="Contoh: Pengisian Kas Kecil Operasional"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowTransferModal(false)}>Batal</Button>
            <Button size="sm" type="submit">
              <ArrowLeftRight className="h-4 w-4" /> Proses Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: Tambah/Edit Rekening Bank */}
      <Modal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        title={editBankId ? 'Edit Rekening Kas & Bank' : 'Tambah Rekening Kas & Bank Baru'}
        size="md"
      >
        <div className="space-y-4">
          {bankError && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40 text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{bankError}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Rekening *</label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Contoh: Bank BCA Operasional, Kas Toko"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nomor Rekening (Opsional)</label>
            <input
              type="text"
              value={bankNumber}
              onChange={e => setBankNumber(e.target.value)}
              placeholder="Contoh: 123-456-7890"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {!editBankId && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Saldo Awal / Starting Balance (Rp) *</label>
              <input
                type="number"
                value={bankInitialBalance}
                onChange={e => setBankInitialBalance(e.target.value)}
                placeholder="Contoh: 10000000"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Saldo awal akan otomatis dijurnalkan sebagai Modal Disetor (Equity).</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setShowBankModal(false)}>Batal</Button>
            <Button size="sm" onClick={handleSaveBankAccount}>Simpan Rekening</Button>
          </div>
        </div>
      </Modal>

      {/* Modal 6: Buku Mutasi Kas Spesifik Rekening */}
      <Modal
        isOpen={!!showLedgerModal}
        onClose={() => setShowLedgerModal(null)}
        title={`Buku Mutasi — ${bankAccounts.find(b => b.id === showLedgerModal)?.name || ''}`}
        size="lg"
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
                <div className="max-h-[350px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 sticky top-0">
                        <th className="p-2.5 font-semibold">Tanggal</th>
                        <th className="p-2.5 font-semibold">Keterangan</th>
                        <th className="p-2.5 text-right font-semibold">Mutasi (Rp)</th>
                        <th className="p-2.5 text-right font-semibold">Saldo (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {ledgerTxs.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-2.5 text-slate-400 font-mono">{formatDateTime(tx.date)}</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200 font-medium">{tx.description}</td>
                          <td className={`p-2.5 text-right font-mono font-bold ${tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {tx.type === 'INFLOW' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(tx.runningBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setShowLedgerModal(null)}>Tutup</Button>
              </div>
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

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setShowCOAModal(false)}>Batal</Button>
            <Button type="submit" variant="primary">{editingCOAId ? 'Simpan Perubahan' : 'Tambah Akun'}</Button>
          </div>
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
