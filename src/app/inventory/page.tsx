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
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Table } from '@/components/ui/Table';
import { formatCurrency, formatDateTime, getStockLevel, getStockLevelColor, getStockLevelTextColor, calculateSubAssemblyCost } from '@/lib/utils';
import { canCreatePO, canManageInventory } from '@/lib/roles';
import type { PurchaseOrderItem, RawMaterial, CompanyAsset, CompanyAssetServiceLog, PurchaseOrder, BOMItem } from '@/lib/types';
import Link from 'next/link';
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
  Settings,
  Eye,
  Info,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  Send,
  Truck,
  CheckCircle2,
  User,
  ChevronRight,
  Check,
  X,
  Box,
  Layers,
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
    createDirectPurchase,
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
    bankAccounts,
    routings = [],
    operations = [],
  } = useApp();


  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [activeTab, setActiveTab] = useUrlTab(['stock', 'finished', 'po', 'movements', 'assets'] as const, 'stock');

  // Master Material / Barang Jadi CRUD state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matCategory, setMatCategory] = useState('');
  const [matUnit, setMatUnit] = useState('pcs');
  const [matUnitCost, setMatUnitCost] = useState(0);
  const [matInitialStock, setMatInitialStock] = useState<string>('0');
  const [matMinStock, setMatMinStock] = useState(5);
  const [matIsSubAssembly, setMatIsSubAssembly] = useState(false);
  const [matChildBom, setMatChildBom] = useState<BOMItem[]>([]);
  const [matRoutingId, setMatRoutingId] = useState('');
  const [childMatId, setChildMatId] = useState('');
  const [childMatQty, setChildMatQty] = useState<string>('');
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

  // Pengadaan (PO & Pembelian Langsung) form state
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedProcurementDetail, setSelectedProcurementDetail] = useState<PurchaseOrder | null>(null);
  const [purchaseType, setPurchaseType] = useState<'PO' | 'DIRECT'>('PO');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [additionalCost, setAdditionalCost] = useState(0);
  const [procurementError, setProcurementError] = useState('');
  const [poItems, setPOItems] = useState<any[]>([]);
  const [selectedMat, setSelectedMat] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedQty, setSelectedQty] = useState(0);
  const [showAddItemRow, setShowAddItemRow] = useState(false);

  // Cancellation PO modal state
  const [showCancelPOModal, setShowCancelPOModal] = useState(false);
  const [cancelPOReason, setCancelPOReason] = useState('');
  const [cancelPOError, setCancelPOError] = useState('');

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
    setMatIsSubAssembly(false);
    setMatChildBom([]);
    setMatRoutingId(routings[0]?.id || '');
    setChildMatId('');
    setChildMatQty('');
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
    setMatIsSubAssembly(!!mat.isSubAssembly);
    const initialChild = mat.childBom ? [...mat.childBom] : [];
    setMatChildBom(initialChild);
    const initialRtId = mat.routingId || routings[0]?.id || '';
    setMatRoutingId(initialRtId);
    setChildMatId('');
    setChildMatQty('');
    if (mat.isSubAssembly) {
      setMatUnitCost(calculateSubAssemblyCost(initialChild, materials, initialRtId, routings, operations));
    }
    setCrudError('');
    setShowMaterialModal(true);
  };

  const handleAddChildBomItem = () => {
    if (!childMatId) return;
    const parsedQty = parseFloat(childMatQty.replace(',', '.'));
    if (isNaN(parsedQty) || parsedQty <= 0) return;
    const existingIndex = matChildBom.findIndex(item => item.materialId === childMatId);
    let updated: BOMItem[];
    if (existingIndex !== -1) {
      updated = [...matChildBom];
      updated[existingIndex].qty += parsedQty;
    } else {
      updated = [...matChildBom, { materialId: childMatId, qty: parsedQty }];
    }
    setMatChildBom(updated);
    setChildMatId('');
    setChildMatQty('');
    setMatUnitCost(calculateSubAssemblyCost(updated, materials, matRoutingId, routings, operations));
  };

  const handleRemoveChildBomItem = (materialId: string) => {
    const updated = matChildBom.filter(item => item.materialId !== materialId);
    setMatChildBom(updated);
    setMatUnitCost(calculateSubAssemblyCost(updated, materials, matRoutingId, routings, operations));
  };

  const handleSaveMaterial = () => {
    if (!matCode.trim() || !matName.trim() || !matUnit.trim()) {
      setCrudError('Kode, nama, dan satuan bahan wajib diisi.');
      return;
    }
    if (!editMaterialId && (matInitialStock === '' || matInitialStock === undefined || String(matInitialStock).trim() === '')) {
      setCrudError('Stok awal wajib diisi.');
      return;
    }
    if (!matCategory.trim()) {
      setCrudError('Kategori bahan wajib diisi. Silakan tambah kategori terlebih dahulu.');
      return;
    }

    const finalUnitCost = matIsSubAssembly
      ? calculateSubAssemblyCost(matChildBom, materials, matRoutingId, routings, operations)
      : (Number(matUnitCost) || 0);

    const payload = {
      code: matCode.trim().toUpperCase(),
      name: matName.trim(),
      category: matCategory,
      unit: matUnit.trim().toLowerCase(),
      unitCost: finalUnitCost,
      stock: Number(matInitialStock) || 0,
      minStock: Number(matMinStock) || 0,
      isSubAssembly: matIsSubAssembly,
      childBom: matIsSubAssembly ? matChildBom : undefined,
      routingId: matIsSubAssembly ? matRoutingId : undefined,
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
    setPOItems(prev => [...prev, {
      materialId: mat.id,
      materialName: mat.name,
      qty: selectedQty,
      unitCost: mat.unitCost,
      unit: mat.unit || 'unit',
    }]);
    setSelectedMat('');
    setSelectedQty(0);
    setShowAddItemRow(false);
  };

  const removePOItem = (idx: number) => {
    setPOItems(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length === 0) {
        setShowAddItemRow(true);
      }
      return updated;
    });
  };

  const openAddProcurement = () => {
    if (materials.length === 0) {
      toast.warning('Bahan Baku Kosong', 'Belum ada bahan baku yang terdaftar. Silakan register bahan baku terlebih dahulu di tab Stok Bahan Baku.');
      return;
    }
    setPurchaseType('PO');
    setSelectedBankAccountId(bankAccounts[0]?.id || '');
    setAdditionalCost(0);
    setProcurementError('');
    setPOItems([]);
    setSelectedMat('');
    setSelectedSupplier('');
    setSelectedQty(0);
    setShowAddItemRow(true);
    setShowPOModal(true);
  };

  const submitProcurement = () => {
    setProcurementError('');
    const supplierName = selectedSupplier.trim();
    if (!supplierName) {
      setProcurementError('Nama Vendor wajib diisi.');
      return;
    }

    if (poItems.length === 0) {
      setProcurementError('Daftar item pengadaan masih kosong. Silakan tambah minimal 1 item.');
      return;
    }

    if (purchaseType === 'DIRECT') {
      if (!selectedBankAccountId) {
        setProcurementError('Kas / Rekening Pembayaran wajib dipilih untuk Pembelian Langsung.');
        return;
      }
      const selectedBank = bankAccounts.find(b => b.id === selectedBankAccountId);
      if (!selectedBank) {
        setProcurementError('Kas / Rekening Pembayaran tidak valid.');
        return;
      }

      createDirectPurchase(supplierName, poItems, selectedBankAccountId, additionalCost);

      setPOItems([]);
      setSelectedSupplier('');
      setSelectedBankAccountId('');
      setAdditionalCost(0);
      setShowPOModal(false);
      toast.success(
        'Pembelian Langsung Berhasil',
        'Stok bahan baku otomatis bertambah dan saldo kas langsung berkurang.'
      );
    } else {
      createPO(supplierName, poItems);

      setPOItems([]);
      setSelectedSupplier('');
      setShowPOModal(false);
      toast.success('PO Berhasil Dibuat', 'Purchase Order baru telah terbit.');
    }
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

  const filteredRawMaterials = materials.filter(m => {
    const matchesFilter = !inventoryFilter || m.category === inventoryFilter;
    const matchesSearch = !searchTerm ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });



  return (
    <div className='space-y-3'>
      <PageHeader
        title="Inventaris & Pengadaan"
      >
        <div className="flex gap-2">
          {canManageInventory(currentUser.role) && (
            <Link href="/inventory/config">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-1.5" />
                Konfigurasi
              </Button>
            </Link>
          )}
          {canManageInventory(currentUser.role) && (activeTab === 'stock' || activeTab === 'finished') && (
            <Button onClick={openAddMaterial}>
              <Plus className="h-4 w-4" />
              {activeTab === 'finished' ? 'Register Barang Jadi' : 'Register Bahan Baku'}
            </Button>
          )}
          {canManageInventory(currentUser.role) && activeTab === 'assets' && (
            <Button onClick={openAddAsset}>
              <Plus className="h-4 w-4" />
              Register Aset Baru
            </Button>
          )}
          {canCreatePO(currentUser.role) && activeTab === 'po' && (
            <Button onClick={openAddProcurement}>
              <Plus className="h-4 w-4" />
              Buat Pengadaan Baru
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Reusable Segmented Control */}
      {(() => {
        const activePOsCount = purchaseOrders.filter(p => p.status !== 'RECEIVED' && p.status !== 'REJECTED').length;

        let filterOptions: { value: string; label: string }[] = [];
        let filterPlaceholder = "Filter Atribut";

        if (activeTab === 'stock' || activeTab === 'finished') {
          filterPlaceholder = "Semua Kategori";
          filterOptions = categories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'movements') {
          filterPlaceholder = "Semua Tipe Mutasi";
          filterOptions = [
            { value: 'IN', label: 'Masuk (PO / Pembelian)' },
            { value: 'OUT', label: 'Keluar (SPK / Konsumsi)' },
          ];
        } else if (activeTab === 'po') {
          filterPlaceholder = "Semua Status Pengadaan";
          filterOptions = [
            { value: '', label: 'Semua Status' },
            { value: 'DRAFT', label: 'Dibuat' },
            { value: 'ORDERED', label: 'Dipesan' },
            { value: 'RECEIVED', label: 'Diterima' },
            { value: 'REJECTED', label: 'Dibatalkan' },
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
              { key: 'po', label: 'Pengadaan', count: activePOsCount, icon: FileText },
              { key: 'assets', label: 'Aset & Alat Kerja', icon: Wrench },
            ]}
            filterValue={inventoryFilter}
            onFilterChange={setInventoryFilter}
            filterPlaceholder={filterPlaceholder}
            filterOptions={filterOptions}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Cari bahan baku, barang jadi, pengadaan, mutasi, atau aset..."
          />
        );
      })()}

      {/* Raw Materials Stock Table */}
      {activeTab === 'stock' && (
        <Card>
          {filteredRawMaterials.length === 0 ? (
            <EmptyState
              title="Belum ada bahan baku"
              description={
                searchTerm || inventoryFilter
                  ? "Tidak ada bahan baku yang cocok dengan pencarian atau filter."
                  : "Register bahan baku baru untuk mulai mengelola stok inventaris gudang."
              }
            />
          ) : (
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
                  {filteredRawMaterials.map(mat => {
                    const level = getStockLevel(mat.stock, mat.minStock);
                    return (
                      <tr key={mat.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pr-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{mat.code}</td>
                        <td className="py-3.5 pr-3 font-normal text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{mat.name}</span>
                            {mat.isSubAssembly && (
                              <Badge variant="purple" className="text-[10px]">SUB-ASSEMBLY</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 pr-3">
                          <Badge>{mat.category}</Badge>
                        </td>
                        <td className="py-3.5 pr-3 text-right font-semibold text-slate-900 dark:text-white">{mat.stock}</td>
                        <td className="py-3.5 pr-3 text-slate-500 dark:text-slate-400 text-xs">{mat.unit}</td>
                        <td className="py-3.5 pr-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(mat.unitCost)}</td>
                        <td className="py-3.5 pr-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(mat.stock * mat.unitCost)}</td>
                        <td className="py-3.5 pr-3 text-center text-slate-500">{mat.minStock}</td>
                        <td className={`py-3.5 pr-3 text-center text-xs font-semibold ${getStockLevelTextColor(level)}`}>
                          {level}
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
          )}
        </Card>
      )}



      {/* Purchase Orders / Pengadaan */}
      {activeTab === 'po' && (
        <Table
          data={[...filteredPOs].reverse()}
          emptyTitle="Belum ada riwayat pengadaan"
          emptyDescription={searchTerm ? "Tidak ada pengadaan yang cocok dengan pencarian." : "Buat pengadaan baru untuk memesan atau membeli bahan baku"}
          onRowClick={(po) => setSelectedProcurementDetail(po)}
          columns={[
            {
              key: 'poNumber',
              header: 'No. Pengadaan',
              cell: (po) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    {po.poNumber}
                  </span>
                  {po.purchaseType === 'DIRECT' ? (
                    <Badge variant="purple">Cash</Badge>
                  ) : (
                    <Badge variant="info">PO</Badge>
                  )}
                </div>
              ),
            },
            {
              key: 'supplier',
              header: 'Vendor',
              cell: (po) => <span className="text-sm font-normal text-slate-700 dark:text-slate-300">{po.supplier}</span>,
            },
            {
              key: 'itemsSummary',
              header: 'Item Material',
              cell: (po) => {
                if (!po.items || po.items.length === 0) return <span className="text-slate-400 text-xs">-</span>;
                const firstItem = po.items[0];
                const extraCount = po.items.length - 1;
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {firstItem.materialName}
                    </span>
                    {extraCount > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                        +{extraCount} lainnya
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'quantitySummary',
              header: 'Kuantitas',
              cell: (po) => {
                if (!po.items || po.items.length === 0) return <span className="text-slate-400 text-xs">-</span>;
                const firstItem = po.items[0];
                const matUnit = firstItem.unit || materials.find(m => m.id === firstItem.materialId)?.unit || 'unit';
                return (
                  <span className="text-sm font-normal text-slate-700 dark:text-slate-300">
                    {firstItem.qty} {matUnit}
                  </span>
                );
              },
            },
            {
              key: 'totalAmount',
              header: 'Total Transaksi',
              align: 'right',
              cell: (po) => (
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(po.totalAmount)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'left',
              cell: (po) => (
                po.status === 'REJECTED' ? (
                  <Badge variant="danger">Dibatalkan</Badge>
                ) : po.purchaseType === 'DIRECT' || po.status === 'RECEIVED' ? (
                  <Badge variant="success">Diterima</Badge>
                ) : po.status === 'ORDERED' ? (
                  <Badge variant="info">Dipesan</Badge>
                ) : (
                  <Badge variant="warning">Dibuat</Badge>
                )
              ),
            },
            {
              key: 'actions',
              header: 'Aksi',
              align: 'left',
              cell: (po) => (
                <div className="flex items-center justify-start gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {po.purchaseType !== 'DIRECT' && po.status === 'ORDERED' && canManageInventory(currentUser.role) && (
                    <Button size="sm" variant="success" className="h-8 px-3 text-xs font-semibold whitespace-nowrap" onClick={() => receivePO(po.id)}>
                      Terima Barang
                    </Button>
                  )}

                  {po.purchaseType !== 'DIRECT' && po.status === 'DRAFT' && canManageInventory(currentUser.role) && (
                    <Button size="sm" variant="primary" className="h-8 px-3 text-xs font-semibold whitespace-nowrap" onClick={() => orderPO(po.id)}>
                      Pesan Barang
                    </Button>
                  )}

                  {(po.purchaseType === 'DIRECT' || po.status === 'RECEIVED' || po.status === 'REJECTED' || !canManageInventory(currentUser.role)) && (
                    <span className="text-xs text-slate-400 font-medium hover:text-slate-600 transition-colors whitespace-nowrap">
                      Lihat Detail
                    </span>
                  )}
                </div>
              ),
            },
          ]}
        />
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
      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title={editMaterialId ? 'Edit Material / Inventaris' : 'Register Material Baru'}
        size="lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowMaterialModal(false)}>Batal</Button>
            <Button onClick={handleSaveMaterial}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4 pb-4">
          {crudError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{crudError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode Bahan Baku"
              required
              type="text"
              value={matCode}
              onChange={e => setMatCode(e.target.value)}
              disabled={!!editMaterialId}
              placeholder="Contoh: MAT-PLY-18MM"
            />
            <Select
              label="Kategori"
              required
              value={matCategory}
              onChange={e => setMatCategory(e.target.value)}
              options={categories.map(cat => ({ value: cat, label: cat }))}
            />
          </div>

          <Input
            label="Nama Bahan Baku"
            required
            type="text"
            value={matName}
            onChange={e => setMatName(e.target.value)}
            placeholder="Contoh: Multiplek 18mm"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Satuan"
              required
              type="text"
              value={matUnit}
              onChange={e => setMatUnit(e.target.value)}
              placeholder="pcs / unit / meter"
            />
            <div>
              <CurrencyInput
                label="HPP Satuan (Rp)"
                required
                value={matIsSubAssembly ? calculateSubAssemblyCost(matChildBom, materials, matRoutingId, routings, operations) : matUnitCost}
                onChange={val => !matIsSubAssembly && setMatUnitCost(typeof val === 'number' ? val : 0)}
                disabled={matIsSubAssembly}
              />
              {matIsSubAssembly && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                  *Terhitung otomatis dari Bahan + Upah Routing
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stok Awal"
              required
              type="number"
              step="any"
              value={matInitialStock}
              onChange={e => setMatInitialStock(e.target.value)}
              disabled={!!editMaterialId}
              placeholder="0"
            />
            <Input
              label="Batas Stok Minimum"
              required
              type="number"
              value={matMinStock || ''}
              onChange={e => setMatMinStock(Number(e.target.value))}
              placeholder="0"
            />
          </div>

          {/* Sub-Assembly Checkbox & Child BOM Builder */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={matIsSubAssembly}
                onChange={e => {
                  const checked = e.target.checked;
                  setMatIsSubAssembly(checked);
                  if (checked && matChildBom.length > 0) {
                    setMatUnitCost(calculateSubAssemblyCost(matChildBom, materials, matRoutingId, routings, operations));
                  }
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Item ini adalah Barang Setengah Jadi (Sub-Assembly / Memiliki Child BOM)
              </span>
            </label>

            {matIsSubAssembly && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    Child BOM Builder & Routing Sub-Assembly
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Total HPP Sub-Assembly: {formatCurrency(calculateSubAssemblyCost(matChildBom, materials, matRoutingId, routings, operations))}
                  </span>
                </div>

                {/* Routing Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Alur Routing Produksi Sub-Assembly <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={matRoutingId}
                    onChange={e => {
                      const newRtId = e.target.value;
                      setMatRoutingId(newRtId);
                      setMatUnitCost(calculateSubAssemblyCost(matChildBom, materials, newRtId, routings, operations));
                    }}
                    options={[
                      { value: '', label: '-- Tanpa Routing (Hanya Biaya Bahan) --' },
                      ...routings.map(r => ({ value: r.id, label: `${r.name} (${r.steps.length} Tahap Operasi)` })),
                    ]}
                    inputSize="sm"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Biaya upah dari alur routing ini akan otomatis ditambahkan ke HPP Sub-Assembly dan teralokasi saat SPK dibuat.
                  </p>
                </div>

                {/* Add Row */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Pilih Material Penyusun
                    </label>
                    <Select
                      value={childMatId}
                      onChange={e => setChildMatId(e.target.value)}
                      options={[
                        { value: '', label: '-- Pilih Bahan Baku Anak --' },
                        ...materials
                          .filter(m => m.id !== editMaterialId)
                          .map(m => ({
                            value: m.id,
                            label: `${m.name} (${m.unit})`,
                          })),
                      ]}
                      inputSize="sm"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Jumlah Qty
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={childMatQty}
                      onChange={e => setChildMatQty(e.target.value)}
                      placeholder="0"
                      inputSize="sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" size="sm" onClick={handleAddChildBomItem} className="w-full">
                      <Plus className="h-3.5 w-3.5" /> Tambah
                    </Button>
                  </div>
                </div>

                {/* Child BOM Table */}
                {matChildBom.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">
                    Belum ada bahan penyusun yang ditambahkan ke Child BOM ini.
                  </p>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-3 py-1.5">Material</th>
                          <th className="px-3 py-1.5 text-center">Qty Required</th>
                          <th className="px-3 py-1.5 text-right">Biaya Subtotal</th>
                          <th className="px-2 py-1.5 text-center w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {matChildBom.map((item, idx) => {
                          const compMat = materials.find(m => m.id === item.materialId);
                          const compCost = compMat
                            ? (compMat.isSubAssembly && compMat.childBom
                                ? calculateSubAssemblyCost(compMat.childBom, materials, compMat.routingId, routings, operations)
                                : compMat.unitCost)
                            : 0;
                          const subtotal = compCost * item.qty;
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-1.5">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{compMat?.name || 'Unknown'}</div>
                                <div className="text-[10px] text-slate-400">{compMat?.code}</div>
                              </td>
                              <td className="px-3 py-1.5 text-center font-bold text-slate-900 dark:text-white">
                                {item.qty} {compMat?.unit}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-slate-600 dark:text-slate-400">
                                {formatCurrency(subtotal)}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChildBomItem(item.materialId)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Hapus Material Anak"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Master Asset CRUD (Add / Edit) */}
      <Modal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        title={editAssetId ? 'Edit Aset & Alat Kerja' : 'Register Aset Baru'}
        size="md"
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowAssetModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveAsset}>Simpan</Button>
          </>
        }
      >
        <form onSubmit={handleSaveAsset} className="space-y-4 pb-6 min-h-[240px]">
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
            <Select
              label="Kategori"
              required
              value={astCategory}
              onChange={e => setAstCategory(e.target.value)}
              options={assetCategories.map(cat => ({ value: cat, label: cat }))}
            />
          </div>


          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Aset *</label>
            <input
              type="text"
              value={astName}
              onChange={e => setAstName(e.target.value)}
              placeholder="Contoh: Mesin Cutting CNC Wood Router"
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
              <Select
                value={astStatus}
                onChange={e => setAstStatus(e.target.value as any)}
                options={[
                  { value: 'AKTIF', label: 'AKTIF' },
                  { value: 'MAINTENANCE', label: 'MAINTENANCE' },
                  { value: 'RUSAK', label: 'RUSAK' },
                ]}
              />
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
        </form>
      </Modal>


      {/* Modal: Form Pengadaan */}
      <Modal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        title="Form Pengadaan Bahan Baku"
        size="lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowPOModal(false)}>Batal</Button>
            <Button onClick={submitProcurement} disabled={poItems.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Buat Pengadaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {procurementError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{procurementError}</span>
            </div>
          )}

          {/* Separate card containers for each Purchase Type radio option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setPurchaseType('PO')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                purchaseType === 'PO'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-600/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="purchaseType"
                  value="PO"
                  checked={purchaseType === 'PO'}
                  onChange={() => setPurchaseType('PO')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Purchase Order (PO)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                Alur pemesanan standar dengan persetujuan dan penerimaan barang.
              </p>
            </div>

            <div
              onClick={() => setPurchaseType('DIRECT')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                purchaseType === 'DIRECT'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-600/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="purchaseType"
                  value="DIRECT"
                  checked={purchaseType === 'DIRECT'}
                  onChange={() => setPurchaseType('DIRECT')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pembelian Langsung
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                Stok otomatis bertambah dan saldo kas langsung berkurang.
              </p>
            </div>
          </div>

          {/* Vendor Name */}
          <div className="pt-1">
            <Input
              label="Nama Vendor"
              required
              placeholder="Contoh: UD Kayu Makmur Jaya"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            />
          </div>

          {/* Extra fields for Direct Purchase placed before item selection */}
          {purchaseType === 'DIRECT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Select
                label="Pilih Rekening Pembayaran"
                required
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                options={bankAccounts.map((b) => ({
                  value: b.id,
                  label: `${b.name} (Saldo: ${formatCurrency(b.balance)})`,
                }))}
              />
              <CurrencyInput
                label="Biaya Tambahan (Opsional)"
                value={additionalCost}
                onChange={(val) => setAdditionalCost(typeof val === 'number' ? val : 0)}
              />
            </div>
          )}

          {/* List of Saved Items & Add Item Section */}
          <div className="space-y-3 pt-1">
            {/* Render Saved Items List */}
            {poItems.length > 0 && (
              <div className="space-y-1.5">
                {poItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs"
                  >
                    <div className="font-medium text-slate-900 dark:text-white truncate flex-1 min-w-0">
                      {item.materialName}
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 text-center min-w-[140px] px-2 shrink-0 font-medium">
                      {item.qty} {item.unit || 'unit'}
                    </div>

                    <div className="font-mono font-semibold text-slate-900 dark:text-white text-right min-w-[110px] shrink-0">
                      {formatCurrency(item.qty * item.unitCost)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removePOItem(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0"
                      title="Hapus Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Flat Row Input Form (Langsung Siap Diiisi) */}
            {showAddItemRow && (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 py-1">
                <div className="flex-1 min-w-[180px]">
                  <Select
                    placeholder="Pilih Bahan Baku..."
                    value={selectedMat}
                    onChange={(e) => setSelectedMat(e.target.value)}
                    options={materials.map((m) => ({
                      value: m.id,
                      label: `${m.name} (${formatCurrency(m.unitCost)} / ${m.unit})`,
                    }))}
                  />
                </div>

                <div className="w-14 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={selectedQty || ''}
                    onChange={(e) => setSelectedQty(Number(e.target.value))}
                  />
                </div>

                <div className="shrink-0 text-right min-w-[130px] px-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {(() => {
                      const m = materials.find((mat) => mat.id === selectedMat);
                      return m && selectedQty > 0 ? formatCurrency(m.unitCost * selectedQty) : 'Rp 0';
                    })()}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="success"
                    onClick={addPOItem}
                    disabled={!selectedMat || selectedQty <= 0}
                    className="h-9 w-9 p-0"
                    title="Simpan Item"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedMat('');
                      setSelectedQty(0);
                      if (poItems.length > 0) {
                        setShowAddItemRow(false);
                      }
                    }}
                    className="h-9 w-9 p-0"
                    title="Batal"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            )}

            {/* Bottom Action Bar: Tombol Tambah Item (Kiri) & Subtotal (Kanan) */}
            {poItems.length > 0 && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  {!showAddItemRow && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddItemRow(true);
                        setSelectedMat('');
                        setSelectedQty(0);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Item
                    </Button>
                  )}
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500 dark:text-slate-400 mr-2">
                    Subtotal ({poItems.length} item):
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {formatCurrency(
                      poItems.reduce((s: number, i: any) => s + i.qty * i.unitCost, 0) +
                      (purchaseType === 'DIRECT' ? (additionalCost || 0) : 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Service History */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title={`Riwayat Pemeliharaan & Servis: ${selectedServiceAsset?.name || ''}`}
        size="lg"
        actions={
          <Button variant="ghost" onClick={() => setShowServiceModal(false)}>Tutup</Button>
        }
      >
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
        </div>
      </Modal>

      {/* Modal: Detail Pengadaan (PO & Pembelian Langsung) */}
      <Modal
        isOpen={!!selectedProcurementDetail}
        onClose={() => setSelectedProcurementDetail(null)}
        title="Detail Pengadaan"
        size="lg"
        actions={(() => {
          if (!selectedProcurementDetail || !canManageInventory(currentUser.role)) return undefined;

          const canCancel = selectedProcurementDetail.status !== 'REJECTED';
          const canOrder = selectedProcurementDetail.purchaseType !== 'DIRECT' && selectedProcurementDetail.status === 'DRAFT';
          const canReceive = selectedProcurementDetail.purchaseType !== 'DIRECT' && selectedProcurementDetail.status === 'ORDERED';

          if (!canCancel && !canOrder && !canReceive) return undefined;

          return (
            <div className="flex justify-end items-center gap-2">
              {canCancel && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setCancelPOReason('');
                    setCancelPOError('');
                    setShowCancelPOModal(true);
                  }}
                >
                  Batalkan Pengadaan
                </Button>
              )}

              {canOrder && (
                <Button
                  variant="primary"
                  className="whitespace-nowrap font-medium"
                  onClick={() => {
                    orderPO(selectedProcurementDetail.id);
                    setSelectedProcurementDetail(null);
                  }}
                >
                  Pesan Barang
                </Button>
              )}

              {canReceive && (
                <Button
                  variant="success"
                  className="whitespace-nowrap font-medium"
                  onClick={() => {
                    receivePO(selectedProcurementDetail.id);
                    setSelectedProcurementDetail(null);
                  }}
                >
                  Terima Barang
                </Button>
              )}
            </div>
          );
        })()}
      >
        {selectedProcurementDetail && (
          <div className="space-y-5 py-1">
            {/* Cancellation Callout Info */}
            {selectedProcurementDetail.status === 'REJECTED' && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs dark:border-red-900/50 dark:bg-red-950/30 space-y-1">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Pengadaan Ini Telah Dibatalkan</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Dibatalkan pada <strong className="font-semibold">{selectedProcurementDetail.cancelledAt ? formatDateTime(selectedProcurementDetail.cancelledAt) : '-'}</strong> oleh <strong className="font-semibold">{selectedProcurementDetail.cancelledBy || 'Admin'}</strong>.
                </p>
                {selectedProcurementDetail.cancelReason && (
                  <p className="text-slate-700 dark:text-slate-200 font-medium italic pt-1 border-t border-red-200/60 dark:border-red-900/40">
                    &quot;{selectedProcurementDetail.cancelReason}&quot;
                  </p>
                )}
              </div>
            )}

            {/* Header metadata line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {selectedProcurementDetail.poNumber}
                  </span>

                  <Badge
                    variant={
                      selectedProcurementDetail.status === 'REJECTED'
                        ? 'danger'
                        : selectedProcurementDetail.purchaseType === 'DIRECT' || selectedProcurementDetail.status === 'RECEIVED'
                        ? 'success'
                        : selectedProcurementDetail.status === 'ORDERED'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {selectedProcurementDetail.status === 'REJECTED'
                      ? 'Dibatalkan'
                      : selectedProcurementDetail.purchaseType === 'DIRECT' || selectedProcurementDetail.status === 'RECEIVED'
                      ? 'Diterima'
                      : selectedProcurementDetail.status === 'ORDERED'
                      ? 'Dipesan'
                      : 'Dibuat'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dibuat {formatDateTime(selectedProcurementDetail.createdAt)} oleh {selectedProcurementDetail.createdBy || 'Gudang'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Transaksi</span>
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(selectedProcurementDetail.totalAmount)}
                </span>
              </div>
            </div>

            {/* Clean Key-Value Grid: Tipe, Vendor, Diterima Pada */}
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Tipe</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedProcurementDetail.purchaseType === 'DIRECT' ? 'Pembelian Langsung' : 'Purchase Order'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Vendor</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedProcurementDetail.supplier}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Diterima Pada</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {selectedProcurementDetail.receivedAt ? formatDateTime(selectedProcurementDetail.receivedAt) : 'Belum Diterima'}
                </span>
              </div>
            </div>

            {/* Item Table */}
            <div className="pt-2">
              <Table
                dense
                data={selectedProcurementDetail.items}
                columns={[
                  {
                    key: 'materialName',
                    header: 'Bahan Baku',
                    cell: (item) => <span className="font-medium text-slate-900 dark:text-white">{item.materialName}</span>,
                  },
                  {
                    key: 'qty',
                    header: 'Kuantitas',
                    align: 'center',
                    cell: (item) => <span className="font-mono text-slate-800 dark:text-slate-200">{item.qty} unit</span>,
                  },
                  {
                    key: 'unitCost',
                    header: 'Harga Satuan',
                    align: 'right',
                    cell: (item) => <span className="font-mono text-slate-600 dark:text-slate-400">{formatCurrency(item.unitCost)}</span>,
                  },
                  {
                    key: 'subtotal',
                    header: 'Subtotal',
                    align: 'right',
                    cell: (item) => <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(item.qty * item.unitCost)}</span>,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Form Pembatalan Pengadaan */}
      <Modal
        isOpen={showCancelPOModal}
        onClose={() => setShowCancelPOModal(false)}
        title={`Batalkan Pengadaan ${selectedProcurementDetail?.poNumber || ''}`}
        size="md"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowCancelPOModal(false)}>Batal</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!selectedProcurementDetail) return;
                if (!cancelPOReason.trim()) {
                  setCancelPOError('Alasan pembatalan wajib diisi.');
                  return;
                }
                const res = rejectPO(selectedProcurementDetail.id, cancelPOReason.trim());
                if (!res.success) {
                  setCancelPOError(res.error || 'Gagal membatalkan pengadaan.');
                } else {
                  toast.success('Pengadaan Dibatalkan', `Pengadaan ${selectedProcurementDetail.poNumber} berhasil dibatalkan.`);
                  setShowCancelPOModal(false);
                  setSelectedProcurementDetail(null);
                }
              }}
            >
              Konfirmasi Pembatalan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {cancelPOError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{cancelPOError}</span>
            </div>
          )}

          {selectedProcurementDetail?.status === 'RECEIVED' || selectedProcurementDetail?.purchaseType === 'DIRECT' ? (
            <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠️ Pengadaan ini <strong>sudah diterima</strong>. Pembatalan akan otomatis <strong>mengurangi stok persediaan</strong> dan <strong>menerbitkan Jurnal Reversal Akuntansi</strong>. Pastikan fisik bahan belum terpakai oleh SPK produksi.
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Pembatalan Pengadaan <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelPOReason}
              onChange={e => setCancelPOReason(e.target.value)}
              placeholder="Contoh: Vendor kehabisan stok / Barang retur karena tidak sesuai spesifikasi..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
