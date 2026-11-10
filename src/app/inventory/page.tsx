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
import {
  RawMaterialSection,
  ProcurementSection,
  StockMovementSection,
  FinishedGoodsTableSection,
  AssetTableSection,
  ReturnedGoodsTabSection,
} from './components';
import { materialService, type MaterialItem } from '@/services/material.service';
import { workOrderService } from '@/services/work-order.service';
import { returnedGoodService } from '@/services/returned-good.service';
import {
  materialCategoryService,
  MaterialCategoryOption,
} from '@/services/material-category.service';
import {
  productCategoryService,
  ProductCategoryOption,
} from '@/services/product-category.service';
import {
  assetCategoryService,
  AssetCategoryOption,
} from '@/services/asset-category.service';
import { userService, type UserOption } from '@/services/user.service';
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
    po_created_by_id: '',
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

  // URL table filters for Finished Goods tab
  const { filters: fgFilters, setFilter: setFGFilter } = useTableFilters({
    fg_page: 1,
    fg_per_page: 20,
    fg_search: '',
    fg_category_id: '',
    fg_show_empty: false,
  });

  const [fgSearchInput, setFgSearchInput] = useState(fgFilters.fg_search || '');
  const isFgSearchInitial = useRef(true);

  // Debounce search input for finished goods (600ms)
  useEffect(() => {
    if (isFgSearchInitial.current) {
      isFgSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFGFilter('fg_search', fgSearchInput.trim());
      setFGFilter('fg_page', 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [fgSearchInput, setFGFilter]);

  useEffect(() => {
    setFgSearchInput(fgFilters.fg_search || '');
  }, [fgFilters.fg_search]);

  // Product category options for Finished Goods filter
  const [productCategoryOptions, setProductCategoryOptions] = useState<ProductCategoryOption[]>([]);
  const [creatorUserOptions, setCreatorUserOptions] = useState<UserOption[]>([]);

  useEffect(() => {
    productCategoryService
      .getCategoryOptions()
      .then((res) => {
        if (res.data) setProductCategoryOptions(res.data);
      })
      .catch((err) => console.error('Failed to load product category options:', err));

    userService
      .getUserOptions()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setCreatorUserOptions(res.data);
        }
      })
      .catch((err) => console.error('Failed to load user options:', err));
  }, []);

  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);

  // Modal SPK Bahan Setengah Jadi (WIP)
  const [showSaModal, setShowSaModal] = useState(false);
  const [saMaterialId, setSaMaterialId] = useState('');
  const [saTargetQty, setSaTargetQty] = useState('1');
  const [saError, setSaError] = useState('');
  const [isSubmittingSa, setIsSubmittingSa] = useState(false);
  const [wipMaterials, setWipMaterials] = useState<MaterialItem[]>([]);
  const [selectedWipDetail, setSelectedWipDetail] = useState<MaterialItem | null>(null);
  const [allMaterialsMap, setAllMaterialsMap] = useState<Record<number, MaterialItem>>({});

  const fetchWipData = useCallback(async (selectedId?: string) => {
    try {
      const res = await materialService.getMaterials({ per_page: 200 });
      if (res.data) {
        const matMap: Record<number, MaterialItem> = {};
        const wips: MaterialItem[] = [];
        res.data.forEach((m) => {
          matMap[m.id] = m;
          if (m.is_sub_assembly) {
            wips.push(m);
          }
        });
        setAllMaterialsMap(matMap);
        setWipMaterials(wips);
        const targetId = selectedId || saMaterialId;
        if (targetId && matMap[Number(targetId)]) {
          setSelectedWipDetail(matMap[Number(targetId)]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch WIP materials:', err);
    }
  }, [saMaterialId]);

  useEffect(() => {
    if (showSaModal) {
      fetchWipData(saMaterialId);
    }
  }, [showSaModal, saMaterialId, fetchWipData]);

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

  // URL table filters for Returned Goods tab
  const { filters: retFilters, setFilter: setRetFilter } = useTableFilters({
    ret_page: 1,
    ret_per_page: 20,
    ret_search: '',
    ret_status: '',
  });

  const [retSearchInput, setRetSearchInput] = useState(retFilters.ret_search || '');
  const isRetSearchInitial = useRef(true);

  // Debounce search input for returned goods (500ms)
  useEffect(() => {
    if (isRetSearchInitial.current) {
      isRetSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setRetFilter('ret_search', retSearchInput.trim());
      setRetFilter('ret_page', 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [retSearchInput, setRetFilter]);

  useEffect(() => {
    setRetSearchInput(retFilters.ret_search || '');
  }, [retFilters.ret_search]);

  // Returned goods pending action counter (awaiting_receival + received) from dedicated counting endpoint
  const [pendingReturnsCount, setPendingReturnsCount] = useState<number>(0);

  const fetchReturnedGoodCounts = useCallback(async () => {
    if (!can(PERMISSIONS.RETURNED_GOOD.READ)) return;
    try {
      const res = await returnedGoodService.getReturnedGoodCounts();
      if (res.success && res.data) {
        setPendingReturnsCount(res.data.pending_action ?? (res.data.awaiting_receival + res.data.received));
      }
    } catch (err) {
      console.warn('Failed to load returned good counts:', err);
    }
  }, [can]);

  useEffect(() => {
    fetchReturnedGoodCounts();
  }, [fetchReturnedGoodCounts]);

  // URL table filters for Assets tab
  const { filters: astFilters, setFilter: setAstFilter } = useTableFilters({
    ast_page: 1,
    ast_per_page: 20,
    ast_search: '',
    ast_category_id: '',
    ast_status: '',
  });

  const [astSearchInput, setAstSearchInput] = useState(astFilters.ast_search || '');
  const isAstSearchInitial = useRef(true);

  // Debounce search input for assets (600ms)
  useEffect(() => {
    if (isAstSearchInitial.current) {
      isAstSearchInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setAstFilter('ast_search', astSearchInput.trim());
      setAstFilter('ast_page', 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [astSearchInput, setAstFilter]);

  useEffect(() => {
    setAstSearchInput(astFilters.ast_search || '');
  }, [astFilters.ast_search]);

  // Category options for Assets filter
  const [assetCategoryOptions, setAssetCategoryOptions] = useState<AssetCategoryOption[]>([]);

  useEffect(() => {
    assetCategoryService
      .getCategoryOptions()
      .then((res) => {
        if (res.data) setAssetCategoryOptions(res.data);
      })
      .catch((err) => console.error('Failed to load asset category options:', err));
  }, []);

  const [showAssetModal, setShowAssetModal] = useState(false);

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
    if (materialId && allMaterialsMap[Number(materialId)]) {
      setSelectedWipDetail(allMaterialsMap[Number(materialId)]);
    } else {
      setSelectedWipDetail(null);
    }
    setShowSaModal(true);
    fetchWipData(materialId);
  };

  const handleCreateSaWorkOrder = async (e?: React.FormEvent) => {
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

    setIsSubmittingSa(true);
    try {
      const res = await workOrderService.createManualWorkOrder({
        category: 'WIP',
        sub_assembly_id: Number(saMaterialId),
        target_qty: qty,
      });

      const targetMat = selectedWipDetail || allMaterialsMap[Number(saMaterialId)];
      toast.success(
        'SPK Berhasil Dibuat',
        `SPK ${res.data?.spk_number || ''} untuk ${qty} ${targetMat?.unit || 'unit'} "${targetMat?.name || 'WIP'}" berhasil diterbitkan.`
      );
      setShowSaModal(false);
      setSaMaterialId('');
      setSaTargetQty('1');
    } catch (err: any) {
      console.error('Failed to create WIP work order:', err);
      setSaError(err?.response?.data?.message || err?.message || 'Gagal menerbitkan SPK.');
    } finally {
      setIsSubmittingSa(false);
    }
  };



  return (
    <div className='space-y-3'>
      <PageHeader
        title="Inventaris"
      >
        <div className="flex gap-2">
          {activeTab === 'raw' && can(PERMISSIONS.INVENTORY.CREATE) && (
            <Button onClick={() => setShowAddMaterialModal(true)}>
              <Plus className="h-4 w-4" />
              Register Bahan
            </Button>
          )}
          {activeTab === 'procurement' && can(PERMISSIONS.PURCHASING.CREATE) && (
            <Button onClick={() => openAddProcurement()}>
              <Plus className="h-4 w-4" />
              Buat Pengadaan
            </Button>
          )}
          {activeTab === 'movements' && can(PERMISSIONS.INVENTORY.STOCK_MOVEMENT_ADJUST) && (
            <Button onClick={() => setShowAdjustStockModal(true)}>
              <Plus className="h-4 w-4" />
              Penyesuaian Stok
            </Button>
          )}
          {activeTab === 'assets' && can(PERMISSIONS.INVENTORY.ASSET_CREATE) && (
            <Button onClick={() => setShowAssetModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register Aset Baru
            </Button>
          )}
          {(can(PERMISSIONS.INVENTORY.CATEGORY_READ) || can(PERMISSIONS.INVENTORY.ASSET_CATEGORY_READ)) && (
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
            { value: 'AWAITING_RECEIVAL', label: 'Menunggu Fisik' },
            { value: 'RECEIVED', label: 'Diterima di Gudang' },
            { value: 'RESTOCKED', label: 'Masuk Barang Jadi' },
            { value: 'DISASSEMBLED', label: 'Dibongkar' },
            { value: 'SCRAPPED', label: 'Afkir / Sampah' },
            { value: 'CANCELED', label: 'Dibatalkan' },
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

        return (
          <SegmentedControl
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as 'raw' | 'finished' | 'movements' | 'procurement' | 'assets' | 'returns');
              setInventoryFilter('');
              setRawStatusFilter('');
            }}
            options={[
              ...(can(PERMISSIONS.INVENTORY.READ)
                ? [{ key: 'raw' as const, label: 'Stok Bahan Baku', icon: Warehouse }]
                : []),
              ...(can(PERMISSIONS.FINISHED_GOOD.READ)
                ? [{ key: 'finished' as const, label: 'Stok Barang Jadi', icon: PackageCheck }]
                : []),
              ...(can(PERMISSIONS.INVENTORY.STOCK_MOVEMENT_READ)
                ? [{ key: 'movements' as const, label: 'Mutasi Stok', icon: ArrowDownCircle }]
                : []),
              ...(can(PERMISSIONS.PURCHASING.READ)
                ? [{ key: 'procurement' as const, label: 'Pengadaan', icon: ShoppingCart }]
                : []),
              ...(can(PERMISSIONS.INVENTORY.ASSET_READ)
                ? [{ key: 'assets' as const, label: 'Aset & Alat Kerja', icon: Wrench }]
                : []),
              ...(can(PERMISSIONS.RETURNED_GOOD.READ)
                ? [
                    {
                      key: 'returns' as const,
                      label: 'Barang Retur',
                      icon: RotateCcw,
                      count: pendingReturnsCount > 0 ? pendingReturnsCount : undefined,
                    },
                  ]
                : []),
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
                : activeTab === 'finished'
                  ? [
                    {
                      id: 'fg-cat',
                      value: fgFilters.fg_category_id,
                      onChange: (catId) => {
                        setFGFilter('fg_category_id', catId);
                        setFGFilter('fg_page', 1);
                      },
                      options: productCategoryOptions.map((c) => ({ value: String(c.id), label: c.name })),
                      placeholder: 'Semua Kategori Produk',
                    },
                  ]
                  : activeTab === 'assets'
                    ? [
                      {
                        id: 'ast-cat',
                        value: astFilters.ast_category_id,
                        onChange: (catId) => {
                          setAstFilter('ast_category_id', catId);
                          setAstFilter('ast_page', 1);
                        },
                        options: assetCategoryOptions.map((c) => ({ value: String(c.id), label: c.name })),
                        placeholder: 'Semua Kategori Aset',
                      },
                      {
                        id: 'ast-status',
                        value: astFilters.ast_status,
                        onChange: (st) => {
                          setAstFilter('ast_status', st);
                          setAstFilter('ast_page', 1);
                        },
                        options: [
                          { value: 'ACTIVE', label: 'Status: Aktif' },
                          { value: 'IN_MAINTENANCE', label: 'Status: Pemeliharaan' },
                          { value: 'BROKEN', label: 'Status: Rusak' },
                          { value: 'DISPOSED', label: 'Status: Dijual' },
                          { value: 'SCRAPPED', label: 'Status: Afkir / Scrap' },
                        ],
                        placeholder: 'Semua Status',
                      },
                    ]
                  : activeTab === 'procurement'
                    ? [
                      {
                        id: 'po-status',
                        value: procurementFilters.po_status,
                        onChange: (st) => {
                          setProcurementFilter('po_status', st);
                          setProcurementFilter('po_page', 1);
                        },
                        options: [
                          { value: 'DRAFT', label: 'Status: Menunggu' },
                          { value: 'ORDERED', label: 'Status: Dipesan' },
                          { value: 'PARTIALLY_RECEIVED', label: 'Status: Diterima Sebagian' },
                          { value: 'RECEIVED', label: 'Status: Diterima' },
                          { value: 'REJECTED', label: 'Status: Ditolak' },
                          { value: 'CANCELED', label: 'Status: Dibatalkan' },
                        ],
                        placeholder: 'Semua Status',
                      },
                      {
                        id: 'po-creator',
                        value: procurementFilters.po_created_by_id,
                        onChange: (uid) => {
                          setProcurementFilter('po_created_by_id', uid);
                          setProcurementFilter('po_page', 1);
                        },
                        options: creatorUserOptions.map((u) => ({
                          value: String(u.id),
                          label: `Dibuat: ${u.full_name || u.email}`,
                        })),
                        placeholder: 'Semua Pembuat',
                      },
                    ]
                  : undefined
            }
            filterValue={
              activeTab === 'procurement'
                ? procurementFilters.po_status
                : activeTab === 'movements'
                  ? movementFilters.mv_type
                  : activeTab === 'returns'
                    ? retFilters.ret_status
                    : inventoryFilter
            }
            onFilterChange={(val) => {
              if (activeTab === 'procurement') {
                setProcurementFilter('po_status', val);
                setProcurementFilter('po_page', 1);
              } else if (activeTab === 'movements') {
                setMovementFilter('mv_type', val);
                setMovementFilter('mv_page', 1);
              } else if (activeTab === 'returns') {
                setRetFilter('ret_status', val);
                setRetFilter('ret_page', 1);
              } else {
                setInventoryFilter(val);
              }
            }}
            filterPlaceholder={filterPlaceholder}
            filterOptions={filterOptions}
            searchValue={
              activeTab === 'raw'
                ? rawSearchInput
                : activeTab === 'finished'
                  ? fgSearchInput
                  : activeTab === 'procurement'
                    ? procurementSearchInput
                    : activeTab === 'movements'
                      ? movementSearchInput
                      : activeTab === 'assets'
                        ? astSearchInput
                        : activeTab === 'returns'
                          ? retSearchInput
                          : searchTerm
            }
            onSearchChange={
              activeTab === 'raw'
                ? setRawSearchInput
                : activeTab === 'finished'
                  ? setFgSearchInput
                  : activeTab === 'procurement'
                    ? setProcurementSearchInput
                    : activeTab === 'movements'
                      ? setMovementSearchInput
                      : activeTab === 'assets'
                        ? setAstSearchInput
                        : activeTab === 'returns'
                          ? setRetSearchInput
                          : setSearchTerm
            }
            searchPlaceholder="Cari bahan baku, barang jadi, pengadaan, mutasi, atau aset..."
            extraControls={
              activeTab === 'finished' ? (
                <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <Toggle
                    size="sm"
                    checked={
                      typeof fgFilters.fg_show_empty === 'boolean'
                        ? fgFilters.fg_show_empty
                        : fgFilters.fg_show_empty === 'true' || fgFilters.fg_show_empty === '1'
                    }
                    onChange={(val) => {
                      setFGFilter('fg_show_empty', val);
                      setFGFilter('fg_page', 1);
                    }}
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

      {/* Finished Goods Table (Modular) */}
      {activeTab === 'finished' && (
        <FinishedGoodsTableSection
          filters={fgFilters}
          setFilter={setFGFilter}
          categoryOptions={productCategoryOptions}
        />
      )}

      {/* Barang Retur Table Section (Modular) */}
      {activeTab === 'returns' && (
        <ReturnedGoodsTabSection
          filters={retFilters}
          setFilter={setRetFilter}
          onCountsUpdated={fetchReturnedGoodCounts}
        />
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
            created_by_id: procurementFilters.po_created_by_id,
          }}
          setFilter={(key, val) => {
            if (key === 'page') setProcurementFilter('po_page', val);
            else if (key === 'per_page') setProcurementFilter('po_per_page', val);
            else if (key === 'search') setProcurementFilter('po_search', val);
            else if (key === 'status') setProcurementFilter('po_status', val);
            else if (key === 'created_by_id') setProcurementFilter('po_created_by_id', val);
          }}
          isCreateModalOpen={showPOModal}
          onCloseCreateModal={() => setShowPOModal(false)}
          preselectedMaterialId={procurementPreselectedMatId}
          onClearPreselectedMaterial={() => setProcurementPreselectedMatId(null)}
        />
      )}

      {/* Assets Table Section (Modular) */}
      {activeTab === 'assets' && (
        <AssetTableSection
          filters={astFilters}
          setFilter={setAstFilter}
          isAddModalOpen={showAssetModal}
          onCloseAddModal={() => setShowAssetModal(false)}
          categoryOptions={assetCategoryOptions}
        />
      )}

      {/* MODAL: BUAT SPK BAHAN SETENGAH JADI (WIP) */}
      <Modal
        isOpen={showSaModal}
        onClose={() => setShowSaModal(false)}
        title="Buat SPK Bahan Setengah Jadi (WIP)"
        size="lg"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowSaModal(false)} disabled={isSubmittingSa}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreateSaWorkOrder()}
              disabled={!saMaterialId || isSubmittingSa}
            >
              <Layers className="h-4 w-4 mr-1.5" /> {isSubmittingSa ? 'Menerbitkan...' : 'Terbitkan SPK'}
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
                  const val = e.target.value;
                  setSaMaterialId(val);
                  setSelectedWipDetail(allMaterialsMap[Number(val)] || null);
                  setSaError('');
                }}
                inputSize="sm"
              >
                <option value="">-- Pilih Bahan Setengah Jadi --</option>
                {wipMaterials.map(m => (
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
            const targetMat = selectedWipDetail || allMaterialsMap[Number(saMaterialId)];
            const targetQtyNum = parseFloat(saTargetQty.replace(',', '.')) || 0;
            const childBom = targetMat?.child_bom || [];

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
                          const childMat = allMaterialsMap[child.child_material_id];
                          const requiredQty = child.qty * targetQtyNum;
                          const currentStock = childMat?.stock || 0;
                          const isOk = currentStock >= requiredQty;
                          if (!isOk) hasInsufficientStock = true;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                                {childMat?.name || `Material #${child.child_material_id}`}
                                <div className="text-[10px] text-slate-400 font-normal">{childMat?.code || '-'} • {childMat?.category || '-'}</div>
                              </td>
                              <td className="px-3 py-2 text-center font-mono">{child.qty} {childMat?.unit || 'unit'}</td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {requiredQty} {childMat?.unit || 'unit'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {currentStock} {childMat?.unit || 'unit'}
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
    </div>
  );
}
