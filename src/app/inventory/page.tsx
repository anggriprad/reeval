'use client';

import React, { useState, Suspense } from 'react';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDateTime, getStockLevel, getStockLevelColor } from '@/lib/utils';
import { canCreatePO, canManageInventory } from '@/lib/roles';
import type { PurchaseOrderItem, RawMaterial, CompanyAsset, CompanyAssetServiceLog } from '@/lib/types';
import {
  Plus,
  PackageCheck,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Warehouse,
  FileText,
  Edit2,
  Trash2,
  AlertTriangle,
  Wrench,
  History,
} from 'lucide-react';

export default function InventoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

export function InventoryContent() {
  const { toast, confirm } = useToast();
  const {
    materials,
    purchaseOrders,
    stockMovements,
    currentUser,
    categories,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addMaterialCategory,
    deleteMaterialCategory,
    createPO,
    receivePO,
    orderPO,
    rejectPO,
    deletePO,
    assets,
    addAsset,
    updateAsset,
    deleteAsset,
    assetCategories,
    addAssetCategory,
    deleteAssetCategory,
    assetServiceLogs,
    recordAssetService,
    deleteAssetServiceLog,
  } = useApp();


  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [activeTab, setActiveTab] = useUrlTab(['stock', 'po', 'movements', 'assets'] as const, 'stock');

  // Master Material CRUD state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matCategory, setMatCategory] = useState('');
  const [matUnit, setMatUnit] = useState('pcs');
  const [matUnitCost, setMatUnitCost] = useState(0);
  const [matInitialStock, setMatInitialStock] = useState<string>('0');
  const [matMinStock, setMatMinStock] = useState(5);
  const [crudError, setCrudError] = useState('');

  // Master Asset CRUD state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [astCode, setAstCode] = useState('');
  const [astName, setAstName] = useState('');
  const [astCategory, setAstCategory] = useState('');
  const [astPurchaseDate, setAstPurchaseDate] = useState('');
  const [astPurchaseCost, setAstPurchaseCost] = useState(0);
  const [astUsefulLifeYears, setAstUsefulLifeYears] = useState(5);
  const [astAccumulatedServiceCost, setAstAccumulatedServiceCost] = useState(0);
  const [astStatus, setAstStatus] = useState<'AKTIF' | 'MAINTENANCE' | 'RUSAK'>('AKTIF');

  // Service History Log state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServiceAsset, setSelectedServiceAsset] = useState<CompanyAsset | null>(null);
  const [newServiceDate, setNewServiceDate] = useState('');
  const [newServiceCost, setNewServiceCost] = useState(0);
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [serviceError, setServiceError] = useState('');

  // Category CRUD states
  const [showManageCats, setShowManageCats] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [catError, setCatError] = useState('');

  // Asset Category CRUD states
  const [showManageAssetCats, setShowManageAssetCats] = useState(false);
  const [newAssetCatInput, setNewAssetCatInput] = useState('');
  const [assetCatError, setAssetCatError] = useState('');

  // PO form state
  const [showPOModal, setShowPOModal] = useState(false);
  const [poItems, setPOItems] = useState<any[]>([]);
  const [selectedMat, setSelectedMat] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedQty, setSelectedQty] = useState(0);

  const filteredMaterials = materials.filter(m => {
    const matchesFilter = !inventoryFilter || m.category === inventoryFilter;
    const matchesSearch = !searchTerm ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredAssets = assets.filter(a => {
    const matchesFilter = !inventoryFilter || a.category === inventoryFilter || a.status === inventoryFilter;
    const matchesSearch = !searchTerm ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });


  const openAddMaterial = () => {
    setEditMaterialId(null);
    setMatCode('');
    setMatName('');
    setMatCategory(categories[0] || '');
    setMatUnit('pcs');
    setMatUnitCost(0);
    setMatInitialStock('');
    setMatMinStock(5);
    setCrudError('');
    setShowMaterialModal(true);
  };

  const openEditMaterial = (mat: RawMaterial) => {
    setEditMaterialId(mat.id);
    setMatCode(mat.code);
    setMatName(mat.name);
    setMatCategory(mat.category);
    setMatUnit(mat.unit);
    setMatUnitCost(mat.unitCost);
    setMatInitialStock(mat.stock.toString());
    setMatMinStock(mat.minStock);
    setCrudError('');
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = () => {
    if (!matCode.trim() || !matName.trim() || !matUnit.trim()) {
      setCrudError('Kode, nama, dan satuan bahan wajib diisi.');
      return;
    }
    if (!matCategory.trim()) {
      setCrudError('Kategori bahan wajib diisi. Silakan tambah kategori terlebih dahulu.');
      return;
    }

    const payload = {
      code: matCode.trim().toUpperCase(),
      name: matName.trim(),
      category: matCategory,
      unit: matUnit.trim().toLowerCase(),
      unitCost: Number(matUnitCost) || 0,
      stock: Number(matInitialStock) || 0,
      minStock: Number(matMinStock) || 0,
    };

    if (editMaterialId) {
      updateMaterial(editMaterialId, payload);
    } else {
      // Check duplicate code
      const isDuplicate = materials.some(m => m.code === payload.code);
      if (isDuplicate) {
        setCrudError(`Bahan dengan kode "${payload.code}" sudah terdaftar.`);
        return;
      }
      addMaterial(payload);
    }

    setShowMaterialModal(false);
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Bahan Baku',
      message: `Apakah Anda yakin ingin menghapus bahan baku "${name}" dari master katalog?`,
      confirmText: 'Hapus Material',
      variant: 'danger',
    });
    if (isOk) {
      const success = deleteMaterial(id);
      if (!success) {
        toast.error('Gagal Menghapus', 'Bahan baku ini sudah digunakan dalam transaksi SPK atau Purchase Order.');
      } else {
        toast.success('Bahan Baku Dihapus', `Bahan baku "${name}" berhasil dihapus.`);
      }
    }
  };

  const openAddAsset = () => {
    setEditAssetId(null);
    setAstCode('');
    setAstName('');
    setAstCategory(assetCategories[0] || '');
    setAstPurchaseDate(new Date().toISOString().split('T')[0]);
    setAstPurchaseCost(0);
    setAstUsefulLifeYears(5);
    setAstAccumulatedServiceCost(0);
    setAstStatus('AKTIF');
    setCrudError('');
    setShowAssetModal(true);
  };

  const openEditAsset = (ast: CompanyAsset) => {
    setEditAssetId(ast.id);
    setAstCode(ast.code);
    setAstName(ast.name);
    setAstCategory(ast.category);
    setAstPurchaseDate(ast.purchaseDate);
    setAstPurchaseCost(ast.purchaseCost);
    setAstUsefulLifeYears(ast.usefulLifeYears);
    setAstAccumulatedServiceCost(ast.accumulatedServiceCost);
    setAstStatus(ast.status);
    setCrudError('');
    setShowAssetModal(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!astCode.trim() || !astName.trim()) {
      setCrudError('Kode dan Nama Aset wajib diisi.');
      return;
    }
    if (!astCategory.trim()) {
      setCrudError('Kategori aset wajib diisi. Silakan tambah kategori terlebih dahulu.');
      return;
    }
    if (astPurchaseCost <= 0 || astUsefulLifeYears <= 0) {
      setCrudError('Harga perolehan dan umur ekonomis harus lebih besar dari 0.');
      return;
    }

    const payload = {
      code: astCode.trim().toUpperCase(),
      name: astName.trim(),
      category: astCategory,
      purchaseDate: astPurchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(astPurchaseCost) || 0,
      usefulLifeYears: Number(astUsefulLifeYears) || 5,
      status: astStatus,
    };

    if (editAssetId) {
      updateAsset(editAssetId, payload);
      toast.success('Aset Diperbarui', `Data aset "${payload.name}" berhasil diperbarui.`);
    } else {
      // Check duplicate code
      const isDuplicate = assets.some(a => a.code === payload.code);
      if (isDuplicate) {
        setCrudError(`Aset dengan kode "${payload.code}" sudah terdaftar.`);
        return;
      }
      addAsset(payload);
      toast.success('Aset Ditambahkan', `Aset "${payload.name}" berhasil ditambahkan.`);
    }

    setShowAssetModal(false);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'Hapus Aset Perusahaan',
      message: `Apakah Anda yakin ingin menghapus aset "${name}" dari sistem?`,
      confirmText: 'Hapus Aset',
      variant: 'danger',
    });
    if (isOk) {
      deleteAsset(id);
      toast.success('Aset Dihapus', `Aset "${name}" berhasil dihapus.`);
    }
  };

  const openManageServices = (ast: CompanyAsset) => {
    setSelectedServiceAsset(ast);
    setNewServiceDate(new Date().toISOString().split('T')[0]);
    setNewServiceCost(0);
    setNewServiceDescription('');
    setServiceError('');
    setShowServiceModal(true);
  };

  const handleSaveServiceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceAsset) return;
    if (!newServiceDescription.trim() || newServiceCost <= 0) {
      setServiceError('Deskripsi servis wajib diisi dan biaya harus lebih besar dari 0.');
      return;
    }

    recordAssetService({
      assetId: selectedServiceAsset.id,
      assetCode: selectedServiceAsset.code,
      assetName: selectedServiceAsset.name,
      serviceDate: newServiceDate || new Date().toISOString().split('T')[0],
      cost: Number(newServiceCost),
      description: newServiceDescription.trim(),
    });

    // Refresh selectedServiceAsset to show updated accumulated cost in modal header/subtext
    setSelectedServiceAsset({
      ...selectedServiceAsset,
      accumulatedServiceCost: selectedServiceAsset.accumulatedServiceCost + Number(newServiceCost),
    });

    setNewServiceDescription('');
    setNewServiceCost(0);
    setServiceError('');
    toast.success('Catatan Servis Disimpan', 'Catatan pemeliharaan aset berhasil ditambahkan.');
  };

  const handleDeleteServiceLog = async (id: string, cost: number) => {
    if (!selectedServiceAsset) return;
    const isOk = await confirm({
      title: 'Hapus Catatan Servis',
      message: 'Apakah Anda yakin ingin menghapus catatan pemeliharaan ini dari riwayat?',
      confirmText: 'Hapus Catatan',
      variant: 'danger',
    });
    if (isOk) {
      deleteAssetServiceLog(id);
      setSelectedServiceAsset({
        ...selectedServiceAsset,
        accumulatedServiceCost: Math.max(0, selectedServiceAsset.accumulatedServiceCost - cost),
      });
      toast.success('Catatan Dihapus', 'Catatan pemeliharaan berhasil dihapus.');
    }
  };

  const addPOItem = () => {
    const mat = materials.find(m => m.id === selectedMat);
    if (!mat || selectedQty <= 0) return;
    const supplierToUse = selectedSupplier.trim() || 'Supplier Umum';
    setPOItems(prev => [...prev, { materialId: mat.id, materialName: mat.name, qty: selectedQty, unitCost: mat.unitCost, supplier: supplierToUse }]);
    setSelectedMat('');
    setSelectedQty(0);
    setSelectedSupplier('');
  };

  const removePOItem = (idx: number) => {
    setPOItems(prev => prev.filter((_, i) => i !== idx));
  };

  const submitPO = () => {
    if (poItems.length === 0) return;

    // Group items by supplier
    const grouped: Record<string, any[]> = {};
    poItems.forEach(item => {
      const sup = item.supplier || 'Supplier Umum';
      if (!grouped[sup]) {
        grouped[sup] = [];
      }
      grouped[sup].push({
        materialId: item.materialId,
        materialName: item.materialName,
        qty: item.qty,
        unitCost: item.unitCost,
      });
    });

    // Create PO for each supplier group
    Object.entries(grouped).forEach(([supplier, items]) => {
      createPO(supplier, items);
    });

    setPOItems([]);
    setShowPOModal(false);
    toast.success('PO Berhasil Dibuat', 'Purchase Order baru telah terbit.');
  };

  const handleDeletePO = async (id: string, poNumber: string) => {
    const isOk = await confirm({
      title: 'Hapus Purchase Order',
      message: `Apakah Anda yakin ingin menghapus PO ${poNumber}?`,
      confirmText: 'Hapus PO',
      variant: 'danger',
    });
    if (isOk) {
      const success = deletePO(id);
      if (!success) {
        toast.error('Gagal Menghapus PO', 'PO yang sudah diterima atau lunas tidak bisa dihapus.');
      } else {
        toast.success('PO Dihapus', `Purchase Order ${poNumber} berhasil dihapus.`);
      }
    }
  };

  const sortedMovements = [...stockMovements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesFilter = !inventoryFilter || po.status === inventoryFilter;
    const matchesSearch = !searchTerm ||
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.createdBy && po.createdBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      po.items.some(i => i.materialName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const filteredMovements = sortedMovements.filter(mv => {
    const matchesFilter = !inventoryFilter || mv.type === inventoryFilter;
    const matchesSearch = !searchTerm ||
      mv.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mv.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className='space-y-3'>
      <PageHeader
        title="Inventaris & Pengadaan"
      >
        <div className="flex gap-2">
          {canManageInventory(currentUser.role) && activeTab === 'stock' && (
            <Button onClick={openAddMaterial}>
              <Plus className="h-4 w-4" />
              Register Bahan Baku
            </Button>
          )}
          {canManageInventory(currentUser.role) && activeTab === 'assets' && (
            <Button onClick={openAddAsset}>
              <Plus className="h-4 w-4" />
              Register Aset Baru
            </Button>
          )}
          {canCreatePO(currentUser.role) && activeTab === 'po' && (
            <Button onClick={() => {
              if (materials.length === 0) {
                toast.warning('Bahan Baku Kosong', 'Belum ada bahan baku (material) yang terdaftar. Silakan register bahan baku terlebih dahulu di tab Stok Bahan Baku.');
                return;
              }
              setShowPOModal(true);
            }}>
              <Plus className="h-4 w-4" />
              Buat PO Baru
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Reusable Segmented Control */}
      {(() => {
        const activePOsCount = purchaseOrders.filter(p => p.status !== 'RECEIVED' && p.status !== 'REJECTED').length;

        let filterOptions: { value: string; label: string }[] = [];
        let filterPlaceholder = "Filter Atribut";

        if (activeTab === 'stock') {
          filterPlaceholder = "Semua Kategori Material";
          filterOptions = categories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'movements') {
          filterPlaceholder = "Semua Tipe Mutasi";
          filterOptions = [
            { value: 'IN', label: 'Masuk (PO / Restock)' },
            { value: 'OUT', label: 'Keluar (SPK / Konsumsi)' },
          ];
        } else if (activeTab === 'po') {
          filterPlaceholder = "Semua Status PO";
          filterOptions = [
            { value: 'DRAFT', label: 'Draft' },
            { value: 'ORDERED', label: 'Diproses / Dikirim' },
            { value: 'RECEIVED', label: 'Diterima' },
            { value: 'REJECTED', label: 'Ditolak' },
          ];
        } else if (activeTab === 'assets') {
          filterPlaceholder = "Semua Kategori Aset";
          filterOptions = assetCategories.map(c => ({ value: c, label: c }));
        }

        return (
          <SegmentedControl
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as 'stock' | 'po' | 'movements' | 'assets');
              setInventoryFilter('');
            }}
            options={[
              { key: 'stock', label: 'Stok Bahan Baku', icon: Warehouse },
              { key: 'movements', label: 'Mutasi Stok', icon: ArrowDownCircle },
              { key: 'po', label: 'Purchase Orders', count: activePOsCount, icon: FileText },
              { key: 'assets', label: 'Aset & Alat Kerja', icon: Wrench },
            ]}
            filterValue={inventoryFilter}
            onFilterChange={setInventoryFilter}
            filterPlaceholder={filterPlaceholder}
            filterOptions={filterOptions}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Cari bahan baku, PO, mutasi, atau aset..."
          />
        );
      })()}

      {/* Stock Table */}
      {activeTab === 'stock' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                  <th className="pb-3 pr-3 text-left font-medium text-slate-500">Kode</th>
                  <th className="pb-3 pr-3 text-left font-medium text-slate-500">Nama Bahan</th>
                  <th className="pb-3 pr-3 text-left font-medium text-slate-500">Kategori</th>
                  <th className="pb-3 pr-3 text-right font-medium text-slate-500">Stok</th>
                  <th className="pb-3 pr-3 text-left font-medium text-slate-500">Satuan</th>
                  <th className="pb-3 pr-3 text-right font-medium text-slate-500">HPP Satuan</th>
                  <th className="pb-3 pr-3 text-right font-medium text-slate-500">Total Nilai</th>
                  <th className="pb-3 pr-3 text-center font-medium text-slate-500">Batas Min</th>
                  <th className="pb-3 pr-3 text-center font-medium text-slate-500">Status</th>
                  {canManageInventory(currentUser.role) && (
                    <th className="pb-3 text-center font-medium text-slate-500">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map(mat => {
                  const level = getStockLevel(mat.stock, mat.minStock);
                  return (
                    <tr key={mat.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{mat.code}</td>
                      <td className="py-3.5 pr-3 font-medium text-slate-900 dark:text-white">{mat.name}</td>
                      <td className="py-3.5 pr-3">
                        <Badge>{mat.category}</Badge>
                      </td>
                      <td className="py-3.5 pr-3 text-right font-semibold text-slate-900 dark:text-white">{mat.stock}</td>
                      <td className="py-3.5 pr-3 text-slate-500 dark:text-slate-400 text-xs">{mat.unit}</td>
                      <td className="py-3.5 pr-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(mat.unitCost)}</td>
                      <td className="py-3.5 pr-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(mat.stock * mat.unitCost)}</td>
                      <td className="py-3.5 pr-3 text-center text-slate-500">{mat.minStock}</td>
                      <td className="py-3.5 pr-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStockLevelColor(level)}`}>
                          {level}
                        </span>
                      </td>
                      {canManageInventory(currentUser.role) && (
                        <td className="py-3.5 text-center">
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditMaterial(mat)} title="Edit Master">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <button
                              onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-950/20"
                              title="Hapus Bahan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Purchase Orders */}
      {activeTab === 'po' && (
        <Card>
          {filteredPOs.length === 0 ? (
            <EmptyState title="Belum ada Purchase Order" description={searchTerm ? "Tidak ada Purchase Order yang cocok dengan pencarian." : "Buat PO baru untuk memesan bahan baku ke supplier"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">No. PO</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Dibuat Oleh</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Supplier</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Item Bahan</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Total</th>
                    <th className="pb-3 pr-3 text-center font-medium text-slate-500">Status</th>
                    <th className="pb-3 text-center font-medium text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredPOs].reverse().map(po => (
                    <tr key={po.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                      <td className="py-3.5 pr-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{po.poNumber}</td>
                      <td className="py-3.5 pr-3 text-xs text-slate-600 dark:text-slate-400">
                        {po.createdBy || 'Gudang'}
                      </td>
                      <td className="py-3.5 pr-3 text-slate-800 dark:text-slate-200">{po.supplier}</td>
                      <td className="py-3.5 pr-3">
                        <div className="space-y-0.5">
                          {po.items.map((item, idx) => (
                            <p key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                              {item.materialName} ({item.qty} unit)
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(po.totalAmount)}</td>
                      <td className="py-3.5 pr-3 text-center">
                        <Badge variant={po.status === 'RECEIVED' ? 'success' : po.status === 'ORDERED' ? 'info' : po.status === 'REJECTED' ? 'danger' : 'warning'}>
                          {po.status === 'RECEIVED' ? 'Diterima' : po.status === 'ORDERED' ? 'Dipesan' : po.status === 'REJECTED' ? 'Ditolak' : 'Dibuat'}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {po.status === 'DRAFT' && canManageInventory(currentUser.role) && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => orderPO(po.id)}>
                                Pesan Barang
                              </Button>
                              <Button size="sm" variant="danger" onClick={async () => {
                                const isOk = await confirm({
                                  title: 'Tolak Purchase Order',
                                  message: `Apakah Anda yakin ingin menolak PO ${po.poNumber}?`,
                                  confirmText: 'Tolak PO',
                                  variant: 'danger',
                                });
                                if (isOk) {
                                  rejectPO(po.id);
                                  toast.success('PO Ditolak', `Purchase Order ${po.poNumber} telah ditolak.`);
                                }
                              }}>
                                Tolak PO
                              </Button>
                            </>
                          )}
                          {po.status === 'ORDERED' && canManageInventory(currentUser.role) && (
                            <Button size="sm" variant="success" onClick={() => receivePO(po.id)}>
                              <PackageCheck className="h-3.5 w-3.5" />
                              Terima Barang
                            </Button>
                          )}
                          {po.status === 'DRAFT' && currentUser.name === po.createdBy && (
                            <button
                              onClick={() => handleDeletePO(po.id, po.poNumber)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-950/20"
                              title="Hapus PO"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {po.status === 'RECEIVED' && (
                            <span className="text-xs text-slate-400">✓ {po.receivedAt ? formatDateTime(po.receivedAt) : ''}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Stock Movements */}
      {activeTab === 'movements' && (
        <Card>
          {filteredMovements.length === 0 ? (
            <EmptyState title="Belum ada mutasi stok" description={searchTerm ? "Tidak ada mutasi stok yang cocok dengan pencarian." : "Mutasi stok otomatis dicatat saat menerima PO atau pemotongan bahan SPK"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Waktu</th>
                    <th className="pb-3 pr-3 text-center font-medium text-slate-500">Jenis</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Material</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Jumlah</th>
                    <th className="pb-3 text-left font-medium text-slate-500">Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map(mv => (
                    <tr key={mv.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                      <td className="py-3 pr-3 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(mv.date)}</td>
                      <td className="py-3 pr-3 text-center">
                        {mv.type === 'IN' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <ArrowDownCircle className="h-3.5 w-3.5" /> MASUK (PO)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                            <ArrowUpCircle className="h-3.5 w-3.5" /> KELUAR (SPK)
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-slate-800 dark:text-slate-200">{mv.materialName}</td>
                      <td className="py-3 pr-3 text-right font-semibold text-slate-900 dark:text-white">{mv.qty}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{mv.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Assets Table */}
      {activeTab === 'assets' && (
        <Card>
          {filteredAssets.length === 0 ? (
            <EmptyState title="Belum ada aset terdaftar" description="Register aset & alat kerja untuk mencatat biaya penyusutan dan servis" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Kode</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Nama Aset / Alat</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Kategori</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Tgl Perolehan</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Harga Perolehan</th>
                    <th className="pb-3 pr-3 text-center font-medium text-slate-500">Umur Ekonomis</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Penyusutan / Bln</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Biaya Servis</th>
                    <th className="pb-3 pr-3 text-center font-medium text-slate-500">Status</th>
                    {canManageInventory(currentUser.role) && (
                      <th className="pb-3 text-center font-medium text-slate-500">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(ast => {
                    return (
                      <tr key={ast.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pr-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{ast.code}</td>
                        <td className="py-3.5 pr-3 font-medium text-slate-900 dark:text-white">{ast.name}</td>
                        <td className="py-3.5 pr-3">
                          <Badge variant="info">{ast.category}</Badge>
                        </td>
                        <td className="py-3.5 pr-3 text-slate-600 dark:text-slate-400 text-xs">{ast.purchaseDate}</td>
                        <td className="py-3.5 pr-3 text-right text-slate-950 dark:text-white font-medium">{formatCurrency(ast.purchaseCost)}</td>
                        <td className="py-3.5 pr-3 text-center text-slate-600 dark:text-slate-400">{ast.usefulLifeYears} Tahun</td>
                        <td className="py-3.5 pr-3 text-right font-semibold text-red-650 dark:text-red-400">{formatCurrency(ast.monthlyDepreciation)}</td>
                        <td className="py-3.5 pr-3 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(ast.accumulatedServiceCost)}</td>
                        <td className="py-3.5 pr-3 text-center">
                          <Badge variant={ast.status === 'AKTIF' ? 'success' : ast.status === 'MAINTENANCE' ? 'warning' : 'danger'}>
                            {ast.status}
                          </Badge>
                        </td>
                        {canManageInventory(currentUser.role) && (
                          <td className="py-3.5 text-center">
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditAsset(ast)} title="Edit Aset">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openManageServices(ast)} title="Kelola Servis" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900">
                                <History className="h-3.5 w-3.5" />
                              </Button>
                              <button
                                onClick={() => handleDeleteAsset(ast.id, ast.name)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-950/20"
                                title="Hapus Aset"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Master Material CRUD (Add / Edit) */}
      <Modal isOpen={showMaterialModal} onClose={() => setShowMaterialModal(false)} title={editMaterialId ? 'Edit Bahan Baku' : 'Register Bahan Baku Baru'} size="md">
        <div className="space-y-4">
          {crudError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{crudError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Kode Bahan *</label>
              <input
                type="text"
                value={matCode}
                onChange={e => setMatCode(e.target.value)}
                placeholder="Misal: MAT-KAYU-JATI"
                disabled={!!editMaterialId}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori *</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowManageCats(!showManageCats);
                    setNewCatInput('');
                    setCatError('');
                  }}
                  className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
                >
                  {showManageCats ? 'Selesai' : '➕ Kelola Kategori'}
                </button>
              </div>
              <select
                value={matCategory}
                onChange={e => setMatCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inline category manager */}
          {showManageCats && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kelola Kategori Bahan</span>
                {catError && <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">{catError}</span>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kategori baru..."
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const trimmed = newCatInput.trim();
                    if (!trimmed) return;
                    addMaterialCategory(trimmed);
                    setMatCategory(trimmed);
                    setNewCatInput('');
                    setCatError('');
                  }}
                >
                  Tambah
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pt-1">
                {categories.map(cat => (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const deleted = deleteMaterialCategory(cat);
                        if (!deleted) {
                          setCatError(`"${cat}" sedang digunakan bahan baku.`);
                        } else {
                          setCatError('');
                          if (matCategory === cat && categories.length > 0) {
                            setMatCategory(categories.find(c => c !== cat) || '');
                          }
                        }
                      }}
                      className="text-red-450 hover:text-red-650 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Bahan Baku *</label>
            <input
              type="text"
              value={matName}
              onChange={e => setMatName(e.target.value)}
              placeholder="Contoh: Kayu Jati TPK Kering"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Satuan *</label>
              <input
                type="text"
                value={matUnit}
                onChange={e => setMatUnit(e.target.value)}
                placeholder="Misal: m³, lembar, meter, pcs"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">HPP Satuan (Rp) *</label>
              <input
                type="number"
                value={matUnitCost || ''}
                onChange={e => setMatUnitCost(Number(e.target.value))}
                placeholder="Biaya per satuan"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Stok Awal</label>
              <input
                type="number"
                step="any"
                value={matInitialStock}
                onChange={e => setMatInitialStock(e.target.value)}
                disabled={!!editMaterialId}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Batas Stok Minimum *</label>
              <input
                type="number"
                value={matMinStock || ''}
                onChange={e => setMatMinStock(Number(e.target.value))}
                placeholder="Batas minimal sebelum restock"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowMaterialModal(false)}>Batal</Button>
            <Button onClick={handleSaveMaterial}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Master Asset CRUD (Add / Edit) */}
      <Modal isOpen={showAssetModal} onClose={() => setShowAssetModal(false)} title={editAssetId ? 'Edit Aset & Alat Kerja' : 'Register Aset Baru'} size="md">
        <form onSubmit={handleSaveAsset} className="space-y-4">
          {crudError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{crudError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Kode Aset *</label>
              <input
                type="text"
                value={astCode}
                onChange={e => setAstCode(e.target.value)}
                placeholder="Misal: AST-MSN-001"
                disabled={!!editAssetId}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori *</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowManageAssetCats(!showManageAssetCats);
                    setNewAssetCatInput('');
                    setAssetCatError('');
                  }}
                  className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
                >
                  {showManageAssetCats ? 'Selesai' : '➕ Kelola Kategori'}
                </button>
              </div>
              <select
                value={astCategory}
                onChange={e => setAstCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {assetCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inline Asset Category manager */}
          {showManageAssetCats && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kelola Kategori Aset</span>
                {assetCatError && <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">{assetCatError}</span>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kategori baru..."
                  value={newAssetCatInput}
                  onChange={e => setNewAssetCatInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const trimmed = newAssetCatInput.trim();
                    if (!trimmed) return;
                    addAssetCategory(trimmed);
                    setAstCategory(trimmed);
                    setNewAssetCatInput('');
                    setAssetCatError('');
                  }}
                >
                  Tambah
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pt-1">
                {assetCategories.map(cat => (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const deleted = deleteAssetCategory(cat);
                        if (!deleted) {
                          setAssetCatError(`"${cat}" sedang digunakan aset.`);
                        } else {
                          setAssetCatError('');
                          if (astCategory === cat && assetCategories.length > 0) {
                            setAstCategory(assetCategories.find(c => c !== cat) || '');
                          }
                        }
                      }}
                      className="text-red-450 hover:text-red-650 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Aset / Alat Kerja *</label>
            <input
              type="text"
              value={astName}
              onChange={e => setAstName(e.target.value)}
              placeholder="Contoh: Mesin Jahit Singer"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal Perolehan *</label>
              <input
                type="date"
                value={astPurchaseDate}
                onChange={e => setAstPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Status *</label>
              <select
                value={astStatus}
                onChange={e => setAstStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="AKTIF">AKTIF</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="RUSAK">RUSAK</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Harga Perolehan (Rp) *</label>
              <input
                type="number"
                value={astPurchaseCost || ''}
                onChange={e => setAstPurchaseCost(Number(e.target.value))}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Umur (Thn) *</label>
              <input
                type="number"
                value={astUsefulLifeYears || ''}
                onChange={e => setAstUsefulLifeYears(Number(e.target.value))}
                placeholder="5"
                min="1"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {editAssetId && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Total Biaya Servis (Rp)</label>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 font-semibold">
                {formatCurrency(astAccumulatedServiceCost)}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Nilai dihitung otomatis dari Riwayat Servis aset.</p>
            </div>
          )}

          {/* Auto calculation info display */}
          {astPurchaseCost > 0 && astUsefulLifeYears > 0 && (
            <div className="rounded-lg bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400">
              <span className="font-semibold">Perkiraan Beban Overhead:</span> Penyusutan bulanan untuk aset ini adalah <strong className="font-bold">{formatCurrency(astPurchaseCost / (astUsefulLifeYears * 12))}</strong> per bulan.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setShowAssetModal(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>


      {/* Modal: Create PO */}
      <Modal isOpen={showPOModal} onClose={() => setShowPOModal(false)} title="Buat Purchase Order Baru" size="lg">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Pilih Bahan Baku & Supplier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={selectedMat}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedMat(val);
                  setSelectedSupplier('');
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Pilih bahan...</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.unitCost)}/{m.unit})</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Nama Supplier"
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <input
                type="number"
                value={selectedQty || ''}
                onChange={e => setSelectedQty(Number(e.target.value))}
                placeholder="Qty"
                min="1"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex justify-end">
              <Button size="md" variant="secondary" onClick={addPOItem} disabled={!selectedMat || selectedQty <= 0}>
                Tambah ke Daftar PO
              </Button>
            </div>
          </div>

          {poItems.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                    <th className="p-3 text-left font-medium text-slate-500">Bahan</th>
                    <th className="p-3 text-left font-medium text-slate-500">Supplier</th>
                    <th className="p-3 text-right font-medium text-slate-500">Qty</th>
                    <th className="p-3 text-right font-medium text-slate-500">Harga</th>
                    <th className="p-3 text-right font-medium text-slate-500">Subtotal</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((item: any, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                      <td className="p-3 text-slate-800 dark:text-slate-200">{item.materialName}</td>
                      <td className="p-3 text-slate-650 dark:text-slate-400 text-xs font-semibold">{item.supplier}</td>
                      <td className="p-3 text-right font-semibold">{item.qty}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(item.qty * item.unitCost)}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => removePOItem(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={4} className="p-3 text-right font-semibold text-slate-950 dark:text-white">Total:</td>
                    <td className="p-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(poItems.reduce((s, i) => s + i.qty * i.unitCost, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowPOModal(false)}>Batal</Button>
            <Button onClick={submitPO} disabled={poItems.length === 0}>
              <Plus className="h-4 w-4" />
              Kirim PO
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Service History */}
      <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title={`Riwayat Pemeliharaan & Servis: ${selectedServiceAsset?.name || ''}`} size="lg">
        <div className="space-y-4">
          {/* Header info */}
          <div className="flex flex-wrap gap-4 justify-between bg-slate-50 p-3 rounded-lg dark:bg-slate-800/40 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Kode Aset: </span>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">{selectedServiceAsset?.code}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Kategori: </span>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">{selectedServiceAsset?.category}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Biaya Servis: </span>
              <strong className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(selectedServiceAsset?.accumulatedServiceCost || 0)}</strong>
            </div>
          </div>

          {/* Form to add a new service log */}
          {canManageInventory(currentUser.role) && (
            <form onSubmit={handleSaveServiceLog} className="border border-slate-200 p-3.5 rounded-lg dark:border-slate-700 bg-white dark:bg-slate-900/50">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">Catat Pemeliharaan / Perbaikan Baru</h3>
              {serviceError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-400 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{serviceError}</span>
                </div>
              )}
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Tanggal Servis *</label>
                  <input
                    type="date"
                    value={newServiceDate}
                    onChange={e => setNewServiceDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Deskripsi Pemeliharaan *</label>
                  <input
                    type="text"
                    value={newServiceDescription}
                    onChange={e => setNewServiceDescription(e.target.value)}
                    placeholder="Misal: Ganti oli transmisi & filter"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Biaya (Rp) *</label>
                  <input
                    type="number"
                    value={newServiceCost || ''}
                    onChange={e => setNewServiceCost(Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="submit" size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Simpan Catatan
                </Button>
              </div>
            </form>
          )}

          {/* List of service logs */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-left font-medium">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Deskripsi Pemeliharaan</th>
                  <th className="p-3 text-right">Biaya Servis</th>
                  {canManageInventory(currentUser.role) && <th className="p-3 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {assetServiceLogs.filter(l => l.assetId === selectedServiceAsset?.id).length === 0 ? (
                  <tr>
                    <td colSpan={canManageInventory(currentUser.role) ? 4 : 3} className="p-4 text-center text-slate-500 dark:text-slate-400">Belum ada riwayat servis tercatat untuk aset ini.</td>
                  </tr>
                ) : (
                  assetServiceLogs
                    .filter(l => l.assetId === selectedServiceAsset?.id)
                    .map(log => (
                      <tr key={log.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{log.serviceDate}</td>
                        <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{log.description}</td>
                        <td className="p-3 text-right font-bold text-slate-950 dark:text-white">{formatCurrency(log.cost)}</td>
                        {canManageInventory(currentUser.role) && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteServiceLog(log.id, log.cost)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowServiceModal(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
