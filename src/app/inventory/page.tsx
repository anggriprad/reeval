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
import { Toggle } from '@/components/ui/Toggle';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDateTime, getStockLevel, getStockLevelColor, getStockLevelTextColor, calculateSubAssemblyCost, formatVariantLabel } from '@/lib/utils';
import { canCreatePO, canManageInventory, canRequestPO, canManageProduction } from '@/lib/roles';
import type { RawMaterial, CompanyAsset, CompanyAssetServiceLog, BOMItem, FinishedGoodStock, PurchaseOrder, ReturnedGood, ReturnedGoodAction, ReturnedGoodStatus } from '@/lib/types';
import Link from 'next/link';
import {
  Plus,
  PackageCheck,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Warehouse,
  ShoppingCart,
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
  RotateCcw,
  BedDouble,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
};

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
    stockMovements,
    currentUser,
    categories,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addMaterialCategory,
    deleteMaterialCategory,
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
    finishedGoods,
    addFinishedGood,
    updateFinishedGood,
    deleteFinishedGood,
    adjustFinishedGoodStock,
    products,
    productCategories,
    purchaseOrders,
    createPO,
    createDirectPurchase,
    orderPO,
    receivePO,
    rejectPO,
    deletePO,
    createSubAssemblyWorkOrder,
    salesOrders = [],
    returnedGoods = [],
    processReturnedGoodAction,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [activeTab, setActiveTab] = useUrlTab(['raw', 'finished', 'movements', 'procurement', 'assets', 'returns'] as const, 'raw');

  // Modal SPK Bahan Setengah Jadi (WIP)
  const [showSaModal, setShowSaModal] = useState(false);
  const [saMaterialId, setSaMaterialId] = useState('');
  const [saTargetQty, setSaTargetQty] = useState('1');
  const [saError, setSaError] = useState('');

  // Pengadaan (PO & Pembelian Langsung) state
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

  // Finished Goods CRUD state
  const [showFGModal, setShowFGModal] = useState(false);
  const [editFGId, setEditFGId] = useState<string | null>(null);
  const [fgProductId, setFGProductId] = useState('');
  const [fgVariantId, setFGVariantId] = useState('');
  const [fgStock, setFGStock] = useState<string>('0');
  const [fgMinStock, setFGMinStock] = useState(0);
  const [fgUnit, setFGUnit] = useState('unit');
  const [fgError, setFGError] = useState('');
  const [showEmptyStock, setShowEmptyStock] = useState(false);

  // Barang Retur Action state
  const [selectedReturnItem, setSelectedReturnItem] = useState<ReturnedGood | null>(null);
  const [returnAction, setReturnAction] = useState<ReturnedGoodAction>('RESTOCK');
  const [returnActionNotes, setReturnActionNotes] = useState('');

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

  const sortedMovements = [...stockMovements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesFilter = !inventoryFilter || po.status === inventoryFilter;
    const matchesSearch = !searchTerm ||
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.createdBy && po.createdBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      po.items.some(i => i.materialName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const filteredFinishedGoods = finishedGoods.filter(fg => {
    const p = products.find(prod => prod.id === fg.productId);
    const matchesCategory = !inventoryFilter || (p && p.category === inventoryFilter);
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (p && p.name.toLowerCase().includes(q)) ||
      (p && p.category.toLowerCase().includes(q)) ||
      (fg.productName && fg.productName.toLowerCase().includes(q)) ||
      (fg.variantLabel && fg.variantLabel.toLowerCase().includes(q));

    // Default: hanya tampilkan barang yang memiliki stok (stok > 0).
    // Jika toggle aktif (showEmptyStock = true), barang dengan stok 0 juga ditampilkan.
    const matchesStock = showEmptyStock ? true : fg.stock > 0;

    return matchesCategory && matchesSearch && matchesStock;
  });

  const filteredReturnedGoods = (returnedGoods || []).filter(rg => {
    const matchesStatus = !inventoryFilter || rg.status === inventoryFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      rg.productName.toLowerCase().includes(q) ||
      rg.customerName.toLowerCase().includes(q) ||
      rg.salesOrderNumber.toLowerCase().includes(q) ||
      rg.complaintId.toLowerCase().includes(q) ||
      (rg.conditionReason && rg.conditionReason.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const openReturnActionModal = (item: ReturnedGood) => {
    setSelectedReturnItem(item);
    setReturnAction('RESTOCK');
    setReturnActionNotes('');
  };

  const handleConfirmReturnAction = () => {
    if (!selectedReturnItem) return;
    processReturnedGoodAction(selectedReturnItem.id, returnAction, returnActionNotes.trim());
    toast.success('Tindakan Berhasil Diproses', `Barang retur telah diproses.`);
    setSelectedReturnItem(null);
  };

  // Finished Goods handlers
  const openAddFinishedGood = () => {
    setEditFGId(null);
    setFGProductId('');
    setFGVariantId('');
    setFGStock('0');
    setFGMinStock(0);
    setFGUnit('unit');
    setFGError('');
    setShowFGModal(true);
  };

  const openEditFinishedGood = (fg: FinishedGoodStock) => {
    setEditFGId(fg.id);
    setFGProductId(fg.productId);
    setFGVariantId(fg.variantId || '');
    setFGStock(fg.stock.toString());
    setFGMinStock(fg.minStock);
    setFGUnit(fg.unit || 'unit');
    setFGError('');
    setShowFGModal(true);
  };

  const handleSaveFinishedGood = () => {
    if (!fgProductId) {
      setFGError('Produk wajib dipilih.');
      return;
    }
    const stockNum = Number(fgStock) || 0;
    const minStockNum = Number(fgMinStock) || 0;

    const prod = products.find(p => p.id === fgProductId);
    const variant = prod?.variants?.find(v => v.id === fgVariantId);
    const variantLabel = variant ? (Object.values(variant.combination || {}).join(' • ') || variant.sku) : undefined;
    const productName = prod?.name || 'Produk';

    if (editFGId) {
      updateFinishedGood(editFGId, {
        productId: fgProductId,
        variantId: fgVariantId || undefined,
        productName,
        variantLabel,
        stock: stockNum,
        minStock: minStockNum,
        unit: fgUnit,
      });
    } else {
      addFinishedGood({
        productId: fgProductId,
        variantId: fgVariantId || undefined,
        productName,
        variantLabel,
        stock: stockNum,
        minStock: minStockNum,
        unit: fgUnit,
      });
    }
    setShowFGModal(false);
  };

  const handleDeleteFinishedGood = async (id: string, name: string) => {
    const targetFG = finishedGoods.find(item => item.id === id);
    const isCatalog = targetFG ? products.some(p => p.id === targetFG.productId) : false;

    const isOk = await confirm({
      title: isCatalog ? 'Reset Stok Barang Jadi' : 'Hapus Barang Jadi',
      message: isCatalog
        ? `Barang "${name}" terdaftar pada katalog produk. Apakah Anda yakin ingin mereset jumlah stoknya menjadi 0?`
        : `Apakah Anda yakin ingin menghapus stok barang jadi "${name}"?`,
      confirmText: isCatalog ? 'Reset ke 0' : 'Hapus',
      variant: 'danger',
    });
    if (isOk) {
      deleteFinishedGood(id);
      toast.success(
        isCatalog ? 'Stok Direset' : 'Berhasil Dihapus',
        isCatalog ? `Stok ${name} berhasil direset menjadi 0.` : `Stok barang jadi ${name} berhasil dihapus.`
      );
    }
  };

  // ---- Pengadaan Handlers ----
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
      if (updated.length === 0) setShowAddItemRow(true);
      return updated;
    });
  };

  const openAddProcurement = (targetMatId?: string) => {
    if (materials.length === 0) {
      toast.warning('Bahan Baku Kosong', 'Belum ada bahan baku yang terdaftar.');
      return;
    }
    setPurchaseType('PO');
    setSelectedBankAccountId(bankAccounts[0]?.id || '');
    setAdditionalCost(0);
    setProcurementError('');
    setSelectedSupplier('');

    const targetMat = targetMatId ? materials.find(m => m.id === targetMatId) : null;
    if (targetMat) {
      setPOItems([{
        materialId: targetMat.id,
        materialName: targetMat.name,
        qty: 1,
        unitCost: targetMat.unitCost,
        unit: targetMat.unit || 'unit',
      }]);
      setSelectedMat('');
      setSelectedQty(0);
      setShowAddItemRow(false);
    } else {
      setPOItems([]);
      setSelectedMat('');
      setSelectedQty(0);
      setShowAddItemRow(true);
    }

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

    if (poItems.some(i => !i.qty || Number(i.qty) <= 0)) {
      setProcurementError('Kuantitas setiap item pengadaan harus lebih besar dari 0.');
      return;
    }

    if (purchaseType === 'DIRECT') {
      if (!selectedBankAccountId) {
        setProcurementError('Kas / Rekening Pembayaran wajib dipilih untuk Pembelian Langsung.');
        return;
      }
      createDirectPurchase(supplierName, poItems, selectedBankAccountId, additionalCost);
      setPOItems([]);
      setSelectedSupplier('');
      setSelectedBankAccountId('');
      setAdditionalCost(0);
      setShowPOModal(false);
      toast.success('Pembelian Langsung Berhasil Dibuat');
    } else {
      createPO(supplierName, poItems);
      setPOItems([]);
      setSelectedSupplier('');
      setShowPOModal(false);
      toast.success('Pengadaan Berhasil Dibuat');
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
        toast.success('PO Berhasil Dihapus');
      }
    }
  };

  // ---- SPK Bahan Setengah Jadi (WIP) Handlers ----
  const openCreateSaWorkOrder = (materialId?: string) => {
    setSaMaterialId(materialId || '');
    setSaTargetQty('1');
    setSaError('');
    setShowSaModal(true);
  };

  const handleCreateSaWorkOrder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaError('');

    if (!saMaterialId) {
      setSaError('Pilih bahan setengah jadi.');
      return;
    }

    const qty = parseFloat(saTargetQty.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      setSaError('Kuantitas produksi harus lebih besar dari 0.');
      return;
    }

    const res = createSubAssemblyWorkOrder(saMaterialId, qty);
    if (!res.success) {
      setSaError(res.error || 'Gagal menerbitkan SPK.');
      return;
    }

    const targetMat = materials.find(m => m.id === saMaterialId);
    toast.success('SPK Berhasil Dibuat', `SPK untuk ${qty} ${targetMat?.unit || 'unit'} "${targetMat?.name}" berhasil diterbitkan.`);
    setShowSaModal(false);
  };



  return (
    <div className='space-y-3'>
      <PageHeader
        title="Inventaris"
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
          {activeTab === 'raw' && canManageInventory(currentUser.role) && (
            <Button onClick={openAddMaterial}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register Bahan
            </Button>
          )}
          {activeTab === 'finished' && canManageInventory(currentUser.role) && (
            <Button onClick={openAddFinishedGood}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Barang Jadi
            </Button>
          )}
          {activeTab === 'procurement' && canRequestPO(currentUser.role) && (
            <Button onClick={() => openAddProcurement()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Buat Pengadaan
            </Button>
          )}
          {activeTab === 'assets' && canManageInventory(currentUser.role) && (
            <Button onClick={openAddAsset}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register Aset Baru
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Reusable Segmented Control: 5 Tab */}
      {(() => {
        let filterOptions: { value: string; label: string }[] = [];
        let filterPlaceholder = "Filter Atribut";

        if (activeTab === 'raw') {
          filterPlaceholder = "Semua Kategori";
          filterOptions = categories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'finished') {
          filterPlaceholder = "Semua Kategori Produk";
          filterOptions = productCategories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'returns') {
          filterPlaceholder = "Semua Status Retur";
          filterOptions = [
            { value: '', label: 'Semua Status' },
            { value: 'PENDING', label: 'Menunggu Tindakan' },
            { value: 'RESTOCKED', label: 'Masuk Barang Jadi' },
            { value: 'REPAIR', label: 'Diperbaiki' },
            { value: 'DISASSEMBLED', label: 'Dibongkar' },
            { value: 'SCRAPPED', label: 'Dibuang / Sampah' },
          ];
        } else if (activeTab === 'procurement') {
          filterPlaceholder = "Semua Status";
          filterOptions = [
            { value: '', label: 'Semua Status' },
            { value: 'DRAFT', label: 'Pengajuan' },
            { value: 'ORDERED', label: 'Dipesan' },
            { value: 'RECEIVED', label: 'Diterima' },
            { value: 'REJECTED', label: 'Dibatalkan' },
          ];
        } else if (activeTab === 'movements') {
          filterPlaceholder = "Semua Tipe Mutasi";
          filterOptions = [
            { value: 'IN', label: 'Masuk (PO / Pembelian)' },
            { value: 'OUT', label: 'Keluar (SPK / Konsumsi)' },
          ];
        } else if (activeTab === 'assets') {
          filterPlaceholder = "Semua Kategori Aset";
          filterOptions = assetCategories.map(c => ({ value: c, label: c }));
        }

        const pendingReturnsCount = (returnedGoods || []).filter(rg => rg.status === 'PENDING').length;

        return (
          <SegmentedControl
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as 'raw' | 'finished' | 'movements' | 'procurement' | 'assets' | 'returns');
              setInventoryFilter('');
            }}
            options={[
              { key: 'raw', label: 'Stok Bahan Baku', icon: Warehouse },
              { key: 'finished', label: 'Stok Barang Jadi', icon: PackageCheck },
              { key: 'movements', label: 'Mutasi Stok', icon: ArrowDownCircle },
              { key: 'procurement', label: 'Pengadaan', icon: ShoppingCart },
              { key: 'assets', label: 'Aset & Alat Kerja', icon: Wrench },
              {
                key: 'returns',
                label: 'Barang Retur',
                icon: RotateCcw,
                count: pendingReturnsCount > 0 ? pendingReturnsCount : undefined,
              },
            ]}
            filterValue={inventoryFilter}
            onFilterChange={setInventoryFilter}
            filterPlaceholder={filterPlaceholder}
            filterOptions={filterOptions}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Cari bahan baku, barang jadi, pengadaan, mutasi, atau aset..."
            extraControls={
              activeTab === 'finished' ? (
                <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <Toggle
                    size="sm"
                    checked={showEmptyStock}
                    onChange={setShowEmptyStock}
                    label="Tampilkan barang dengan stok kosong"
                    labelPosition="right"
                    labelClassName="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    color="indigo"
                  />
                </div>
              ) : undefined
            }
          />
        );
      })()}

      {/* Raw Materials Stock Table */}
      {activeTab === 'raw' && (
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
                    {(canManageInventory(currentUser.role) || canRequestPO(currentUser.role)) && (
                      <th className="pb-3 text-center font-medium text-slate-500 w-[180px] whitespace-nowrap">Aksi</th>
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
                              <Badge variant="purple">WIP</Badge>
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
                        {(canManageInventory(currentUser.role) || canRequestPO(currentUser.role)) && (
                          <td className="py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {!mat.isSubAssembly ? (
                                canRequestPO(currentUser.role) && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openAddProcurement(mat.id)}
                                    title={`Buat pengadaan untuk ${mat.name}`}
                                  >
                                    Buat Pengadaan
                                  </Button>
                                )
                              ) : (
                                (canManageProduction(currentUser.role) || canManageInventory(currentUser.role)) && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openCreateSaWorkOrder(mat.id)}
                                    title={`Buat SPK untuk ${mat.name}`}
                                  >
                                    Buat SPK
                                  </Button>
                                )
                              )}

                              {canManageInventory(currentUser.role) && (
                                <ActionMenu
                                  items={[
                                    {
                                      label: 'Edit',
                                      icon: <Edit2 className="h-3.5 w-3.5" />,
                                      onClick: () => openEditMaterial(mat),
                                    },
                                    {
                                      label: 'Delete',
                                      icon: <Trash2 className="h-3.5 w-3.5" />,
                                      variant: 'danger',
                                      onClick: () => handleDeleteMaterial(mat.id, mat.name),
                                    },
                                  ]}
                                />
                              )}
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

      {/* Finished Goods Table */}
      {activeTab === 'finished' && (
        <Card>
          {filteredFinishedGoods.length === 0 ? (
            <EmptyState
              title="Belum ada barang jadi"
              description={
                searchTerm || inventoryFilter || !showEmptyStock
                  ? (!showEmptyStock && finishedGoods.length > 0
                      ? 'Tidak ada barang jadi dengan stok tersedia. Aktifkan toggle "Tampilkan barang dengan stok kosong" untuk menampilkan produk dengan stok 0.'
                      : 'Tidak ada barang jadi yang cocok dengan pencarian atau filter.')
                  : 'Tambahkan stok barang jadi untuk mencatat hasil produksi.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Produk</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Stok</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Satuan</th>
                    <th className="pb-3 pr-3 text-center font-medium text-slate-500">Min Stok</th>
                    <th className="pb-3 pr-3 text-center font-medium text-slate-500">Status</th>
                    {canManageInventory(currentUser.role) && (
                      <th className="pb-3 text-center font-medium text-slate-500 w-[140px] whitespace-nowrap">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredFinishedGoods.map(fg => {
                    const prod = products.find(p => p.id === fg.productId);
                    const variant = prod?.variants?.find(v => v.id === fg.variantId);
                    const IconComp = iconMap[prod?.imageIcon || 'BedDouble'] || BedDouble;
                    const level = getStockLevel(fg.stock, fg.minStock);
                    const variantText = variant ? (Object.values(variant.combination || {}).join(' • ') || variant.sku) : '';
                    const displayName = fg.productName ? `${fg.productName}${fg.variantLabel ? ` (${fg.variantLabel})` : ''}` : (prod ? (variantText ? `${prod.name} (${variantText})` : prod.name) : 'Produk Tidak Ditemukan');
                    return (
                      <tr key={fg.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pr-3 font-normal text-slate-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            {prod?.image ? (
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                                <img src={prod.image} alt={displayName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                <IconComp className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold block truncate">{displayName}</span>
                              {prod?.category && (
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                  {prod.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-3 text-right font-semibold text-slate-900 dark:text-white">{fg.stock}</td>
                        <td className="py-3.5 pr-3 text-slate-500 dark:text-slate-400 text-xs">{fg.unit}</td>
                        <td className="py-3.5 pr-3 text-center text-slate-500">{fg.minStock}</td>
                        <td className={`py-3.5 pr-3 text-center text-xs font-semibold ${getStockLevelTextColor(level)}`}>
                          {level}
                        </td>
                        {canManageInventory(currentUser.role) && (
                          <td className="py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <ActionMenu
                                items={[
                                  {
                                    label: 'Edit',
                                    icon: <Edit2 className="h-3.5 w-3.5" />,
                                    onClick: () => openEditFinishedGood(fg),
                                  },
                                  {
                                    label: 'Delete',
                                    icon: <Trash2 className="h-3.5 w-3.5" />,
                                    variant: 'danger',
                                    onClick: () => handleDeleteFinishedGood(fg.id, displayName),
                                  },
                                ]}
                              />
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

      {/* Barang Retur Table */}
      {activeTab === 'returns' && (
        <Card>
          {filteredReturnedGoods.length === 0 ? (
            <EmptyState
              icon={<RotateCcw className="h-7 w-7" />}
              title="Tidak ada barang retur"
              description={
                searchTerm || inventoryFilter
                  ? "Tidak ada data barang retur yang sesuai dengan pencarian atau filter."
                  : "Barang retur dari komplain refund / pembatalan pesanan akan otomatis tercatat di sini."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs">
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Produk</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Ref</th>
                    <th className="pb-3 pr-3 text-right font-medium text-slate-500">Qty</th>
                    <th className="pb-3 pr-3 text-left font-medium text-slate-500">Alasan Retur</th>
                    {canManageInventory(currentUser.role) && (
                      <th className="pb-3 text-center font-medium text-slate-500 w-[140px] whitespace-nowrap">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredReturnedGoods.map(rg => {
                    const prod = products.find(p => p.id === rg.productId || p.name === rg.productName);
                    const IconComp = iconMap[prod?.imageIcon || 'BedDouble'] || BedDouble;
                    const soItem = salesOrders
                      .find(so => so.id === rg.salesOrderId || so.orderNumber === rg.salesOrderNumber)
                      ?.items.find(i => i.productId === rg.productId && (!rg.variantId || i.variantId === rg.variantId));
                    const orderItemNotes = rg.customNotes || soItem?.customNotes;

                    return (
                      <tr key={rg.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pr-3 font-normal text-slate-900 dark:text-white">
                          <div className="flex items-start gap-3">
                            {prod?.image ? (
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                                <img src={prod.image} alt={rg.productName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                <IconComp className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-slate-900 dark:text-white">{rg.productName}</div>
                              {rg.variantLabel && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {formatVariantLabel(rg.variantLabel)}
                                </div>
                              )}
                              {orderItemNotes && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                  Catatan: {orderItemNotes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-3 whitespace-nowrap">
                          <Link
                            href={`/order/complaint/${rg.complaintId}`}
                            className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {rg.complaintId}
                          </Link>
                        </td>
                        <td className="py-3.5 pr-3 text-right font-mono text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {rg.qty}
                        </td>
                        <td className="py-3.5 pr-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={rg.conditionReason}>
                          {rg.conditionReason}
                        </td>
                        {canManageInventory(currentUser.role) && (
                          <td className="py-3.5 text-center whitespace-nowrap w-[140px]">
                            {rg.status === 'PENDING' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openReturnActionModal(rg)}
                              >
                                Tindak Lanjuti
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">-</span>
                            )}
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

      {/* Procurement (Pengadaan) Table */}
      {activeTab === 'procurement' && (
        <Card>
          {filteredPOs.length === 0 ? (
            <EmptyState
              title="Belum ada pengadaan"
              description={
                searchTerm || inventoryFilter
                  ? "Tidak ada data pengadaan yang sesuai dengan pencarian atau filter."
                  : "Buat pengadaan baru untuk memesan bahan baku ke vendor."
              }
            />
          ) : (
            <Table
              data={[...filteredPOs].reverse()}
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
                      <Badge variant="warning">Pengajuan</Badge>
                    )
                  ),
                },
                {
                  key: 'actions',
                  header: 'Aksi',
                  align: 'center',
                  cell: (po) => {
                    const isPurchasing = canCreatePO(currentUser.role);
                    const isInventory = canManageInventory(currentUser.role);

                    const items: ActionMenuItem[] = [
                      {
                        label: 'Lihat Detail',
                        icon: <Eye className="h-4 w-4" />,
                        onClick: () => setSelectedProcurementDetail(po),
                      },
                    ];

                    if (po.status === 'DRAFT') {
                      if (isPurchasing) {
                        items.push({
                          label: 'Setujui & Pesan',
                          icon: <Check className="h-4 w-4" />,
                          onClick: () => orderPO(po.id),
                        });
                        items.push({
                          label: 'Tolak',
                          icon: <X className="h-4 w-4" />,
                          variant: 'danger',
                          onClick: () => {
                            setSelectedProcurementDetail(po);
                            setCancelPOReason('');
                            setCancelPOError('');
                            setShowCancelPOModal(true);
                          },
                        });
                        items.push({
                          label: 'Hapus',
                          icon: <Trash2 className="h-4 w-4" />,
                          variant: 'danger',
                          onClick: () => handleDeletePO(po.id, po.poNumber),
                        });
                      }
                    } else if (po.status === 'ORDERED') {
                      if (isInventory) {
                        items.push({
                          label: 'Terima Barang',
                          icon: <PackageCheck className="h-4 w-4" />,
                          onClick: () => receivePO(po.id),
                        });
                      }
                      if (isPurchasing) {
                        items.push({
                          label: 'Batalkan',
                          icon: <X className="h-4 w-4" />,
                          variant: 'danger',
                          onClick: () => {
                            setSelectedProcurementDetail(po);
                            setCancelPOReason('');
                            setCancelPOError('');
                            setShowCancelPOModal(true);
                          },
                        });
                      }
                    } else if (po.status === 'REJECTED') {
                      if (isPurchasing) {
                        items.push({
                          label: 'Hapus',
                          icon: <Trash2 className="h-4 w-4" />,
                          variant: 'danger',
                          onClick: () => handleDeletePO(po.id, po.poNumber),
                        });
                      }
                    }

                    return (
                      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu menuWidth="w-max min-w-[108px]" items={items} />
                      </div>
                    );
                  },
                },
              ]}
            />
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

          {/* Bahan Setengah Jadi Checkbox & Child BOM Builder */}
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
                Item ini adalah Bahan Setengah Jadi (Memiliki Child BOM)
              </span>
            </label>

            {matIsSubAssembly && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    Child BOM Builder & Routing Bahan Setengah Jadi
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Total HPP Bahan Setengah Jadi: {formatCurrency(calculateSubAssemblyCost(matChildBom, materials, matRoutingId, routings, operations))}
                  </span>
                </div>

                {/* Routing Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Alur Routing Produksi Bahan Setengah Jadi <span className="text-red-500">*</span>
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
                    Biaya upah dari alur routing ini akan otomatis ditambahkan ke HPP Bahan Setengah Jadi dan teralokasi saat SPK dibuat.
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
      {/* Modal: Form Barang Jadi */}
      <Modal
        isOpen={showFGModal}
        onClose={() => setShowFGModal(false)}
        title={editFGId ? 'Edit Stok Barang Jadi' : 'Tambah Stok Barang Jadi'}
        size="md"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowFGModal(false)}>Batal</Button>
            <Button onClick={handleSaveFinishedGood}>
              <Check className="h-4 w-4 mr-1.5" />
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          {fgError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{fgError}</span>
            </div>
          )}

          <div className="space-y-3">
            <Select
              label="Pilih Produk Utama"
              required
              value={fgProductId}
              onChange={e => {
                setFGProductId(e.target.value);
                setFGVariantId('');
              }}
              options={[
                { value: '', label: '-- Pilih Produk --' },
                ...products.map(p => ({ value: p.id, label: p.name })),
              ]}
              disabled={!!editFGId}
            />

            {(() => {
              const selectedProd = products.find(p => p.id === fgProductId);
              if (!selectedProd || !selectedProd.variants || selectedProd.variants.length === 0) return null;
              return (
                <Select
                  label="Pilih Varian (Opsional)"
                  value={fgVariantId}
                  onChange={e => setFGVariantId(e.target.value)}
                  options={[
                    { value: '', label: '-- Tanpa Varian --' },
                    ...selectedProd.variants.map(v => ({ value: v.id, label: Object.values(v.combination || {}).join(' • ') || v.sku })),
                  ]}
                  disabled={!!editFGId}
                />
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stok"
                required
                type="number"
                value={fgStock}
                onChange={e => setFGStock(e.target.value)}
              />
              <Input
                label="Batas Min Stok"
                required
                type="number"
                value={fgMinStock}
                onChange={e => setFGMinStock(Number(e.target.value))}
              />
            </div>
            
            <Input
              label="Satuan"
              required
              type="text"
              value={fgUnit}
              onChange={e => setFGUnit(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Form Pengadaan Bahan Baku (PO & Pembelian Langsung) */}
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
                  name="invPurchaseType"
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
                  name="invPurchaseType"
                  value="DIRECT"
                  checked={purchaseType === 'DIRECT'}
                  onChange={() => setPurchaseType('DIRECT')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pembelian Langsung (Tunai)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                Bayar kas langsung & stok otomatis masuk tanpa alur pemesanan.
              </p>
            </div>
          </div>

          <Input
            label="Nama Vendor / Toko"
            required
            placeholder="Contoh: Toko Kayu Sejahtera / PT Multi Surya"
            value={selectedSupplier}
            onChange={e => setSelectedSupplier(e.target.value)}
          />

          {purchaseType === 'DIRECT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kas / Rekening Pembayaran <span className="text-red-500 font-bold">*</span>
                </label>
                <Select
                  value={selectedBankAccountId}
                  onChange={e => setSelectedBankAccountId(e.target.value)}
                  options={bankAccounts.map(b => ({
                    value: b.id,
                    label: `${b.name} (${formatCurrency(b.balance)})`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Biaya Ekspedisi / Ongkir Tambahan (Opsional)
                </label>
                <CurrencyInput
                  value={additionalCost}
                  onChange={val => setAdditionalCost(typeof val === 'number' ? val : 0)}
                  placeholder="Rp 0"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Daftar Item Bahan Baku <span className="text-red-500 font-bold">*</span>
            </label>

            {poItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                Belum ada bahan baku yang ditambahkan ke daftar pengadaan.
              </div>
            ) : (
              <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 pt-2 first:pt-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.materialName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatCurrency(item.unitCost)} / {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => {
                            const newQty = Number(e.target.value);
                            setPOItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: newQty } : it));
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-10 truncate">{item.unit}</span>
                      <div className="font-mono text-xs font-semibold text-right min-w-[90px] text-slate-900 dark:text-white">
                        {formatCurrency(item.qty * item.unitCost)}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removePOItem(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 h-8 w-8"
                        title="Hapus Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddItemRow ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    placeholder="Pilih Bahan Baku..."
                    value={selectedMat}
                    onChange={e => setSelectedMat(e.target.value)}
                    options={materials.filter(m => !m.isSubAssembly).map(m => ({
                      value: m.id,
                      label: `${m.name} (${formatCurrency(m.unitCost)} / ${m.unit})`,
                    }))}
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={selectedQty || ''}
                    onChange={e => setSelectedQty(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={addPOItem}
                    disabled={!selectedMat || selectedQty <= 0}
                    className="h-9 w-9 p-0"
                    title="Tambah"
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
                      if (poItems.length > 0) setShowAddItemRow(false);
                    }}
                    className="h-9 w-9 p-0"
                    title="Batal"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex justify-between items-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddItemRow(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tambah Item Lain
                </Button>
                <div className="text-right text-xs">
                  <span className="text-slate-500 mr-2">Total Estimasi:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {formatCurrency(poItems.reduce((acc, i) => acc + i.qty * i.unitCost, 0) + (purchaseType === 'DIRECT' ? additionalCost : 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Detail Pengadaan */}
      <Modal
        isOpen={!!selectedProcurementDetail}
        onClose={() => setSelectedProcurementDetail(null)}
        title="Detail Pengadaan"
        size="lg"
        actions={(() => {
          if (!selectedProcurementDetail) return undefined;

          const isDraft = selectedProcurementDetail.status === 'DRAFT';
          const isOrdered = selectedProcurementDetail.status === 'ORDERED';
          const isPurchasing = canCreatePO(currentUser.role);
          const isInventory = canManageInventory(currentUser.role);

          if (!isDraft && !isOrdered) return undefined;

          return (
            <div className="flex justify-end items-center gap-2">
              {isDraft && isPurchasing && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setCancelPOReason('');
                      setCancelPOError('');
                      setShowCancelPOModal(true);
                    }}
                  >
                    Tolak Pengajuan
                  </Button>
                  <Button
                    variant="primary"
                    className="whitespace-nowrap font-medium"
                    onClick={() => {
                      orderPO(selectedProcurementDetail.id);
                      setSelectedProcurementDetail(null);
                    }}
                  >
                    Setujui & Pesan
                  </Button>
                </>
              )}

              {isOrdered && (
                <>
                  {isPurchasing && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        setCancelPOReason('');
                        setCancelPOError('');
                        setShowCancelPOModal(true);
                      }}
                    >
                      Batalkan Pesanan
                    </Button>
                  )}
                  {isInventory && (
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
                </>
              )}
            </div>
          );
        })()}
      >
        {selectedProcurementDetail && (
          <div className="space-y-5 py-1">
            {selectedProcurementDetail.status === 'REJECTED' && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs dark:border-red-900/50 dark:bg-red-950/30 space-y-1">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Pengadaan Dibatalkan / Ditolak</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Diproses pada <strong className="font-semibold">{selectedProcurementDetail.cancelledAt ? formatDateTime(selectedProcurementDetail.cancelledAt) : '-'}</strong> oleh <strong className="font-semibold">{selectedProcurementDetail.cancelledBy || 'Admin'}</strong>.
                </p>
                {selectedProcurementDetail.cancelReason && (
                  <p className="text-slate-700 dark:text-slate-200 font-medium italic pt-1 border-t border-red-200/60 dark:border-red-900/40">
                    &quot;{selectedProcurementDetail.cancelReason}&quot;
                  </p>
                )}
              </div>
            )}

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
                      : 'Pengajuan'}
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
                    cell: (item) => <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(item.unitCost)}</span>,
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

      {/* Modal: Form Pembatalan / Penolakan Pengadaan */}
      <Modal
        isOpen={showCancelPOModal}
        onClose={() => setShowCancelPOModal(false)}
        title={selectedProcurementDetail?.status === 'DRAFT' ? `Tolak Pengajuan ${selectedProcurementDetail?.poNumber || ''}` : `Batalkan Pesanan ${selectedProcurementDetail?.poNumber || ''}`}
        size="md"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowCancelPOModal(false)}>Batal</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!selectedProcurementDetail) return;
                if (!cancelPOReason.trim()) {
                  setCancelPOError('Alasan wajib diisi.');
                  return;
                }
                const isDraft = selectedProcurementDetail.status === 'DRAFT';
                const res = rejectPO(selectedProcurementDetail.id, cancelPOReason.trim());
                if (!res.success) {
                  setCancelPOError(res.error || (isDraft ? 'Gagal menolak pengajuan.' : 'Gagal membatalkan pesanan.'));
                } else {
                  toast.success(isDraft ? 'Pengajuan Ditolak' : 'Pesanan Dibatalkan');
                  setShowCancelPOModal(false);
                  setSelectedProcurementDetail(null);
                }
              }}
            >
              {selectedProcurementDetail?.status === 'DRAFT' ? 'Tolak Pengajuan' : 'Batalkan Pesanan'}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {selectedProcurementDetail?.status === 'DRAFT' ? 'Alasan Penolakan Pengajuan' : 'Alasan Pembatalan Pesanan'} <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelPOReason}
              onChange={e => setCancelPOReason(e.target.value)}
              placeholder={selectedProcurementDetail?.status === 'DRAFT' ? 'Contoh: Stok di gudang masih mencukupi...' : 'Contoh: Vendor kehabisan stok...'}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL: BUAT SPK BAHAN SETENGAH JADI (WIP) */}
      <Modal
        isOpen={showSaModal}
        onClose={() => setShowSaModal(false)}
        title="Buat SPK Bahan Setengah Jadi (WIP)"
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowSaModal(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreateSaWorkOrder()}
              disabled={!saMaterialId}
            >
              <Layers className="h-4 w-4 mr-1.5" /> Terbitkan SPK
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSaWorkOrder} className="space-y-4 text-xs">
          {saError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{saError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pilih Bahan Setengah Jadi <span className="text-red-500">*</span>
              </label>
              <Select
                value={saMaterialId}
                onChange={e => {
                  setSaMaterialId(e.target.value);
                  setSaError('');
                }}
                inputSize="sm"
              >
                <option value="">-- Pilih Bahan Setengah Jadi --</option>
                {materials.filter(m => m.isSubAssembly).map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} — Stok Saat Ini: {m.stock} {m.unit}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Kuantitas Rencana SPK <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={saTargetQty}
                onChange={e => setSaTargetQty(e.target.value)}
                placeholder="0"
                inputSize="sm"
                className="font-bold text-right"
              />
            </div>
          </div>

          {/* Child BOM Requirement & Stock Preview */}
          {saMaterialId && (() => {
            const targetMat = materials.find(m => m.id === saMaterialId);
            const targetQtyNum = parseFloat(saTargetQty.replace(',', '.')) || 0;
            const childBom = targetMat?.childBom || [];

            let hasInsufficientStock = false;

            return (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    Kebutuhan Bahan Baku Penyusun (Child BOM)
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Untuk Produksi: <strong className="text-indigo-600 dark:text-indigo-400">{targetQtyNum} {targetMat?.unit || 'unit'}</strong>
                  </span>
                </div>

                {childBom.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 text-amber-800 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="font-semibold text-xs">Item bahan setengah jadi ini belum memiliki Child BOM yang terdaftar di Inventory.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3 py-2">Bahan Baku Penyusun</th>
                          <th className="px-3 py-2 text-center">BOM / Unit</th>
                          <th className="px-3 py-2 text-center">Dibutuhkan</th>
                          <th className="px-3 py-2 text-center">Stok Gudang</th>
                          <th className="px-3 py-2 text-center">Status Stok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {childBom.map((child, idx) => {
                          const childMat = materials.find(m => m.id === child.materialId);
                          const requiredQty = child.qty * targetQtyNum;
                          const currentStock = childMat?.stock || 0;
                          const isOk = currentStock >= requiredQty;
                          if (!isOk) hasInsufficientStock = true;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                                {childMat?.name || child.materialId}
                                <div className="text-[10px] text-slate-400 font-normal">{childMat?.code} • {childMat?.category}</div>
                              </td>
                              <td className="px-3 py-2 text-center font-mono">{child.qty} {childMat?.unit}</td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {requiredQty} {childMat?.unit}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {currentStock} {childMat?.unit}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {isOk ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Stok Cukup
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                    Stok Kurang ({requiredQty - currentStock})
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {hasInsufficientStock && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Peringatan Stok Kurang:</strong> Beberapa bahan baku penyusun memiliki stok di bawah kuantitas kebutuhan produksi. Penerbitan SPK tetap dapat diproses namun disarankan melakukan pengadaan bahan baku terlebih dahulu.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Modal Tindak Lanjut Barang Retur */}
      <Modal
        isOpen={!!selectedReturnItem}
        onClose={() => setSelectedReturnItem(null)}
        title="Tindak Lanjut Barang Retur"
        size="md"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedReturnItem(null)}
            >
              Batal
            </Button>
            <Button
              variant={returnAction === 'SCRAP' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleConfirmReturnAction}
            >
              Simpan Tindakan
            </Button>
          </div>
        }
      >
        {selectedReturnItem && (
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            {/* Ringkasan Item */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2.5 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-start gap-3">
                {(() => {
                  const prod = products.find(p => p.id === selectedReturnItem.productId || p.name === selectedReturnItem.productName);
                  const IconComp = iconMap[prod?.imageIcon || 'BedDouble'] || BedDouble;
                  return prod?.image ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                      <img src={prod.image} alt={selectedReturnItem.productName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                      <IconComp className="h-6 w-6" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {selectedReturnItem.productName}
                  </div>
                  {selectedReturnItem.variantLabel && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatVariantLabel(selectedReturnItem.variantLabel)}
                    </div>
                  )}
                  <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Jumlah Retur: {selectedReturnItem.qty} unit
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Referensi</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedReturnItem.complaintId} • {selectedReturnItem.salesOrderNumber} ({selectedReturnItem.customerName})
                </span>
              </div>
              {selectedReturnItem.conditionReason && (
                <div className="flex justify-between items-start pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0 mr-2">Alasan Retur</span>
                  <span className="text-right text-slate-700 dark:text-slate-300">
                    {selectedReturnItem.conditionReason}
                  </span>
                </div>
              )}
            </div>

            {/* Pilihan Tindakan Alokasi */}
            <div>
              <Select
                label="Pilih Tindakan Alokasi"
                required
                value={returnAction}
                onChange={(e) => setReturnAction(e.target.value as ReturnedGoodAction)}
                options={[
                  { value: 'RESTOCK', label: 'Masuk ke Stok Barang Jadi (Restock)' },
                  { value: 'REPAIR', label: 'Perbaiki Ulang / Reparasi (Rework)' },
                  { value: 'DISASSEMBLE', label: 'Bongkar ke Bahan Baku (Disassemble)' },
                  { value: 'SCRAP', label: 'Afkir / Dibuang ke Sampah (Scrap)' },
                ]}
              />
            </div>

            {/* Input Catatan Tindakan */}
            <div>
              <Input
                label="Catatan Tindakan (Opsional)"
                placeholder="Tambahkan catatan atau instruksi..."
                value={returnActionNotes}
                onChange={(e) => setReturnActionNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
