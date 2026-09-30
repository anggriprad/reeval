'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  formatCurrency,
  formatDateTime,
  formatPhoneDisplay,
  formatVariantLabel,
  getWhatsAppUrl,
  getOrderStatusColor,
  getOrderStatusVariant,
  getOrderStatusLabel,
} from '@/lib/utils';
import { canApproveOrder, USER_ACCOUNTS } from '@/lib/roles';
import { ComplaintAttachment } from '@/lib/types';
import {
  ArrowLeft,
  Phone,
  MapPin,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  Edit,
  XCircle,
  AlertCircle,
  Package,
  Clock,
  User,
  ShoppingBag,
  Circle,
  Upload,
  Film,
  Trash2,
} from 'lucide-react';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { toast } = useToast();

  const {
    salesOrders,
    deliveryOrders,
    workOrders,
    currentUser,
    processOrder,
    cancelOrder,
    submitOrderComplaint,
  } = useApp();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  // Complaint State
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState<'Barang tidak sesuai' | 'Barang rusak / cacat' | 'Barang kurang' | 'Lainnya'>('Barang rusak / cacat');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintItems, setComplaintItems] = useState<{ idx: number, qty: number }[]>([]);
  const [complaintAttachments, setComplaintAttachments] = useState<ComplaintAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [complaintError, setComplaintError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const order = salesOrders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <PageHeader
          backHref="/order"
          title="Detail Sales Order"
        />
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Sales Order Tidak Ditemukan"
          description="Pesanan dengan ID tersebut tidak tersedia atau telah dihapus."
          action={
            <Button onClick={() => router.push('/order')}>
              Kembali ke Daftar Order
            </Button>
          }
        />
      </div>
    );
  }

  const salesPhone = order.salesPhone || USER_ACCOUNTS.find(u => u.name === order.createdBy)?.phone || '';

  const handleProcess = () => {
    const res = processOrder(order.id);
    if (res.success) {
      toast.success(
        'SPK Berhasil Diterbitkan',
        `Sales Order ${order.orderNumber} telah diproses dan dokumen SPK diproduksi.`
      );
    } else {
      toast.error('Gagal Memproses Order', res.error || 'Terjadi kesalahan sistem.');
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelReasonInput.trim()) {
      setCancelReasonError('Alasan pembatalan wajib diisi.');
      return;
    }
    cancelOrder(order.id, cancelReasonInput.trim());
    toast.success('Sales Order Dibatalkan', `Sales Order ${order.orderNumber} telah berhasil dibatalkan.`);
    setCancelModalOpen(false);
    setCancelReasonInput('');
    setCancelReasonError('');
  };

  const handleToggleComplaintItem = (idx: number, isChecked: boolean, maxQty: number) => {
    setComplaintItems(prev => {
      if (isChecked) {
        return [...prev, { idx, qty: 1 }];
      }
      return prev.filter(i => i.idx !== idx);
    });
  };

  const handleChangeComplaintQty = (idx: number, qty: number, maxQty: number) => {
    setComplaintItems(prev => prev.map(i => {
      if (i.idx === idx) {
        return { ...i, qty: Math.min(Math.max(1, qty), maxQty) };
      }
      return i;
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const newAttachments: ComplaintAttachment[] = [];
    let processed = 0;
    const total = files.length;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image');

      if (!isImage && !isVideo) {
        toast.error('Format Tidak Didukung', `${file.name} bukan file gambar atau video.`);
        processed++;
        if (processed === total) setUploadingFiles(false);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error('Ukuran Terlalu Besar', `${file.name} melebihi batas maksimal 50MB.`);
        processed++;
        if (processed === total) setUploadingFiles(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          url: base64,
          size: file.size,
        });

        processed++;
        if (processed === total) {
          setComplaintAttachments(prev => [...prev, ...newAttachments]);
          setUploadingFiles(false);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === total) setUploadingFiles(false);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setComplaintAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmitComplaint = () => {
    if (order.status !== 'SENT') {
      setComplaintError('Komplain hanya dapat diajukan untuk pesanan yang sudah terkirim.');
      return;
    }
    if (complaintItems.length === 0) {
      setComplaintError('Pilih minimal satu item produk yang bermasalah.');
      return;
    }
    if (!complaintDesc.trim()) {
      setComplaintError('Deskripsi komplain wajib diisi.');
      return;
    }
    if (complaintAttachments.length === 0) {
      setComplaintError('Upload minimal satu bukti foto atau video kerusakan / kendala produk.');
      return;
    }
    
    const items = complaintItems.map(c => {
      const oItem = order.items[c.idx];
      return {
        productId: oItem.productId,
        variantId: oItem.variantId,
        productName: oItem.productName,
        variantLabel: oItem.variantLabel,
        qty: c.qty,
        unitPrice: oItem.unitPrice
      };
    });

    submitOrderComplaint(order.id, {
      category: complaintCategory,
      description: complaintDesc,
      items,
      attachments: complaintAttachments,
    });

    toast.success('Komplain Diajukan', 'Komplain penjualan berhasil dicatat dan masuk status menunggu tinjauan.');
    setComplaintModalOpen(false);
    setComplaintCategory('Barang rusak / cacat');
    setComplaintDesc('');
    setComplaintItems([]);
    setComplaintAttachments([]);
    setComplaintError('');
  };

  // Log Proses / Riwayat Pesanan
  const relatedWorkOrders = (workOrders || []).filter(wo => wo.salesOrderId === order.id || wo.salesOrderNumber === order.orderNumber);
  const relatedDeliveries = (deliveryOrders || []).filter(doItem => 
    doItem.salesOrderId === order.id || 
    (doItem.salesOrderIds && doItem.salesOrderIds.includes(order.id)) || 
    doItem.salesOrderNumber === order.orderNumber
  );

  const isCanceled = order.status === 'CANCELED';
  const isProcessing = ['PROCESSING', 'PARTIALLY_READY', 'READY', 'PARTIALLY_SHIPPED', 'SENT'].includes(order.status);
  const isReady = ['READY', 'PARTIALLY_SHIPPED', 'SENT'].includes(order.status);
  const isShipped = ['PARTIALLY_SHIPPED', 'SENT'].includes(order.status) || relatedDeliveries.some(d => d.status === 'IN_TRANSIT' || d.status === 'DELIVERED');
  const isDelivered = order.status === 'SENT' || relatedDeliveries.some(d => d.status === 'DELIVERED');

  interface OrderTimelineEvent {
    id: string;
    title: string;
    description: string;
    timestamp?: string;
    actor: string;
    status: 'completed' | 'current' | 'pending';
  }

  const timelineEvents: OrderTimelineEvent[] = [];

  // 1. Pesanan Dibuat
  timelineEvents.push({
    id: 'created',
    title: 'Pesanan Dibuat',
    description: `Sales order berhasil dicatat (${order.items.length} jenis item)`,
    timestamp: order.createdAt,
    actor: order.createdBy,
    status: 'completed',
  });

  if (isCanceled && !isProcessing) {
    timelineEvents.push({
      id: 'canceled',
      title: 'Pesanan Dibatalkan',
      description: order.cancelReason || 'Pesanan dibatalkan',
      timestamp: order.updatedAt,
      actor: order.updatedBy || (order.cancelledByRole ? `User (${order.cancelledByRole})` : 'Admin'),
      status: 'completed',
    });
  } else {
    // 2. Pesanan Diproses / SPK
    const spkCount = relatedWorkOrders.length;
    timelineEvents.push({
      id: 'processing',
      title: isProcessing ? 'Pesanan Diproses' : 'Menunggu Diproses',
      description: isProcessing
        ? (spkCount > 0 ? `${spkCount} SPK produksi telah diterbitkan dan berjalan` : 'SPK produksi telah diterbitkan')
        : 'Menunggu persetujuan dan penerbitan dokumen SPK',
      timestamp: relatedWorkOrders[0]?.issuedAt || (isProcessing ? order.updatedAt : undefined),
      actor: isProcessing ? (order.updatedBy || 'Admin Produksi') : '-',
      status: isProcessing ? 'completed' : (order.status === 'PENDING' ? 'current' : 'pending'),
    });

    // 3. Produksi Selesai / Siap Kirim
    timelineEvents.push({
      id: 'ready',
      title: isReady ? 'Produksi Selesai & Siap Kirim' : 'Proses Produksi',
      description: isReady
        ? 'Seluruh barang selesai diproduksi dan siap dikirim'
        : (isProcessing ? 'Barang sedang dalam tahap pengerjaan di pabrik' : 'Menunggu antrean produksi'),
      timestamp: relatedWorkOrders[0]?.completedAt || (isReady ? order.updatedAt : undefined),
      actor: isReady ? 'Tim Produksi & QC' : '-',
      status: isReady ? 'completed' : ((order.status === 'PROCESSING' || order.status === 'PARTIALLY_READY') ? 'current' : 'pending'),
    });

    // 4. Detail Pengiriman / Surat Jalan
    if (relatedDeliveries.length > 0) {
      relatedDeliveries.forEach(del => {
        timelineEvents.push({
          id: `do-${del.id}`,
          title: `Surat Jalan Dibuat (${del.doNumber})`,
          description: `Armada: ${del.armadaName || 'Pengiriman'} · Driver: ${del.assignedDriverName || '-'}`,
          timestamp: del.createdAt,
          actor: 'Admin Logistik',
          status: 'completed',
        });

        const isLoaded = del.status === 'IN_TRANSIT' || del.status === 'DELIVERED';
        timelineEvents.push({
          id: `load-${del.id}`,
          title: isLoaded ? 'Barang Dimuat & Dalam Perjalanan' : 'Proses Muat Armada',
          description: isLoaded
            ? 'Barang telah dimuat dan armada sedang menuju lokasi pelanggan'
            : 'Menunggu konfirmasi muat barang oleh driver armada',
          timestamp: del.loadedAt || (isLoaded ? del.createdAt : undefined),
          actor: del.loadedBy || del.assignedDriverName || 'Driver Logistik',
          status: isLoaded ? 'completed' : (del.status === 'READY_TO_SHIP' ? 'current' : 'pending'),
        });

        const isDeliv = del.status === 'DELIVERED';
        timelineEvents.push({
          id: `deliv-${del.id}`,
          title: isDeliv ? 'Pesanan Diterima Pelanggan' : 'Konfirmasi Penerimaan',
          description: isDeliv
            ? (del.receiverName ? `Diterima oleh ${del.receiverName}${del.deliveryProofNote ? ` (${del.deliveryProofNote})` : ''}` : 'Barang telah berhasil diterima pelanggan')
            : 'Menunggu serah terima barang di alamat tujuan',
          timestamp: del.deliveredAt || order.deliveredAt,
          actor: del.assignedDriverName || 'Driver Logistik',
          status: isDeliv ? 'completed' : (del.status === 'IN_TRANSIT' ? 'current' : 'pending'),
        });
      });
    } else {
      timelineEvents.push({
        id: 'shipping',
        title: isDelivered ? 'Pesanan Terkirim' : (isShipped ? 'Dalam Pengiriman' : 'Pengiriman Barang'),
        description: isDelivered
          ? 'Barang telah diterima oleh pelanggan di alamat tujuan'
          : (isShipped ? 'Barang sedang dalam perjalanan menuju pelanggan' : (isReady ? 'Menunggu pembuatan surat jalan & armada pengiriman' : 'Menunggu kesiapan barang')),
        timestamp: order.deliveredAt,
        actor: isDelivered ? (order.updatedBy || 'Driver Logistik') : '-',
        status: isDelivered ? 'completed' : (isShipped ? 'completed' : (order.status === 'READY' ? 'current' : 'pending')),
      });
    }

    if (isCanceled) {
      timelineEvents.push({
        id: 'canceled',
        title: 'Pesanan Dibatalkan',
        description: order.cancelReason || 'Pesanan telah dibatalkan',
        timestamp: order.updatedAt,
        actor: order.updatedBy || (order.cancelledByRole ? `User (${order.cancelledByRole})` : 'Admin'),
        status: 'completed',
      });
    }

    // 5. Komplain & Resolusi Komplain (jika ada)
    if (order.complaints && order.complaints.length > 0) {
      order.complaints.forEach(cmp => {
        timelineEvents.push({
          id: `cmp-submit-${cmp.id}`,
          title: `Komplain Diajukan: ${cmp.category}`,
          description: `Keluhan: "${cmp.description}" (${cmp.items.map(i => `${i.productName} x${i.qty}`).join(', ')})`,
          timestamp: cmp.createdAt,
          actor: 'Pelanggan / Sales',
          status: 'completed',
        });

        if (cmp.status === 'SELESAI') {
          timelineEvents.push({
            id: `cmp-resolve-${cmp.id}`,
            title: `Komplain Selesai: ${cmp.resolution || 'Diselesaikan'}`,
            description: cmp.resolutionNotes || `Tindakan penyelesaian telah diproses: ${cmp.resolution}`,
            timestamp: cmp.resolvedAt || cmp.createdAt,
            actor: 'Admin Customer Service',
            status: 'completed',
          });
        } else if (cmp.status === 'DITANGANI') {
          timelineEvents.push({
            id: `cmp-progress-${cmp.id}`,
            title: 'Komplain Sedang Ditangani',
            description: 'Tim terkait sedang menindaklanjuti proses penanganan komplain',
            timestamp: cmp.createdAt,
            actor: 'Admin Customer Service',
            status: 'current',
          });
        } else {
          timelineEvents.push({
            id: `cmp-pending-${cmp.id}`,
            title: 'Menunggu Penanganan Komplain',
            description: 'Menunggu tinjauan dan keputusan aksi resolusi dari admin',
            timestamp: cmp.createdAt,
            actor: 'Admin Customer Service',
            status: 'current',
          });
        }
      });
    }
  }

  const salesWaMsg = `Halo ${order.createdBy}, perihal Sales Order ${order.orderNumber}. Detail pesanan dapat dilihat di: ${currentUrl}`;
  const customerWaMsg = `Halo ${order.customer.name}, kami dari Reeval ERP perihal Sales Order ${order.orderNumber}...`;

  // Perhitungan Penyesuaian Refund dari Komplain
  const refundComplaints = (order.complaints || []).filter(
    c => c.status === 'SELESAI' && c.resolution === 'Batalkan Pesanan (Refund)'
  );

  const getComplaintRefundAmount = (cmp: (typeof refundComplaints)[0]) => {
    return (cmp.items || []).reduce((sum, ci) => {
      const price = (ci.unitPrice && ci.unitPrice > 0)
        ? ci.unitPrice
        : (order.items.find(oi => oi.productId === ci.productId)?.unitPrice ?? 0);
      return sum + (price * ci.qty);
    }, 0);
  };

  const totalRefundAmount = refundComplaints.reduce(
    (sum, cmp) => sum + getComplaintRefundAmount(cmp),
    0
  );

  const originalItemsSubtotal = order.items.reduce(
    (sum, item) => sum + (item.unitPrice * item.qty),
    0
  );

  const getItemRefundedQty = (item: (typeof order.items)[0]) => {
    let count = 0;
    refundComplaints.forEach(cmp => {
      (cmp.items || []).forEach(ci => {
        const matchProduct = ci.productId === item.productId;
        const matchVariant = !ci.variantLabel || !item.variantLabel || ci.variantLabel === item.variantLabel;
        if (matchProduct && matchVariant) {
          count += ci.qty;
        }
      });
    });
    return count;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* PAGE HEADER: Nomor SO + Badge Status + Navigation Back + Native Actions & Action Menu */}
      <PageHeader
        backHref="/order"
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{order.orderNumber}</span>
            <Badge variant={getOrderStatusVariant(order.status)}>
              {getOrderStatusLabel(order.status, order.cancelledByRole)}
            </Badge>
          </div>
        }
        actionMenuItems={
          (() => {
            const items = [];
            if (order.status === 'PENDING') {
              items.push({
                label: 'Edit Pesanan',
                icon: Edit,
                onClick: () => router.push(`/order/create?edit=${order.id}`),
              });
            }

            if (order.status === 'PENDING' || order.status === 'PROCESSING') {
              items.push({
                label: 'Batalkan Order',
                icon: XCircle,
                onClick: () => {
                  setCancelReasonInput('');
                  setCancelReasonError('');
                  setCancelModalOpen(true);
                },
                variant: 'danger' as const,
              });
            }

            // Hanya bisa mengajukan komplain jika pesanan berstatus TERKIRIM (SENT) dan tidak ada komplain aktif
            const hasActiveComplaint = order.complaints?.some(c => c.status !== 'SELESAI');
            if (order.status === 'SENT' && !hasActiveComplaint) {
              items.push({
                label: 'Ajukan Komplain',
                icon: AlertCircle,
                onClick: () => {
                  setComplaintCategory('Barang rusak / cacat');
                  setComplaintDesc('');
                  setComplaintItems([]);
                  setComplaintError('');
                  setComplaintModalOpen(true);
                },
                variant: 'danger' as const,
              });
            }

            return items.length > 0 ? items : undefined;
          })()
        }
      />

      {/* COMPLAINT INFO ALERT */}
      {order.complaints && order.complaints.length > 0 && (
        <div className="space-y-2">
          {order.complaints.map(complaint => (
            <div
              key={complaint.id}
              className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 flex-wrap shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold mr-1.5">Komplain: {complaint.category}</span>
                  <span className="text-amber-700/80 dark:text-amber-300/80 text-[11px]">({complaint.status}) — "{complaint.description}"</span>
                </div>
              </div>
              <Link
                href={`/order/complaint/${complaint.id}`}
                className="font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 ml-auto"
              >
                Lihat Detail Komplain &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* CANCELED ORDER REASON ALERT */}
      {order.status === 'CANCELED' && order.cancelReason && (
        <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-900/60 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Alasan Pembatalan:</span>
            <span className="mt-0.5 block leading-relaxed">{order.cancelReason}</span>
          </div>
        </div>
      )}

      {/* 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* KOLOM KIRI (7 COLS): DAFTAR CARD ITEM PRODUK & TOTAL AMOUNT */}
        <div className="lg:col-span-7 space-y-4">
          {/* CONTAINER: INFORMASI PELANGGAN (TANPA JUDUL LABEL) */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {order.customer.name}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="">
                {formatPhoneDisplay(order.customer.phone)}
              </span>
            </div>
            {order.customer.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{order.customer.address}</span>
              </div>
            )}
          </div>
          {/* SINGLE CONTAINER UNTUK SELURUH ITEM PESANAN DAN TOTAL AMOUNT */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {/* DAFTAR ITEM PESANAN */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {order.items.map((item, idx) => {
                const refundedQty = getItemRefundedQty(item);
                const isFullyRefunded = refundedQty >= item.qty;
                const isPartiallyRefunded = refundedQty > 0 && refundedQty < item.qty;
                const activeQty = Math.max(0, item.qty - refundedQty);
                const originalSubtotal = item.unitPrice * item.qty;
                const activeSubtotal = item.unitPrice * activeQty;

                return (
                  <div
                    key={idx}
                    className={`p-4 space-y-3 transition-colors ${
                      isFullyRefunded
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : isPartiallyRefunded
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : ''
                    }`}
                  >
                    {/* Header Card Item: Product Name, Variant & Modifiers */}
                    <div className="flex justify-between min-w-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${isFullyRefunded ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.productName}
                          </span>
                          {isFullyRefunded && (
                            <Badge variant="danger" className="text-[10px] py-0 px-1.5 font-bold">
                              Dibatalkan (Refund Penuh)
                            </Badge>
                          )}
                          {isPartiallyRefunded && (
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
                              Direfund {refundedQty} unit
                            </Badge>
                          )}
                        </div>
                        {item.variantLabel && (
                          <div className={`text-xs font-medium ${isFullyRefunded ? 'text-slate-400 line-through' : 'text-slate-500 dark:text-slate-400'}`}>
                            {formatVariantLabel(item.variantLabel)}
                          </div>
                        )}
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.selectedModifiers.map(mGroup => (
                              mGroup.selectedOptions.map(opt => (
                                <span key={opt.optionId} className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md font-medium">
                                  +{opt.name}
                                </span>
                              ))
                            ))}
                          </div>
                        )}
                        {/* Catatan Khusus (If Any) */}
                        {item.customNotes && (
                          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{item.customNotes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col text-right shrink-0">
                        {isFullyRefunded ? (
                          <>
                            <span className="font-semibold text-sm text-slate-400 line-through">x {item.qty}</span>
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">0 unit aktif</span>
                          </>
                        ) : isPartiallyRefunded ? (
                          <>
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs text-slate-400 line-through">x {item.qty}</span>
                              <span className="font-semibold text-base text-slate-900 dark:text-white">x {activeQty}</span>
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{formatCurrency(item.unitPrice)}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-base text-slate-900 dark:text-white">x {item.qty}</span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{formatCurrency(item.unitPrice)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Subtotal Item Bar */}
                    <div className="flex justify-between items-center gap-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">Subtotal</span>
                      {isFullyRefunded ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through text-xs font-normal">{formatCurrency(originalSubtotal)}</span>
                          <span className="text-rose-600 dark:text-rose-400 text-sm font-bold">Rp 0</span>
                        </div>
                      ) : isPartiallyRefunded ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through text-xs font-normal">{formatCurrency(originalSubtotal)}</span>
                          <span className="text-slate-900 dark:text-white text-sm font-bold">{formatCurrency(activeSubtotal)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{formatCurrency(originalSubtotal)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Amount Summary Section & Refund Adjustments */}
            {(totalRefundAmount > 0 || !!order.shippingCost) && (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 text-xs font-semibold space-y-2.5">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Subtotal Produk</span>
                  <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(originalItemsSubtotal)}</span>
                </div>

                {refundComplaints.map(cmp => {
                  const cmpRefund = getComplaintRefundAmount(cmp);
                  return (
                    <div key={cmp.id} className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>Penyesuaian Refund ({cmp.id})</span>
                        {cmp.items && cmp.items.length > 0 && (
                          <span className="text-[11px] font-normal text-rose-500/90 dark:text-rose-400/80">
                            • {cmp.items.map(i => `${i.productName} x${i.qty}`).join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold shrink-0">- {formatCurrency(cmpRefund)}</span>
                    </div>
                  );
                })}

                {!!order.shippingCost && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Ongkos Kirim</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(order.shippingCost)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-950/40 border-t border-slate-200/80 dark:border-slate-800 font-bold text-sm">
              <span className="text-slate-800 dark:text-slate-200">Total Pembayaran</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-lg font-mono">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* TERPISAH: Container Catatan Pesanan (Jika Ada) */}
          {order.orderNotes && (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 shadow-xs space-y-1">
              <span className="font-semibold text-xs text-slate-600 dark:text-slate-400 block">
                Catatan Pesanan
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {order.orderNotes}
              </p>
            </div>
          )}


        </div>

        {/* KOLOM KANAN (5 COLS): PELANGGAN, RIWAYAT PESANAN, KONTAK WHATSAPP */}
        <div className="lg:col-span-5 space-y-5">
          {/* CONTAINER: INFORMASI PESANAN & SALES */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal / Waktu Pesanan</span>
              <span className="text-slate-900 dark:text-white font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sales Executive</span>
              <span className="text-slate-900 dark:text-white font-medium">{order.createdBy}</span>
            </div>
          </div>

          {/* CONTAINER: LOG PROSES / RIWAYAT PESANAN */}
          {(() => {
            const displayedEvents = timelineEvents.filter(evt => evt.status !== 'pending');
            if (displayedEvents.length === 0) return null;

            return (
              <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="space-y-0">
                  {displayedEvents.map((evt, idx) => {
                    const isLast = idx === displayedEvents.length - 1;
                    const isDone = evt.status === 'completed';
                    const isCurrent = evt.status === 'current';

                    return (
                      <div key={evt.id || idx} className="flex gap-3 text-xs">
                        {/* Node & Connector Line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`flex items-center justify-center rounded-full bg-white dark:bg-slate-900 mt-0.5 ${
                            isDone ? 'text-emerald-600 dark:text-emerald-400' :
                            isCurrent ? 'text-indigo-600 dark:text-indigo-400' :
                            'text-slate-300 dark:text-slate-600'
                          }`}>
                            {isDone ? (
                              <CheckCircle className="w-4 h-4 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                              </div>
                            )}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 grow min-h-[22px] bg-slate-200 dark:bg-slate-700 my-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`space-y-0.5 ${!isLast ? 'pb-3.5' : ''}`}>
                          <div className={`font-semibold ${
                            isDone ? 'text-slate-900 dark:text-white' : 'text-indigo-600 dark:text-indigo-400 font-bold'
                          }`}>
                            {evt.title}
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                            {evt.description}
                          </p>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5 flex items-center gap-1.5 flex-wrap">
                            {evt.timestamp && (
                              <span>{formatDateTime(evt.timestamp)}</span>
                            )}
                            {evt.actor && evt.actor !== '-' && (
                              <>
                                <span>·</span>
                                <span>Oleh: {evt.actor}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* CONTAINER: KONTAK WHATSAPP (PELANGGAN & SALES) */}
          <div className="flex gap-2">
            {/* WhatsApp Sales (Memuat Nomor SO & URL Detail SO) */}
            {salesPhone && (
              <a
                href={getWhatsAppUrl(salesPhone, salesWaMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-md border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs transition-colors"
              >
                <MessageSquare className='w-4 h-4' />
                <span>Hubungi Sales</span>
              </a>
            )}

            {/* WhatsApp Pelanggan */}
            {order.customer.phone && (
              <a
                href={getWhatsAppUrl(order.customer.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <MessageSquare className='w-4 h-4' />
                <span>Hubungi Pelanggan</span>
              </a>
            )}
          </div>
          {canApproveOrder(currentUser.role) && order.status === 'PENDING' && (
            <Button onClick={handleProcess} size='lg' className='bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 w-full'>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Proses Pesanan
            </Button>
          )}
        </div>
      </div>

      {/* CANCEL ORDER MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Batalkan Sales Order — ${order.orderNumber}`}
        size="md"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmCancel} disabled={!cancelReasonInput.trim()}>
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

      {/* COMPLAINT MODAL */}
      <Modal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        title="Ajukan Komplain"
        size="lg"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setComplaintModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitComplaint} disabled={uploadingFiles}>
              {uploadingFiles ? 'Memproses File...' : 'Kirim Pengajuan Komplain'}
            </Button>
          </>
        }
      >
        <div className="space-y-5 text-xs">
          {complaintError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{complaintError}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Kategori Komplain <span className="text-red-500">*</span>
            </label>
            <Select
              value={complaintCategory}
              onChange={e => setComplaintCategory(e.target.value as any)}
              inputSize="sm"
            >
              <option value="Barang tidak sesuai">Barang tidak sesuai (Salah Varian/Warna/Spek)</option>
              <option value="Barang rusak / cacat">Barang rusak / cacat produksi</option>
              <option value="Barang kurang">Barang kurang (Shortage)</option>
              <option value="Lainnya">Lainnya</option>
            </Select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Pilih Item yang Bermasalah <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {order.items.map((item, idx) => {
                const isSelected = complaintItems.some(i => i.idx === idx);
                const selectedItem = complaintItems.find(i => i.idx === idx);
                
                return (
                  <div key={idx} className={`p-3 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSelected ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/50 dark:bg-indigo-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'}`}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleToggleComplaintItem(idx, checked, item.qty)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.productName}
                        </div>
                        {item.variantLabel && (
                          <div className="text-slate-500 dark:text-slate-400 truncate">
                            {formatVariantLabel(item.variantLabel)}
                          </div>
                        )}
                        <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          Terkirim: {item.qty} item
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Qty Bermasalah:</span>
                        <Input
                          type="number"
                          min={1}
                          max={item.qty}
                          value={selectedItem?.qty || 1}
                          onChange={(e) => handleChangeComplaintQty(idx, parseInt(e.target.value) || 1, item.qty)}
                          inputSize="sm"
                          className="w-20 text-center font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Detail Komplain / Kendala <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ceritakan secara detail kerusakan atau masalah yang dialami pelanggan..."
              value={complaintDesc}
              onChange={e => setComplaintDesc(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Upload Bukti Foto / Video <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-[11px]">(Wajib, maks. 50MB per file)</span>
            </label>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-center">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {uploadingFiles ? 'Sedang memproses file...' : 'Klik untuk memilih foto atau video bukti'}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung format gambar (JPG, PNG, WEBP) dan video (MP4, WebM)
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={uploadingFiles}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {complaintAttachments.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {complaintAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs"
                    >
                      {att.type === 'image' ? (
                        <img
                          src={att.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                          <video
                            src={att.url}
                            className="w-full h-full object-cover pointer-events-none opacity-80"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Film className="w-4 h-4 text-white/90" />
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white hover:bg-red-600 transition-colors cursor-pointer"
                        title="Hapus Bukti"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
