import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BOMItem, RawMaterial, Product, FinishedGoodStock, StockLevel, POStatus } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? Math.round(amount) : 0;
  const isNegative = validAmount < 0;
  const formatted = Math.abs(validAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return phone;
  if (clean.startsWith('62')) {
    const rest = clean.slice(2);
    if (rest.length <= 4) return `+62 ${rest}`;
    if (rest.length <= 8) return `+62 ${rest.slice(0, 4)}-${rest.slice(4)}`;
    return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
  }
  return phone;
}

export function getWhatsAppUrl(phone?: string | null, message?: string): string {
  if (!phone) return '#';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  const baseUrl = `https://wa.me/${clean}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

export function formatDurationBetween(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '-';
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return '-';

  const diffMs = end - start;
  const totalMins = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} menit`);

  return parts.join(' ');
}

export function getCustomerLocationDisplay(customer?: { address?: string; city?: string; district?: string } | null): string {
  if (!customer) return '';

  // 1. Prioritaskan jika field district & city tersimpan eksplisit
  if (customer.district && customer.city) {
    const dist = customer.district.toLowerCase().startsWith('kec')
      ? customer.district
      : `Kec. ${customer.district}`;
    return `${dist}, ${customer.city}`;
  }

  const addr = customer.address?.trim() || '';
  if (!addr) return '';

  // 2. Ekstrak dari teks alamat jika mengandung Kecamatan & Kota/Kabupaten
  // Contoh: "Jl. Merdeka No. 10, Kec. Kebon Jeruk, Kota Adm. Jakarta Barat"
  const matchWithComma = addr.match(/(?:Kec\.|Kecamatan)\s*([^,]+),\s*([^,\n]+)/i);
  if (matchWithComma) {
    const district = matchWithComma[1].trim();
    const city = matchWithComma[2].trim();
    return `Kec. ${district}, ${city}`;
  }

  // Contoh tanpa koma: "Kecamatan Menteng Kota Jakarta Pusat"
  const matchNoComma = addr.match(/(?:Kec\.|Kecamatan)\s+([^\s]+(?:\s+[^\s]+)?)\s+(Kota\s+[^,\n]+|Kabupaten\s+[^,\n]+|Kab\.\s+[^,\n]+)/i);
  if (matchNoComma) {
    return `Kec. ${matchNoComma[1].trim()}, ${matchNoComma[2].trim()}`;
  }

  // 3. Fallback: jika tidak ada info kecamatan dan kota, tampilkan alamat lengkap
  return addr;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function getStockLevel(stock: number, minStock: number): StockLevel {
  if (stock <= 0) return 'Habis';
  if (stock <= minStock) return 'Kritis';
  return 'Aman';
}

export function getStockLevelDescription(level: StockLevel | string): string {
  switch (level) {
    case 'Aman':
      return 'Stok cukup untuk operasional harian.';
    case 'Kritis':
    case 'Menipis':
      return 'Sudah menyentuh batas minimal, bagian pengadaan siap buat PO.';
    case 'Habis':
      return 'Barang kosong total, produksi terancam stop.';
    default:
      return '';
  }
}

export function getStockLevelBadgeVariant(level: StockLevel | string): 'success' | 'warning' | 'danger' | 'default' {
  switch (level) {
    case 'Aman': return 'success';
    case 'Kritis':
    case 'Menipis': return 'warning';
    case 'Habis': return 'danger';
    default: return 'default';
  }
}

export function getStockLevelColor(level: StockLevel | 'Menipis' | string): string {
  switch (level) {
    case 'Aman': return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    case 'Kritis':
    case 'Menipis': return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    case 'Habis': return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60';
    default: return 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getStockLevelTextColor(level: StockLevel | 'Menipis' | string): string {
  switch (level) {
    case 'Aman': return 'text-emerald-600 dark:text-emerald-400';
    case 'Kritis':
    case 'Menipis': return 'text-amber-600 dark:text-amber-400';
    case 'Habis': return 'text-red-600 dark:text-red-400';
    default: return 'text-slate-600 dark:text-slate-400';
  }
}


export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'PROCESSING': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'PARTIALLY_READY': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'READY': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'PARTIALLY_SHIPPED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'SENT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'CANCELED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getOrderStatusVariant(status: string): 'warning' | 'info' | 'purple' | 'success' | 'danger' | 'default' {
  switch (status) {
    case 'PENDING': return 'warning';
    case 'PROCESSING': return 'info';
    case 'PARTIALLY_READY': return 'info';
    case 'READY': return 'purple';
    case 'PARTIALLY_SHIPPED': return 'purple';
    case 'SENT': return 'success';
    case 'CANCELED': return 'danger';
    default: return 'default';
  }
}

export function getOrderStatusLabel(status: string, cancelledByRole?: string): string {
  switch (status) {
    case 'PENDING': return 'Menunggu';
    case 'PROCESSING': return 'Diproses';
    case 'PARTIALLY_READY': return 'Sebagian Siap';
    case 'READY': return 'Siap Kirim';
    case 'PARTIALLY_SHIPPED': return 'Sebagian Terkirim';
    case 'SENT': return 'Terkirim';
    case 'CANCELED':
      if (cancelledByRole) {
        const roleStr = cancelledByRole.toLowerCase() === 'admin' ? 'admin' : cancelledByRole.toLowerCase() === 'sales' ? 'sales' : cancelledByRole.toLowerCase();
        return `Dibatalkan oleh ${roleStr}`;
      }
      return 'Dibatalkan';
    default: return status;
  }
}

export function getSPKStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
    case 'QUEUED': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    case 'IN_PROGRESS':
    case 'PROCESSING': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'CUTTING': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'ASSEMBLY': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'UPHOLSTERY': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400';
    case 'QC_PACKING': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'CANCELED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
}

export function getSPKStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
    case 'QUEUED': return 'Menunggu';
    case 'IN_PROGRESS':
    case 'PROCESSING': return 'Berjalan';
    case 'CUTTING': return 'Potong';
    case 'ASSEMBLY': return 'Rakit';
    case 'UPHOLSTERY': return 'Jok & Busa';
    case 'QC_PACKING': return 'QC & Packing';
    case 'COMPLETED': return 'Selesai';
    case 'CANCELED': return 'Dibatalkan';
    default: return status;
  }
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'UNPAID': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'PARTIAL': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'PAID': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getInvoiceStatusLabel(status: string): string {
  switch (status) {
    case 'UNPAID': return 'Belum Bayar';
    case 'PARTIAL': return 'DP / Cicilan';
    case 'PAID': return 'Lunas';
    default: return status;
  }
}

export function getPOStatusLabel(status: POStatus | string): string {
  switch (status) {
    case 'DRAFT': return 'Menunggu';
    case 'ORDERED': return 'Dipesan';
    case 'PARTIALLY_RECEIVED': return 'Diterima Sebagian';
    case 'RECEIVED': return 'Diterima';
    case 'REJECTED': return 'Ditolak';
    case 'CANCELED': return 'Dibatalkan';
    default: return status;
  }
}

export function getComplaintStatusLabel(status: string): string {
  switch (status) {
    case 'DIAJUKAN':
    case 'MENUNGGU': return 'Menunggu';
    case 'DITANGANI': return 'Ditangani';
    case 'SELESAI': return 'Selesai';
    case 'DITOLAK': return 'Ditolak';
    default: return status;
  }
}

export function getPOStatusVariant(status: POStatus | string): 'warning' | 'info' | 'purple' | 'success' | 'danger' | 'default' {
  switch (status) {
    case 'DRAFT': return 'warning';
    case 'ORDERED': return 'info';
    case 'PARTIALLY_RECEIVED': return 'purple';
    case 'RECEIVED': return 'success';
    case 'REJECTED': return 'danger';
    case 'CANCELED': return 'danger';
    default: return 'default';
  }
}


export const SPK_STAGES: Array<{ key: string; label: string; color: string }> = [
  { key: 'QUEUED', label: 'Menunggu', color: 'border-slate-300 dark:border-slate-600' },
  { key: 'CUTTING', label: 'Potong Bahan', color: 'border-orange-400 dark:border-orange-500' },
  { key: 'ASSEMBLY', label: 'Rakit Rangka', color: 'border-blue-400 dark:border-blue-500' },
  { key: 'UPHOLSTERY', label: 'Jok & Busa', color: 'border-violet-400 dark:border-violet-500' },
  { key: 'QC_PACKING', label: 'QC & Packing', color: 'border-cyan-400 dark:border-cyan-500' },
  { key: 'COMPLETED', label: 'Selesai', color: 'border-emerald-400 dark:border-emerald-500' },
];

export function getEffectiveVariantBOM(
  variant: { presetId?: string; isCustomBOM?: boolean; bom?: { materialId: string; qty: number }[] } | undefined | null,
  bomTemplateItems: { templateId: string; materialId: string; defaultQty: number }[]
): { materialId: string; qty: number }[] {
  if (!variant) return [];
  if (variant.isCustomBOM) {
    return variant.bom || [];
  }
  if (variant.presetId) {
    const tplItems = bomTemplateItems.filter(item => item.templateId === variant.presetId);
    if (tplItems.length > 0) {
      return tplItems.map(item => ({ materialId: item.materialId, qty: item.defaultQty }));
    }
  }
  return variant.bom || [];
}

export function formatVariantLabel(label?: string | null): string {
  if (!label) return '';
  const cleaned = label.replace(/\s*\((?:Bahan Setengah Jadi|WIP)[^)]*\)/gi, '').trim();
  return cleaned
    .split(/[•/]/)
    .map(part => {
      const trimmed = part.trim();
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        return trimmed.substring(colonIdx + 1).trim();
      }
      return trimmed;
    })
    .filter(Boolean)
    .join(' • ');
}

/**
 * Calculates Bahan Setengah Jadi unit cost = (Sum of Child Materials Cost) + (Planned Labor Cost of Routing).
 * Recursively supports nested Bahan Setengah Jadi.
 */
export function calculateSubAssemblyCost(
  childBom: { materialId: string; qty: number }[] | undefined | null,
  allMaterials: { id: string; unitCost: number; isSubAssembly?: boolean; childBom?: { materialId: string; qty: number }[]; routingId?: string }[],
  routingId?: string,
  allRoutings?: { id: string; steps: { operationId: string }[] }[],
  allOperations?: { id: string; costingMethod?: 'fixed' | 'hourly'; fixedLaborCost?: number; laborCostPerHour?: number; durationMinutes?: number }[]
): number {
  if (!childBom) childBom = [];
  const materialCost = calculateRollupBOMCost(childBom, allMaterials, allRoutings, allOperations);

  let laborCost = 0;
  if (routingId && allRoutings && allOperations) {
    const routing = allRoutings.find(r => r.id === routingId);
    if (routing) {
      laborCost = routing.steps.reduce((acc, step) => {
        const op = allOperations.find(o => o.id === step.operationId);
        if (!op) return acc;
        if (op.costingMethod === 'fixed') {
          return acc + (op.fixedLaborCost || 0);
        }
        const hours = (op.durationMinutes || 30) / 60;
        return acc + (hours * (op.laborCostPerHour || 0));
      }, 0);
    }
  }

  return materialCost + laborCost;
}

/**
 * Recursively explodes a BOM item list down to raw materials and calculates total material cost.
 * If a BOM item is a Bahan Setengah Jadi with its own childBom, it recursively calculates the bahan setengah jadi cost (including its labor).
 */
export function calculateRollupBOMCost(
  bom: { materialId: string; qty: number }[] | undefined | null,
  allMaterials: { id: string; unitCost: number; isSubAssembly?: boolean; childBom?: { materialId: string; qty: number }[]; routingId?: string }[],
  allRoutings?: { id: string; steps: { operationId: string }[] }[],
  allOperations?: { id: string; costingMethod?: 'fixed' | 'hourly'; fixedLaborCost?: number; laborCostPerHour?: number; durationMinutes?: number }[]
): number {
  if (!bom || bom.length === 0) return 0;

  return bom.reduce((total, item) => {
    const mat = allMaterials.find(m => m.id === item.materialId);
    if (!mat) return total;

    if (mat.isSubAssembly) {
      // Rollup child BOM cost + labor cost recursively
      const subUnitCost = calculateSubAssemblyCost(mat.childBom, allMaterials, mat.routingId, allRoutings, allOperations);
      return total + (subUnitCost * item.qty);
    }

    return total + (mat.unitCost * item.qty);
  }, 0);
}

/**
 * Sinkronisasi produk katalog beserta seluruh variannya ke dalam daftar Barang Jadi (Finished Goods).
 * Semua produk katalog otomatis memiliki entri barang jadi dengan default stok 0.
 * Jika barang jadi sudah ada sebelumnya, stok dan pengaturannya tetap dipertahankan.
 */
export function syncFinishedGoodsWithProducts(
  products: Product[],
  currentFinishedGoods: FinishedGoodStock[] = []
): FinishedGoodStock[] {
  // Entri stok SPK spesifik (id berbasis SPK) dipertahankan tersendiri tanpa tertimpa
  const spkFinishedGoods = currentFinishedGoods.filter(fg => fg.id.startsWith('SPK') || fg.id.startsWith('spk'));
  const nonSpkFinishedGoods = currentFinishedGoods.filter(fg => !fg.id.startsWith('SPK') && !fg.id.startsWith('spk'));

  const fgMap = new Map<string, FinishedGoodStock>();
  for (const fg of nonSpkFinishedGoods) {
    const key = `${fg.productId}__${fg.variantId || ''}`;
    fgMap.set(key, fg);
  }

  const result: FinishedGoodStock[] = [];

  for (const prod of products) {
    if (prod.isActive === false) continue;
    if (prod.variants && prod.variants.length > 0) {
      for (const variant of prod.variants) {
        if (variant.isActive === false) continue;
        const key = `${prod.id}__${variant.id}`;
        const existing = fgMap.get(key);
        const variantLabel = Object.values(variant.combination || {}).join(' • ') || variant.sku;

        if (existing) {
          result.push({
            ...existing,
            productName: prod.name,
            variantLabel: variantLabel || existing.variantLabel,
            isActive: existing.isActive !== false,
          });
          fgMap.delete(key);
        } else {
          result.push({
            id: `fg-${prod.id}-${variant.id}`,
            productId: prod.id,
            variantId: variant.id,
            productName: prod.name,
            variantLabel,
            stock: variant.initialStock || 0,
            minStock: 0,
            unit: 'unit',
            isActive: true,
          });
        }
      }
    } else {
      // Produk tanpa varian
      const key = `${prod.id}__`;
      const existing = fgMap.get(key);
      const initStock = prod.variants?.[0]?.initialStock || 0;
      if (existing) {
        result.push({
          ...existing,
          productName: prod.name,
          isActive: existing.isActive !== false,
        });
        fgMap.delete(key);
      } else {
        result.push({
          id: `fg-${prod.id}`,
          productId: prod.id,
          variantId: undefined,
          productName: prod.name,
          variantLabel: undefined,
          stock: initStock,
          minStock: 0,
          unit: 'unit',
          isActive: true,
        });
      }
    }
  }

  // Pertahankan barang jadi non-katalog/custom yang masih memiliki stok
  for (const remainingFG of fgMap.values()) {
    if (remainingFG.stock > 0) {
      result.push(remainingFG);
    }
  }

  return [...result, ...spkFinishedGoods];
}

/**
 * Format ID Pesanan: YYMMDDHHmmss + increment (contoh: 2610021131151)
 */
export function generateOrderNumber(orderCount: number, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yy}${mm}${dd}${hh}${min}${ss}${orderCount}`;
}

/**
 * Format ID Barang / Unit SPK: Pesanan-orderitem (contoh: 2610021131151-001)
 */
export function generateItemUnitNumber(orderNumber: string, unitIndex: number): string {
  return `${orderNumber}-${String(unitIndex).padStart(3, '0')}`;
}

/**
 * Menghitung total stok netto dari riwayat mutasi stok:
 * Total Stok = (Inisiasi + Masuk) - Keluar
 */
export function calculateNetStockFromMovements(
  movements: { type: 'IN' | 'OUT' | 'INIT'; qty: number }[]
): number {
  return movements.reduce((acc, mv) => {
    if (mv.type === 'INIT' || mv.type === 'IN') {
      return acc + mv.qty;
    }
    if (mv.type === 'OUT') {
      return acc - mv.qty;
    }
    return acc;
  }, 0);
}

