'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusVariant, getOrderStatusLabel } from '@/lib/utils';
import {
  ShoppingCart,
  Factory,
  Warehouse,
  PackageOpen,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const { salesOrders = [], workOrders = [], materials = [], invoices = [], currentUser } = useApp();

  // Metrics
  const totalOrders = salesOrders.length;
  const activeOrders = salesOrders.filter(o => o.status !== 'CANCELED' && o.status !== 'SENT');
  const activeWorkOrders = workOrders.filter(w => w.status !== 'COMPLETED');
  const lowStockItems = materials.filter(m => m.stock <= m.minStock);
  
  const totalRevenue = invoices
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const pendingPayments = invoices
    .filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL')
    .reduce((sum, i) => sum + ((i.totalAmount || 0) - (i.paidAmount || 0)), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Executive Dashboard"
      >
        <Link href="/order/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Buat Sales Order
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Sales Order</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalOrders}</h3>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {activeOrders.length} order sedang diproses
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SpK Produksi Aktif</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{activeWorkOrders.length}</h3>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                di lantai produksi
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Factory className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Peringatan Stok Bahan</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{lowStockItems.length}</h3>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                {lowStockItems.length > 0 ? 'Bahan menipis/habis' : 'Stok dalam batas aman'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <Warehouse className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendapatan Lunas</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</h3>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Piutang: {formatCurrency(pendingPayments)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Modules */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Modul Utama Reeval ERP</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link href="/order" className="group">
            <Card className="p-4 text-center hover:border-indigo-500 transition-all group-hover:shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">Sales Order</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{salesOrders.length} Pesanan</p>
            </Card>
          </Link>

          <Link href="/production" className="group">
            <Card className="p-4 text-center hover:border-amber-500 transition-all group-hover:shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <Factory className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">Lantai Produksi</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{workOrders.length} SpK Produksi</p>
            </Card>
          </Link>

          <Link href="/inventory" className="group">
            <Card className="p-4 text-center hover:border-blue-500 transition-all group-hover:shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Warehouse className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">Inventaris & PO</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{materials.length} Item Bahan</p>
            </Card>
          </Link>

          <Link href="/products" className="group">
            <Card className="p-4 text-center hover:border-purple-500 transition-all group-hover:shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                <PackageOpen className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">Katalog Produk</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Dipan & Kasur</p>
            </Card>
          </Link>

          <Link href="/delivery" className="group">
            <Card className="p-4 text-center hover:border-emerald-500 transition-all group-hover:shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <Truck className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">Pengiriman</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Surat Jalan SJ</p>
            </Card>
          </Link>

          <Link href="/finance" className="group">
            <Card className="p-4 text-center hover:border-rose-500 transition-all group-hover:shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">Keuangan</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Faktur & Jurnal</p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sales Order Terbaru</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daftar pesanan masuk paling akhir</p>
            </div>
            <Link href="/order" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {salesOrders.slice(0, 5).map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{order.orderNumber}</span>
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {getOrderStatusLabel(order.status, order.cancelledByRole)}
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {order.customer.name} • {order.items.length} item ({formatCurrency(order.totalAmount)})
                  </p>
                </div>
                <div className="text-right text-slate-500 dark:text-slate-400">
                  {formatDate(order.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* System Warnings & Alerts */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Peringatan & Status Sistem
          </h3>

          <div className="space-y-3">
            {lowStockItems.length > 0 ? (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-bold">Stok Bahan Baku Menipis</p>
                  <p className="mt-0.5 text-[11px]">
                    Terdapat {lowStockItems.length} bahan baku (seperti {lowStockItems[0]?.name}) di bawah batas minimum.
                  </p>
                  <Link href="/inventory" className="mt-1.5 inline-block text-[11px] font-bold text-amber-700 underline dark:text-amber-300">
                    Buka Inventaris & Buat PO →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Seluruh stok bahan baku dalam kondisi aman.</span>
              </div>
            )}

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" /> Status Produksi
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {activeWorkOrders.length} SpK sedang dikerjakan operator di lantai produksi.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

