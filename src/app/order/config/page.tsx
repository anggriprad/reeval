'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp, initialOrderFormConfiguration } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { orderService, UpdateSalesOrderConfigRequest } from '@/services/order.service';
import { PageHeader } from '@/components/ui/PageHeader';
import type { FormContainer } from '@/lib/types';

import { AllOrdersTabSetting } from './components/AllOrdersTabSetting';
import { FormCustomizationSection } from './components/FormCustomizationSection';
import { OrderDeadlineSetting, DeadlineValues } from './components/OrderDeadlineSetting';
import { StrictStockCheckSetting } from './components/StrictStockCheckSetting';
import { ResetConfigButton } from './components/ResetConfigButton';

export default function OrderConfigPage() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    currentUser,
    orderFormConfiguration,
    updateOrderFormConfiguration,
    showAllOrdersTab,
    setShowAllOrdersTab,
    isCustomOrderFormEnabled,
    setIsCustomOrderFormEnabled,
    strictSOStockCheck,
    setStrictSOStockCheck,
  } = useApp();

  const canUpdate = can(PERMISSIONS.SALES.UPDATE) || ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  // Local state for the form builder schema
  const [containers, setContainers] = useState<FormContainer[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Local state for Batas Waktu Pesanan UI feature
  const [isOrderDeadlineEnabled, setIsOrderDeadlineEnabled] = useState(false);
  const [deadlineProcessed, setDeadlineProcessed] = useState<DeadlineValues>({ days: 1, hours: 0, minutes: 0 });
  const [deadlineReady, setDeadlineReady] = useState<DeadlineValues>({ days: 2, hours: 0, minutes: 0 });
  const [deadlineShipped, setDeadlineShipped] = useState<DeadlineValues>({ days: 3, hours: 0, minutes: 0 });

  // Initialize state from backend or fallback to AppContext
  useEffect(() => {
    orderService
      .getOrderConfig()
      .then((res) => {
        if (res.success && res.data) {
          setShowAllOrdersTab(res.data.show_all_orders_tab);
          setIsCustomOrderFormEnabled(res.data.is_custom_form_enabled);
          if (res.data.form_containers && res.data.form_containers.length > 0) {
            setContainers(res.data.form_containers as any);
            updateOrderFormConfiguration(res.data.form_containers as any);
          }
          setIsOrderDeadlineEnabled(Boolean(res.data.is_order_deadline_enabled));
          if (res.data.deadline_processed) setDeadlineProcessed(res.data.deadline_processed);
          if (res.data.deadline_ready) setDeadlineReady(res.data.deadline_ready);
          if (res.data.deadline_shipped) setDeadlineShipped(res.data.deadline_shipped);
          setStrictSOStockCheck(Boolean(res.data.strict_so_stock_check));
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat konfigurasi sales order dari server:', err);
        if (orderFormConfiguration && orderFormConfiguration.length > 0) {
          setContainers(orderFormConfiguration);
        }
      });
  }, [
    setShowAllOrdersTab,
    setIsCustomOrderFormEnabled,
    updateOrderFormConfiguration,
    setStrictSOStockCheck,
  ]);

  // Centralized save function to sync settings with backend
  const saveConfig = useCallback(
    async (overrides?: Partial<UpdateSalesOrderConfigRequest>) => {
      const payload: UpdateSalesOrderConfigRequest = {
        show_all_orders_tab: overrides?.show_all_orders_tab ?? showAllOrdersTab,
        is_custom_form_enabled: overrides?.is_custom_form_enabled ?? isCustomOrderFormEnabled,
        form_containers: (overrides?.form_containers ?? containers) as any,
        is_order_deadline_enabled: overrides?.is_order_deadline_enabled ?? isOrderDeadlineEnabled,
        deadline_processed: overrides?.deadline_processed ?? {
          days: Number(deadlineProcessed.days) || 0,
          hours: Number(deadlineProcessed.hours) || 0,
          minutes: Number(deadlineProcessed.minutes) || 0,
        },
        deadline_ready: overrides?.deadline_ready ?? {
          days: Number(deadlineReady.days) || 0,
          hours: Number(deadlineReady.hours) || 0,
          minutes: Number(deadlineReady.minutes) || 0,
        },
        deadline_shipped: overrides?.deadline_shipped ?? {
          days: Number(deadlineShipped.days) || 0,
          hours: Number(deadlineShipped.hours) || 0,
          minutes: Number(deadlineShipped.minutes) || 0,
        },
        strict_so_stock_check: overrides?.strict_so_stock_check ?? strictSOStockCheck,
      };

      try {
        const res = await orderService.updateOrderConfig(payload);
        if (res.success && res.data) {
          return true;
        }
      } catch (err: any) {
        console.warn('Gagal menyimpan konfigurasi ke backend:', err);
      }
      return false;
    },
    [
      showAllOrdersTab,
      isCustomOrderFormEnabled,
      containers,
      isOrderDeadlineEnabled,
      deadlineProcessed,
      deadlineReady,
      deadlineShipped,
      strictSOStockCheck,
    ]
  );

  const handleSaveFormCustomization = async () => {
    setIsSaving(true);
    updateOrderFormConfiguration(containers);
    setIsCustomOrderFormEnabled(true);

    const saved = await saveConfig({
      is_custom_form_enabled: true,
      form_containers: containers as any,
    });

    setIsSaving(false);
    if (saved) {
      toast.success('Konfigurasi Disimpan', 'Konfigurasi form sales order berhasil disimpan ke server.');
    } else {
      toast.success('Konfigurasi Disimpan', 'Format pesanan custom berhasil diperbarui.');
    }
  };

  const handleReset = async () => {
    const isConfirmed = await confirm({
      title: 'Reset Konfigurasi Form?',
      message:
        'Apakah Anda yakin ingin mengembalikan semua pengaturan formulir pesanan ke standar bawaan sistem? Seluruh pengaturan kustom yang telah dibuat akan terhapus.',
      confirmText: 'Ya, Reset Form',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const res = await orderService.resetOrderConfig();
      if (res.success && res.data) {
        setContainers(res.data.form_containers as any);
        setShowAllOrdersTab(res.data.show_all_orders_tab);
        setIsCustomOrderFormEnabled(res.data.is_custom_form_enabled);
        updateOrderFormConfiguration(res.data.form_containers as any);
        setIsOrderDeadlineEnabled(Boolean(res.data.is_order_deadline_enabled));
        if (res.data.deadline_processed) setDeadlineProcessed(res.data.deadline_processed);
        if (res.data.deadline_ready) setDeadlineReady(res.data.deadline_ready);
        if (res.data.deadline_shipped) setDeadlineShipped(res.data.deadline_shipped);
        setStrictSOStockCheck(Boolean(res.data.strict_so_stock_check));
        toast.info('Konfigurasi Direset', 'Pengaturan berhasil dikembalikan ke standar sistem.');
        return;
      }
    } catch (err: any) {
      console.warn('Backend reset config failed, using local fallback:', err);
    } finally {
      setIsResetting(false);
    }

    setContainers(initialOrderFormConfiguration);
    setIsCustomOrderFormEnabled(false);
    setShowAllOrdersTab(false);
    setIsOrderDeadlineEnabled(false);
    setStrictSOStockCheck(false);
    updateOrderFormConfiguration(initialOrderFormConfiguration);
    toast.info('Konfigurasi Direset', 'Pengaturan dikembalikan ke default system.');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Konfigurasi Sales Order" backHref="/order" />

      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* Item 1: Tampilkan Tab "Semua Pesanan" */}
        <AllOrdersTabSetting
          checked={showAllOrdersTab}
          disabled={!canUpdate}
          onChange={(nextVal) => {
            setShowAllOrdersTab(nextVal);
            saveConfig({ show_all_orders_tab: nextVal });
            toast.success(
              'Konfigurasi Diperbarui',
              `Tab "Semua Pesanan" ${nextVal ? 'ditampilkan' : 'disembunyikan'}.`
            );
          }}
        />

        {/* Item 2: Kustomisasi Form Pesanan */}
        <FormCustomizationSection
          enabled={isCustomOrderFormEnabled}
          disabled={!canUpdate}
          containers={containers}
          onChangeContainers={setContainers}
          onSave={handleSaveFormCustomization}
          isSaving={isSaving}
          onToggle={(nextVal) => {
            setIsCustomOrderFormEnabled(nextVal);
            saveConfig({ is_custom_form_enabled: nextVal });
            if (!nextVal) {
              toast.info('Kustomisasi Form Pesanan Dinonaktifkan');
            } else {
              toast.success('Kustomisasi Form Pesanan Diaktifkan');
            }
          }}
        />

        {/* Item 3: Batas Waktu Pesanan */}
        <OrderDeadlineSetting
          enabled={isOrderDeadlineEnabled}
          disabled={!canUpdate}
          deadlineProcessed={deadlineProcessed}
          onProcessedChange={(val) => {
            setDeadlineProcessed(val);
            saveConfig({
              deadline_processed: {
                days: Number(val.days) || 0,
                hours: Number(val.hours) || 0,
                minutes: Number(val.minutes) || 0,
              },
            });
          }}
          deadlineReady={deadlineReady}
          onReadyChange={(val) => {
            setDeadlineReady(val);
            saveConfig({
              deadline_ready: {
                days: Number(val.days) || 0,
                hours: Number(val.hours) || 0,
                minutes: Number(val.minutes) || 0,
              },
            });
          }}
          deadlineShipped={deadlineShipped}
          onShippedChange={(val) => {
            setDeadlineShipped(val);
            saveConfig({
              deadline_shipped: {
                days: Number(val.days) || 0,
                hours: Number(val.hours) || 0,
                minutes: Number(val.minutes) || 0,
              },
            });
          }}
          onToggle={(nextVal) => {
            setIsOrderDeadlineEnabled(nextVal);
            saveConfig({ is_order_deadline_enabled: nextVal });
            if (!nextVal) {
              toast.info('Pengaturan Batas Waktu Pesanan Dinonaktifkan');
            } else {
              toast.success('Pengaturan Batas Waktu Pesanan Diaktifkan');
            }
          }}
        />

        {/* Item 4: Blokir Proses Pesanan saat stok kurang */}
        <StrictStockCheckSetting
          checked={strictSOStockCheck}
          disabled={!canUpdate}
          onChange={(nextVal) => {
            setStrictSOStockCheck(nextVal);
            saveConfig({ strict_so_stock_check: nextVal });
            toast.success(
              'Konfigurasi Diperbarui',
              nextVal
                ? 'Proses pesanan akan diblokir jika stok kurang.'
                : 'Pesanan dapat diproses secara dinamis.'
            );
          }}
        />
      </div>

      {/* Bottom Footer Action Area */}
      {canUpdate && (
        <ResetConfigButton
          onReset={handleReset}
          isLoading={isResetting}
          disabled={!canUpdate}
        />
      )}
    </div>
  );
}
