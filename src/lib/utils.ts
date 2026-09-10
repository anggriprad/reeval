import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(validAmount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\./g, ':');
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

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function getStockLevel(stock: number, minStock: number): 'Aman' | 'Menipis' | 'Kritis' {
  if (stock <= 0) return 'Kritis';
  if (stock <= minStock) return 'Menipis';
  return 'Aman';
}

export function getStockLevelColor(level: 'Aman' | 'Menipis' | 'Kritis'): string {
  switch (level) {
    case 'Aman': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'Menipis': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'Kritis': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'PROCESSING': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'READY': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'SENT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'CANCELED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getOrderStatusLabel(status: string, cancelledByRole?: string): string {
  switch (status) {
    case 'PENDING': return 'Menunggu';
    case 'PROCESSING': return 'Diproses';
    case 'READY': return 'Siap Kirim';
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
    case 'QUEUED': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    case 'CUTTING': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'ASSEMBLY': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'UPHOLSTERY': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400';
    case 'QC_PACKING': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
}

export function getSPKStatusLabel(status: string): string {
  switch (status) {
    case 'QUEUED': return 'Menunggu';
    case 'CUTTING': return 'Potong';
    case 'ASSEMBLY': return 'Rakit';
    case 'UPHOLSTERY': return 'Jok & Busa';
    case 'QC_PACKING': return 'QC & Packing';
    case 'COMPLETED': return 'Selesai';
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
  return label
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
