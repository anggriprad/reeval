'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import { canManageProduction } from '@/lib/roles';
import type { ProductionOperation, ProductionRouting, ProductionOperator, RoutingStep } from '@/lib/types';
import {
  Wrench,
  Layers,
  Users,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  UserCheck
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useUrlTab(['operations', 'routings', 'operators'] as const, 'operations');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Operation Modal State ---
  const [showOpModal, setShowOpModal] = useState(false);
  const [editOpId, setEditOpId] = useState<string | null>(null);
  const [opName, setOpName] = useState('');
  const [opDuration, setOpDuration] = useState<number | ''>(45);
  const [opCostingMethod, setOpCostingMethod] = useState<'hourly' | 'fixed'>('fixed');
  const [opFixedLaborCost, setOpFixedLaborCost] = useState<number | ''>(35000);
  const [opLaborCost, setOpLaborCost] = useState<number | ''>(25000);
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
    setOpDuration(45);
    setOpCostingMethod('fixed');
    setOpFixedLaborCost(35000);
    setOpLaborCost(25000);
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
    setRtSteps(operations.length > 0 ? [{ sequence: 1, operationId: operations[0].id }] : []);
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

  // Filtered lists
  const filteredOperations = operations.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredRoutings = routings.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredOperators = operators.filter(op =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (op.roleSpecialization && op.roleSpecialization.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/production"
        title="Konfigurasi Produksi"
      >
        <div className="flex items-center gap-2">
          {canManage && activeTab === 'operations' && (
            <Button onClick={openAddOp}>
              <Plus className="h-4 w-4" /> Tambah Operasi
            </Button>
          )}
          {canManage && activeTab === 'routings' && (
            <Button onClick={openAddRt}>
              <Plus className="h-4 w-4" /> Buat Alur Produksi
            </Button>
          )}
          {canManage && activeTab === 'operators' && (
            <Button onClick={openAddOperator}>
              <Plus className="h-4 w-4" /> Tambah Operator
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Standardized Reusable Segmented Control */}
      <SegmentedControl
        value={activeTab}
        onChange={(tab) => {
          setActiveTab(tab as typeof activeTab);
          setSearchTerm('');
        }}
        options={[
          { key: 'operations', label: 'Master Produksi', count: operations.length, icon: Wrench },
          { key: 'routings', label: 'Alur Produksi', count: routings.length, icon: Layers },
          { key: 'operators', label: 'Operator Produksi', count: operators.length, icon: Users },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={`Cari ${activeTab === 'operations' ? 'operasi' : activeTab === 'routings' ? 'alur produksi' : 'operator'}...`}
      />

      {/* ========================================================================= */}
      {/* TAB 1: MASTER PRODUKSI (OPERASI) */}
      {/* ========================================================================= */}
      {activeTab === 'operations' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Nama Operasi</th>
                  <th className="px-5 py-3.5">Sistem Upah</th>
                  <th className="px-5 py-3.5">Nilai Tarif (Biaya)</th>
                  <th className="px-5 py-3.5">Estimasi Durasi</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOperations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Belum ada master operasi. Klik &quot;Tambah Operasi&quot; untuk membuat.
                    </td>
                  </tr>
                ) : (
                  filteredOperations.map(op => (
                    <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        {op.name}
                        {op.description && (
                          <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{op.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {op.costingMethod === 'fixed' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Borongan (Fixed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            Durasi (Per Jam)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {op.costingMethod === 'fixed'
                          ? formatCurrency(op.fixedLaborCost || 0)
                          : `${formatCurrency(op.laborCostPerHour || 0)} / Jam`
                        }
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {op.durationMinutes ? `${op.durationMinutes} Menit` : '-'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditOp(op)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Operasi"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOp(op.id, op.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Hapus Operasi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALUR PRODUKSI (ROUTINGS) */}
      {/* ========================================================================= */}
      {activeTab === 'routings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoutings.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
                <div key={rt.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{rt.name}</h3>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRt(rt)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRt(rt.id, rt.name)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                      <span>{rt.steps.length} Tahap Operasi</span>
                      <span>•</span>
                      <span>Total Est: {totalEstMinutes} Menit</span>
                    </div>

                    {/* Step list */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {rt.steps.map(step => {
                        const op = operations.find(o => o.id === step.operationId);
                        return (
                          <div key={step.sequence} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] dark:bg-indigo-950 dark:text-indigo-300">
                                {step.sequence}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{op?.name || 'Operasi Dihapus'}</span>
                            </div>
                            <span className="font-mono text-slate-500">
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

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Estimasi Upah per Unit:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(totalPlannedCost)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OPERATOR PRODUKSI */}
      {/* ========================================================================= */}
      {activeTab === 'operators' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Nama Operator</th>
                  <th className="px-5 py-3.5">Keahlian / Spesialisasi</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Performa KPI (Tugas Selesai)</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOperators.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Belum ada operator terdaftar. Klik &quot;Tambah Operator&quot; untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  filteredOperators.map(op => {
                    // Calculate KPI summary for this operator across all work orders
                    const completedJobs = workOrders.flatMap(wo => wo.jobCards).filter(jc =>
                      jc.status === 'COMPLETED' && (jc.operatorId === op.id || jc.picName === op.name)
                    );
                    const totalJobs = completedJobs.length;

                    return (
                      <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs dark:bg-indigo-950 dark:text-indigo-300">
                            {op.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{op.name}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {op.roleSpecialization || 'Umum'}
                        </td>
                        <td className="px-5 py-4">
                          {op.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <UserCheck className="h-3 w-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Non-aktif
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {totalJobs} Pekerjaan Selesai
                        </td>
                        <td className="px-5 py-4 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditOperator(op)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Edit Operator"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOperator(op.id, op.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Hapus Operator"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD/EDIT OPERASI */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showOpModal}
        onClose={() => setShowOpModal(false)}
        title={editOpId ? 'Edit Master Operasi' : 'Tambah Master Operasi Baru'}
      >
        <div className="space-y-4">
          {opError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {opError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Operasi <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Contoh: Potong Kayu Rangka, Jahit Jok, QC"
              value={opName}
              onChange={e => setOpName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sistem Upah Operasi</label>
              <select
                value={opCostingMethod}
                onChange={e => setOpCostingMethod(e.target.value as 'fixed' | 'hourly')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="fixed">Borongan (Tarif Tetap per Unit)</option>
                <option value="hourly">Durasi (Tarif per Jam)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estimasi Durasi (Menit)</label>
              <input
                type="number"
                placeholder="45"
                value={opDuration}
                onChange={e => setOpDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>

          {opCostingMethod === 'fixed' ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Upah Borongan <span className="text-red-500">*</span></label>
              <CurrencyInput
                value={Number(opFixedLaborCost) || 0}
                onChange={(val) => setOpFixedLaborCost(val)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tarif Upah Pekerja (Per Jam) <span className="text-red-500">*</span></label>
              <CurrencyInput
                value={Number(opLaborCost) || 0}
                onChange={(val) => setOpLaborCost(val)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Keterangan / Instruksi Kerja</label>
            <textarea
              rows={2}
              placeholder="Instruksi singkat untuk tim produksi..."
              value={opDesc}
              onChange={e => setOpDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setShowOpModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveOp}>Simpan Operasi</Button>
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
      >
        <div className="space-y-4">
          {rtError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {rtError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Template Alur Produksi <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={rtName}
              onChange={e => setRtName(e.target.value)}
              placeholder="Contoh: Standar Pembuatan Kursi Kayu"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rangkaian Tahap Operasi <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={handleAddStepToRt}
                disabled={operations.length === 0}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Tahap
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto p-1">
              {rtSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                    {step.sequence}
                  </span>
                  <select
                    value={step.operationId}
                    onChange={e => handleStepOpChange(index, e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {operations.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.costingMethod === 'fixed' ? 'Borongan' : 'Durasi'}, {op.durationMinutes}m)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveStepFromRt(index)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setShowRtModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveRt}>Simpan Alur Produksi</Button>
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
      >
        <div className="space-y-4">
          {operatorError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {operatorError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Operator Pekerja <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso, Agus Setiawan"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Keahlian / Spesialisasi Utama</label>
            <input
              type="text"
              placeholder="Contoh: Potong Kayu, Jahit Jok, Amplas & Finishing"
              value={operatorRole}
              onChange={e => setOperatorRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status Operator</label>
            <select
              value={operatorStatus}
              onChange={e => setOperatorStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ACTIVE">Aktif (Dapat Ditugaskan)</option>
              <option value="INACTIVE">Non-aktif</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setShowOperatorModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveOperator}>Simpan Data Operator</Button>
          </div>
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
