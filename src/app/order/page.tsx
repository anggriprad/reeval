'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Textarea } from '@/components/ui/Textarea';
import { SegmentedControl, SegmentOption } from '@/components/ui/SegmentedControl';
import { formatCurrency, formatDateTime, formatPhoneDisplay, formatVariantLabel, getOrderStatusColor, getOrderStatusVariant, getOrderStatusLabel, getComplaintStatusLabel, getCustomerLocationDisplay, cn } from '@/lib/utils';
import { canApproveOrder, canCreateOrder, USER_ACCOUNTS } from '@/lib/roles';
import type { OrderStatus, SalesOrder } from '@/lib/types';
import { CustomProcessModal } from '@/components/order/CustomProcessModal';
import {
  Plus,
  CheckCircle,
  ShoppingCart,
  User,
  MoreVertical,
  Edit,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cog,
  PackageCheck,
  Truck,
  MapPin,
  Settings,
  Layers,
  Check,
  FileText,
  Sliders,
  BedDouble,
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

export function OrderListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const createHref = '/order/create';
  const { toast } = useToast();
  const {
    salesOrders,
    products,
    currentUser,
    processOrder,
    cancelOrder,
    showAllOrdersTab,
  } = useApp();

  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [customProcessOrder, setCustomProcessOrder] = useState<SalesOrder | null>(null);
  const [statusFilter, setStatusFilter] = useUrlTab(['all', 'pending', 'processing', 'ready', 'sent', 'canceled', 'komplain'] as const, 'pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [salesFilter, setSalesFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpandOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter orders based on user role & status
  const baseOrders = currentUser.role === 'SALES'
    ? salesOrders.filter(o => o.createdBy === currentUser.name || o.createdBy === 'Budi Santoso' || o.createdBy === 'Sari Wulandari')
    : salesOrders;

  const salesOptions = Array.from(
    new Set([
      ...USER_ACCOUNTS.filter(u => u.role === 'SALES').map(u => u.name),
      'Budi Santoso',
      'Sari Wulandari',
      ...salesOrders.map(o => o.createdBy).filter(Boolean),
    ])
  ).map(name => ({
    value: name,
    label: name
  }));

  const filteredOrders = baseOrders
    .filter(o => {
      if (statusFilter === 'all') return true;
      const s = o.status;
      if (statusFilter === 'processing') return s === 'PROCESSING' || s === 'PARTIALLY_READY';
      if (statusFilter === 'ready') return s === 'READY' || s === 'PARTIALLY_SHIPPED';
      if (statusFilter === 'komplain') return false;
      return s.toLowerCase() === statusFilter;
    })
    .filter(o => !salesFilter || o.createdBy === salesFilter)
    .filter(o => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        (o.customer.phone && o.customer.phone.toLowerCase().includes(q)) ||
        (o.customer.address && o.customer.address.toLowerCase().includes(q)) ||
        o.createdBy.toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q) || (i.variantLabel && i.variantLabel.toLowerCase().includes(q)))
      );
    });

  const allComplaints = baseOrders
    .filter(o => !salesFilter || o.createdBy === salesFilter)
    .flatMap(o => (o.complaints || []).map(c => ({
      ...c,
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer.name
    })));

  const filteredComplaints = allComplaints.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.orderNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.items.some(i => i.productName.toLowerCase().includes(q))
    );
  });
  const handleProcessOrder = (id: string) => {
    setErrorMsg('');
    const targetOrder = salesOrders.find(o => o.id === id);
    const res = processOrder(id);
    if (res && !res.success) {
      setErrorMsg(res.error || 'Terjadi kesalahan saat memproses order.');
      toast.error('Gagal Memproses Pesanan', res.error || 'Terjadi kesalahan saat memproses pesanan.');
    } else {
      toast.success('Pesanan Diproses', `Pesanan ${targetOrder?.orderNumber || ''} berhasil diproses.`);
    }
  };

  const handleOpenCancelModal = (orderId: string) => {
    setCancelModalOrderId(orderId);
    setCancelReasonInput('');
    setCancelReasonError('');
  };

  const handleConfirmCancelOrder = () => {
    if (!cancelReasonInput.trim()) {
      setCancelReasonError('Mohon isi alasan pembatalan order.');
      return;
    }
    if (cancelModalOrderId) {
      const targetOrder = salesOrders.find(o => o.id === cancelModalOrderId);
      cancelOrder(cancelModalOrderId, cancelReasonInput.trim());
      toast.success('Sales Order Dibatalkan', `Sales Order ${targetOrder?.orderNumber || ''} telah berhasil dibatalkan.`);
      setCancelModalOrderId(null);
      setCancelReasonInput('');
    }
  };

  const orderToCancel = salesOrders.find(o => o.id === cancelModalOrderId);

  const statusTabOptions: SegmentOption<string>[] = [
    ...(showAllOrdersTab ? [{
      key: 'all',
      label: 'Semua',
      icon: Layers,
    }] : []),
    {
      key: 'pending',
      label: 'Menunggu',
      count: baseOrders.filter(o => o.status === 'PENDING').length,
      icon: Clock,
    },
    {
      key: 'processing',
      label: 'Diproses',
      count: baseOrders.filter(o => o.status === 'PROCESSING' || o.status === 'PARTIALLY_READY').length,
      icon: Cog,
    },
    {
      key: 'ready',
      label: 'Siap Kirim',
      count: baseOrders.filter(o => o.status === 'READY' || o.status === 'PARTIALLY_SHIPPED').length,
      icon: Truck,
    },
    {
      key: 'sent',
      label: 'Terkirim',
      icon: CheckCircle,
    },
    {
      key: 'canceled',
      label: 'Dibatalkan',
      icon: XCircle,
    },
    {
      key: 'komplain',
      label: 'Komplain',
      count: baseOrders.filter(o => o.complaints?.some(c => c.status !== 'SELESAI' && c.status !== 'DITOLAK')).length || undefined,
      icon: AlertCircle,
      countColor: 'bg-red-600',
    }
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Sales Order">
        {canCreateOrder(currentUser.role) && (
          <Link href={createHref}>
            <Button>
              <Plus className="h-4 w-4" />
              Buat Pesanan
            </Button>
          </Link>
        )}
        <Link href="/order/config">
          <Button variant="outline">
            <Settings className="h-4 w-4" />
            Konfigurasi
          </Button>
        </Link>
      </PageHeader>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
        </div>
      )}

      {/* Standardized Reusable Segmented Control */}
      <SegmentedControl
        options={statusTabOptions}
        value={statusFilter}
        onChange={(val) => setStatusFilter(val as any)}
        filterValue={salesFilter}
        onFilterChange={setSalesFilter}
        filterOptions={salesOptions}
        filterPlaceholder="Semua Sales"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari sales order, pelanggan, produk..."
      />

      {/* List */}
      {statusFilter === 'komplain' ? (
        filteredComplaints.length === 0 ? (
          <EmptyState
            title="Tidak Ada Komplain"
            description="Tidak ada komplain yang sesuai dengan filter/pencarian."
            icon={<AlertCircle className="h-7 w-7 text-slate-400" />}
          />
        ) : (
          <div className="grid gap-2.5 sm:gap-4 max-md:-mx-4 md:mx-0">
            {filteredComplaints.map(complaint => (
              <Card
                key={complaint.id}
                noPadding
                noRounded="mobile"
                onClick={() => router.push(`/order/complaint/${complaint.id}`)}
                className="dark:hover:bg-slate-800/70 transition-all relative p-4 flex flex-col gap-3 sm:gap-3.5 cursor-pointer hover:shadow-lg hover:border-slate-300"
              >
                {/* TOP ROW: Header (Timestamp & Status) + ID SO (Desktop only) */}
                <div className="flex items-center justify-between gap-3 w-full">
                  {/* Timestamp & Status Badges */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap w-full sm:w-auto">
                    <span className="text-[13px] sm:text-xs font-normal text-slate-500 dark:text-slate-400">
                      {formatDateTime(complaint.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={
                        complaint.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                        complaint.status === 'DITOLAK' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800' :
                        complaint.status === 'DITANGANI' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
                        'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }>
                        {getComplaintStatusLabel(complaint.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* ID SO: Desktop only (hidden on mobile) */}
                  <div className="hidden sm:block text-right text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 shrink-0">
                    <span>{complaint.orderNumber}</span>
                  </div>
                </div>

                {/* INFO PELANGGAN: Kategori Komplain di atas Nama Pelanggan (Tanpa Alamat) */}
                <div className="flex flex-col space-y-1 text-[13.5px] sm:text-xs font-normal text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-sm sm:text-xs text-slate-900 dark:text-white">
                    {complaint.category}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium sm:font-normal">{complaint.customerName}</span>
                  </span>
                </div>

                {/* MIDDLE SECTION: Complaint Items */}
                <div className="space-y-2">
                  {complaint.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId || p.name === item.productName);
                    const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

                    return (
                      <div key={idx} className="space-y-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                        {/* Row: Visual & Info Produk (Kiri) + QTY (Kanan) */}
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          {/* KIRI: Visual Produk + Nama & Varian */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {product?.image ? (
                              <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                                <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                <IconComp className="h-6 w-6" />
                              </div>
                            )}

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">
                                {item.productName}
                              </span>
                              {item.variantLabel && (
                                <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                                  {formatVariantLabel(item.variantLabel)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* KANAN: QTY */}
                          <div className="flex items-center text-right shrink-0">
                            <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                              x {item.qty}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* BOTTOM SECTION: Deskripsi Komplain (Tempat yang sama dengan catatan pesanan pada card SO) */}
                {complaint.description && (
                  <div className="flex items-center gap-2 mt-1 pt-1">
                    <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                        Deskripsi Komplain:
                      </span>
                      <p className="text-[13.5px] sm:text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed truncate">
                        {complaint.description}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="Tidak Ada Order"
          description={`Tidak ada pesanan ${statusFilter === 'all' ? 'terdaftar.' : `dengan status ${getOrderStatusLabel((statusFilter.toUpperCase()) as OrderStatus)}.`}`}
          icon={<ShoppingCart className="h-7 w-7" />}
        />
      ) : (
        <div className="grid gap-2.5 sm:gap-4 max-md:-mx-4 md:mx-0">
          {filteredOrders.map(order => {
            return (
              <Card
                key={order.id}
                noPadding
                noRounded="mobile"
                onClick={() => router.push(`/order/${order.id}`)}
                className="dark:hover:bg-slate-800/70 transition-all relative p-4 flex flex-col gap-3 sm:gap-3.5 cursor-pointer hover:shadow-lg hover:border-slate-300"
              >
                {/* TOP ROW: Header (Timestamp & Status) + Sales | ID SO (Desktop only) */}
                <div className="flex items-center justify-between gap-3 w-full">
                  {/* Timestamp & Status Badges */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap w-full sm:w-auto">
                    <span className="text-[13px] sm:text-xs font-normal text-slate-500 dark:text-slate-400">
                      {formatDateTime(order.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {getOrderStatusLabel(order.status, order.cancelledByRole)}
                      </Badge>
                      {order.items.some(i => i.isBomCustomized) && (
                        <Badge variant="purple">
                          Kustom Proses
                        </Badge>
                      )}
                      {order.complaints && order.complaints.some(c => c.status !== 'SELESAI' && c.status !== 'DITOLAK') && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                          Dikomplain
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Salesperson & ID SO: Desktop only (hidden on mobile) */}
                  <div className="hidden sm:block text-right text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 shrink-0">
                    {order.createdBy} <span className="text-slate-300 dark:text-slate-600 mx-1">|</span> <span>{order.orderNumber}</span>
                  </div>
                </div>

                {/* CUSTOMER INFO: Nama pelanggan & Alamat (Kecamatan & Kota saja jika ada) */}
                <div className="flex flex-col space-y-1 text-[13.5px] sm:text-xs font-normal text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium sm:font-normal">{order.customer.name}</span>
                  </span>
                  {(order.customer.address || order.customer.district) && (
                    <span className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
                      <MapPin className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        {getCustomerLocationDisplay(order.customer)}
                      </span>
                    </span>
                  )}
                </div>

                  {order.status === 'CANCELED' && order.cancelReason && (
                    <div className="text-[13.5px] sm:text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 p-2.5 rounded-lg border border-red-100 dark:border-red-900/50">
                      <span className="font-bold">Alasan Pembatalan:</span> {order.cancelReason}
                    </div>
                  )}

                  {/* MIDDLE SECTION: Order Items */}
                  <div className="space-y-2">
                    {order.items.slice(0, expandedOrders[order.id] ? order.items.length : 1).map((item, idx) => {
                      const product = products.find(p => p.id === item.productId || p.name === item.productName);
                      const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

                      return (
                        <div key={idx} className="space-y-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                          {/* Row: Visual & Info Produk (Kiri) + QTY & Nominal (Kanan) */}
                          <div className="flex items-center justify-between gap-3 min-w-0">
                            {/* KIRI: Visual Produk + Nama & Varian (Maksimal 1 baris dengan elipsis) */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {product?.image ? (
                                <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                                  <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                  <IconComp className="h-6 w-6" />
                                </div>
                              )}

                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">
                                    {item.productName}
                                  </span>
                                  {item.isBomCustomized && (
                                    <Badge variant="purple" className="shrink-0 text-[10px] py-0 px-1.5 font-semibold">
                                      {item.qty > 1 && item.unitCustomProcesses
                                        ? `Kustom (${item.unitCustomProcesses.filter(u => u.isBomCustomized).length}/${item.qty})`
                                        : 'Kustom'}
                                    </Badge>
                                  )}
                                </div>

                                {item.variantLabel && (
                                  <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                                    {formatVariantLabel(item.variantLabel)}
                                  </div>
                                )}

                                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {item.selectedModifiers.map(mGroup => (
                                      mGroup.selectedOptions.map(opt => (
                                        <span key={opt.optionId} className="text-xs bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-medium truncate max-w-[130px]">
                                          +{opt.name}
                                        </span>
                                      ))
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* KANAN: QTY */}
                            <div className="flex items-center text-right shrink-0">
                              <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                                x {item.qty}
                              </span>
                            </div>
                          </div>

                          {/* Catatan Khusus Produk (Truncated) */}
                          {item.customNotes && (
                            <div className="text-[13px] sm:text-xs text-amber-800 dark:text-amber-300 font-normal truncate pt-0.5" title={item.customNotes}>
                              {item.customNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {order.items.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandOrder(order.id);
                        }}
                        className="w-full text-center py-2 sm:py-1.5 text-[13px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {expandedOrders[order.id] ? (
                          <><ChevronUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Sembunyikan item</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Tampilkan {order.items.length - 1} item lainnya...</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* BOTTOM SECTION: Order Notes (Desktop & Mobile) + Total & Action Buttons (Desktop only) */}
                  <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6 ${order.orderNotes ? 'mt-1 pt-1' : 'hidden sm:flex mt-1 pt-1'}`}>
                    {order.orderNotes ? (
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                            Catatan Pesanan:
                          </span>
                          <p className="text-[13.5px] sm:text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed truncate">
                            {order.orderNotes}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0" />
                    )}

                    {/* Container Total Pesanan & Action Buttons: Desktop only (hidden on mobile) */}
                    <div className="hidden sm:flex items-center justify-end gap-3 sm:gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Pesanan</span>
                        <div className="flex items-center gap-1.5">
                          {order.shippingCost ? (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                              <Truck className="h-2.5 w-2.5" />
                              Ongkir
                            </span>
                          ) : null}
                          <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-none">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {order.status === 'PENDING' && (
                        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4" onClick={(e) => e.stopPropagation()}>
                          {canApproveOrder(currentUser.role) && (
                            <Button
                              variant="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcessOrder(order.id);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1.5" />
                              Proses Pesanan
                            </Button>
                          )}

                          <ActionMenu
                            align="right"
                            triggerTitle="Opsi Pesanan"
                            items={[
                              {
                                label: 'Kustom Proses',
                                icon: <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
                                onClick: () => setCustomProcessOrder(order),
                              },
                              {
                                label: 'Edit Pesanan',
                                icon: <Edit className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
                                onClick: () => router.push(`/order/create?edit=${order.id}`),
                              },
                              {
                                label: 'Batalkan Order',
                                icon: <XCircle className="h-3.5 w-3.5" />,
                                variant: 'danger' as const,
                                onClick: () => handleOpenCancelModal(order.id),
                              },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  </div>
              </Card>
            );
          })}
        </div>
      )}



      {/* CANCEL ORDER REASON MODAL */}
      <Modal
        isOpen={!!cancelModalOrderId}
        onClose={() => setCancelModalOrderId(null)}
        title={`Batalkan Sales Order — ${orderToCancel?.orderNumber || ''}`}
        size="md"
        actions={
          <>
            <Button variant="ghost" onClick={() => setCancelModalOrderId(null)}>Batal</Button>
            <Button variant="danger" onClick={handleConfirmCancelOrder}>
              Konfirmasi Pembatalan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Mohon masukkan alasan pembatalan untuk pesanan ini. Catatan pembatalan ini akan tersimpan pada riwayat pesanan.
          </p>

          <Textarea
            label="Alasan Pembatalan"
            required
            rows={3}
            placeholder="Contoh: Pelanggan membatalkan pesanan karena perubahan spesifikasi proyek..."
            value={cancelReasonInput}
            onChange={e => setCancelReasonInput(e.target.value)}
            error={cancelReasonError}
          />
        </div>
      </Modal>

      {/* CUSTOM PROCESS MODAL */}
      {customProcessOrder && (
        <CustomProcessModal
          isOpen={!!customProcessOrder}
          onClose={() => setCustomProcessOrder(null)}
          order={customProcessOrder}
        />
      )}
    </div>
  );
}

export default function OrderListPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <OrderListContent />
    </Suspense>
  );
}

