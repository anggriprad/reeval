'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime, formatVariantLabel, getComplaintStatusLabel } from '@/lib/utils';
import type { Product } from '@/lib/types';
import {
  User,
  FileText,
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

export interface ComplaintCardData {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  category: string;
  status: string;
  description?: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    variantLabel?: string;
    qty: number;
  }>;
}

interface ComplaintCardProps {
  complaint: ComplaintCardData;
  products?: Product[];
}

export function ComplaintCard({ complaint, products = [] }: ComplaintCardProps) {
  const router = useRouter();

  return (
    <Card
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
            <Badge
              className={
                complaint.status === 'SELESAI'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : complaint.status === 'DITOLAK'
                  ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                  : complaint.status === 'DITANGANI' || complaint.status === 'DIPROSES'
                  ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }
            >
              {getComplaintStatusLabel(complaint.status as any)}
            </Badge>
          </div>
        </div>

        {/* ID SO: Desktop only (hidden on mobile) */}
        {complaint.orderNumber && (
          <div className="hidden sm:block text-right text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 shrink-0">
            <span>{complaint.orderNumber}</span>
          </div>
        )}
      </div>

      {/* INFO PELANGGAN: Kategori Komplain di atas Nama Pelanggan (Tanpa Alamat) */}
      <div className="flex flex-col space-y-1 text-[13.5px] sm:text-xs font-normal text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-sm sm:text-xs text-slate-900 dark:text-white">
          {complaint.category}
        </span>
        {complaint.customerName && (
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
            <span className="font-medium sm:font-normal">{complaint.customerName}</span>
          </span>
        )}
      </div>

      {/* MIDDLE SECTION: Complaint Items */}
      <div className="space-y-2">
        {complaint.items.map((item, idx) => {
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

      {/* BOTTOM SECTION: Deskripsi Komplain */}
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
  );
}
