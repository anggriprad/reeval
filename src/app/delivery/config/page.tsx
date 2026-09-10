'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Truck,
  User,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Armada, Driver } from '@/lib/types';
import regionsData from '@/lib/regions.json';

function ConfigSection({
  title,
  description,
  icon: Icon,
  iconWrapperClass,
  children,
  headerAction,
  defaultExpanded = false,
  isControlled = false,
  isExpandedControlled = false,
  hideChevron = false,
}: {
  title: string;
  description: string;
  icon: any;
  iconWrapperClass: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultExpanded?: boolean;
  isControlled?: boolean;
  isExpandedControlled?: boolean;
  hideChevron?: boolean;
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = isControlled ? isExpandedControlled : internalExpanded;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div
        className={`flex items-center gap-3 p-4 transition-colors ${hideChevron ? '' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70'
          }`}
        onClick={() => {
          if (!hideChevron && !isControlled) {
            setInternalExpanded(!internalExpanded);
          }
        }}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          {!hideChevron && (
            <div className="text-slate-400">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DeliveryConfigPage() {
  const {
    armadas,
    drivers,
    shippingRates,
    isShippingRateEnabled,
    addArmada,
    updateArmada,
    deleteArmada,
    addDriver,
    updateDriver,
    deleteDriver,
    addShippingRate,
    deleteShippingRatesByRegency,
    setIsShippingRateEnabled,
  } = useApp();

  // ----- Armada State -----
  const [editingArmadaId, setEditingArmadaId] = useState<string | null>(null);
  const [armadaForm, setArmadaForm] = useState<Partial<Armada>>({});
  const [showAddArmada, setShowAddArmada] = useState(false);

  // ----- Driver State -----
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState<Partial<Driver>>({});
  const [showAddDriver, setShowAddDriver] = useState(false);

  // ----- Shipping Area Form & CRUD State -----
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingRegencyId, setEditingRegencyId] = useState<string | null>(null);
  const [formProvinceId, setFormProvinceId] = useState('');
  const [formRegencyId, setFormRegencyId] = useState('');
  const [isDraftFlatRate, setIsDraftFlatRate] = useState(false);
  const [draftFlatRate, setDraftFlatRate] = useState<number | ''>('');
  const [draftDistrictRates, setDraftDistrictRates] = useState<Record<string, number | ''>>({});

  // Distinct configured regency IDs from shippingRates
  const configuredRegencyIds = useMemo(() => {
    return Array.from(new Set(shippingRates.map(r => r.regencyId)));
  }, [shippingRates]);

  // Handlers for Armada
  const handleSaveArmada = () => {
    if (!armadaForm.name || !armadaForm.plateNumber) return;
    if (editingArmadaId) {
      updateArmada(editingArmadaId, armadaForm);
      setEditingArmadaId(null);
    } else {
      addArmada({
        name: armadaForm.name,
        plateNumber: armadaForm.plateNumber,
      });
      setShowAddArmada(false);
    }
    setArmadaForm({});
  };

  // Handlers for Driver
  const handleSaveDriver = () => {
    if (!driverForm.name || !driverForm.phone) return;
    if (editingDriverId) {
      updateDriver(editingDriverId, driverForm);
      setEditingDriverId(null);
    } else {
      addDriver({
        name: driverForm.name,
        phone: driverForm.phone,
      });
      setShowAddDriver(false);
    }
    setDriverForm({});
  };

  // Handlers for Shipping Area Form
  const handleOpenAddArea = () => {
    setEditingRegencyId(null);
    setFormProvinceId('');
    setFormRegencyId('');
    setIsDraftFlatRate(false);
    setDraftFlatRate('');
    setDraftDistrictRates({});
    setShowAreaForm(true);
  };

  const handleOpenEditArea = (rId: string) => {
    setEditingRegencyId(rId);
    const reg = regionsData.regencies.find(r => r.id === rId);
    setFormProvinceId(reg?.province_id || '');
    setFormRegencyId(rId);

    const flatObj = shippingRates.find(r => r.regencyId === rId && r.isFlatCityRate);
    if (flatObj) {
      setIsDraftFlatRate(true);
      setDraftFlatRate(flatObj.rate);
    } else {
      setIsDraftFlatRate(false);
      setDraftFlatRate('');
    }

    const distRates: Record<string, number | ''> = {};
    shippingRates.filter(r => r.regencyId === rId && !r.isFlatCityRate).forEach(r => {
      if (r.districtId) {
        distRates[r.districtId] = r.rate;
      }
    });
    setDraftDistrictRates(distRates);

    setShowAreaForm(true);
  };

  const handleCancelArea = () => {
    setShowAreaForm(false);
    setEditingRegencyId(null);
    setFormProvinceId('');
    setFormRegencyId('');
    setDraftFlatRate('');
    setDraftDistrictRates({});
  };

  const handleSaveArea = () => {
    if (!formProvinceId || !formRegencyId) return;
    const province = regionsData.provinces.find(p => p.id === formProvinceId);
    const regency = regionsData.regencies.find(r => r.id === formRegencyId);
    if (!province || !regency) return;

    // Remove previous rates for this regency
    deleteShippingRatesByRegency(formRegencyId);

    if (isDraftFlatRate) {
      const rateNum = typeof draftFlatRate === 'number' ? draftFlatRate : 0;
      addShippingRate({
        provinceId: province.id,
        provinceName: province.name,
        regencyId: regency.id,
        regencyName: regency.name,
        rate: rateNum,
        isFlatCityRate: true,
      });
    } else {
      const districts = regionsData.districts.filter(d => d.regency_id === formRegencyId);
      districts.forEach(d => {
        const rateVal = draftDistrictRates[d.id];
        if (typeof rateVal === 'number' && rateVal > 0) {
          addShippingRate({
            provinceId: province.id,
            provinceName: province.name,
            regencyId: regency.id,
            regencyName: regency.name,
            districtId: d.id,
            districtName: d.name,
            rate: rateVal,
            isFlatCityRate: false,
          });
        }
      });
    }

    // Close form
    setShowAreaForm(false);
    setEditingRegencyId(null);
    setFormProvinceId('');
    setFormRegencyId('');
    setDraftFlatRate('');
    setDraftDistrictRates({});
  };

  const handleDeleteArea = (rId: string) => {
    deleteShippingRatesByRegency(rId);
    if (editingRegencyId === rId) {
      handleCancelArea();
    }
  };

  // Dynamic lists for the active form
  const formRegenciesList = regionsData.regencies.filter(r => r.province_id === formProvinceId);
  const formDistrictsList = regionsData.districts.filter(d => d.regency_id === formRegencyId);
  const currentFormRegency = regionsData.regencies.find(r => r.id === formRegencyId);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <PageHeader
        title="Konfigurasi Pengiriman"
        backHref="/delivery"
      />

      <div className="space-y-4">
        {/* ============================================================== */}
        {/* ARMADA CONFIGURATION */}
        {/* ============================================================== */}
        <ConfigSection
          title="Daftar Armada"
          description="Kelola kendaraan operasional pengiriman barang."
          icon={Truck}
          iconWrapperClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        >
          <div className="pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">{armadas.length} Armada Terdaftar</span>
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
                  {armadas.map(armada => (
                    <tr key={armada.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      {editingArmadaId === armada.id ? (
                        <td colSpan={3} className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40">
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder="Nama Armada"
                              value={armadaForm.name || ''}
                              onChange={e => setArmadaForm({ ...armadaForm, name: e.target.value })}
                              inputSize="sm"
                            />
                            <Input
                              placeholder="Plat Nomor"
                              value={armadaForm.plateNumber || ''}
                              onChange={e => setArmadaForm({ ...armadaForm, plateNumber: e.target.value })}
                              inputSize="sm"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="success" onClick={handleSaveArmada}>
                                Simpan
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingArmadaId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{armada.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{armada.plateNumber}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingArmadaId(armada.id); setArmadaForm(armada); }} disabled={showAddArmada}>
                                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteArmada(armada.id)} disabled={showAddArmada}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
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
                            onChange={e => setArmadaForm({ ...armadaForm, name: e.target.value })}
                            inputSize="sm"
                          />
                          <Input
                            placeholder="Plat Nomor"
                            value={armadaForm.plateNumber || ''}
                            onChange={e => setArmadaForm({ ...armadaForm, plateNumber: e.target.value })}
                            inputSize="sm"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="success" onClick={handleSaveArmada}>
                              Simpan
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowAddArmada(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {armadas.length === 0 && !showAddArmada && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">Belum ada armada terdaftar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ConfigSection>

        {/* ============================================================== */}
        {/* DRIVER CONFIGURATION */}
        {/* ============================================================== */}
        <ConfigSection
          title="Daftar Driver"
          description="Kelola karyawan sopir pengiriman."
          icon={User}
          iconWrapperClass="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
        >
          <div className="pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">{drivers.length} Driver Terdaftar</span>
              <Button
                size="sm"
                onClick={() => {
                  setShowAddDriver(true);
                  setEditingDriverId(null);
                  setDriverForm({});
                }}
                disabled={showAddDriver || !!editingDriverId}
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah Driver
              </Button>
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
                  {drivers.map(driver => (
                    <tr key={driver.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      {editingDriverId === driver.id ? (
                        <td colSpan={3} className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40">
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder="Nama Lengkap"
                              value={driverForm.name || ''}
                              onChange={e => setDriverForm({ ...driverForm, name: e.target.value })}
                              inputSize="sm"
                            />
                            <Input
                              placeholder="No. Telepon / WA"
                              value={driverForm.phone || ''}
                              onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                              inputSize="sm"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="success" onClick={handleSaveDriver}>
                                Simpan
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingDriverId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{driver.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{driver.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingDriverId(driver.id); setDriverForm(driver); }} disabled={showAddDriver}>
                                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteDriver(driver.id)} disabled={showAddDriver}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {showAddDriver && (
                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                      <td colSpan={3} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Input
                            autoFocus
                            placeholder="Nama Lengkap"
                            value={driverForm.name || ''}
                            onChange={e => setDriverForm({ ...driverForm, name: e.target.value })}
                            inputSize="sm"
                          />
                          <Input
                            placeholder="No. Telepon / WA"
                            value={driverForm.phone || ''}
                            onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                            inputSize="sm"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="success" onClick={handleSaveDriver}>
                              Simpan
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowAddDriver(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {drivers.length === 0 && !showAddDriver && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">Belum ada driver terdaftar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ConfigSection>

        {/* ============================================================== */}
        {/* SHIPPING RATE CONFIGURATION */}
        {/* ============================================================== */}
        <ConfigSection
          title="Atur Ongkos Kirim"
          description="Tarif pengiriman toko flat atau per kecamatan."
          icon={MapPin}
          iconWrapperClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          isControlled={true}
          isExpandedControlled={isShippingRateEnabled}
          hideChevron={true}
          headerAction={
            <Toggle
              checked={isShippingRateEnabled}
              onChange={(next) => setIsShippingRateEnabled(next)}
              showStatusBadge
              color="emerald"
            />
          }
        >
          {isShippingRateEnabled && (
            <div className="pt-3 space-y-4">
              {/* Form Atur / Tambah Area Pengiriman */}
              {showAreaForm && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 dark:border-indigo-900/50 dark:bg-slate-800/40 p-4 space-y-4 shadow-xs">
                  {/* Region Dropdowns: Provinsi & Kota/Kabupaten */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pilih Provinsi
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        value={formProvinceId}
                        onChange={e => {
                          setFormProvinceId(e.target.value);
                          setFormRegencyId('');
                        }}
                      >
                        <option value="">-- Pilih Provinsi --</option>
                        {regionsData.provinces.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pilih Kota / Kabupaten
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                        value={formRegencyId}
                        onChange={e => setFormRegencyId(e.target.value)}
                        disabled={!formProvinceId}
                      >
                        <option value="">-- Pilih Kota/Kab. --</option>
                        {formRegenciesList.map(r => {
                          const isAlreadyConfigured = configuredRegencyIds.includes(r.id) && r.id !== editingRegencyId;
                          return (
                            <option
                              key={r.id}
                              value={r.id}
                              disabled={isAlreadyConfigured}
                            >
                              {r.name} {isAlreadyConfigured ? '(Sudah terdaftar)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Area Settings Panel (When Regency is chosen) */}
                  {formRegencyId && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                      {/* Daftar Kecamatan jika Tarif Tetap Nonaktif (Tanpa Header Kolom) */}
                      {!isDraftFlatRate && (
                        <div>
                          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {formDistrictsList.length} Kecamatan
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Atur ongkos kirim tiap kecamatan
                            </span>
                          </div>

                          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                            {formDistrictsList.map(district => (
                              <div
                                key={district.id}
                                className="flex items-center justify-between px-4 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {district.name}
                                </span>
                                <div className="w-40 shrink-0">
                                  <CurrencyInput
                                    placeholder="0"
                                    value={draftDistrictRates[district.id] ?? ''}
                                    onChange={(val) => {
                                      setDraftDistrictRates(prev => ({
                                        ...prev,
                                        [district.id]: val,
                                      }));
                                    }}
                                    inputSize="sm"
                                  />
                                </div>
                              </div>
                            ))}
                            {formDistrictsList.length === 0 && (
                              <div className="px-4 py-6 text-center text-slate-500 text-xs">
                                Tidak ada data kecamatan untuk kota ini.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Tarif Tetap Checkbox Box */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isDraftFlatRate}
                              onChange={(e) => setIsDraftFlatRate(e.target.checked)}
                              className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                            />
                            <span className="text-sm text-slate-900 dark:text-white">
                              Gunakan tarif tetap untuk semua Kecamatan di Kota/Kabupaten ini
                            </span>
                          </label>

                          {isDraftFlatRate && (
                            <div className="w-full sm:w-48 shrink-0 flex items-center gap-2">
                              <CurrencyInput
                                placeholder="0"
                                value={draftFlatRate}
                                onChange={(val) => setDraftFlatRate(val)}
                                inputSize="sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Action Buttons: Simpan & Batal */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelArea}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveArea}
                      disabled={!formProvinceId || !formRegencyId}
                    >
                      Simpan Pengaturan
                    </Button>
                  </div>
                </div>
              )}

              {/* CRUD Table List of Configured Areas (Wajib disembunyikan saat form aktif) */}
              {!showAreaForm && (
                <div className='space-y-3'>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Kota / Kabupaten</th>
                          <th className="px-4 py-3 font-semibold">Provinsi</th>
                          <th className="px-4 py-3 font-semibold">Tipe & Nominal Tarif</th>
                          <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {configuredRegencyIds.map(rId => {
                          const reg = regionsData.regencies.find(r => r.id === rId);
                          const prov = regionsData.provinces.find(p => p.id === reg?.province_id);
                          const flatRate = shippingRates.find(r => r.regencyId === rId && r.isFlatCityRate);
                          const districtCount = shippingRates.filter(r => r.regencyId === rId && !r.isFlatCityRate && r.rate > 0).length;

                          return (
                            <tr key={rId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                  <span>{reg?.name || rId}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                {prov?.name || '-'}
                              </td>
                              <td className="px-4 py-3">
                                {flatRate ? (
                                  <span className='text-xs uppercase font-semibold text-blue-700 dark:text-blue-300'>Tarif Tetap: Rp {flatRate.rate.toLocaleString('id-ID')}</span>
                                ) : (
                                  <span className='text-xs uppercase font-semibold text-amber-700 dark:text-amber-300'>Tarif Beragam: {districtCount} Kecamatan</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditArea(rId)}
                                    title="Edit tarif area"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteArea(rId)}
                                    title="Hapus area"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {configuredRegencyIds.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Belum ada area pengiriman terdaftar.
                              </p>
                              <p className="text-xs text-slate-400 mt-1 mb-3">
                                Klik tombol di bawah untuk mulai mengatur tarif flat atau per kecamatan.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                  </div>
                  <Button
                    size="sm"
                    variant='outline'
                    onClick={handleOpenAddArea}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Tambah Area Pengiriman
                  </Button>
                </div>
              )}
            </div>
          )}
        </ConfigSection>

      </div>
    </div>
  );
}
