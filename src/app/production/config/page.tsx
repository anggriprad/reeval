'use client';

import React, { useState, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import { canManageProduction } from '@/lib/roles';
import type { ProductionOperation, ProductionRouting, ProductionOperator, RoutingStep } from '@/lib/types';
import { Toggle } from '@/components/ui/Toggle';
import {
  Wrench,
  Layers,
  Users,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface ConfigSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconWrapperClass: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function ConfigSection({
  title,
  description,
  icon: Icon,
  iconWrapperClass,
  children,
  defaultExpanded = false,
}: ConfigSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all">
      <div
        className="flex items-center gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

function ProductionConfigContent() {
  const { toast, confirm } = useToast();
  const {
    currentUser,
    operations,
    routings,
    operators = [],
    workOrders,
    addOperation,
    updateOperation,
    deleteOperation,
    addRouting,
    updateRouting,
    deleteRouting,
    addOperator,
    updateOperator,
    deleteOperator,
  } = useApp();

  const canManage = canManageProduction(currentUser.role);

  // Search terms per accordion section
  const [opSearch, setOpSearch] = useState('');
  const [rtSearch, setRtSearch] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');

  // --- Operation Modal State ---
  const [showOpModal, setShowOpModal] = useState(false);
  const [editOpId, setEditOpId] = useState<string | null>(null);
  const [opName, setOpName] = useState('');
  const [opDuration, setOpDuration] = useState<number | ''>('');
  const [opCostingMethod, setOpCostingMethod] = useState<'hourly' | 'fixed'>('fixed');
  const [opFixedLaborCost, setOpFixedLaborCost] = useState<number | ''>('');
  const [opLaborCost, setOpLaborCost] = useState<number | ''>('');
  const [opDesc, setOpDesc] = useState('');
  const [opError, setOpError] = useState('');

  // --- Routing Modal State ---
  const [showRtModal, setShowRtModal] = useState(false);
  const [editRtId, setEditRtId] = useState<string | null>(null);
  const [rtName, setRtName] = useState('');
  const [rtSteps, setRtSteps] = useState<RoutingStep[]>([]);
  const [rtError, setRtError] = useState('');

  // --- Operator Modal State ---
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [editOperatorId, setEditOperatorId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorRole, setOperatorRole] = useState('');
  const [operatorStatus, setOperatorStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [operatorError, setOperatorError] = useState('');

  // --- Handlers: Operations CRUD ---
  const openAddOp = () => {
    setEditOpId(null);
    setOpName('');
    setOpDuration('');
    setOpCostingMethod('fixed');
    setOpFixedLaborCost('');
    setOpLaborCost('');
    setOpDesc('');
    setOpError('');
    setShowOpModal(true);
  };

  const openEditOp = (op: ProductionOperation) => {
    setEditOpId(op.id);
    setOpName(op.name);
    setOpDuration(op.durationMinutes || 45);
    setOpCostingMethod(op.costingMethod || 'fixed');
    setOpFixedLaborCost(op.fixedLaborCost || 0);
    setOpLaborCost(op.laborCostPerHour || 0);
    setOpDesc(op.description || '');
    setOpError('');
    setShowOpModal(true);
  };

  const handleSaveOp = () => {
    if (!opName.trim()) {
      setOpError('Nama operasi wajib diisi.');
      return;
    }
    const fixedVal = Number(opFixedLaborCost) || 0;
    const hourlyVal = Number(opLaborCost) || 0;
    if (opCostingMethod === 'fixed' && fixedVal <= 0) {
      setOpError('Nominal upah borongan harus lebih besar dari 0.');
      return;
    }
    if (opCostingMethod === 'hourly' && hourlyVal <= 0) {
      setOpError('Tarif upah per jam harus lebih besar dari 0.');
      return;
    }

    const payload = {
      name: opName.trim(),
      costingMethod: opCostingMethod,
      fixedLaborCost: opCostingMethod === 'fixed' ? fixedVal : undefined,
      laborCostPerHour: opCostingMethod === 'hourly' ? hourlyVal : undefined,
      durationMinutes: Number(opDuration) || undefined,
      description: opDesc.trim() || undefined,
    };

    if (editOpId) {
      updateOperation(editOpId, payload);
      toast.success('Operasi Diperbarui', `Operasi "${payload.name}" berhasil diperbarui.`);
    } else {
      addOperation(payload);
      toast.success('Operasi Ditambahkan', `Operasi "${payload.name}" berhasil ditambahkan.`);
    }
    setShowOpModal(false);
  };

  const handleDeleteOp = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Operasi Produksi',
      message: `Apakah Anda yakin ingin menghapus operasi "${name}"?`,
      confirmText: 'Hapus Operasi',
      variant: 'danger',
    });
    if (isOk) {
      const ok = deleteOperation(id);
      if (!ok) {
        toast.error('Gagal Menghapus Operasi', 'Operasi ini tidak dapat dihapus karena sedang digunakan dalam Alur Produksi.');
      } else {
        toast.success('Operasi Dihapus', `Operasi "${name}" berhasil dihapus.`);
      }
    }
  };

  // --- Handlers: Routings CRUD ---
  const openAddRt = () => {
    setEditRtId(null);
    setRtName('');
    setRtSteps([]);
    setRtError('');
    setShowRtModal(true);
  };

  const openEditRt = (rt: ProductionRouting) => {
    setEditRtId(rt.id);
    setRtName(rt.name);
    setRtSteps(rt.steps.map(s => ({ ...s })));
    setRtError('');
    setShowRtModal(true);
  };

  const handleAddStepToRt = () => {
    if (operations.length === 0) return;
    setRtSteps(prev => [
      ...prev,
      { sequence: prev.length + 1, operationId: operations[0].id }
    ]);
  };

  const handleRemoveStepFromRt = (index: number) => {
    setRtSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 })));
  };

  const handleStepOpChange = (index: number, opId: string) => {
    setRtSteps(prev => prev.map((s, i) => i === index ? { ...s, operationId: opId } : s));
  };

  const handleSaveRt = () => {
    if (!rtName.trim()) {
      setRtError('Nama alur produksi wajib diisi.');
      return;
    }
    if (rtSteps.length === 0) {
      setRtError('Alur produksi wajib memiliki minimal 1 tahap operasi.');
      return;
    }

    const payload = {
      name: rtName.trim(),
      steps: rtSteps,
    };

    if (editRtId) {
      updateRouting(editRtId, payload);
      toast.success('Alur Diperbarui', `Alur produksi "${payload.name}" berhasil diperbarui.`);
    } else {
      addRouting(payload);
      toast.success('Alur Ditambahkan', `Alur produksi "${payload.name}" berhasil ditambahkan.`);
    }
    setShowRtModal(false);
  };

  const handleDeleteRt = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Alur Produksi',
      message: `Apakah Anda yakin ingin menghapus alur produksi "${name}"?`,
      confirmText: 'Hapus Alur',
      variant: 'danger',
    });
    if (isOk) {
      const ok = deleteRouting(id);
      if (!ok) {
        toast.error('Gagal Menghapus Alur', 'Alur produksi ini sedang digunakan oleh varian produk aktif.');
      } else {
        toast.success('Alur Dihapus', `Alur produksi "${name}" berhasil dihapus.`);
      }
    }
  };

  // --- Handlers: Operators CRUD ---
  const openAddOperator = () => {
    setEditOperatorId(null);
    setOperatorName('');
    setOperatorRole('');
    setOperatorStatus('ACTIVE');
    setOperatorError('');
    setShowOperatorModal(true);
  };

  const openEditOperator = (op: ProductionOperator) => {
    setEditOperatorId(op.id);
    setOperatorName(op.name);
    setOperatorRole(op.roleSpecialization || '');
    setOperatorStatus(op.status);
    setOperatorError('');
    setShowOperatorModal(true);
  };

  const handleSaveOperator = () => {
    if (!operatorName.trim()) {
      setOperatorError('Nama operator wajib diisi.');
      return;
    }

    const payload = {
      name: operatorName.trim(),
      roleSpecialization: operatorRole.trim() || undefined,
      status: operatorStatus,
    };

    if (editOperatorId) {
      updateOperator(editOperatorId, payload);
      toast.success('Operator Diperbarui', `Data operator "${payload.name}" berhasil diperbarui.`);
    } else {
      addOperator(payload);
      toast.success('Operator Ditambahkan', `Operator "${payload.name}" berhasil ditambahkan.`);
    }
    setShowOperatorModal(false);
  };

  const handleDeleteOperator = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Data Operator',
      message: `Apakah Anda yakin ingin menghapus data operator "${name}"?`,
      confirmText: 'Hapus Operator',
      variant: 'danger',
    });
    if (isOk) {
      deleteOperator(id);
      toast.success('Operator Dihapus', `Data operator "${name}" berhasil dihapus.`);
    }
  };

  // Filtered lists per section
  const filteredOperations = operations.filter(o =>
    o.name.toLowerCase().includes(opSearch.toLowerCase())
  );
  const filteredRoutings = routings.filter(r =>
    r.name.toLowerCase().includes(rtSearch.toLowerCase())
  );
  const filteredOperators = operators.filter(op =>
    op.name.toLowerCase().includes(operatorSearch.toLowerCase()) ||
    (op.roleSpecialization && op.roleSpecialization.toLowerCase().includes(operatorSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        backHref="/production"
        title="Konfigurasi Produksi"
      />

      <div className="space-y-4">

        {/* ========================================================================= */}
        {/* ACCORDION ITEM 1: MASTER OPERASI PRODUKSI */}
        {/* ========================================================================= */}
        <ConfigSection
          title="Master Operasi Produksi"
          description={`Kelola daftar master tahap pekerjaan/operasi produksi dan sistem upah. (${operations.length} Operasi)`}
          icon={Wrench}
          iconWrapperClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
        >
          <div className="pt-4 space-y-4">
            {/* TOP BAR INSIDE ACCORDION BODY: Search Input (Left) + Create Button (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Input
                icon={Search}
                placeholder="Cari master operasi..."
                value={opSearch}
                onChange={e => setOpSearch(e.target.value)}
                inputSize="sm"
                containerClassName="max-w-xs w-full"
              />
              {canManage && (
                <Button size="sm" onClick={openAddOp}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Operasi
                </Button>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Nama Operasi</th>
                    <th className="px-4 py-3">Sistem Upah</th>
                    <th className="px-4 py-3">Nilai Tarif (Biaya)</th>
                    <th className="px-4 py-3">Estimasi Durasi</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                        Belum ada master operasi yang sesuai. Klik &quot;Tambah Operasi&quot; untuk membuat.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {op.name}
                          {op.description && (
                            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{op.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {op.costingMethod === 'fixed' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Borongan (Fixed)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              Durasi (Per Jam)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {op.costingMethod === 'fixed'
                            ? formatCurrency(op.fixedLaborCost || 0)
                            : `${formatCurrency(op.laborCostPerHour || 0)} / Jam`
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {op.durationMinutes ? `${op.durationMinutes} Menit` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditOp(op)}
                                title="Edit Operasi"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteOp(op.id, op.name)}
                                title="Hapus Operasi"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ConfigSection>

        {/* ========================================================================= */}
        {/* ACCORDION ITEM 2: ALUR PRODUKSI (ROUTINGS) */}
        {/* ========================================================================= */}
        <ConfigSection
          title="Template Alur Produksi (Routing)"
          description={`Kelola susunan urutan tahap operasi untuk pembuatan varian produk. (${routings.length} Template Alur)`}
          icon={Layers}
          iconWrapperClass="bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        >
          <div className="pt-4 space-y-4">
            {/* TOP BAR INSIDE ACCORDION BODY: Search Input (Left) + Create Button (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Input
                icon={Search}
                placeholder="Cari alur produksi..."
                value={rtSearch}
                onChange={e => setRtSearch(e.target.value)}
                inputSize="sm"
                containerClassName="max-w-xs w-full"
              />
              {canManage && (
                <Button size="sm" onClick={openAddRt}>
                  <Plus className="h-4 w-4 mr-1" /> Buat Alur Produksi
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoutings.length === 0 ? (
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                  Belum ada template alur produksi. Klik &quot;Buat Alur Produksi&quot; untuk membuat.
                </div>
              ) : (
                filteredRoutings.map(rt => {
                  const totalEstMinutes = rt.steps.reduce((total, step) => {
                    const op = operations.find(o => o.id === step.operationId);
                    return total + (op?.durationMinutes || 0);
                  }, 0);

                  const totalPlannedCost = rt.steps.reduce((total, step) => {
                    const op = operations.find(o => o.id === step.operationId);
                    if (!op) return total;
                    if (op.costingMethod === 'fixed') return total + (op.fixedLaborCost || 0);
                    return total + ((op.durationMinutes || 60) / 60 * (op.laborCostPerHour || 0));
                  }, 0);

                  return (
                    <div key={rt.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{rt.name}</h4>
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditRt(rt)}
                                title="Edit Alur"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRt(rt.id, rt.name)}
                                title="Hapus Alur"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                          <span>{rt.steps.length} Tahap Operasi</span>
                          <span>•</span>
                          <span>Est: {totalEstMinutes} Menit</span>
                        </div>

                        {/* Step list */}
                        <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                          {rt.steps.map(step => {
                            const op = operations.find(o => o.id === step.operationId);
                            return (
                              <div key={step.sequence} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                                    {step.sequence}
                                  </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{op?.name || 'Operasi Dihapus'}</span>
                                </div>
                                <span className="font-mono text-slate-500 shrink-0 text-[11px]">
                                  {op?.costingMethod === 'fixed'
                                    ? formatCurrency(op.fixedLaborCost || 0)
                                    : `${formatCurrency(op?.laborCostPerHour || 0)}/j`
                                  }
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">Estimasi Upah:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">{formatCurrency(totalPlannedCost)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </ConfigSection>

        {/* ========================================================================= */}
        {/* ACCORDION ITEM 3: OPERATOR PRODUKSI */}
        {/* ========================================================================= */}
        <ConfigSection
          title="Daftar Operator Produksi"
          description={`Kelola tenaga kerja operator produksi, spesialisasi keahlian, dan status keaktifan. (${operators.length} Operator)`}
          icon={Users}
          iconWrapperClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        >
          <div className="pt-4 space-y-4">
            {/* TOP BAR INSIDE ACCORDION BODY: Search Input (Left) + Create Button (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Input
                icon={Search}
                placeholder="Cari nama operator atau keahlian..."
                value={operatorSearch}
                onChange={e => setOperatorSearch(e.target.value)}
                inputSize="sm"
                containerClassName="max-w-xs w-full"
              />
              {canManage && (
                <Button size="sm" onClick={openAddOperator}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Operator
                </Button>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Nama Operator</th>
                    <th className="px-4 py-3">Keahlian / Spesialisasi</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Performa KPI</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOperators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                        Belum ada operator terdaftar. Klik &quot;Tambah Operator&quot; untuk menambahkan.
                      </td>
                    </tr>
                  ) : (
                    filteredOperators.map(op => {
                      const completedJobs = workOrders.flatMap(wo => wo.jobCards).filter(jc =>
                        jc.status === 'COMPLETED' && (jc.operatorId === op.id || jc.picName === op.name)
                      );
                      const totalJobs = completedJobs.length;

                      return (
                        <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                              {op.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{op.name}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {op.roleSpecialization || 'Umum'}
                          </td>
                          <td className="px-4 py-3">
                            {op.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <UserCheck className="h-3 w-3" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Non-aktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                            {totalJobs} Pekerjaan Selesai
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManage && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditOperator(op)}
                                  title="Edit Operator"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteOperator(op.id, op.name)}
                                  title="Hapus Operator"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ConfigSection>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD/EDIT OPERASI */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showOpModal}
        onClose={() => setShowOpModal(false)}
        title={editOpId ? 'Edit Master Operasi' : 'Tambah Master Operasi Baru'}
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowOpModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveOp}>Simpan Operasi</Button>
          </>
        }
      >
        <div className="space-y-4">
          {opError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {opError}
            </div>
          )}

          <Input
            label="Nama Operasi"
            required
            value={opName}
            onChange={e => setOpName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Sistem Upah Operasi"
              value={opCostingMethod}
              onChange={e => setOpCostingMethod(e.target.value as 'fixed' | 'hourly')}
              options={[
                { value: 'fixed', label: 'Borongan (Tarif Tetap per Unit)' },
                { value: 'hourly', label: 'Durasi (Tarif per Jam)' },
              ]}
            />

            <Input
              label="Estimasi Durasi (Menit)"
              type="number"
              value={opDuration}
              onChange={e => setOpDuration(e.target.value === '' ? '' : Number(e.target.value))}
              className="font-mono"
            />
          </div>

          {opCostingMethod === 'fixed' ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nominal Upah Borongan <span className="text-red-500 font-bold">*</span>
              </label>
              <CurrencyInput
                value={Number(opFixedLaborCost) || 0}
                onChange={(val) => setOpFixedLaborCost(val)}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tarif Upah Pekerja (Per Jam) <span className="text-red-500 font-bold">*</span>
              </label>
              <CurrencyInput
                value={Number(opLaborCost) || 0}
                onChange={(val) => setOpLaborCost(val)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Keterangan / Instruksi Kerja
            </label>
            <textarea
              rows={2}
              value={opDesc}
              onChange={e => setOpDesc(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors shadow-xs"
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD/EDIT ALUR PRODUKSI (ROUTING) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showRtModal}
        onClose={() => setShowRtModal(false)}
        title={editRtId ? 'Edit Alur Produksi' : 'Buat Template Alur Produksi Baru'}
        size="lg"
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowRtModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveRt}>Simpan Alur Produksi</Button>
          </>
        }
      >
        <div className="space-y-5 pb-28">
          {rtError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {rtError}
            </div>
          )}

          <Input
            label="Nama Template Alur Produksi"
            required
            value={rtName}
            onChange={e => setRtName(e.target.value)}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rangkaian Tahap Operasi <span className="text-red-500 font-bold">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Urutan proses pekerjaan yang harus dilalui dalam alur ini.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddStepToRt}
                disabled={operations.length === 0}
                className="text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Tahap
              </Button>
            </div>

            <div className="space-y-2.5 min-h-[300px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 divide-y divide-slate-200/60 dark:divide-slate-800/80">
              {rtSteps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                    <Layers className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada tahap operasi ditambahkan</p>
                  <p className="text-[11px] text-slate-400 mt-1">Klik tombol &quot;+ Tambah Tahap&quot; di atas untuk memilih master operasi.</p>
                </div>
              ) : (
                rtSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 pt-2.5 first:pt-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                      {step.sequence}
                    </span>
                    <Select
                      value={step.operationId}
                      onChange={e => handleStepOpChange(index, e.target.value)}
                      inputSize="sm"
                      containerClassName="flex-1 min-w-0"
                      options={operations.map(op => ({
                        value: op.id,
                        label: `${op.name} (${op.costingMethod === 'fixed' ? 'Borongan' : 'Durasi'}, ${op.durationMinutes || 0}m)`
                      }))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveStepFromRt(index)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                      title="Hapus Tahap"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD/EDIT OPERATOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showOperatorModal}
        onClose={() => setShowOperatorModal(false)}
        title={editOperatorId ? 'Edit Operator Produksi' : 'Tambah Operator Produksi Baru'}
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowOperatorModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveOperator}>Simpan Data Operator</Button>
          </>
        }
      >
        <div className="space-y-4">
          {operatorError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {operatorError}
            </div>
          )}

          <Input
            label="Nama Operator Pekerja"
            required
            value={operatorName}
            onChange={e => setOperatorName(e.target.value)}
          />

          <Input
            label="Keahlian / Spesialisasi Utama"
            value={operatorRole}
            onChange={e => setOperatorRole(e.target.value)}
          />

          <Select
            label="Status Operator"
            value={operatorStatus}
            onChange={e => setOperatorStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            options={[
              { value: 'ACTIVE', label: 'Aktif (Dapat Ditugaskan)' },
              { value: 'INACTIVE', label: 'Non-aktif' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ProductionConfigPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Konfigurasi Produksi...</div>}>
      <ProductionConfigContent />
    </Suspense>
  );
}
