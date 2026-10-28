'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { driverService, DriverItem } from '@/services/driver.service';
import { userService, UserOption } from '@/services/user.service';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { User, Plus, Trash2, Edit2, X } from 'lucide-react';

export function DriverSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    drivers: appDrivers,
    addDriver,
    updateDriver,
    deleteDriver,
  } = useApp();

  // Lazy expansion state: default closed, fetches only when opened by user
  const [isExpanded, setIsExpanded] = useState(false);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // User assignment state (only users with is_ready = true)
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoadingUserOptions, setIsLoadingUserOptions] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Edit driver state
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState<string>('');
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadDrivers = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const response = await driverService.getDrivers({ per_page: 100 });
      hasFetchedRef.current = true;

      if (response && Array.isArray(response.data)) {
        setDrivers(response.data);

        // Keep AppContext drivers in sync for delivery order creation pages
        response.data.forEach((d) => {
          const exists = appDrivers.some(
            (ad) => ad.id === String(d.id) || ad.name.toLowerCase() === d.user_name.toLowerCase()
          );
          if (!exists) {
            addDriver({
              name: d.user_name,
              phone: d.user_phone || '-',
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('Gagal memuat driver dari API, menggunakan data lokal AppContext:', err);
      hasFetchedRef.current = true;
      setDrivers((prev) => {
        if (prev.length > 0) return prev;
        return appDrivers.map((ad, index) => ({
          id: parseInt(ad.id) || index + 1,
          user_id: index + 1,
          user_name: ad.name,
          user_email: `${ad.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@reeval.local`,
          user_phone: ad.phone,
          is_ready: true,
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

  const loadReadyUserOptions = async () => {
    try {
      setIsLoadingUserOptions(true);
      const res = await userService.getUserOptions({ is_ready: true });
      if (res?.data && Array.isArray(res.data)) {
        setUserOptions(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat opsi user siap kerja:', err);
    } finally {
      setIsLoadingUserOptions(false);
    }
  };

  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (expanded && !hasFetchedRef.current) {
      loadDrivers();
    }
  };

  const handleOpenAdd = () => {
    setShowAddDriver(true);
    setEditingDriverId(null);
    setSelectedUserId('');
    loadReadyUserOptions();
  };

  // Available users: is_ready = true and not yet assigned as driver in this company
  const availableUsers = useMemo(() => {
    const assignedUserIds = new Set(drivers.map((d) => d.user_id));
    return userOptions.filter((u) => !assignedUserIds.has(u.id));
  }, [userOptions, drivers]);

  const handleAssignDriver = async () => {
    const userIdNum = parseInt(selectedUserId, 10);
    if (!userIdNum) {
      toast.error('Pengguna Belum Dipilih', 'Silakan pilih pengguna siap kerja dari daftar.');
      return;
    }

    const selectedUser = availableUsers.find((u) => u.id === userIdNum);

    try {
      setIsSaving(true);
      const res = await driverService.assignDriver({ user_id: userIdNum });

      const newDriver: DriverItem = res.data || {
        id: Date.now(),
        user_id: userIdNum,
        user_name: selectedUser?.full_name || 'Driver',
        user_email: selectedUser?.email || '',
        user_phone: selectedUser?.phone || '-',
        is_ready: true,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setDrivers((prev) => [...prev, newDriver]);
      addDriver({
        name: newDriver.user_name,
        phone: newDriver.user_phone || '-',
      });
      toast.success(
        'Driver Ditugaskan',
        `Pengguna "${newDriver.user_name}" berhasil ditugaskan sebagai driver pengiriman.`
      );
      setShowAddDriver(false);
      setSelectedUserId('');
    } catch (err: any) {
      toast.error('Gagal Menugaskan Driver', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDriver = async (driver: DriverItem) => {
    const phone = editPhoneValue.trim();
    const name = editNameValue.trim();

    if (!name) {
      toast.error('Nama Lengkap Wajib Diisi', 'Nama driver tidak boleh kosong.');
      return;
    }

    try {
      setIsSaving(true);
      try {
        await userService.updateUser(driver.user_id, {
          full_name: name,
          phone,
        });
      } catch (e) {
        console.warn('Update user profile failed, applying local update:', e);
      }

      const updated: DriverItem = {
        ...driver,
        user_name: name,
        user_phone: phone,
      };

      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)));
      updateDriver(String(driver.id), { name, phone });
      toast.success('Driver Diperbarui', `Data driver "${name}" berhasil diperbarui.`);
      setEditingDriverId(null);
    } catch (err: any) {
      toast.error('Gagal Memperbarui Driver', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDriver = async (driver: DriverItem) => {
    const isOk = await confirm({
      title: 'Hapus Penugasan Driver',
      message: `Apakah Anda yakin ingin melepas penugasan driver "${driver.user_name}"?`,
      confirmText: 'Hapus Penugasan',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await driverService.deleteDriver(driver.id);
        setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
        deleteDriver(String(driver.id));
        toast.success('Penugasan Driver Dilepas', `Driver "${driver.user_name}" berhasil dihapus.`);
      } catch (err: any) {
        toast.error('Gagal Menghapus Driver', err?.message || 'Terjadi kesalahan pada server.');
      }
    }
  };

  const canCreate = can(PERMISSIONS.DELIVERY.DRIVER_CREATE);
  const canUpdate = can(PERMISSIONS.DELIVERY.DRIVER_UPDATE);
  const canDelete = can(PERMISSIONS.DELIVERY.DRIVER_DELETE);

  return (
    <ConfigSection
      title="Daftar Driver"
      description="Kelola karyawan sopir pengiriman."
      icon={User}
      iconWrapperClass="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
      defaultExpanded={false}
      isControlled={true}
      isExpandedControlled={isExpanded}
      onToggle={handleToggle}
    >
      <div className="pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">
            {drivers.length} Driver Terdaftar
          </span>
          {canCreate && (
            <Button
              size="sm"
              onClick={handleOpenAdd}
              disabled={showAddDriver || !!editingDriverId}
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Driver
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                <th className="px-4 py-3 font-semibold">No. Telepon / WA</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  {editingDriverId === driver.id ? (
                    <td colSpan={3} className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Nama Lengkap"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          inputSize="sm"
                          disabled={isSaving}
                        />
                        <Input
                          placeholder="No. Telepon / WA"
                          value={editPhoneValue}
                          onChange={(e) => setEditPhoneValue(e.target.value)}
                          inputSize="sm"
                          disabled={isSaving}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleUpdateDriver(driver)}
                            isLoading={isSaving}
                          >
                            Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDriverId(null)}
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
                        {driver.user_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {driver.user_phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingDriverId(driver.id);
                                setEditNameValue(driver.user_name);
                                setEditPhoneValue(driver.user_phone || '');
                                setShowAddDriver(false);
                              }}
                              disabled={showAddDriver}
                              title="Edit Driver"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDriver(driver)}
                              disabled={showAddDriver || driver.can_delete === false}
                              title={
                                driver.can_delete === false
                                  ? 'Driver sedang dalam penugasan aktif'
                                  : 'Hapus Driver'
                              }
                            >
                              <Trash2
                                className={`h-3.5 w-3.5 ${
                                  driver.can_delete === false
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

              {/* Inline User Assignment Row */}
              {showAddDriver && (
                <tr className="bg-slate-50 dark:bg-slate-800/40">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="flex-1 min-w-[260px]">
                        <Select
                          inputSize="sm"
                          placeholder={
                            isLoadingUserOptions
                              ? 'Memuat pengguna siap kerja...'
                              : availableUsers.length === 0
                              ? 'Tidak ada pengguna siap kerja yang tersedia'
                              : 'Pilih pengguna siap kerja untuk ditugaskan...'
                          }
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          options={availableUsers.map((u) => ({
                            value: String(u.id),
                            label: `${u.full_name} (${u.phone || u.email || 'Tanpa Kontak'})`,
                          }))}
                          disabled={isSaving || isLoadingUserOptions || availableUsers.length === 0}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={handleAssignDriver}
                          isLoading={isSaving}
                          disabled={!selectedUserId || isSaving}
                        >
                          Tugaskan Driver
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddDriver(false)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {drivers.length === 0 && !showAddDriver && !isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Belum ada driver terdaftar.
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
