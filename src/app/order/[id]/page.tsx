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
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import {
  formatCurrency,
  formatDateTime,
  formatPhoneDisplay,
  formatVariantLabel,
  getWhatsAppUrl,
  getOrderStatusColor,
  getOrderStatusVariant,
  getOrderStatusLabel,
  getComplaintStatusLabel,
} from '@/lib/utils';
import { canApproveOrder, USER_ACCOUNTS } from '@/lib/roles';
import { ComplaintAttachment, SalesOrder } from '@/lib/types';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { orderService, mapOrderResponseToSalesOrder } from '@/services/order.service';
import { CustomProcessModal } from '@/components/order/CustomProcessModal';
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  MapPin,
  MessageSquare,
  ExternalLink,
  Check,
  CheckCircle,
  Edit,
  XCircle,
  AlertCircle,
  Package,
  Clock,
  User,
  ShoppingBag,
  Circle,
  CircleDot,
  Upload,
  Plus,
  Loader2,
  Film,
  Trash2,
  Eye,
  Sliders,
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
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
  Archive,
  FolderTree,
  Sparkles,
  ChevronDown,
  FileText,
  Copy,
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

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { toast } = useToast();

  const {
    salesOrders,
    products,
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
  const [complaintCategory, setComplaintCategory] = useState<string>('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintItems, setComplaintItems] = useState<{ idx: number, qty: number }[]>([]);
  const [complaintAttachments, setComplaintAttachments] = useState<ComplaintAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [complaintError, setComplaintError] = useState('');
  const [selectedProofPhoto, setSelectedProofPhoto] = useState<string | null>(null);
  const [customProcessModalOpen, setCustomProcessModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
      if (window.innerWidth >= 768) {
        setIsHistoryExpanded(true);
      }
    }
  }, []);

  const { can } = usePermission();
  const [liveOrder, setLiveOrder] = useState<SalesOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  const fetchLiveOrderDetail = React.useCallback(() => {
    if (!orderId) return;
    setIsLoadingOrder(true);
    orderService.getOrderById(orderId)
      .then(res => {
        if (res.success && res.data) {
          setLiveOrder(mapOrderResponseToSalesOrder(res.data));
        }
      })
      .catch(err => {
        console.error('Failed to fetch live order:', err);
      })
      .finally(() => setIsLoadingOrder(false));
  }, [orderId]);

  useEffect(() => {
    fetchLiveOrderDetail();
  }, [fetchLiveOrderDetail]);

  const order = liveOrder;

  if (isLoadingOrder && !order) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

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

  const salesPhone = order!.salesPhone || (order as any)!.created_by_phone || (order as any)!.sales_phone || USER_ACCOUNTS.find(u => u.name === order!.createdBy)?.phone || '';

  const handleProcess = async () => {
    try {
      const res = await orderService.processOrder(order!.id);
      if (res.success) {
        toast.success(
          'Pesanan Diproses',
          `Pesanan ${order!.orderNumber} berhasil diproses.`
        );
        processOrder(order!.id);
        fetchLiveOrderDetail();
      } else {
        toast.error('Gagal Memproses Pesanan', res.message || 'Terjadi kesalahan saat memproses pesanan.');
      }
    } catch (err: any) {
      toast.error('Gagal Memproses Pesanan', err?.response?.data?.message || err?.message || 'Gagal memproses pesanan.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReasonInput.trim()) {
      setCancelReasonError('Alasan pembatalan wajib diisi.');
      return;
    }
    try {
      const res = await orderService.cancelOrder(order!.id, { reason: cancelReasonInput.trim() });
      if (res.success) {
        toast.success('Sales Order Dibatalkan', `Sales Order ${order!.orderNumber} telah berhasil dibatalkan.`);
        cancelOrder(order!.id, cancelReasonInput.trim());
        fetchLiveOrderDetail();
        setCancelModalOpen(false);
        setCancelReasonInput('');
        setCancelReasonError('');
      } else {
        toast.error('Gagal Membatalkan Order', res.message || 'Gagal.');
      }
    } catch (err: any) {
      toast.error('Gagal Membatalkan Order', err?.response?.data?.message || err?.message || 'Gagal membatalkan order.');
    }
  };

  const handleCopyOrderNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (order?.orderNumber) {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(order.orderNumber);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = order.orderNumber;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Disalin ke Clipboard', `Nomor pesanan ${order.orderNumber} berhasil disalin.`);
    }
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

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran Terlalu Besar', `${file.name} melebihi batas maksimal 10MB.`);
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

  const handleSubmitComplaint = async () => {
    if (order.status !== 'SENT') {
      setComplaintError('Komplain hanya dapat diajukan untuk pesanan yang sudah terkirim.');
      return;
    }
    if (!complaintCategory) {
      setComplaintError('Pilih kategori terlebih dahulu.');
      return;
    }
    if (complaintItems.length === 0) {
      setComplaintError('Pilih minimal satu item produk yang bermasalah.');
      return;
    }
    if (!complaintDesc.trim()) {
      setComplaintError('Detail keluhan wajib diisi.');
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

    const complaintPayload = {
      category: complaintCategory,
      description: complaintDesc,
      items: items.map(it => ({
        product_id: Number(it.productId) || 1,
        variant_id: it.variantId ? Number(it.variantId) : null,
        product_name: it.productName,
        variant_label: it.variantLabel || '',
        qty: it.qty,
        unit_price: it.unitPrice,
      })),
      attachments: complaintAttachments.map(att => ({
        name: att.name,
        type: att.type,
        url: att.url,
        size: att.size,
      })),
    };

    try {
      const res = await orderService.createComplaint(order.id, complaintPayload);
      if (res.success) {
        toast.success('Komplain Diajukan', 'Komplain penjualan berhasil dicatat dan masuk status menunggu tinjauan.');
        submitOrderComplaint(order.id, {
          category: complaintCategory as any,
          description: complaintDesc,
          items,
          attachments: complaintAttachments,
        });
        fetchLiveOrderDetail();
        setComplaintModalOpen(false);
        setComplaintCategory('');
        setComplaintDesc('');
        setComplaintItems([]);
        setComplaintAttachments([]);
        setComplaintError('');
        return;
      }
    } catch (err: any) {
      console.warn('Backend complaint filing failed, syncing local mock:', err);
    }

    submitOrderComplaint(order.id, {
      category: complaintCategory as any,
      description: complaintDesc,
      items,
      attachments: complaintAttachments,
    });

    toast.success('Komplain Diajukan', 'Komplain penjualan berhasil dicatat dan masuk status menunggu tinjauan.');
    setComplaintModalOpen(false);
    setComplaintCategory('');
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

  interface OrderTimelineEvent {
    id: string;
    stage: string;
    title: string;
    description: string;
    timestamp: string;
    actor: string;
    photo?: string;
  }

  const rawEvents: OrderTimelineEvent[] = [];

  // 1. Pesanan Dibuat
  if (order.createdAt) {
    rawEvents.push({
      id: 'order-created',
      stage: 'order-created',
      title: 'Pesanan Dibuat',
      description: 'Menunggu persetujuan admin',
      timestamp: order.createdAt,
      actor: order.createdBy || 'Sales',
    });
  }

  // Kondisi Khusus: Kustomisasi Pesanan (jika ada)
  if (order.isCustomProcess && order.customProcessAt) {
    rawEvents.push({
      id: 'custom-process',
      stage: 'custom-process',
      title: 'Kustomisasi Pesanan',
      description: 'Penyesuaian kebutuhan bahan baku dan alur produksi',
      timestamp: order.customProcessAt,
      actor: order.customProcessBy || 'Admin Produksi',
    });
  }

  // 2. Pesanan Diproses (disetujui admin / SPK produksi terbit)
  const regularWOs = relatedWorkOrders.filter(w => !w.isComplaintReplacement);
  const hasProcessing = Boolean(
    order.confirmedAt ||
    order.spkIssuedAt ||
    regularWOs.length > 0 ||
    ['PROCESSING', 'PARTIALLY_READY', 'READY', 'PARTIALLY_SHIPPED', 'SENT'].includes(order.status)
  );

  if (hasProcessing) {
    const processTime = order.confirmedAt || order.spkIssuedAt || regularWOs[0]?.issuedAt || order.updatedAt || order.createdAt;
    rawEvents.push({
      id: 'order-processing',
      stage: 'order-processing',
      title: 'Pesanan Diproses',
      description: 'Pesanan sedang dalam proses produksi',
      timestamp: processTime,
      actor: order.updatedBy || 'Admin Produksi',
    });
  }

  // 3. Siap Dikirim (seluruh barang pesanan selesai diproduksi)
  const completedRegularWOs = regularWOs.filter(w => w.status === 'COMPLETED' && w.completedAt);
  const isProductionDone = Boolean(
    (completedRegularWOs.length > 0 && completedRegularWOs.length === regularWOs.length) ||
    ['READY', 'PARTIALLY_SHIPPED', 'SENT'].includes(order.status)
  );

  if (isProductionDone) {
    const readyTime = completedRegularWOs.map(w => w.completedAt!).sort().reverse()[0] || order.updatedAt || order.createdAt;
    rawEvents.push({
      id: 'ready-to-ship',
      stage: 'ready-to-ship',
      title: 'Siap Dikirim',
      description: 'Seluruh barang pesanan telah selesai diproduksi',
      timestamp: readyTime,
      actor: 'Tim Produksi & QC',
    });
  }

  // 4. Dalam Pengiriman (armada dan supir sedang mengantar)
  // Hanya berlaku jika barang SUDAH dimuat ke armada ATAU DO berstatus IN_TRANSIT / DELIVERED
  const activeShippingDelivery = relatedDeliveries.find(d => Boolean(d.loadedAt || d.status === 'IN_TRANSIT' || d.status === 'DELIVERED'));
  const isShipping = Boolean(
    activeShippingDelivery ||
    order.status === 'SENT'
  );

  if (isShipping) {
    const deliveryToUse = activeShippingDelivery || relatedDeliveries[0];
    const shippingTime = deliveryToUse?.loadedAt || deliveryToUse?.createdAt || order.updatedAt || order.createdAt;
    const driverInfo = deliveryToUse?.assignedDriverName
      ? `${deliveryToUse.assignedDriverName}${deliveryToUse.armadaName ? ` (${deliveryToUse.armadaName})` : ''}`
      : 'Driver Logistik';
    rawEvents.push({
      id: 'in-transit',
      stage: 'in-transit',
      title: 'Dalam Pengiriman',
      description: 'Barang sedang diantar armada menuju alamat tujuan',
      timestamp: shippingTime,
      actor: driverInfo,
    });
  }

  // 5. Pesanan Diterima (serah terima pelanggan selesai)
  const deliveredDelivery = relatedDeliveries.find(d => Boolean(d.deliveredAt || d.status === 'DELIVERED'));
  const isDelivered = Boolean(
    order.status === 'SENT' ||
    deliveredDelivery
  );

  if (isDelivered) {
    const deliveryToUse = deliveredDelivery || activeShippingDelivery || relatedDeliveries[0];
    const deliveredTime = deliveryToUse?.deliveredAt || order.deliveredAt || order.updatedAt || order.createdAt;
    const receiverInfo = deliveryToUse?.receiverName
      ? `Diterima oleh ${deliveryToUse.receiverName}`
      : deliveryToUse?.assignedDriverName || 'Driver Logistik';
    rawEvents.push({
      id: 'order-delivered',
      stage: 'order-delivered',
      title: 'Pesanan Diterima',
      description: 'Barang telah diterima oleh pelanggan',
      timestamp: deliveredTime,
      actor: receiverInfo,
      photo: deliveryToUse?.deliveryProofPhoto,
    });
  }

  // Kondisi Khusus: Komplain Pelanggan
  (order.complaints || []).forEach(cmp => {
    if (cmp.createdAt) {
      rawEvents.push({
        id: `cmp-filed-${cmp.id}`,
        stage: 'complaint-filed',
        title: 'Komplain Diajukan',
        description: 'Keluhan pelanggan sedang dalam penanganan',
        timestamp: cmp.createdAt,
        actor: 'Pelanggan / Sales',
      });
    }
    if (cmp.status === 'SELESAI' && cmp.resolvedAt) {
      rawEvents.push({
        id: `cmp-resolved-${cmp.id}`,
        stage: 'complaint-resolved',
        title: 'Komplain Selesai',
        description: 'Penanganan keluhan pelanggan telah selesai',
        timestamp: cmp.resolvedAt,
        actor: 'Customer Service',
      });
    }
  });

  // Kondisi Khusus: Pesanan Dibatalkan
  if (order.status === 'CANCELED') {
    rawEvents.push({
      id: 'order-canceled',
      stage: 'order-canceled',
      title: 'Pesanan Dibatalkan',
      description: order.cancelReason || 'Pesanan dibatalkan',
      timestamp: order.updatedAt || order.createdAt,
      actor: order.updatedBy || (order.cancelledByRole ? `User (${order.cancelledByRole})` : 'Admin'),
    });
  }

  // Urutkan kronologis murni berdasarkan urutan tahapan & waktu kejadian
  const STAGE_ORDER: Record<string, number> = {
    'order-created': 1,
    'custom-process': 2,
    'order-processing': 3,
    'ready-to-ship': 4,
    'in-transit': 5,
    'order-delivered': 6,
    'complaint-filed': 7,
    'complaint-resolved': 8,
    'order-canceled': 9,
  };

  const timelineEvents = rawEvents.sort((a, b) => {
    const orderDiff = (STAGE_ORDER[a.stage] || 0) - (STAGE_ORDER[b.stage] || 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

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
    <div className="space-y-6 max-w-6xl mx-auto pb-24 md:pb-12">
      {/* PAGE HEADER: Detail Pesanan */}
      <PageHeader
        backHref="/order"
        title="Detail Pesanan"
        actionMenuItems={
          (() => {
            const items = [];
            if (order.status === 'PENDING') {
              items.push({
                label: 'Kustom Proses',
                icon: Sliders,
                onClick: () => setCustomProcessModalOpen(true),
              });
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
            const hasActiveComplaint = order.complaints?.some(c => c.status !== 'SELESAI' && c.status !== 'DITOLAK');
            if (order.status === 'SENT' && !hasActiveComplaint) {
              items.push({
                label: 'Ajukan Komplain',
                icon: AlertCircle,
                onClick: () => {
                  setComplaintCategory('');
                  setComplaintDesc('');
                  setComplaintItems([]);
                  setComplaintAttachments([]);
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
      {order.complaints && order.complaints.some(c => c.status !== 'SELESAI' && c.status !== 'DITOLAK') && (
        <div className="space-y-2">
          {order.complaints
            .filter(c => c.status !== 'SELESAI' && c.status !== 'DITOLAK')
            .map(complaint => (
              <div
                key={complaint.id}
                className="text-[13.5px] sm:text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 flex-wrap shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold mr-1.5">Komplain: {complaint.category}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant='secondary'
                  onClick={() => router.push(`/order/complaint/${complaint.id}`)}
                  className="shrink-0 ml-auto max-md:w-11 max-md:p-0 max-md:justify-center"
                  aria-label="Lihat Detail"
                  title="Lihat Detail"
                >
                  <span className="hidden md:inline">Lihat Detail</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* CANCELED ORDER REASON ALERT */}
      {order.status === 'CANCELED' && order.cancelReason && (
        <Alert
          variant="danger"
          title="Pesanan Dibatalkan"
          description={
            <div className="mt-0.5">
              <span className="font-medium text-slate-700 dark:text-slate-300">Alasan: </span>
              <span>{order.cancelReason}</span>
            </div>
          }
        />
      )}

      {/* 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-[13.5px] sm:text-xs">
        {/* KOLOM KIRI (7 COLS): DAFTAR CARD ITEM PRODUK & TOTAL AMOUNT */}
        <div className="lg:col-span-7 space-y-4">
          {/* CONTAINER: INFORMASI PELANGGAN (DENGAN STATUS BADGE DI KANAN NAMA) */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {order.customer.name}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <Badge variant={getOrderStatusVariant(order.status)}>
                  {getOrderStatusLabel(order.status, order.cancelledByRole)}
                </Badge>
                {order.items.some(i => i.isBomCustomized) && (
                  <Badge variant="purple">Kustom Proses</Badge>
                )}
                {order.complaints && order.complaints.some(c => c.status !== 'SELESAI' && c.status !== 'DITOLAK') && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                    Dikomplain
                  </Badge>
                )}
              </div>
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs overflow-hidden">
            {/* DAFTAR ITEM PESANAN */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {order.items.map((item, idx) => {
                const product = products.find(p => p.id === item.productId || p.name === item.productName);
                const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;
                const refundedQty = getItemRefundedQty(item);
                const isFullyRefunded = refundedQty >= item.qty;
                const isPartiallyRefunded = refundedQty > 0 && refundedQty < item.qty;
                const activeQty = Math.max(0, item.qty - refundedQty);
                const originalSubtotal = item.unitPrice * item.qty;
                const activeSubtotal = item.unitPrice * activeQty;

                return (
                  <div
                    key={idx}
                    className={`p-4 space-y-3 transition-colors ${isFullyRefunded
                      ? 'bg-rose-50/40 dark:bg-rose-950/20'
                      : isPartiallyRefunded
                        ? 'bg-amber-50/20 dark:bg-amber-950/10'
                        : ''
                      }`}
                  >
                    {/* BAGIAN ATAS: Visual Produk + Nama, Varian, Modifiers, Catatan Produk */}
                    <div className="flex items-start gap-3 min-w-0">
                      {product?.image ? (
                        <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                          <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <IconComp className="h-6 w-6" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${isFullyRefunded ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.productName}
                          </span>
                          {item.isBomCustomized && (
                            <Badge variant="purple" className="text-[10px] py-0 px-1.5 font-semibold">
                              {item.qty > 1 && item.unitCustomProcesses
                                ? `Kustom Proses (${item.unitCustomProcesses.filter(u => u.isBomCustomized).length}/${item.qty} unit)`
                                : 'Kustom Proses'}
                            </Badge>
                          )}
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
                          <div className={`text-[13px] sm:text-xs font-medium ${isFullyRefunded ? 'text-slate-400 line-through' : 'text-slate-500 dark:text-slate-400'}`}>
                            {formatVariantLabel(item.variantLabel)}
                          </div>
                        )}

                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.selectedModifiers.map(mGroup => (
                              mGroup.selectedOptions.map(opt => (
                                <span key={opt.optionId} className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-medium">
                                  +{opt.name}
                                </span>
                              ))
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Catatan Khusus Produk: Baris baru di bawah gambar visual dan varian, tepat sebelum baris qty dan nominal subtotal */}
                    {item.customNotes && (
                      <p className="text-[13.5px] sm:text-xs text-amber-800 dark:text-amber-300 font-normal leading-relaxed">
                        {item.customNotes}
                      </p>
                    )}

                    {/* BAGIAN BAWAH: Info QTY dan Harga berada di baris setelah gambar visual, nama produk, varian, dan catatan produk */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        {isFullyRefunded ? (
                          <span className="text-slate-400 line-through">x {item.qty}</span>
                        ) : isPartiallyRefunded ? (
                          <>
                            <span className="text-xs text-slate-400 line-through">x {item.qty}</span>
                            <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">x {activeQty}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">x {item.qty}</span>
                        )}
                      </div>

                      <div className="text-right">
                        {isFullyRefunded ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 line-through font-normal">{formatCurrency(originalSubtotal)}</span>
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Rp 0 (Refund)</span>
                          </div>
                        ) : isPartiallyRefunded ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 line-through font-normal">{formatCurrency(originalSubtotal)}</span>
                            <span className="text-sm text-slate-900 dark:text-white">{formatCurrency(activeSubtotal)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-900 dark:text-white">{formatCurrency(originalSubtotal)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Amount Summary Section & Refund Adjustments */}
            {(totalRefundAmount > 0 || !!order.shippingCost) && (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 text-[13.5px] sm:text-xs font-semibold space-y-2.5">
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
                          <span className="text-xs sm:text-[11px] font-normal text-rose-500/90 dark:text-rose-400/80">
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

            <div className="flex justify-between items-center p-4 bg-indigo-100 dark:bg-indigo-950/40 font-bold text-sm">
              <span className="text-slate-800 dark:text-slate-200">Total Pembayaran</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-base sm:text-lg font-mono">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* TERPISAH: Container Catatan Pesanan (Jika Ada) */}
          {order.orderNotes && (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 shadow-xs flex items-start gap-3">
              <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-xs sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                  Catatan Pesanan:
                </span>
                <p className="text-[13.5px] sm:text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed mt-1">
                  {order.orderNotes}
                </p>
              </div>
            </div>
          )}


        </div>

        {/* KOLOM KANAN (5 COLS): PELANGGAN, RIWAYAT PESANAN, KONTAK WHATSAPP */}
        <div className="lg:col-span-5 space-y-5">
          {/* CONTAINER: INFORMASI PESANAN & SALES (Tanpa garis pemisah) */}
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl space-y-2.5 text-[13.5px] sm:text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Nomor Pesanan</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 dark:text-white font-medium">{order.orderNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  className="p-1 -mr-1 text-slate-400 hover:text-indigo-600 active:text-indigo-600 dark:hover:text-indigo-400 dark:active:text-indigo-400 active:scale-95 transition-all cursor-pointer rounded"
                  title="Salin Nomor Pesanan"
                  aria-label="Salin Nomor Pesanan"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal / Waktu Pesanan</span>
              <span className="text-slate-900 dark:text-white font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sales Executive</span>
              <span className="text-slate-900 dark:text-white font-medium">{order.createdBy}</span>
            </div>
          </div>

          {/* CONTAINER: LOG PROSES / RIWAYAT PESANAN (ACCORDION DEFAULT COLLAPSE) */}
          {(() => {
            const displayedEvents = timelineEvents;
            if (displayedEvents.length === 0) return null;

            return (
              <div className="bg-white dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full flex items-center justify-between p-4 text-[15px] sm:text-base font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer select-none"
                >
                  <span>Riwayat Pesanan</span>
                  <ChevronDown
                    className={`w-4.5 h-4.5 text-slate-400 transition-transform duration-200 ${isHistoryExpanded ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {isHistoryExpanded && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="space-y-0 pt-2">
                      {displayedEvents.map((evt, idx) => {
                        const isOrderFinished = order.status === 'SENT';
                        const isLast = idx === displayedEvents.length - 1;
                        const isDone = isOrderFinished ? true : !isLast;
                        const isCurrent = isOrderFinished ? false : isLast;

                        return (
                          <div key={evt.id || idx} className="flex gap-3 text-xs sm:text-sm">
                            {/* Node & Connector Line */}
                            <div className="flex flex-col items-center shrink-0">
                              <div className="flex items-center justify-center mt-0.5">
                                {isDone ? (
                                  <Check className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0 stroke-[2.5]" />
                                ) : isCurrent ? (
                                  <div className="w-4.5 h-4.5 rounded-full border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                  </div>
                                ) : (
                                  <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                                )}
                              </div>
                              {!isLast && (
                                <div className="w-0.5 grow min-h-[24px] bg-slate-200 dark:bg-slate-700/80 my-1" />
                              )}
                            </div>

                            {/* Content */}
                            <div className={`space-y-0.5 ${!isLast ? 'pb-3.5' : ''}`}>
                              <div
                                className={`text-[13.5px] sm:text-sm ${isDone
                                  ? 'text-slate-500 dark:text-slate-400 font-medium'
                                  : isCurrent
                                    ? 'text-slate-900 dark:text-white font-bold'
                                    : 'text-slate-400 dark:text-slate-500 font-medium'
                                  }`}
                              >
                                {evt.title}
                              </div>
                              <p
                                className={`text-xs sm:text-[13px] leading-relaxed ${isDone
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : isCurrent
                                    ? 'text-slate-800 dark:text-white'
                                    : 'text-slate-400 dark:text-slate-600'
                                  }`}
                              >
                                {evt.description}
                              </p>
                              {(evt.timestamp || (evt.actor && evt.actor !== '-')) && (
                                <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 pt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {evt.timestamp && (
                                    <span>{formatDateTime(evt.timestamp)}</span>
                                  )}
                                  {evt.actor && evt.actor !== '-' && (
                                    <>
                                      {evt.timestamp && <span>·</span>}
                                      <span>Oleh: {evt.actor}</span>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Bukti Foto Penerimaan (Jika Ada) */}
                              {evt.photo && (
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProofPhoto(evt.photo!)}
                                    className="group relative block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all cursor-pointer shadow-2xs text-left"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={evt.photo}
                                      alt="Bukti Serah Terima"
                                      className="w-32 h-20 sm:w-36 sm:h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 backdrop-blur-xs">
                                        <Eye className="w-3 h-3" />
                                        <span>Lihat Foto</span>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* CONTAINER: KONTAK WHATSAPP (PELANGGAN & SALES) — Warna Netral (Secondary) */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* WhatsApp Pelanggan */}
            {order.customer.phone && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(getWhatsAppUrl(order.customer.phone), '_blank')}
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                <span>Hubungi Pelanggan</span>
              </Button>
            )}

            {/* WhatsApp Sales (Memuat Nomor SO & URL Detail SO) */}
            {salesPhone && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(getWhatsAppUrl(salesPhone, salesWaMsg), '_blank')}
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                <span>Hubungi Sales</span>
              </Button>
            )}
          </div>

          {/* DESKTOP ACTION BUTTON: Proses Pesanan berada di bawah tombol hubungi sales & pelanggan */}
          {canApproveOrder(currentUser.role) && order.status === 'PENDING' && (
            <div className="hidden md:block">
              <Button
                variant="success"
                size="lg"
                className="w-full text-white font-semibold"
                onClick={handleProcess}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Proses Pesanan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM FIXED ACTION BAR: Tombol aksi utama "Proses Pesanan" selalu berada di bawah tanpa ikut scroll (Konsisten dengan Buat Pesanan) */}
      {canApproveOrder(currentUser.role) && order.status === 'PENDING' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 dark:border-slate-800/90 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pt-3 px-3 pb-[max(12px,calc(env(safe-area-inset-bottom,0px)+4px))] after:content-[''] after:absolute after:top-full after:left-0 after:right-0 after:h-24 after:bg-white dark:after:bg-slate-900 pointer-events-auto">
          <Button
            variant="success"
            className="w-full h-12 text-[15px] font-bold justify-center rounded-xl"
            onClick={handleProcess}
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Proses Pesanan
          </Button>
        </div>
      )}

      {/* CANCEL ORDER MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Batalkan Sales Order — ${order.orderNumber}`}
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} disabled={!cancelReasonInput.trim()}>
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

      {/* COMPLAINT MODAL */}
      <Modal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        title="Ajukan Komplain"
        size="md"
        mobileBottomSheet
        actions={
          <Button
            variant="primary"
            onClick={handleSubmitComplaint}
            disabled={uploadingFiles}
          >
            {uploadingFiles ? 'Memproses File...' : 'Kirim Pengajuan'}
          </Button>
        }
      >
        <div className="space-y-6 sm:space-y-4">
          {complaintError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{complaintError}</span>
            </div>
          )}

          <Select
            label="Kategori"
            required
            value={complaintCategory}
            onChange={e => {
              setComplaintCategory(e.target.value);
              if (complaintError) setComplaintError('');
            }}
          >
            <option value="" disabled></option>
            <option value="Barang tidak sesuai">Barang tidak sesuai</option>
            <option value="Barang rusak / cacat">Barang rusak / cacat</option>
            <option value="Barang kurang">Barang kurang</option>
          </Select>

          <div>
            <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Item yang Bermasalah <span className="ml-1 text-red-500 font-bold">*</span>
            </label>
            <div className="space-y-2">
              {order.items.map((item, idx) => {
                const isSelected = complaintItems.some(i => i.idx === idx);
                const selectedItem = complaintItems.find(i => i.idx === idx);
                const product = products.find(p => p.id === item.productId || p.name === item.productName);
                const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleComplaintItem(idx, !isSelected, item.qty)}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none ${isSelected
                      ? 'border-indigo-400 bg-indigo-50/50 dark:border-indigo-500/60 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/40'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Kiri: Checkbox */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleToggleComplaintItem(idx, checked, item.qty)}
                        />
                      </div>

                      {/* Tengah: Nama Produk & Varian */}
                      <div className="min-w-0 flex-1">
                        <div className="font-normal text-slate-900 dark:text-white truncate text-base sm:text-sm leading-snug">
                          {item.productName}
                        </div>
                        {item.variantLabel && (
                          <div className="text-slate-500 dark:text-slate-400 truncate text-[13px] sm:text-xs font-medium mt-0.5">
                            {formatVariantLabel(item.variantLabel)}
                          </div>
                        )}
                      </div>

                      {/* Kanan: Gambar visual */}
                      <div className="shrink-0">
                        {product?.image ? (
                          <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                            <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-12 w-12 sm:h-12 sm:w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                            <IconComp className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Saat checkbox true: Muncul dalam 1 baris justify-between tanpa border di atasnya */}
                    {isSelected && (
                      <div
                        className="flex items-center justify-between mt-3 pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[13px] md:text-xs whitespace-nowrap">
                          Qty Bermasalah:
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={item.qty}
                          value={selectedItem?.qty || 1}
                          onChange={(e) => handleChangeComplaintQty(idx, parseInt(e.target.value) || 1, item.qty)}
                          inputSize="sm"
                          containerClassName="w-20 shrink-0"
                          className="text-center font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Textarea
            label="Detail Keluhan"
            required
            rows={3}
            value={complaintDesc}
            onChange={e => setComplaintDesc(e.target.value)}
          />

          <div>
            <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
              Unggah Bukti <span className="ml-1 text-red-500 font-bold">*</span>
            </label>
            <div className="space-y-3">
              {complaintAttachments.length === 0 ? (
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-center">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {uploadingFiles ? 'Sedang memproses file...' : 'Klik untuk mengunggah foto/video'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    maks. 10 MB per file
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
              ) : (
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

                  {/* Button Tambah File berukuran sama persis dengan thumbnail di sebelah kanan thumbnail terakhir */}
                  <label
                    className="relative aspect-square rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-800/40 dark:hover:bg-slate-800 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 group"
                    title="Tambah foto atau video lain"
                  >
                    {uploadingFiles ? (
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                    )}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploadingFiles}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* DELIVERY PROOF PHOTO PREVIEW MODAL */}
      <Modal
        isOpen={!!selectedProofPhoto}
        onClose={() => setSelectedProofPhoto(null)}
        title="Foto Bukti Pesanan Diterima"
        size="lg"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setSelectedProofPhoto(null)}>
            Tutup
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center p-1">
          {selectedProofPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedProofPhoto}
              alt="Bukti Serah Terima"
              className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-xs"
            />
          )}
        </div>
      </Modal>

      {/* CUSTOM PROCESS MODAL */}
      <CustomProcessModal
        isOpen={customProcessModalOpen}
        onClose={() => setCustomProcessModalOpen(false)}
        onSuccess={fetchLiveOrderDetail}
        order={order}
      />
    </div>
  );
}
