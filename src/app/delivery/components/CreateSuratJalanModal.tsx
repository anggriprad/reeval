'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { driverService, DriverOption } from '@/services/driver.service';
import { vehicleService, VehicleOption } from '@/services/vehicle.service';
import type { ChildUnitItem } from './types';

interface CreateSuratJalanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnitsList: ChildUnitItem[];
  onSubmit: (data: {
    driverId?: number;
    driverName: string;
    driverPhone?: string;
    armadaId?: number;
    armadaName?: string;
    vehiclePlate: string;
    scheduledDate: string;
    notes?: string;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function CreateSuratJalanModal({
  isOpen,
  onClose,
  selectedUnitsList,
  onSubmit,
  isSubmitting = false,
}: CreateSuratJalanModalProps) {
  // Live Drivers & Vehicles from backend
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Form state
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [customVehiclePlate, setCustomVehiclePlate] = useState<string>('');
  const [scheduledShipDate, setScheduledShipDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [shipmentNotes, setShipmentNotes] = useState<string>('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Fetch live driver & vehicle options on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingOptions(true);

    Promise.all([
      driverService.getDriverOptions().catch(err => {
        console.error('Failed to fetch driver options:', err);
        return { success: false, data: [] };
      }),
      vehicleService.getVehicleOptions().catch(err => {
        console.error('Failed to fetch vehicle options:', err);
        return { success: false, data: [] };
      }),
    ]).then(([driverRes, vehicleRes]) => {
      if (!isMounted) return;

      const driverList = (driverRes.data || []) as DriverOption[];
      const vehicleList = (vehicleRes.data || []) as VehicleOption[];

      setDrivers(driverList);
      setVehicles(vehicleList);

      if (driverList.length > 0 && !selectedDriverId) {
        setSelectedDriverId(String(driverList[0].id));
      }
      if (vehicleList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(String(vehicleList[0].id));
        setCustomVehiclePlate(vehicleList[0].plate_number || '');
      }

      setIsLoadingOptions(false);
    });

    // Check for complaint replacement needing return note
    const hasTukarGuling = selectedUnitsList.some(u => u.isReplacement);
    if (hasTukarGuling) {
      setShipmentNotes('[TUKAR GULING] Tarik barang komplain/retur fisik dari pelanggan saat serah terima barang baru.');
    } else {
      setShipmentNotes('');
    }

    setExpandedOrderIds({});
    setScheduledShipDate(new Date().toISOString().split('T')[0]);

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const found = vehicles.find(v => String(v.id) === vehicleId);
    if (found) {
      setCustomVehiclePlate(found.plate_number);
    }
  };

  // Distinct orders list for Modal Surat Jalan
  const selectedOrdersList = useMemo(() => {
    const map = new Map<
      string,
      {
        orderId: string;
        orderNumber: string;
        customerName: string;
        customerPhone?: string;
        customerAddress: string;
      }
    >();

    selectedUnitsList.forEach(item => {
      if (!map.has(item.orderId)) {
        map.set(item.orderId, {
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          customerName: item.customerName,
          customerPhone: item.customerPhone,
          customerAddress: item.customerAddress,
        });
      }
    });

    return Array.from(map.values());
  }, [selectedUnitsList]);

  const handleSubmit = async () => {
    if (selectedUnitsList.length === 0) return;

    const driverObj = drivers.find(d => String(d.id) === selectedDriverId);
    const vehicleObj = vehicles.find(v => String(v.id) === selectedVehicleId);
    const vehiclePlate = customVehiclePlate.trim() || vehicleObj?.plate_number || 'B 1234 CD';

    await onSubmit({
      driverId: driverObj?.id ? Number(driverObj.id) : undefined,
      driverName: driverObj?.name || 'Driver Pengirim',
      driverPhone: driverObj?.phone,
      armadaId: vehicleObj?.id ? Number(vehicleObj.id) : undefined,
      armadaName: vehicleObj?.name,
      vehiclePlate,
      scheduledDate: scheduledShipDate,
      notes: shipmentNotes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penerbitan Surat Jalan"
      size="lg"
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              selectedOrdersList.length === 0 ||
              !selectedDriverId ||
              !selectedVehicleId ||
              isSubmitting ||
              isLoadingOptions
            }
          >
            {isSubmitting ? 'Menerbitkan...' : 'Terbitkan Surat Jalan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* List Pesanan & Unit yang Dikirim (Accordion, normal modal scroll) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {selectedOrdersList.map(order => {
            const orderUnits = selectedUnitsList.filter(u => u.orderId === order.orderId);
            const isOrderExpanded = !!expandedOrderIds[order.orderId];

            return (
              <div key={order.orderId} className="transition-colors">
                {/* Accordion Collapse Row */}
                <div
                  onClick={() => toggleOrderExpand(order.orderId)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 select-none transition-colors"
                >
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start sm:items-center">
                    {/* Info Pesanan */}
                    <div className="sm:col-span-4 min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Pesanan
                      </span>
                      <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 block truncate">
                        {order.orderNumber}
                      </span>
                    </div>

                    {/* Pelanggan & Alamat */}
                    <div className="sm:col-span-8 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {order.customerName}
                      </p>
                      <p
                        className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5"
                        title={order.customerAddress}
                      >
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{order.customerAddress || 'Alamat tidak dispesifikasikan'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Unit Count & Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                      {orderUnits.length} Unit
                    </span>

                    <div
                      className={cn(
                        'p-1 text-slate-400 transition-transform duration-200 shrink-0',
                        isOrderExpanded ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Accordion Expand: List Produk */}
                {isOrderExpanded && (
                  <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {orderUnits.map((unit, idx) => (
                        <div
                          key={unit.key || idx}
                          className="py-2 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            {unit.spkNumber && (
                              <span className="font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 border border-slate-300/50 dark:border-slate-600">
                                {unit.spkNumber}
                              </span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-white">
                              {unit.productName}
                            </span>
                            {unit.variantLabel && (
                              <span className="text-slate-500 dark:text-slate-400">
                                • {unit.variantLabel}
                              </span>
                            )}
                            {unit.isReplacement ? (
                              <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                                Penggantian Komplain
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Unit #{unit.unitNumber}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
                            1 Unit
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Form Input Reusable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Pilih driver"
            value={selectedDriverId}
            onChange={e => setSelectedDriverId(e.target.value)}
            options={drivers.map(d => ({
              value: String(d.id),
              label: d.phone ? `${d.name} (${d.phone})` : d.name,
            }))}
            placeholder={isLoadingOptions ? 'Memuat driver...' : 'Pilih Driver'}
          />

          <Select
            label="Pilih armada"
            value={selectedVehicleId}
            onChange={e => handleVehicleChange(e.target.value)}
            options={vehicles.map(v => ({
              value: String(v.id),
              label: `${v.name} (${v.plate_number})`,
            }))}
            placeholder={isLoadingOptions ? 'Memuat armada...' : 'Pilih Armada'}
          />

          <Input
            type="date"
            label="Jadwal pengiriman"
            value={scheduledShipDate}
            onChange={e => setScheduledShipDate(e.target.value)}
          />

          <Input
            label="Catatan"
            value={shipmentNotes}
            onChange={e => setShipmentNotes(e.target.value)}
            placeholder="Catatan"
          />
        </div>
      </div>
    </Modal>
  );
}
