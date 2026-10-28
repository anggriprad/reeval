'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { vehicleService, Vehicle } from '@/services/vehicle.service';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Truck, Plus, Trash2, Edit2, X } from 'lucide-react';
import type { Armada } from '@/lib/types';

export function ArmadaSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    armadas: appArmadas,
    addArmada,
    updateArmada,
    deleteArmada,
  } = useApp();

  // Lazy expansion state: default closed, fetches only when opened by user
  const [isExpanded, setIsExpanded] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Form states matching original design
  const [editingArmadaId, setEditingArmadaId] = useState<number | null>(null);
  const [armadaForm, setArmadaForm] = useState<{ name?: string; plateNumber?: string }>({});
  const [showAddArmada, setShowAddArmada] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadVehicles = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await vehicleService.getVehicles({ per_page: 100 });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setVehicles(response.data);

        // Keep AppContext armadas in sync for delivery order creation pages
        response.data.forEach((v) => {
          const exists = appArmadas.some((a) => a.id === String(v.id) || a.plateNumber === v.plate_number);
          if (!exists) {
            addArmada({
              name: v.name,
              plateNumber: v.plate_number,
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('Gagal memuat armada dari API, menggunakan data lokal AppContext:', err);
      hasFetchedRef.current = true;
      setVehicles((prev) => {
        if (prev.length > 0) return prev;
        return appArmadas.map((a, index) => ({
          id: parseInt(a.id) || index + 1,
          company_id: 1,
          name: a.name,
          plate_number: a.plateNumber,
          can_delete: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadVehicles();
    }
  };

  const handleSaveArmada = async () => {
    const name = armadaForm.name?.trim();
    const plateNumber = armadaForm.plateNumber?.trim();

    if (!name || !plateNumber) {
      toast.error('Data Tidak Lengkap', 'Nama armada dan plat nomor wajib diisi.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingArmadaId) {
        // Update existing vehicle
        const res = await vehicleService.updateVehicle(editingArmadaId, {
          name,
          plate_number: plateNumber,
        });

        const updated = res.data || {
          ...vehicles.find((v) => v.id === editingArmadaId)!,
          name,
          plate_number: plateNumber,
        };

        setVehicles((prev) => prev.map((v) => (v.id === editingArmadaId ? updated : v)));
        updateArmada(String(editingArmadaId), { name, plateNumber });
        toast.success('Armada Diperbarui', `Armada "${name}" (${plateNumber}) berhasil diperbarui.`);
        setEditingArmadaId(null);
      } else {
        // Create new vehicle
        const res = await vehicleService.createVehicle({
          name,
          plate_number: plateNumber,
        });

        const newVehicle: Vehicle = res.data || {
          id: Date.now(),
          company_id: 1,
          name,
          plate_number: plateNumber,
          can_delete: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setVehicles((prev) => [...prev, newVehicle]);
        addArmada({ name, plateNumber });
        toast.success('Armada Ditambahkan', `Armada "${name}" (${plateNumber}) berhasil ditambahkan.`);
        setShowAddArmada(false);
      }
      setArmadaForm({});
    } catch (err: any) {
      toast.error('Gagal Menyimpan Armada', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArmada = async (armada: Vehicle) => {
    const isOk = await confirm({
      title: 'Hapus Armada',
      message: `Apakah Anda yakin ingin menghapus armada "${armada.name}" (${armada.plate_number})?`,
      confirmText: 'Hapus Armada',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await vehicleService.deleteVehicle(armada.id);
        setVehicles((prev) => prev.filter((v) => v.id !== armada.id));
        deleteArmada(String(armada.id));
        toast.success('Armada Dihapus', `Armada "${armada.name}" berhasil dihapus.`);
      } catch (err: any) {
        toast.error('Gagal Menghapus Armada', err?.message || 'Terjadi kesalahan pada server.');
      }
    }
  };

  const canCreate = can(PERMISSIONS.DELIVERY.VEHICLE_CREATE);
  const canUpdate = can(PERMISSIONS.DELIVERY.VEHICLE_UPDATE);
  const canDelete = can(PERMISSIONS.DELIVERY.VEHICLE_DELETE);

  return (
    <ConfigSection
      title="Daftar Armada"
      description="Kelola kendaraan operasional pengiriman barang."
      icon={Truck}
      iconWrapperClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
      defaultExpanded={false}
      isControlled={true}
      isExpandedControlled={isExpanded}
      onToggle={handleToggle}
    >
      <div className="pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">
            {vehicles.length} Armada Terdaftar
          </span>
          {canCreate && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddArmada(true);
                setEditingArmadaId(null);
                setArmadaForm({});
              }}
              disabled={showAddArmada || !!editingArmadaId}
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Armada
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Kendaraan</th>
                <th className="px-4 py-3 font-semibold">Plat Nomor</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {vehicles.map((armada) => (
                <tr key={armada.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  {editingArmadaId === armada.id ? (
                    <td colSpan={3} className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Nama Armada"
                          value={armadaForm.name || ''}
                          onChange={(e) => setArmadaForm({ ...armadaForm, name: e.target.value })}
                          inputSize="sm"
                          disabled={isSaving}
                        />
                        <Input
                          placeholder="Plat Nomor"
                          value={armadaForm.plateNumber || ''}
                          onChange={(e) => setArmadaForm({ ...armadaForm, plateNumber: e.target.value })}
                          inputSize="sm"
                          disabled={isSaving}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={handleSaveArmada}
                            isLoading={isSaving}
                          >
                            Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingArmadaId(null)}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                        {armada.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {armada.plate_number}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingArmadaId(armada.id);
                                setArmadaForm({
                                  name: armada.name,
                                  plateNumber: armada.plate_number,
                                });
                              }}
                              disabled={showAddArmada}
                              title="Edit Armada"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteArmada(armada)}
                              disabled={showAddArmada || armada.can_delete === false}
                              title={
                                armada.can_delete === false
                                  ? 'Armada sedang digunakan dalam pengiriman'
                                  : 'Hapus Armada'
                              }
                            >
                              <Trash2
                                className={`h-3.5 w-3.5 ${
                                  armada.can_delete === false
                                    ? 'text-slate-300 dark:text-slate-600'
                                    : 'text-red-500'
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {showAddArmada && (
                <tr className="bg-slate-50 dark:bg-slate-800/40">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Input
                        autoFocus
                        placeholder="Nama Armada"
                        value={armadaForm.name || ''}
                        onChange={(e) => setArmadaForm({ ...armadaForm, name: e.target.value })}
                        inputSize="sm"
                        disabled={isSaving}
                      />
                      <Input
                        placeholder="Plat Nomor"
                        value={armadaForm.plateNumber || ''}
                        onChange={(e) => setArmadaForm({ ...armadaForm, plateNumber: e.target.value })}
                        inputSize="sm"
                        disabled={isSaving}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={handleSaveArmada}
                          isLoading={isSaving}
                        >
                          Simpan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddArmada(false)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {vehicles.length === 0 && !showAddArmada && !isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Belum ada armada terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ConfigSection>
  );
}
