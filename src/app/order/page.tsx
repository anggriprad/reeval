'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl, SegmentOption } from '@/components/ui/SegmentedControl';
import { formatCurrency, formatDateTime, formatPhoneDisplay, formatVariantLabel, getOrderStatusColor, getOrderStatusVariant, getOrderStatusLabel } from '@/lib/utils';
import { canApproveOrder, canCreateOrder } from '@/lib/roles';
import type { OrderStatus } from '@/lib/types';
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
} from 'lucide-react';

export function OrderListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const createHref = '/order/create';
  const { toast } = useToast();
  const {
    salesOrders,
    currentUser,
    processOrder,
    cancelOrder,
    showAllOrdersTab,
  } = useApp();

  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useUrlTab(['all', 'pending', 'processing', 'ready', 'sent', 'canceled'] as const, 'pending');
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

  const salesOptions = Array.from(new Set(salesOrders.map(o => o.createdBy))).map(name => ({
    value: name,
    label: `Sales: ${name}`
  }));

  const filteredOrders = baseOrders
    .filter(o => statusFilter === 'all' || o.status.toLowerCase() === statusFilter)
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

  const handleProcessOrder = (id: string) => {
    setErrorMsg('');
    const res = processOrder(id);
    if (res && !res.success) {
      setErrorMsg(res.error || 'Terjadi kesalahan saat memproses order.');
    }
  };

  const handleOpenCancelModal = (orderId: string) => {
    setCancelModalOrderId(orderId);
    setCancelReasonInput('');
    setCancelReasonError('');
    setOpenActionMenuId(null);
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
      count: baseOrders.filter(o => o.status === 'PROCESSING').length,
      icon: Cog,
    },
    {
      key: 'ready',
      label: 'Siap Kirim',
      count: baseOrders.filter(o => o.status === 'READY').length,
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
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Sales Order"
      >
        <div className="flex items-center gap-2">
          <Link href="/order/config">
            <Button variant="outline">
              <Settings className="h-4 w-4" />
              Konfigurasi
            </Button>
          </Link>
          {canCreateOrder(currentUser.role) && (
            <Link href={createHref}>
              <Button>
                <Plus className="h-4 w-4" />
                Buat Pesanan
              </Button>
            </Link>
          )}
        </div>
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
        filterPlaceholder="Semua Sales Executive"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari sales order, pelanggan, produk..."
      />

      {/* Sales Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak Ada Order"
            description={`Tidak ada pesanan ${statusFilter === 'all' ? 'terdaftar.' : `dengan status ${getOrderStatusLabel((statusFilter.toUpperCase()) as OrderStatus)}.`}`}
            icon={<ShoppingCart className="h-7 w-7" />}
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map(order => {
            const isMenuOpen = openActionMenuId === order.id;

            return (
              <Card
                key={order.id}
                onClick={() => router.push(`/order/${order.id}`)}
                className="dark:hover:bg-slate-800/70 transition-all relative p-0 overflow-hidden cursor-pointer hover:shadow-lg border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
              >
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  {/* TOP SECTION: Header (Order Number & Status) + Sales | Date (Top Right) */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">
                          {order.orderNumber}
                        </span>
                        <Badge variant={getOrderStatusVariant(order.status)}>
                          {getOrderStatusLabel(order.status, order.cancelledByRole)}
                        </Badge>
                      </div>
                      <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <span className="flex items-center gap-1.5 font-normal text-slate-700 dark:text-slate-300">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {order.customer.name} {order.customer.phone ? `(${formatPhoneDisplay(order.customer.phone)})` : ''}
                        </span>
                        {order.customer.address && (
                          <span className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{order.customer.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 self-start sm:self-auto">
                      {order.createdBy} <span className="text-slate-300 dark:text-slate-600 mx-1">|</span> {formatDateTime(order.createdAt)}
                    </div>
                  </div>

                  {order.status === 'CANCELED' && order.cancelReason && (
                    <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 p-2.5 rounded-lg border border-red-100 dark:border-red-900/50">
                      <span className="font-bold">Alasan Pembatalan:</span> {order.cancelReason}
                    </div>
                  )}

                  {/* MIDDLE SECTION: Order Items */}
                  <div className="space-y-2">
                    {order.items.slice(0, expandedOrders[order.id] ? order.items.length : 1).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                        {/* KONTAINER KIRI (50%): NAMA ITEM, VARIANT, MODIFIERS & CATATAN */}
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>{item.productName}</span>
                          </div>

                          {item.variantLabel && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {formatVariantLabel(item.variantLabel)}
                            </div>
                          )}

                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selectedModifiers.map(mGroup => (
                                mGroup.selectedOptions.map(opt => (
                                  <span key={opt.optionId} className="text-xs bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-1 rounded-md font-medium">
                                    +{opt.name}
                                  </span>
                                ))
                              ))}
                            </div>
                          )}

                          {item.customNotes && (
                            <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                              {item.customNotes}
                            </div>
                          )}
                        </div>

                        {/* KONTAINER KANAN (50%): FLEX JUSTIFY-BETWEEN (KUANTITAS DI TENGAH CARD, HARGA ITEM DI KANAN CARD) */}
                        <div className="flex items-center justify-between gap-3">
                          {/* Kuantitas (terlihat agak ke tengah card SO) */}
                          <div className="flex items-center justify-center text-sm font-bold shrink-0">
                            x {item.qty}
                          </div>

                          {/* Harga Item & Hasil Akhir (qty x harga item) */}
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-200">
                              {formatCurrency(item.unitPrice * item.qty)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {order.items.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandOrder(order.id);
                        }}
                        className="w-full text-center py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {expandedOrders[order.id] ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Sembunyikan item</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Tampilkan {order.items.length - 1} item lainnya...</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* BOTTOM SECTION: Order Notes (Left side of total price) + Total & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-8 mt-1">
                    {order.orderNotes ? (
                      <div className="flex-1 min-w-0 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 px-3 py-2 rounded-md text-xs space-y-0.5">
                        <span className="font-bold text-[11px] uppercase tracking-wider block text-amber-700 dark:text-amber-400">
                          Catatan Pesanan:
                        </span>
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed truncate">
                          {order.orderNotes}
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0" />
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Pesanan</span>
                        <div className="flex items-center justify-end gap-1 mb-0.5">
                          {order.shippingCost ? (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                              <Truck className="h-2.5 w-2.5" />
                              Ongkir
                            </span>
                          ) : null}
                          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-none">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {(canApproveOrder(currentUser.role) && order.status === 'PENDING') || order.status === 'PENDING' ? (
                        <div className="flex items-center gap-1.5 relative border-l border-slate-200 dark:border-slate-700 pl-4" onClick={(e) => e.stopPropagation()}>
                          {canApproveOrder(currentUser.role) && order.status === 'PENDING' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcessOrder(order.id);
                              }}
                              className="bg-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-800 hover:bg-emerald-700 text-white font-semibold"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Proses Pesanan
                            </Button>
                          )}

                          {/* MORE OPTIONS BUTTON FOR PENDING ORDERS (EDIT & DELETE/BATALKAN) */}
                          {order.status === 'PENDING' && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(isMenuOpen ? null : order.id);
                                }}
                                className="p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-200 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors"
                                title="Opsi Lanjutan"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 z-30 py-1.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuId(null);
                                      router.push(`/order/create?edit=${order.id}`);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 text-left font-medium"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-indigo-600" />
                                    Edit Pesanan
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenCancelModal(order.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 text-left font-medium border-t border-slate-100 dark:border-slate-700/60"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Batalkan Order
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
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
            <Button onClick={handleConfirmCancelOrder} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              Konfirmasi Pembatalan
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Mohon masukkan alasan pembatalan untuk pesanan ini. Catatan pembatalan ini akan tersimpan pada riwayat pesanan.
          </p>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Pelanggan membatalkan pesanan karena perubahan spesifikasi proyek..."
              value={cancelReasonInput}
              onChange={e => setCancelReasonInput(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-xs"
            />
            {cancelReasonError && (
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 block mt-1">
                {cancelReasonError}
              </span>
            )}
          </div>
        </div>
      </Modal>
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

