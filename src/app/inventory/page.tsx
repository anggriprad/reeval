'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUrlTab } from '@/lib/useUrlTab';
import { useTableFilters } from '@/hooks/useTableFilters';
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
import { Checkbox } from '@/components/ui/Checkbox';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDateTime, getStockLevel, getStockLevelColor, getStockLevelTextColor, getStockLevelBadgeVariant, getStockLevelDescription, calculateSubAssemblyCost, calculateRollupBOMCost, getEffectiveVariantBOM, formatVariantLabel, getPOStatusLabel, getPOStatusVariant } from '@/lib/utils';
import { canCreatePO, canManageInventory, canRequestPO, canManageProduction } from '@/lib/roles';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import type { RawMaterial, CompanyAsset, CompanyAssetServiceLog, BOMItem, PurchaseOrder, ReturnedGood, ReturnedGoodAction, ReturnedGoodStatus, AssetAcquisitionType, AssetStatus, FinishedGoodStock, FinishedGoodUnit } from '@/lib/types';
import { RawMaterialSection, ProcurementSection, StockMovementSection } from './components';
import {
  materialCategoryService,
  MaterialCategoryOption,
} from '@/services/material-category.service';
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
  XCircle,
  Ban,
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
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { can } = usePermission();
  const {
    materials,
    stockMovements,
    currentUser,
    categories,
    setMaterialsList,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addMaterialCategory,
    deleteMaterialCategory,
    assets,
    addAsset,
    updateAsset,
    deleteAsset,
    canDeleteAsset,
    assetCategories,
    addAssetCategory,
    deleteAssetCategory,
    assetServiceLogs,
    assetDepreciations = [],
    recordAssetService,
    deleteAssetServiceLog,
    bankAccounts,
    routings = [],
    operations = [],
    bomTemplateItems = [],
    finishedGoods,
    products,
    productCategories,
    purchaseOrders,
    createPO,
    createDirectPurchase,
    orderPO,
    receivePO,
    rejectPO,
    cancelPO,
    cancelRemainingPO,
    createSubAssemblyWorkOrder,
    salesOrders = [],
    returnedGoods = [],
    processReturnedGoodAction,
    confirmReceiveReturnedGood,
    allocateFinishedGoodToOrder,
    workOrders = [],
    deliveryOrders = [],
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');
  const [rawStatusFilter, setRawStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useUrlTab(['raw', 'finished', 'movements', 'procurement', 'assets', 'returns'] as const, 'raw');

  // URL table filters for Raw Materials tab
  const { filters: tableFilters, setFilter } = useTableFilters({
    page: 1,
    per_page: 20,
    search: '',
    category_id: '',
    status: '',
  });

  const [rawSearchInput, setRawSearchInput] = useState(tableFilters.search || '');
  const isRawSearchInitial = useRef(true);

  // Debounce search input for raw materials (800ms)
  useEffect(() => {
    if (isRawSearchInitial.current) {
      isRawSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter('search', rawSearchInput.trim());
      setFilter('page', 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [rawSearchInput, setFilter]);

  // Keep search input in sync if URL search param changes
  useEffect(() => {
    setRawSearchInput(tableFilters.search || '');
  }, [tableFilters.search]);

  // URL table filters for Procurement tab
  const { filters: procurementFilters, setFilter: setProcurementFilter } = useTableFilters({
    po_page: 1,
    po_per_page: 20,
    po_search: '',
    po_status: '',
  });

  const [procurementSearchInput, setProcurementSearchInput] = useState(procurementFilters.po_search || '');
  const isProcurementSearchInitial = useRef(true);

  // Debounce search input for procurement (600ms)
  useEffect(() => {
    if (isProcurementSearchInitial.current) {
      isProcurementSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setProcurementFilter('po_search', procurementSearchInput.trim());
      setProcurementFilter('po_page', 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [procurementSearchInput, setProcurementFilter]);

  useEffect(() => {
    setProcurementSearchInput(procurementFilters.po_search || '');
  }, [procurementFilters.po_search]);

  // URL table filters for Stock Movements tab
  const { filters: movementFilters, setFilter: setMovementFilter } = useTableFilters({
    mv_page: 1,
    mv_per_page: 20,
    mv_search: '',
    mv_type: '',
  });

  const [movementSearchInput, setMovementSearchInput] = useState(movementFilters.mv_search || '');
  const isMovementSearchInitial = useRef(true);

  // Debounce search input for movements (600ms)
  useEffect(() => {
    if (isMovementSearchInitial.current) {
      isMovementSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setMovementFilter('mv_search', movementSearchInput.trim());
      setMovementFilter('mv_page', 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [movementSearchInput, setMovementFilter]);

  useEffect(() => {
    setMovementSearchInput(movementFilters.mv_search || '');
  }, [movementFilters.mv_search]);

  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);

  // Alokasi Barang Jadi ke SO / Pengiriman
  const [selectedFGForAllocation, setSelectedFGForAllocation] = useState<FinishedGoodStock | null>(null);
  const [selectedUnitForAllocation, setSelectedUnitForAllocation] = useState<string>('');
  const [targetOrderIdForAllocation, setTargetOrderIdForAllocation] = useState<string>('');
  const [allocationPurpose, setAllocationPurpose] = useState<'REGULAR' | 'COMPLAINT'>('REGULAR');
  const [targetComplaintIdForAllocation, setTargetComplaintIdForAllocation] = useState<string>('');
  const [allocationError, setAllocationError] = useState<string>('');

  // Modal SPK Bahan Setengah Jadi (WIP)
  const [showSaModal, setShowSaModal] = useState(false);
  const [saMaterialId, setSaMaterialId] = useState('');
  const [saTargetQty, setSaTargetQty] = useState('1');
  const [saError, setSaError] = useState('');

  // Pengadaan (PO & Pembelian Langsung) state
  const [showPOModal, setShowPOModal] = useState(false);
  const [procurementPreselectedMatId, setProcurementPreselectedMatId] = useState<string | null>(null);


  // Master Material Add Modal state (Managed by modular RawMaterialSection)
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);

  // Category options for filter
  const [categoryOptions, setCategoryOptions] = useState<MaterialCategoryOption[]>([]);

  useEffect(() => {
    materialCategoryService
      .getCategoryOptions()
      .then(res => {
        if (res.data) setCategoryOptions(res.data);
      })
      .catch(err => console.error('Failed to fetch category options:', err));
  }, []);

  const [showEmptyStock, setShowEmptyStock] = useState(false);

  // Barang Retur Action state
  const [selectedReturnItem, setSelectedReturnItem] = useState<ReturnedGood | null>(null);
  const [returnAction, setReturnAction] = useState<ReturnedGoodAction>('RESTOCK');
  const [returnActionNotes, setReturnActionNotes] = useState('');

  // Master Asset CRUD state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [crudError, setCrudError] = useState('');
  const [astAcquisitionType, setAstAcquisitionType] = useState<AssetAcquisitionType>('EXISTING');
  const [astCashAccountId, setAstCashAccountId] = useState('');
  const [astCode, setAstCode] = useState('');
  const [astName, setAstName] = useState('');
  const [astCategory, setAstCategory] = useState('');
  const [astPurchaseDate, setAstPurchaseDate] = useState('');
  const [astPurchaseCost, setAstPurchaseCost] = useState<number | ''>('');
  const [astUsefulLifeMonths, setAstUsefulLifeMonths] = useState<number | ''>(60);
  const [astSalvageValue, setAstSalvageValue] = useState<number | ''>(0);
  const [astAccumulatedServiceCost, setAstAccumulatedServiceCost] = useState(0);
  const [astStatus, setAstStatus] = useState<AssetStatus>('ACTIVE');

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

  const openAddAsset = () => {
    setEditAssetId(null);
    setAstAcquisitionType('EXISTING');
    setAstCashAccountId(bankAccounts[0]?.id || '');
    setAstCode('');
    setAstName('');
    setAstCategory(assetCategories[0] || '');
    setAstPurchaseDate(new Date().toISOString().split('T')[0]);
    setAstPurchaseCost('');
    setAstUsefulLifeMonths(60);
    setAstSalvageValue(0);
    setAstAccumulatedServiceCost(0);
    setAstStatus('ACTIVE');
    setCrudError('');
    setShowAssetModal(true);
  };

  const openEditAsset = (ast: CompanyAsset) => {
    setEditAssetId(ast.id);
    setAstAcquisitionType(ast.acquisitionType || 'EXISTING');
    setAstCashAccountId(ast.cashAccountId || bankAccounts[0]?.id || '');
    setAstCode(ast.code);
    setAstName(ast.name);
    setAstCategory(ast.category);
    setAstPurchaseDate(ast.purchaseDate);
    setAstPurchaseCost(ast.purchaseCost);
    setAstUsefulLifeMonths(ast.usefulLifeMonths || (ast.usefulLifeYears * 12));
    setAstSalvageValue(ast.salvageValue ?? 0);
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
    const cost = Number(astPurchaseCost) || 0;
    const months = Number(astUsefulLifeMonths) || 0;
    if (cost <= 0) {
      setCrudError('Harga perolehan harus lebih besar dari 0.');
      return;
    }
    if (months <= 0) {
      setCrudError('Masa manfaat harus lebih besar dari 0 bulan.');
      return;
    }

    const salvage = Number(astSalvageValue) || 0;
    if (salvage < 0) {
      setCrudError('Nilai sisa / residual value tidak boleh negatif.');
      return;
    }
    if (salvage >= cost) {
      setCrudError('Nilai sisa tidak boleh melebihi atau sama dengan harga perolehan.');
      return;
    }

    if (!editAssetId && astAcquisitionType === 'NEW_PURCHASE' && !astCashAccountId) {
      setCrudError('Pilih Sumber Dana untuk pembelian baru.');
      return;
    }

    const payload = {
      code: astCode.trim().toUpperCase(),
      name: astName.trim(),
      category: astCategory,
      acquisitionType: astAcquisitionType,
      purchaseDate: astPurchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: cost,
      usefulLifeMonths: months,
      usefulLifeYears: Math.round((months / 12) * 10) / 10,
      salvageValue: salvage,
      status: astStatus,
      cashAccountId: astAcquisitionType === 'NEW_PURCHASE' ? astCashAccountId : undefined,
    };

    if (editAssetId) {
      updateAsset(editAssetId, payload);
      toast.success('Aset Diperbarui', `Data aset "${payload.name}" berhasil diperbarui.`);
    } else {
      // Check duplicate code
      const isDuplicate = assets.some(a => a.code.toUpperCase() === payload.code.toUpperCase());
      if (isDuplicate) {
        setCrudError(`Aset dengan kode "${payload.code}" sudah terdaftar.`);
        return;
      }
      addAsset(payload);
      toast.success('Aset Ditambahkan', `Aset "${payload.name}" berhasil didaftarkan.`);
    }

    setShowAssetModal(false);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    const check = canDeleteAsset ? canDeleteAsset(id) : { canDelete: true };
    if (!check.canDelete) {
      toast.error('Gagal Menghapus Aset', check.reason || 'Aset tidak dapat dihapus karena memiliki keterkaitan data operasional.');
      return;
    }

    const isOk = await confirm({
      title: 'Hapus Aset Perusahaan',
      message: `Apakah Anda yakin ingin menghapus aset "${name}" dari sistem? Data master aset akan dihapus secara permanen.`,
      confirmText: 'Hapus Aset',
      variant: 'danger',
    });
    if (isOk) {
      const res = deleteAsset(id);
      if (res && typeof res === 'object' && !res.success) {
        toast.error('Gagal Menghapus Aset', res.reason || 'Terjadi kesalahan saat menghapus aset.');
      } else {
        toast.success('Aset Dihapus', `Aset "${name}" berhasil dihapus.`);
      }
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

  const filteredRawMaterials = materials.filter(m => {
    if (m.isActive === false) return false;
    const level = getStockLevel(m.stock, m.minStock);
    const matchesCategory = !inventoryFilter || m.category === inventoryFilter;
    const matchesStatus = !rawStatusFilter || level === rawStatusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      level.toLowerCase().includes(q);
    return matchesCategory && matchesStatus && matchesSearch;
  });



  const filteredFinishedGoods = finishedGoods.filter(fg => {
    if (fg.isActive === false) return false;
    const p = products.find(prod => prod.id === fg.productId);
    if (p && p.isActive === false) return false;
    const matchesCategory = !inventoryFilter || (p && p.category === inventoryFilter);
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (p && p.name.toLowerCase().includes(q)) ||
      (p && p.category.toLowerCase().includes(q)) ||
      (fg.productName && fg.productName.toLowerCase().includes(q)) ||
      (fg.variantLabel && fg.variantLabel.toLowerCase().includes(q));

    const matchesStock = showEmptyStock ? true : fg.stock > 0;

    return matchesCategory && matchesSearch && matchesStock;
  });

  // Helper: Hitung HPP (Material + Produksi) dan Potensi Omzet untuk Barang Jadi
  const getFinishedGoodHPP = (fg: { productId: string; variantId?: string; stock: number }) => {
    const prod = products.find(p => p.id === fg.productId);
    const variant = prod?.variants?.find(v => v.id === fg.variantId) || prod?.variants?.[0];

    // 1. Biaya Material (Rollup BOM)
    const effectiveBom = getEffectiveVariantBOM(variant, bomTemplateItems);
    const materialCost = calculateRollupBOMCost(effectiveBom, materials, routings, operations);

    // 2. Biaya Produksi (Tenaga Kerja / Routing)
    let laborCost = 0;
    const routingId = variant?.routingId || prod?.defaultRoutingId;
    if (routingId && routings.length > 0 && operations.length > 0) {
      const routing = routings.find(r => r.id === routingId);
      if (routing) {
        laborCost = routing.steps.reduce((acc, step) => {
          const op = operations.find(o => o.id === step.operationId);
          if (!op) return acc;
          if (op.costingMethod === 'fixed') {
            return acc + (op.fixedLaborCost || 0);
          }
          const hours = (op.durationMinutes || 0) / 60;
          return acc + (hours * (op.laborCostPerHour || 0));
        }, 0);
      }
    }

    const unitHPP = materialCost + laborCost;
    const totalHPP = unitHPP * (fg.stock || 0);

    // 3. Potensi Omzet (Harga Jual x Stok)
    const unitPrice = variant?.price ?? prod?.basePrice ?? 0;
    const potentialRevenue = unitPrice * (fg.stock || 0);

    return { unitHPP, totalHPP, potentialRevenue };
  };

  // Map stok bahan baku yang ditahan oleh SPK aktif
  const reservedMaterialMap = useMemo(() => {
    const map = new Map<string, number>();
    (workOrders || [])
      .filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELED')
      .forEach(w => {
        (w.materialsConsumed || []).forEach(b => {
          map.set(b.materialId, (map.get(b.materialId) || 0) + b.qty);
        });
      });
    return map;
  }, [workOrders]);

  // Map stok barang jadi yang ditahan oleh unit RESERVED di gudang, Antrean Kirim, dan Delivery Order aktif
  const reservedFinishedGoodMap = useMemo(() => {
    const map = new Map<string, number>();

    // 1. Dari unit fisik yang RESERVED di finishedGoods
    finishedGoods.forEach(fg => {
      const explicitReserved = (fg.units || []).filter(u => u.status === 'RESERVED').length;
      if (explicitReserved > 0) {
        map.set(fg.id, explicitReserved);
      }
    });

    // 2. Untuk finished goods yang belum memiliki list units eksplisit:
    finishedGoods.forEach(fg => {
      if (!map.has(fg.id)) {
        let reservedCount = 0;
        (salesOrders || []).forEach(so => {
          if (so.status !== 'CANCELED' && so.status !== 'SENT') {
            (so.items || []).forEach(item => {
              const match = (item.productId === fg.productId && (!fg.variantId || item.variantId === fg.variantId)) ||
                (item.productName === fg.productName && (!fg.variantLabel || item.variantLabel === fg.variantLabel));
              if (match) {
                const waitingToShip = Math.max(0, (item.producedQty || 0) - (item.deliveredQty || 0));
                reservedCount += waitingToShip;
              }
            });
          }
        });
        if (reservedCount > 0) {
          map.set(fg.id, Math.min(fg.stock, reservedCount));
        }
      }
    });

    return map;
  }, [deliveryOrders, finishedGoods, salesOrders]);

  // Filter Sales Order yang membutuhkan barang jadi ini (untuk modal alokasi)
  const eligibleOrdersForAllocation = useMemo(() => {
    if (!selectedFGForAllocation) return [];
    return (salesOrders || []).filter(so => {
      if (so.status === 'CANCELED') return false;
      if (so.status === 'SENT') {
        return (so.complaints || []).some(c =>
          (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
          c.replacementStatus !== 'DELIVERED' &&
          (c.items || []).some(ci =>
            ci.productId === selectedFGForAllocation.productId &&
            (!selectedFGForAllocation.variantId || ci.variantId === selectedFGForAllocation.variantId)
          )
        );
      }
      const hasUnfulfilledItem = (so.items || []).some(item =>
        item.productId === selectedFGForAllocation.productId &&
        (!selectedFGForAllocation.variantId || item.variantId === selectedFGForAllocation.variantId) &&
        (item.producedQty || 0) < item.qty
      );
      const hasActiveComplaint = (so.complaints || []).some(c =>
        (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
        c.replacementStatus !== 'DELIVERED' &&
        (c.items || []).some(ci =>
          ci.productId === selectedFGForAllocation.productId &&
          (!selectedFGForAllocation.variantId || ci.variantId === selectedFGForAllocation.variantId)
        )
      );
      return hasUnfulfilledItem || hasActiveComplaint;
    });
  }, [selectedFGForAllocation, salesOrders]);

  const handleConfirmAllocation = () => {
    if (!selectedFGForAllocation || !targetOrderIdForAllocation) {
      setAllocationError('Pilih Sales Order tujuan.');
      return;
    }

    const res = allocateFinishedGoodToOrder(
      selectedFGForAllocation.id,
      selectedUnitForAllocation || undefined,
      targetOrderIdForAllocation,
      allocationPurpose === 'COMPLAINT' ? targetComplaintIdForAllocation : undefined
    );

    if (res.success) {
      toast.success('Alokasi Berhasil', res.message || 'Unit berhasil dialokasikan ke Antrean Kirim.');
      setSelectedFGForAllocation(null);
      setTargetOrderIdForAllocation('');
      setSelectedUnitForAllocation('');
      setTargetComplaintIdForAllocation('');
      setAllocationPurpose('REGULAR');
      setAllocationError('');
    } else {
      setAllocationError(res.message || 'Gagal mengalokasikan unit.');
    }
  };

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

  // ---- Pengadaan (Procurement) Handlers ----
  const openAddProcurement = (targetMatId?: string) => {
    setProcurementPreselectedMatId(targetMatId || null);
    if (targetMatId) {
      setActiveTab('procurement');
    }
    setShowPOModal(true);
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
          {activeTab === 'raw' && (can(PERMISSIONS.INVENTORY.CREATE) || canManageInventory(currentUser.role)) && (
            <Button onClick={() => setShowAddMaterialModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register Bahan
            </Button>
          )}
          {activeTab === 'procurement' && (can(PERMISSIONS.PURCHASING.CREATE) || canRequestPO(currentUser.role)) && (
            <Button onClick={() => openAddProcurement()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Buat Pengadaan
            </Button>
          )}
          {activeTab === 'movements' && (can(PERMISSIONS.INVENTORY.ADJUST) || canManageInventory(currentUser.role)) && (
            <Button onClick={() => setShowAdjustStockModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Penyesuaian Stok
            </Button>
          )}
          {activeTab === 'assets' && (can(PERMISSIONS.INVENTORY.ASSET_CREATE) || canManageInventory(currentUser.role)) && (
            <Button onClick={openAddAsset}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register Aset Baru
            </Button>
          )}
          {(can(PERMISSIONS.INVENTORY.CATEGORY_READ) || can(PERMISSIONS.INVENTORY.ASSET_CATEGORY_READ) || canManageInventory(currentUser.role)) && (
            <Link href="/inventory/config">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-1.5" />
                Konfigurasi
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      {/* Reusable Segmented Control: 5 Tab */}
      {(() => {
        let filterOptions: { value: string; label: string }[] = [];
        let filterPlaceholder = "Filter Atribut";

        if (activeTab === 'raw') {
          filterPlaceholder = "Semua Kategori";
          filterOptions = categoryOptions.length > 0
            ? categoryOptions.map(c => ({ value: c.name, label: c.name }))
            : categories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'finished') {
          filterPlaceholder = "Semua Kategori Produk";
          filterOptions = productCategories.map(c => ({ value: c, label: c }));
        } else if (activeTab === 'returns') {
          filterPlaceholder = "Semua Status Retur";
          filterOptions = [
            { value: '', label: 'Semua Status Retur' },
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
            { value: 'DRAFT', label: 'Menunggu' },
            { value: 'ORDERED', label: 'Dipesan' },
            { value: 'PARTIALLY_RECEIVED', label: 'Diterima Sebagian' },
            { value: 'RECEIVED', label: 'Diterima' },
            { value: 'REJECTED', label: 'Ditolak' },
            { value: 'CANCELED', label: 'Dibatalkan' },
          ];

        } else if (activeTab === 'movements') {
          filterPlaceholder = "Semua Jenis";
          filterOptions = [
            { value: '', label: 'Semua Jenis' },
            { value: 'IN', label: 'Masuk' },
            { value: 'OUT', label: 'Keluar' },
            { value: 'INIT', label: 'Inisiasi' },
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
              setRawStatusFilter('');
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
            filters={
              activeTab === 'raw'
                ? [
                    {
                      id: 'raw-cat',
                      value: tableFilters.category_id,
                      onChange: (catId) => {
                        setFilter('category_id', catId);
                        setFilter('page', 1);
                      },
                      options: categoryOptions.map((c) => ({ value: String(c.id), label: c.name })),
                      placeholder: 'Semua Kategori',
                    },
                    {
                      id: 'raw-status',
                      value: tableFilters.status,
                      onChange: (st) => {
                        setFilter('status', st);
                        setFilter('page', 1);
                      },
                      options: [
                        { value: 'Aman', label: 'Status: Aman' },
                        { value: 'Kritis', label: 'Status: Kritis' },
                        { value: 'Habis', label: 'Status: Habis' },
                      ],
                      placeholder: 'Semua Status',
                    },
                  ]
                : undefined
            }
            filterValue={
              activeTab === 'procurement'
                ? procurementFilters.po_status
                : activeTab === 'movements'
                ? movementFilters.mv_type
                : inventoryFilter
            }
            onFilterChange={(val) => {
              if (activeTab === 'procurement') {
                setProcurementFilter('po_status', val);
                setProcurementFilter('po_page', 1);
              } else if (activeTab === 'movements') {
                setMovementFilter('mv_type', val);
                setMovementFilter('mv_page', 1);
              } else {
                setInventoryFilter(val);
              }
            }}
            filterPlaceholder={filterPlaceholder}
            filterOptions={filterOptions}
            searchValue={
              activeTab === 'raw'
                ? rawSearchInput
                : activeTab === 'procurement'
                ? procurementSearchInput
                : activeTab === 'movements'
                ? movementSearchInput
                : searchTerm
            }
            onSearchChange={
              activeTab === 'raw'
                ? setRawSearchInput
                : activeTab === 'procurement'
                ? setProcurementSearchInput
                : activeTab === 'movements'
                ? setMovementSearchInput
                : setSearchTerm
            }
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

      {/* Raw Materials Stock Section (Modular) */}
      {activeTab === 'raw' && (
        <RawMaterialSection
          filters={tableFilters}
          setFilter={setFilter}
          isAddModalOpen={showAddMaterialModal}
          onCloseAddModal={() => setShowAddMaterialModal(false)}
          onOpenProcurement={matId => openAddProcurement(matId)}
          onOpenCreateSaWorkOrder={matId => openCreateSaWorkOrder(matId)}
        />
      )}

      {/* Finished Goods Table */}
      {activeTab === 'finished' && (
        filteredFinishedGoods.length === 0 ? (
          <EmptyState
            title={searchTerm || inventoryFilter || !showEmptyStock ? "Tidak Ada Barang Jadi" : "Belum Ada Barang Jadi"}
            description={
              searchTerm || inventoryFilter || !showEmptyStock
                ? (!showEmptyStock && finishedGoods.some(f => (f.stock || 0) <= 0)
                    ? 'Tidak ada barang jadi dengan stok tersedia. Aktifkan toggle "Tampilkan barang dengan stok kosong" untuk melihat semua item.'
                    : 'Tidak ada barang jadi yang cocok dengan pencarian atau filter.')
                : "Barang jadi hasil produksi yang telah selesai akan otomatis muncul di sini."
            }
            icon={<PackageCheck className="h-7 w-7 text-slate-400" />}
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table
              data={filteredFinishedGoods}
              keyExtractor={(fg) => fg.id}
            emptyTitle="Belum ada barang jadi"
            emptyDescription={
              searchTerm || inventoryFilter || !showEmptyStock
                ? (!showEmptyStock && finishedGoods.length > 0
                    ? 'Tidak ada barang jadi dengan stok tersedia. Aktifkan toggle "Tampilkan barang dengan stok kosong" untuk melihat semua item.'
                    : 'Tidak ada barang jadi yang cocok dengan pencarian atau filter.')
                : 'Barang jadi terdaftar otomatis saat menambahkan produk di Katalog Produk.'
            }
              columns={[
                {
                  key: 'visual',
                  header: 'Visual',
                  align: 'center',
                  cell: (fg) => {
                    const prod = products.find(p => p.id === fg.productId);
                    const IconComp = iconMap[prod?.imageIcon || 'BedDouble'] || BedDouble;

                    return prod?.image ? (
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 mx-auto">
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 mx-auto">
                        <IconComp className="h-5 w-5" />
                      </div>
                    );
                  },
                },
                {
                  key: 'productName',
                  header: 'Nama Produk',
                  width: '320px',
                  className: 'min-w-[300px]',
                  cell: (fg) => {
                    const prod = products.find(p => p.id === fg.productId);
                    const variant = prod?.variants?.find(v => v.id === fg.variantId);
                    const variantText = fg.variantLabel || (variant ? (Object.values(variant.combination || {}).join(' • ') || variant.sku) : '');
                    const productName = fg.productName || prod?.name || 'Produk Tidak Ditemukan';

                    return (
                      <div className="flex flex-col gap-0.5 max-w-[320px]">
                        <TruncatedText
                          text={productName}
                          className="font-semibold text-slate-900 dark:text-white"
                          maxWidth="300px"
                        />
                        {variantText && (
                          <TruncatedText
                            text={formatVariantLabel(variantText)}
                            className="text-xs text-slate-500 dark:text-slate-400"
                            maxWidth="300px"
                          />
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'category',
                  header: 'Kategori',
                  cell: (fg) => {
                    const prod = products.find(p => p.id === fg.productId);
                    const categoryName = prod?.category || '-';

                    return (
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {categoryName}
                      </span>
                    );
                  },
                },
                {
                  key: 'stock',
                  header: 'Stok Gudang',
                  align: 'right',
                  cell: (fg) => (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {fg.stock}
                    </span>
                  ),
                },
                {
                  key: 'reservedStock',
                  header: 'Stok Ditahan',
                  align: 'right',
                  cell: (fg) => {
                    const reserved = reservedFinishedGoodMap.get(fg.id) || 0;
                    return (
                      <span className={`font-mono ${reserved > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                        {reserved}
                      </span>
                    );
                  },
                },
                {
                  key: 'availableStock',
                  header: 'Stok Bebas',
                  align: 'right',
                  cell: (fg) => {
                    const reserved = reservedFinishedGoodMap.get(fg.id) || 0;
                    const available = Math.max(0, fg.stock - reserved);
                    return (
                      <span className={`font-mono font-semibold ${available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {available}
                      </span>
                    );
                  },
                },
                {
                  key: 'unitHPP',
                  header: 'HPP Satuan',
                  align: 'right',
                  cell: (fg) => {
                    const { unitHPP } = getFinishedGoodHPP(fg);
                    return (
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(unitHPP)}
                      </span>
                    );
                  },
                },
                {
                  key: 'totalHPP',
                  header: 'Total Nilai HPP',
                  align: 'right',
                  cell: (fg) => {
                    const { totalHPP } = getFinishedGoodHPP(fg);
                    return (
                      <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(totalHPP)}
                      </span>
                    );
                  },
                },
                {
                  key: 'potentialRevenue',
                  header: 'Potensi Omzet',
                  align: 'right',
                  cell: (fg) => {
                    const { potentialRevenue } = getFinishedGoodHPP(fg);
                    return (
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(potentialRevenue)}
                      </span>
                    );
                  },
                },
                ...(canManageInventory(currentUser.role)
                  ? [
                      {
                        key: 'action',
                        header: 'Aksi',
                        align: 'center' as const,
                        width: '120px',
                        cell: (fg: FinishedGoodStock) => {
                          const reserved = reservedFinishedGoodMap.get(fg.id) || 0;
                          const available = Math.max(0, fg.stock - reserved);
                          return (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={available <= 0}
                              onClick={() => {
                                setSelectedFGForAllocation(fg);
                                setSelectedUnitForAllocation('');
                                setTargetOrderIdForAllocation('');
                                setTargetComplaintIdForAllocation('');
                                setAllocationPurpose('REGULAR');
                                setAllocationError('');
                              }}
                            >
                              Alokasikan
                            </Button>
                          );
                        },
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        )
      )}

      {/* Barang Retur Table */}
      {activeTab === 'returns' && (
        filteredReturnedGoods.length === 0 ? (
          <EmptyState
            title="Tidak Ada Barang Retur"
            description={
              searchTerm || inventoryFilter
                ? "Tidak ada data barang retur yang cocok dengan pencarian atau filter."
                : "Barang retur dari komplain yang telah disetujui (refund, penggantian, atau perbaikan) akan otomatis tercatat di sini."
            }
            icon={<RotateCcw className="h-7 w-7 text-slate-400" />}
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table
              data={filteredReturnedGoods}
              keyExtractor={(rg) => rg.id}
            embedded
            emptyTitle="Tidak Ada Barang Retur"
            emptyDescription={
              searchTerm || inventoryFilter
                ? "Tidak ada data barang retur yang cocok dengan pencarian atau filter."
                : "Barang retur dari komplain yang telah disetujui (refund, penggantian, atau perbaikan) akan otomatis tercatat di sini."
            }
            emptyIcon={<RotateCcw className="h-7 w-7 text-slate-400" />}
            columns={[
              {
                key: 'product',
                header: 'Produk',
                align: 'left',
                width: '320px',
                className: 'min-w-[300px]',
                cell: (rg) => {
                  const prod = products.find(p => p.id === rg.productId || p.name === rg.productName);
                  const IconComp = iconMap[prod?.imageIcon || 'BedDouble'] || BedDouble;
                  const soItem = salesOrders
                    .find(so => so.id === rg.salesOrderId || so.orderNumber === rg.salesOrderNumber)
                    ?.items.find(i => i.productId === rg.productId && (!rg.variantId || i.variantId === rg.variantId));
                  const orderItemNotes = rg.customNotes || soItem?.customNotes;

                  return (
                    <div className="flex items-start gap-3 max-w-[320px]">
                      {prod?.image ? (
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                          <img src={prod.image} alt={rg.productName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <IconComp className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <TruncatedText
                          text={rg.productName}
                          className="font-semibold text-xs text-slate-900 dark:text-white"
                          maxWidth="240px"
                        />
                        {rg.variantLabel && (
                          <TruncatedText
                            text={formatVariantLabel(rg.variantLabel)}
                            className="text-[11px] text-slate-500 dark:text-slate-400"
                            maxWidth="240px"
                          />
                        )}
                        {orderItemNotes && (
                          <TruncatedText
                            text={`Catatan: ${orderItemNotes}`}
                            className="text-[11px] text-slate-500 dark:text-slate-400 italic"
                            maxWidth="240px"
                          />
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'reference',
                header: 'Referensi',
                align: 'left',
                width: '160px',
                className: 'min-w-[150px]',
                cell: (rg) => (
                  <div>
                    <Link
                      href={`/order/complaint/${rg.complaintId}`}
                      className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline block"
                    >
                      Komplain #{rg.complaintId}
                    </Link>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {rg.salesOrderNumber}
                    </span>
                  </div>
                ),
              },
              {
                key: 'qty',
                header: 'Qty',
                align: 'right',
                cell: (rg) => (
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {rg.qty} unit
                  </span>
                ),
              },
              {
                key: 'reason',
                header: 'Alasan Retur',
                align: 'left',
                width: '260px',
                className: 'min-w-[240px]',
                cell: (rg) => (
                  <TruncatedText
                    text={rg.conditionReason}
                    className="text-xs text-slate-600 dark:text-slate-400"
                    maxWidth="240px"
                  />
                ),
              },
              {
                key: 'status',
                header: 'Status',
                align: 'center',
                cell: (rg) => {
                  const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'purple' | 'default' | 'danger' }> = {
                    AWAITING_RECEIVAL: { label: 'Menunggu Fisik', variant: 'warning' },
                    PENDING: { label: 'Menunggu Fisik', variant: 'warning' },
                    RECEIVED: { label: 'Diterima di Gudang', variant: 'purple' },
                    RESTOCKED: { label: 'Masuk Barang Jadi', variant: 'success' },
                    REPAIR: { label: 'Diperbaiki', variant: 'purple' },
                    DISASSEMBLED: { label: 'Dibongkar', variant: 'default' },
                    SCRAPPED: { label: 'Afkir / Sampah', variant: 'danger' },
                    CANCELED: { label: 'Dibatalkan', variant: 'default' },
                  };
                  const cfg = statusConfig[rg.status] || { label: rg.status, variant: 'default' };
                  return (
                    <Badge variant={cfg.variant} className="text-[11px]">
                      {cfg.label}
                    </Badge>
                  );
                },
              },
              ...(canManageInventory(currentUser.role)
                ? [
                    {
                      key: 'action',
                      header: 'Aksi',
                      align: 'center' as const,
                      width: '160px',
                      cell: (rg: ReturnedGood) => {
                        const order = salesOrders.find(so => so.id === rg.salesOrderId || so.orderNumber === rg.salesOrderNumber);
                        const complaint = order?.complaints?.find(c => c.id === rg.complaintId);
                        const isComplaintPending = complaint && (complaint.status === 'MENUNGGU' || complaint.status === 'DIAJUKAN');

                        if (isComplaintPending) {
                          return (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                              Menunggu Resolusi CS
                            </span>
                          );
                        }

                        if (rg.status === 'AWAITING_RECEIVAL' || (rg.status === 'PENDING' && !rg.receivedAt)) {
                          return (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  confirmReceiveReturnedGood(rg.id);
                                  toast.success('Barang Diterima', 'Fisik barang retur telah dikonfirmasi tiba di gudang.');
                                }}
                              >
                                Terima Fisik
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  processReturnedGoodAction(rg.id, 'CANCEL', 'Dibatalkan / tidak ditarik');
                                  toast.info('Retur Dibatalkan', 'Barang retur ditandai batal/tidak ditarik.');
                                }}
                              >
                                Batal
                              </Button>
                            </div>
                          );
                        }

                        if (rg.status === 'RECEIVED' || rg.status === 'PENDING') {
                          return (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openReturnActionModal(rg)}
                            >
                              Tindak Lanjuti
                            </Button>
                          );
                        }
                        return <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">-</span>;
                      },
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      )
    )}

      {/* Stock Movements Section (Modular) */}
      {activeTab === 'movements' && (
        <StockMovementSection
          filters={{
            page: movementFilters.mv_page,
            per_page: movementFilters.mv_per_page,
            search: movementFilters.mv_search,
            type: movementFilters.mv_type,
          }}
          setFilter={(key, val) => {
            if (key === 'page') setMovementFilter('mv_page', val);
            else if (key === 'per_page') setMovementFilter('mv_per_page', val);
            else if (key === 'search') setMovementFilter('mv_search', val);
            else if (key === 'type') setMovementFilter('mv_type', val);
          }}
          isAdjustModalOpen={showAdjustStockModal}
          onCloseAdjustModal={() => setShowAdjustStockModal(false)}
          onOpenAdjustModal={() => setShowAdjustStockModal(true)}
        />
      )}

      {/* Procurement (Pengadaan) Section (Modular) */}
      {activeTab === 'procurement' && (
        <ProcurementSection
          filters={{
            page: procurementFilters.po_page,
            per_page: procurementFilters.po_per_page,
            search: procurementFilters.po_search,
            status: procurementFilters.po_status,
          }}
          setFilter={(key, val) => {
            if (key === 'page') setProcurementFilter('po_page', val);
            else if (key === 'per_page') setProcurementFilter('po_per_page', val);
            else if (key === 'search') setProcurementFilter('po_search', val);
            else if (key === 'status') setProcurementFilter('po_status', val);
          }}
          isCreateModalOpen={showPOModal}
          onCloseCreateModal={() => setShowPOModal(false)}
          preselectedMaterialId={procurementPreselectedMatId}
          onClearPreselectedMaterial={() => setProcurementPreselectedMatId(null)}
        />
      )}

      {/* Assets Table */}
      {activeTab === 'assets' && (
        filteredAssets.length === 0 ? (
          <EmptyState
            title={searchTerm || inventoryFilter ? "Tidak Ada Aset" : "Belum Ada Aset Terdaftar"}
            description={
              searchTerm || inventoryFilter
                ? "Tidak ada aset yang cocok dengan pencarian atau filter."
                : "Register aset & alat kerja untuk mencatat biaya penyusutan dan servis."
            }
            icon={<Wrench className="h-7 w-7 text-slate-400" />}
          />
        ) : (
          <Card>
            <Table
              data={filteredAssets}
              keyExtractor={(ast) => ast.id}
              onRowClick={(ast) => router.push(`/inventory/assets/${ast.id}`)}
              columns={[
                {
                  key: 'code',
                  header: 'Kode',
                  cell: (ast) => (
                    <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {ast.code}
                    </span>
                  ),
                },
                {
                  key: 'name',
                  header: 'Nama Aset & Kategori',
                  width: '280px',
                  className: 'min-w-[260px]',
                  cell: (ast) => (
                    <div className="flex flex-col gap-0.5 max-w-[280px]">
                      <TruncatedText
                        text={ast.name}
                        className="font-semibold text-slate-900 dark:text-white"
                        maxWidth="260px"
                      />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ast.category}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'acquisitionType',
                  header: 'Perolehan',
                  align: 'center',
                  cell: (ast) =>
                    ast.acquisitionType === 'NEW_PURCHASE' ? (
                      <Badge variant="purple">Beli Baru</Badge>
                    ) : (
                      <Badge variant="default">Saldo Awal</Badge>
                    ),
                },
                {
                  key: 'purchaseCost',
                  header: 'Harga Perolehan',
                  align: 'right',
                  cell: (ast) => (
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      {formatCurrency(ast.purchaseCost)}
                    </span>
                  ),
                },
                {
                  key: 'currentBookValue',
                  header: 'Nilai Buku',
                  align: 'right',
                  cell: (ast) => (
                    <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(ast.currentBookValue ?? ast.purchaseCost)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  cell: (ast) => {
                    const statusVariant: 'success' | 'warning' | 'danger' | 'default' =
                      ast.status === 'ACTIVE' || ast.status === 'AKTIF'
                        ? 'success'
                        : ast.status === 'IN_MAINTENANCE' || ast.status === 'MAINTENANCE'
                        ? 'warning'
                        : ast.status === 'BROKEN' || ast.status === 'RUSAK'
                        ? 'danger'
                        : 'default';

                    const statusLabel =
                      ast.status === 'ACTIVE' || ast.status === 'AKTIF'
                        ? 'Aktif'
                        : ast.status === 'IN_MAINTENANCE' || ast.status === 'MAINTENANCE'
                        ? 'Perawatan'
                        : ast.status === 'BROKEN' || ast.status === 'RUSAK'
                        ? 'Rusak'
                        : ast.status === 'DISPOSED'
                        ? 'Dijual'
                        : 'Afkir / Scrap';

                    return <Badge variant={statusVariant}>{statusLabel}</Badge>;
                  },
                },
                ...(canManageInventory(currentUser.role)
                  ? [
                      {
                        key: 'actions',
                        header: 'Aksi',
                        align: 'center' as const,
                        cell: (ast: CompanyAsset) => {
                          const serviceCount = (assetServiceLogs || []).filter(l => l.assetId === ast.id).length;
                          const depreciationCount = (assetDepreciations || []).filter(d => d.assetId === ast.id).length;
                          const hasDependencies = serviceCount > 0 || depreciationCount > 0;

                          const menuItems: ActionMenuItem[] = [
                            {
                              label: 'Edit',
                              icon: <Edit2 className="h-3.5 w-3.5" />,
                              onClick: () => openEditAsset(ast),
                            },
                            {
                              label: 'Catat Servis',
                              icon: <Wrench className="h-3.5 w-3.5" />,
                              onClick: () => openManageServices(ast),
                            },
                          ];

                          if (!hasDependencies) {
                            menuItems.push({
                              label: 'Hapus',
                              icon: <Trash2 className="h-3.5 w-3.5" />,
                              variant: 'danger',
                              onClick: () => handleDeleteAsset(ast.id, ast.name),
                            });
                          }

                          return (
                            <div
                              className="flex items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ActionMenu menuWidth="w-max min-w-[120px]" items={menuItems} />
                            </div>
                          );
                        },
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        )
      )}

      {/* Modal: Master Asset CRUD (Add / Edit) */}
      <Modal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        title={editAssetId ? 'Edit Aset Perusahaan' : 'Register Aset Baru'}
        size="lg"
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowAssetModal(false)}>Batal</Button>
            <Button type="button" onClick={handleSaveAsset}>Simpan</Button>
          </>
        }
      >
        <form onSubmit={handleSaveAsset} className="space-y-4 pb-2">
          {crudError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{crudError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode Aset"
              required
              value={astCode}
              onChange={e => setAstCode(e.target.value)}
              placeholder="Misal: AST-MSN-001"
              disabled={!!editAssetId}
            />
            <Select
              label="Kategori"
              required
              value={astCategory}
              onChange={e => setAstCategory(e.target.value)}
              options={assetCategories.map(cat => ({ value: cat, label: cat }))}
            />
          </div>

          <div>
            <Input
              label="Nama Aset"
              required
              value={astName}
              onChange={e => setAstName(e.target.value)}
              placeholder="Contoh: Mesin Cutting CNC Wood Router"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Tanggal Perolehan"
              required
              value={astPurchaseDate}
              onChange={e => setAstPurchaseDate(e.target.value)}
            />
            <Select
              label="Status"
              required
              value={astStatus}
              onChange={e => setAstStatus(e.target.value as any)}
              options={[
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'IN_MAINTENANCE', label: 'Dalam Pemeliharaan' },
                { value: 'BROKEN', label: 'Rusak' },
                { value: 'DISPOSED', label: 'Dijual' },
                { value: 'SCRAPPED', label: 'Afkir / Scrap' },
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <CurrencyInput
              label="Harga Perolehan (Rp)"
              required
              value={astPurchaseCost}
              onChange={val => setAstPurchaseCost(val)}
            />
            <Input
              type="number"
              label="Masa Manfaat (Bulan)"
              required
              value={astUsefulLifeMonths}
              onChange={e => setAstUsefulLifeMonths(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="60"
            />
            <CurrencyInput
              label="Nilai Sisa / Residu (Rp)"
              value={astSalvageValue}
              onChange={val => setAstSalvageValue(val)}
            />
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

          {/* Mode Perolehan: Checkbox Pembelian Baru & Sumber Dana di Paling Bawah */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <Checkbox
              id="checkbox-new-purchase"
              label="Pembelian Baru"
              checked={astAcquisitionType === 'NEW_PURCHASE'}
              disabled={!!editAssetId}
              onChange={(checked) => {
                setAstAcquisitionType(checked ? 'NEW_PURCHASE' : 'EXISTING');
                if (checked && !astCashAccountId) {
                  setAstCashAccountId(bankAccounts[0]?.id || '');
                }
              }}
            />
            {astAcquisitionType === 'NEW_PURCHASE' && (
              <Select
                label="Sumber Dana"
                required
                value={astCashAccountId}
                onChange={e => setAstCashAccountId(e.target.value)}
                options={bankAccounts.map(b => ({
                  value: b.id,
                  label: `${b.name} (${formatCurrency(b.balance)})`,
                }))}
                placeholder="Pilih Sumber Dana"
              />
            )}
          </div>
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
                    <td colSpan={canManageInventory(currentUser.role) ? 4 : 3} className="p-2">
                      <EmptyState
                        title="Belum Ada Riwayat Servis"
                        description="Belum ada riwayat servis tercatat untuk aset ini."
                        variant="plain"
                      />
                    </td>
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
                  { value: 'RESTOCK', label: 'Masuk ke Stok Bebas Barang Jadi (Restock)' },
                  { value: 'DISASSEMBLE', label: 'Bongkar ke Bahan Baku (Disassemble)' },
                  { value: 'SCRAP', label: 'Afkir / Dibuang ke Sampah (Scrap)' },
                  { value: 'CANCEL', label: 'Batalkan / Tidak Ditarik' },
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

      {/* Modal Alokasi Barang Jadi ke Sales Order / Pengiriman */}
      <Modal
        isOpen={!!selectedFGForAllocation}
        onClose={() => {
          setSelectedFGForAllocation(null);
          setAllocationError('');
        }}
        title="Alokasikan ke Pengiriman"
        size="md"
        actions={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFGForAllocation(null);
                setAllocationError('');
              }}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmAllocation}
              disabled={!targetOrderIdForAllocation}
            >
              Alokasikan Unit
            </Button>
          </div>
        }
      >
        {selectedFGForAllocation && (
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            {/* Info Produk & Stok Bebas */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {selectedFGForAllocation.productName}
              </div>
              {selectedFGForAllocation.variantLabel && (
                <div className="text-slate-500">
                  {formatVariantLabel(selectedFGForAllocation.variantLabel)}
                </div>
              )}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span className="text-slate-500">Stok Bebas Tersedia:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.max(0, selectedFGForAllocation.stock - (reservedFinishedGoodMap.get(selectedFGForAllocation.id) || 0))} unit
                </span>
              </div>
            </div>

            {/* Pilihan Fisik Unit (jika ada unit spesifik dengan catatan/SPK) */}
            {(selectedFGForAllocation.units || []).filter(u => u.status === 'AVAILABLE').length > 0 && (
              <div>
                <Select
                  label="Pilih Unit Fisik Spesifik (Opsional)"
                  value={selectedUnitForAllocation}
                  onChange={e => setSelectedUnitForAllocation(e.target.value)}
                  options={[
                    { value: '', label: 'Unit Pertama yang Tersedia (Otomatis)' },
                    ...(selectedFGForAllocation.units || [])
                      .filter(u => u.status === 'AVAILABLE')
                      .map(u => ({
                        value: u.id,
                        label: `${u.spkNumber ? `SPK ${u.spkNumber}` : u.id}${u.customNotes ? ` (Catatan: ${u.customNotes})` : ''}`,
                      })),
                  ]}
                />
              </div>
            )}

            {/* Pilihan Sales Order Tujuan (Filter Otomatis) */}
            <div>
              <Select
                label="Pilih Sales Order Tujuan"
                required
                value={targetOrderIdForAllocation}
                onChange={e => {
                  setTargetOrderIdForAllocation(e.target.value);
                  const so = salesOrders.find(o => o.id === e.target.value);
                  const hasCmp = (so?.complaints || []).some(c =>
                    (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
                    c.replacementStatus !== 'DELIVERED'
                  );
                  if (hasCmp) {
                    setAllocationPurpose('COMPLAINT');
                    const cmp = so?.complaints?.find(c => (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') && c.replacementStatus !== 'DELIVERED');
                    setTargetComplaintIdForAllocation(cmp?.id || '');
                  } else {
                    setAllocationPurpose('REGULAR');
                    setTargetComplaintIdForAllocation('');
                  }
                  if (allocationError) setAllocationError('');
                }}
                options={[
                  { value: '', label: eligibleOrdersForAllocation.length === 0 ? 'Tidak ada SO aktif yang membutuhkan produk ini' : '-- Pilih Sales Order --' },
                  ...eligibleOrdersForAllocation.map(so => {
                    const hasCmp = (so.complaints || []).some(c =>
                      (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
                      c.replacementStatus !== 'DELIVERED'
                    );
                    return {
                      value: so.id,
                      label: `${so.orderNumber} - ${so.customer.name} (${hasCmp ? 'Komplain Aktif' : `Status: ${so.status}`})`,
                    };
                  }),
                ]}
              />
              {eligibleOrdersForAllocation.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500 italic">
                  Hanya Sales Order aktif atau yang memiliki komplain berjalan dan memesan produk ini yang dapat dialokasikan.
                </p>
              )}
            </div>

            {/* Jika Order memiliki komplain dan item reguler */}
            {targetOrderIdForAllocation && (() => {
              const so = salesOrders.find(o => o.id === targetOrderIdForAllocation);
              const hasCmp = (so?.complaints || []).some(c =>
                (c.status === 'MENUNGGU' || c.status === 'DITANGANI' || c.status === 'DIAJUKAN') &&
                c.replacementStatus !== 'DELIVERED'
              );
              const hasReg = (so?.items || []).some(it =>
                it.productId === selectedFGForAllocation.productId &&
                (!selectedFGForAllocation.variantId || it.variantId === selectedFGForAllocation.variantId) &&
                (it.producedQty || 0) < it.qty
              );

              if (hasCmp && hasReg) {
                return (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tujuan Alokasi
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="allocPurpose"
                          checked={allocationPurpose === 'REGULAR'}
                          onChange={() => setAllocationPurpose('REGULAR')}
                        />
                        <span>Pemenuhan Pesanan Reguler</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="allocPurpose"
                          checked={allocationPurpose === 'COMPLAINT'}
                          onChange={() => setAllocationPurpose('COMPLAINT')}
                        />
                        <span>Penggantian Komplain</span>
                      </label>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {allocationError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {allocationError}
              </p>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
