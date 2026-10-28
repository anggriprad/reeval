'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import {
  shippingRateService,
  ConfiguredArea,
  Province,
  Regency,
  District,
} from '@/services/shipping-rate.service';
import { ConfigSection } from './ConfigSection';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { MapPin, Plus, Trash2, Edit2 } from 'lucide-react';
import regionsData from '@/lib/regions.json';

export function ShippingRateSection() {
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    isShippingRateEnabled: appEnabled,
    setIsShippingRateEnabled: setAppEnabled,
    addShippingRate,
    deleteShippingRatesByRegency: deleteAppShippingRates,
  } = useApp();

  const [isEnabled, setIsEnabled] = useState(appEnabled);
  const [isToggling, setIsToggling] = useState(false);
  const [configuredAreas, setConfiguredAreas] = useState<ConfiguredArea[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Region dynamic cache
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Form states matching original design
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingRegencyId, setEditingRegencyId] = useState<string | null>(null);
  const [formProvinceId, setFormProvinceId] = useState('');
  const [formRegencyId, setFormRegencyId] = useState('');
  const [isDraftFlatRate, setIsDraftFlatRate] = useState(false);
  const [draftFlatRate, setDraftFlatRate] = useState<number | ''>('');
  const [draftDistrictRates, setDraftDistrictRates] = useState<Record<string, number | ''>>({});
  const [isSavingArea, setIsSavingArea] = useState(false);

  // 1. Load Overview (Rates & Toggle Status)
  const loadOverview = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingOverview(true);

    try {
      const response = await shippingRateService.getOverview();
      hasFetchedRef.current = true;

      if (response && response.data) {
        const data = response.data;
        setIsEnabled(data.is_shipping_rate_enabled);
        setAppEnabled(data.is_shipping_rate_enabled);

        if (Array.isArray(data.configured_areas)) {
          setConfiguredAreas(data.configured_areas);

          // Sync to AppContext shippingRates for client pages
          data.configured_areas.forEach((area) => {
            deleteAppShippingRates(area.regency_id);
            if (area.is_flat_city_rate) {
              addShippingRate({
                provinceId: area.province_id,
                provinceName: area.province_name,
                regencyId: area.regency_id,
                regencyName: area.regency_name,
                rate: area.flat_rate,
                isFlatCityRate: true,
              });
            } else if (Array.isArray(area.district_rates)) {
              area.district_rates.forEach((d) => {
                addShippingRate({
                  provinceId: area.province_id,
                  provinceName: area.province_name,
                  regencyId: area.regency_id,
                  regencyName: area.regency_name,
                  districtId: d.district_id,
                  districtName: d.district_name,
                  rate: d.rate,
                  isFlatCityRate: false,
                });
              });
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat tarif pengiriman dari API, menggunakan data lokal AppContext:', err);
      hasFetchedRef.current = true;
    } finally {
      setIsLoadingOverview(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // 2. Load Provinces (API with fallback)
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await shippingRateService.getProvinces();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setProvinces(res.data);
          return;
        }
      } catch {}
      // Fallback
      setProvinces(regionsData.provinces);
    };
    fetchProvinces();
  }, []);

  // 3. Load Regencies when Province changes
  useEffect(() => {
    if (!formProvinceId) {
      setRegencies([]);
      return;
    }

    const fetchRegencies = async () => {
      try {
        const res = await shippingRateService.getRegencies(formProvinceId);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setRegencies(res.data);
          return;
        }
      } catch {}
      // Fallback
      const filtered = regionsData.regencies.filter((r) => r.province_id === formProvinceId);
      setRegencies(filtered);
    };
    fetchRegencies();
  }, [formProvinceId]);

  // 4. Load Districts when Regency changes
  useEffect(() => {
    if (!formRegencyId) {
      setDistricts([]);
      return;
    }

    const fetchDistricts = async () => {
      try {
        const res = await shippingRateService.getDistricts(formRegencyId);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setDistricts(res.data);
          return;
        }
      } catch {}
      // Fallback
      const filtered = regionsData.districts.filter((d) => d.regency_id === formRegencyId);
      setDistricts(filtered);
    };
    fetchDistricts();
  }, [formRegencyId]);

  const configuredRegencyIds = useMemo(() => {
    return Array.from(new Set(configuredAreas.map((a) => a.regency_id)));
  }, [configuredAreas]);

  // Handle Toggle Enable/Disable
  const handleToggleEnabled = async (nextState: boolean) => {
    try {
      setIsToggling(true);
      await shippingRateService.toggleShippingRate(nextState);
      setIsEnabled(nextState);
      setAppEnabled(nextState);
      toast.success(
        'Pengaturan Disimpan',
        nextState ? 'Fitur ongkos kirim toko diaktifkan.' : 'Fitur ongkos kirim toko dinonaktifkan.'
      );
    } catch (err: any) {
      toast.error('Gagal Mengubah Status', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleOpenAddArea = () => {
    setEditingRegencyId(null);
    setFormProvinceId('');
    setFormRegencyId('');
    setIsDraftFlatRate(false);
    setDraftFlatRate('');
    setDraftDistrictRates({});
    setShowAreaForm(true);
  };

  const handleOpenEditArea = async (rId: string) => {
    setEditingRegencyId(rId);
    const existingArea = configuredAreas.find((a) => a.regency_id === rId);

    if (existingArea) {
      setFormProvinceId(existingArea.province_id);
      setFormRegencyId(existingArea.regency_id);
      setIsDraftFlatRate(existingArea.is_flat_city_rate);
      setDraftFlatRate(existingArea.is_flat_city_rate ? existingArea.flat_rate : '');

      const distRates: Record<string, number | ''> = {};
      if (Array.isArray(existingArea.district_rates)) {
        existingArea.district_rates.forEach((d) => {
          distRates[d.district_id] = d.rate;
        });
      }
      setDraftDistrictRates(distRates);
    } else {
      // Fallback: fetch details by regency
      try {
        const res = await shippingRateService.getByRegency(rId);
        if (res?.data) {
          const area = res.data;
          setFormProvinceId(area.province_id);
          setFormRegencyId(area.regency_id);
          setIsDraftFlatRate(area.is_flat_city_rate);
          setDraftFlatRate(area.is_flat_city_rate ? area.flat_rate : '');

          const distRates: Record<string, number | ''> = {};
          if (Array.isArray(area.district_rates)) {
            area.district_rates.forEach((d) => {
              distRates[d.district_id] = d.rate;
            });
          }
          setDraftDistrictRates(distRates);
        }
      } catch (err) {
        console.warn('Gagal memuat detail area:', err);
      }
    }

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

  const handleSaveArea = async () => {
    if (!formProvinceId || !formRegencyId) return;

    const province = provinces.find((p) => p.id === formProvinceId);
    const regency = regencies.find((r) => r.id === formRegencyId);
    if (!province || !regency) return;

    const flatRateNum = typeof draftFlatRate === 'number' ? draftFlatRate : 0;
    const districtRatesList = districts
      .filter((d) => typeof draftDistrictRates[d.id] === 'number' && Number(draftDistrictRates[d.id]) > 0)
      .map((d) => ({
        district_id: d.id,
        rate: Number(draftDistrictRates[d.id]),
      }));

    try {
      setIsSavingArea(true);
      await shippingRateService.saveArea({
        province_id: formProvinceId,
        regency_id: formRegencyId,
        is_flat_city_rate: isDraftFlatRate,
        flat_rate: flatRateNum,
        district_rates: districtRatesList,
      });

      // Update local configuredAreas
      const newArea: ConfiguredArea = {
        regency_id: regency.id,
        regency_name: regency.name,
        province_id: province.id,
        province_name: province.name,
        is_flat_city_rate: isDraftFlatRate,
        flat_rate: flatRateNum,
        configured_district_count: isDraftFlatRate ? districts.length : districtRatesList.length,
        total_districts_in_regency: districts.length,
        district_rates: districtRatesList.map((d) => ({
          district_id: d.district_id,
          district_name: districts.find((dist) => dist.id === d.district_id)?.name || d.district_id,
          rate: d.rate,
        })),
      };

      setConfiguredAreas((prev) => [
        ...prev.filter((a) => a.regency_id !== formRegencyId),
        newArea,
      ]);

      // Sync AppContext
      deleteAppShippingRates(formRegencyId);
      if (isDraftFlatRate) {
        addShippingRate({
          provinceId: province.id,
          provinceName: province.name,
          regencyId: regency.id,
          regencyName: regency.name,
          rate: flatRateNum,
          isFlatCityRate: true,
        });
      } else {
        districtRatesList.forEach((d) => {
          addShippingRate({
            provinceId: province.id,
            provinceName: province.name,
            regencyId: regency.id,
            regencyName: regency.name,
            districtId: d.district_id,
            districtName: districts.find((dist) => dist.id === d.district_id)?.name || d.district_id,
            rate: d.rate,
            isFlatCityRate: false,
          });
        });
      }

      toast.success(
        'Pengaturan Disimpan',
        `Tarif pengiriman untuk ${regency.name} berhasil disimpan.`
      );
      handleCancelArea();
    } catch (err: any) {
      toast.error('Gagal Menyimpan Tarif Area', err?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setIsSavingArea(false);
    }
  };

  const handleDeleteArea = async (rId: string) => {
    const area = configuredAreas.find((a) => a.regency_id === rId);
    const areaName = area?.regency_name || rId;

    const isOk = await confirm({
      title: 'Hapus Tarif Area Pengiriman',
      message: `Apakah Anda yakin ingin menghapus pengaturan tarif pengiriman untuk "${areaName}"?`,
      confirmText: 'Hapus Area',
      variant: 'danger',
    });

    if (isOk) {
      try {
        await shippingRateService.deleteByRegency(rId);
        setConfiguredAreas((prev) => prev.filter((a) => a.regency_id !== rId));
        deleteAppShippingRates(rId);
        if (editingRegencyId === rId) {
          handleCancelArea();
        }
        toast.success('Area Dihapus', `Pengaturan tarif untuk ${areaName} berhasil dihapus.`);
      } catch (err: any) {
        toast.error('Gagal Menghapus Area', err?.message || 'Terjadi kesalahan pada server.');
      }
    }
  };

  const canUpdate = can(PERMISSIONS.DELIVERY.UPDATE);

  return (
    <ConfigSection
      title="Atur Ongkos Kirim"
      description="Tarif pengiriman toko flat atau per kecamatan."
      icon={MapPin}
      iconWrapperClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
      isControlled={true}
      isExpandedControlled={isEnabled}
      hideChevron={true}
      headerAction={
        <Toggle
          checked={isEnabled}
          onChange={handleToggleEnabled}
          showStatusBadge
          color="emerald"
          disabled={!canUpdate || isToggling}
        />
      }
    >
      {isEnabled && (
        <div className="pt-3 space-y-4">
          {/* Form Atur / Tambah Area Pengiriman */}
          {showAreaForm && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 dark:border-indigo-900/50 dark:bg-slate-800/40 p-4 space-y-4 shadow-xs">
              {/* Region Dropdowns: Provinsi & Kota/Kabupaten */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Pilih Provinsi"
                  placeholder="-- Pilih Provinsi --"
                  value={formProvinceId}
                  onChange={(e) => {
                    setFormProvinceId(e.target.value);
                    setFormRegencyId('');
                  }}
                  options={provinces.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  disabled={isSavingArea}
                />

                <Select
                  label="Pilih Kota / Kabupaten"
                  placeholder="-- Pilih Kota/Kab. --"
                  value={formRegencyId}
                  onChange={(e) => setFormRegencyId(e.target.value)}
                  disabled={!formProvinceId || isSavingArea}
                  options={regencies.map((r) => {
                    const isAlreadyConfigured =
                      configuredRegencyIds.includes(r.id) && r.id !== editingRegencyId;
                    return {
                      value: r.id,
                      label: `${r.name} ${isAlreadyConfigured ? '(Sudah terdaftar)' : ''}`,
                      disabled: isAlreadyConfigured,
                    };
                  })}
                />
              </div>

              {/* Area Settings Panel (When Regency is chosen) */}
              {formRegencyId && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                  {/* Daftar Kecamatan jika Tarif Tetap Nonaktif */}
                  {!isDraftFlatRate && (
                    <div>
                      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {districts.length} Kecamatan
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Atur ongkos kirim tiap kecamatan
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {districts.map((district) => (
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
                                  setDraftDistrictRates((prev) => ({
                                    ...prev,
                                    [district.id]: val,
                                  }));
                                }}
                                inputSize="sm"
                                disabled={isSavingArea}
                              />
                            </div>
                          </div>
                        ))}
                        {districts.length === 0 && (
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
                          disabled={isSavingArea}
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
                            disabled={isSavingArea}
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
                  disabled={isSavingArea}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveArea}
                  disabled={!formProvinceId || !formRegencyId || isSavingArea || !canUpdate}
                  isLoading={isSavingArea}
                >
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          )}

          {/* CRUD Table List of Configured Areas (Disembunyikan saat form aktif) */}
          {!showAreaForm && (
            <div className="space-y-3">
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
                    {configuredAreas.map((area) => (
                      <tr key={area.regency_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{area.regency_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {area.province_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {area.is_flat_city_rate ? (
                            <span className="text-xs uppercase font-semibold text-blue-700 dark:text-blue-300">
                              Tarif Tetap: Rp {Number(area.flat_rate).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-xs uppercase font-semibold text-amber-700 dark:text-amber-300">
                              Tarif Beragam: {area.configured_district_count} Kecamatan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditArea(area.regency_id)}
                                title="Edit tarif area"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            )}
                            {canUpdate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteArea(area.regency_id)}
                                title="Hapus area"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {configuredAreas.length === 0 && !isLoadingOverview && (
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

              {canUpdate && (
                <Button size="sm" variant="outline" onClick={handleOpenAddArea}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Area Pengiriman
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </ConfigSection>
  );
}
