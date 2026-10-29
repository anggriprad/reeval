'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ActionMenu } from '@/components/ui/ActionMenu';
import {
  formatCurrency,
  formatDateTime,
  formatVariantLabel,
  getOrderStatusVariant,
  getOrderStatusLabel,
  getCustomerLocationDisplay,
} from '@/lib/utils';
import type { SalesOrder, Product } from '@/lib/types';
import {
  User,
  MapPin,
  FileText,
  Truck,
  CheckCircle,
  Sliders,
  Edit,
  XCircle,
  ChevronDown,
  ChevronUp,
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

interface OrderCardProps {
  order: SalesOrder;
  products?: Product[];
  isExpanded?: boolean;
  onToggleExpand?: (orderId: string) => void;
  canApprove?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onProcessOrder?: (orderId: string) => void;
  onOpenCancelModal?: (orderId: string) => void;
  onOpenCustomProcessModal?: (order: SalesOrder) => void;
}

export function OrderCard({
  order,
  products = [],
  isExpanded = false,
  onToggleExpand,
  canApprove = false,
  canUpdate = false,
  canDelete = false,
  onProcessOrder,
  onOpenCancelModal,
  onOpenCustomProcessModal,
}: OrderCardProps) {
  const router = useRouter();

  const actionMenuItems = [];
  if (canUpdate && onOpenCustomProcessModal) {
    actionMenuItems.push({
      label: 'Kustom Proses',
      icon: <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
      onClick: () => onOpenCustomProcessModal(order),
    });
    actionMenuItems.push({
      label: 'Edit Pesanan',
      icon: <Edit className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
      onClick: () => router.push(`/order/create?edit=${order.id}`),
    });
  }
  if (canDelete && onOpenCancelModal) {
    actionMenuItems.push({
      label: 'Batalkan Order',
      icon: <XCircle className="h-3.5 w-3.5" />,
      variant: 'danger' as const,
      onClick: () => onOpenCancelModal(order.id),
    });
  }

  return (
    <Card
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
            {order.items.some((i) => i.isBomCustomized) && (
              <Badge variant="purple">Kustom Proses</Badge>
            )}
            {order.complaints &&
              order.complaints.some((c) => c.status !== 'SELESAI' && c.status !== 'DITOLAK') && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                  Dikomplain
                </Badge>
              )}
          </div>
        </div>

        {/* Salesperson & ID SO: Desktop only (hidden on mobile) */}
        <div className="hidden sm:block text-right text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 shrink-0">
          {order.createdBy} <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>{' '}
          <span>{order.orderNumber}</span>
        </div>
      </div>

      {/* CUSTOMER INFO: Nama pelanggan & Alamat */}
      <div className="flex flex-col space-y-1 text-[13.5px] sm:text-xs font-normal text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <User className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
          <span className="font-medium sm:font-normal">{order.customer.name}</span>
        </span>
        {(order.customer.address || order.customer.district) && (
          <span className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
            <MapPin className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{getCustomerLocationDisplay(order.customer)}</span>
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
        {order.items.slice(0, isExpanded ? order.items.length : 1).map((item, idx) => {
          const product = products.find(
            (p) => String(p.id) === String(item.productId) || p.name === item.productName
          );
          const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

          return (
            <div
              key={idx}
              className="space-y-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800/80"
            >
              {/* Row: Visual & Info Produk (Kiri) + QTY (Kanan) */}
              <div className="flex items-center justify-between gap-3 min-w-0">
                {/* KIRI: Visual Produk + Nama & Varian */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {product?.image ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                      <img
                        src={product.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
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
                        <Badge
                          variant="purple"
                          className="shrink-0 text-[10px] py-0 px-1.5 font-semibold"
                        >
                          {item.qty > 1 && item.unitCustomProcesses
                            ? `Kustom (${item.unitCustomProcesses.filter((u) => u.isBomCustomized).length}/${item.qty})`
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
                        {item.selectedModifiers.map((mGroup) =>
                          mGroup.selectedOptions.map((opt) => (
                            <span
                              key={opt.optionId}
                              className="text-xs bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-medium truncate max-w-[130px]"
                            >
                              +{opt.name}
                            </span>
                          ))
                        )}
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
                <div
                  className="text-[13px] sm:text-xs text-amber-800 dark:text-amber-300 font-normal truncate pt-0.5"
                  title={item.customNotes}
                >
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
              if (onToggleExpand) onToggleExpand(order.id);
            }}
            className="w-full text-center py-2 sm:py-1.5 text-[13px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Sembunyikan item
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Tampilkan{' '}
                {order.items.length - 1} item lainnya...
              </>
            )}
          </button>
        )}
      </div>

      {/* BOTTOM SECTION: Order Notes + Total & Action Buttons */}
      <div
        className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6 ${
          order.orderNotes ? 'mt-1 pt-1' : 'hidden sm:flex mt-1 pt-1'
        }`}
      >
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

        {/* Container Total Pesanan & Action Buttons */}
        <div className="hidden sm:flex items-center justify-end gap-3 sm:gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Total Pesanan
            </span>
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
            <div
              className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4"
              onClick={(e) => e.stopPropagation()}
            >
              {canApprove && onProcessOrder && (
                <Button
                  variant="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProcessOrder(order.id);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Proses Pesanan
                </Button>
              )}

              {actionMenuItems.length > 0 && (
                <ActionMenu align="right" triggerTitle="Opsi Pesanan" items={actionMenuItems} />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
