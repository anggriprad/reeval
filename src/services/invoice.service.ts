import { ApiResponse, endpointUrl, httpGet, httpPost } from "@/helpers/axios";
import type { ApiAuditFields, Invoice, InvoiceStatus, Payment } from "@/lib/types";

export interface InvoicePaymentDTO extends ApiAuditFields {
  id: number;
  invoice_id: number;
  amount: number;
  method: string;
  bank_account_id?: number | null;
  bank_account_name?: string;
  date: string;
  note: string;
  confirmed_by: string;
  cash_transaction_id?: number | null;
  journal_entry_id?: number | null;
  created_at?: string;
}

export interface InvoiceDTO extends ApiAuditFields {
  id: number;
  company_id: number;
  invoice_number: string;
  sales_order_id: number;
  sales_order_number: string;
  sales_name: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
  issued_at: string;
  due_date?: string | null;
  journal_entry_id?: number | null;
  payments: InvoicePaymentDTO[];
  created_at?: string;
  updated_at?: string;
}

export interface SyncSentOrdersDTO {
  created_count: number;
  skipped_count: number;
  invoices: InvoiceDTO[];
}

export interface PurchaseOrderPaymentDTO extends ApiAuditFields {
  id: number;
  purchase_order_id: number;
  amount: number;
  method: string;
  bank_account_id?: number | null;
  bank_account_name?: string;
  date: string;
  note: string;
  confirmed_by: string;
  cash_transaction_id?: number | null;
  journal_entry_id?: number | null;
  created_at?: string;
}

export interface APPurchaseOrderDTO extends ApiAuditFields {
  id: number;
  po_number: string;
  supplier: string;
  purchase_type: string;
  status: string;
  payment_status: "UNPAID" | "PARTIAL" | "PAID" | string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  additional_cost: number;
  received_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  payments: PurchaseOrderPaymentDTO[];
}

export interface GetInvoicesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sales_order_id?: number;
  customer?: string;
}

export interface GetAPPurchaseOrdersParams {
  page?: number;
  per_page?: number;
  search?: string;
  payment_status?: string;
  supplier?: string;
}

export interface RecordInvoicePaymentPayload {
  amount: number;
  bank_account_id: number;
  date: string;
  note?: string;
}

export interface RecordPOPaymentPayload {
  amount: number;
  bank_account_id: number;
  date: string;
  note?: string;
}

export interface InvoiceViewModel extends Invoice {
  numericId: number;
  remainingAmount: number;
  dueDate?: string | null;
  journalEntryId?: number | null;
}

export interface APPurchaseOrderViewModel {
  id: string;
  numericId: number;
  poNumber: string;
  supplier: string;
  purchaseType: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  additionalCost: number;
  receivedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    bankAccountId?: number | null;
    bankAccountName?: string;
    date: string;
    note: string;
    confirmedBy: string;
  }>;
}

export function mapInvoicePaymentDTO(dto: InvoicePaymentDTO): Payment {
  return {
    id: String(dto.id),
    amount: Number(dto.amount ?? 0),
    method: dto.method || (dto.bank_account_name ? `Transfer ${dto.bank_account_name}` : "Transfer Bank"),
    date: dto.date,
    note: dto.note || "",
    confirmedBy: dto.confirmed_by || dto.created_by || "",
  };
}

export function mapInvoiceDTOToInvoice(dto: InvoiceDTO): InvoiceViewModel {
  return {
    id: String(dto.id),
    numericId: dto.id,
    invoiceNumber: dto.invoice_number,
    salesOrderId: String(dto.sales_order_id),
    salesOrderNumber: dto.sales_order_number,
    salesName: dto.sales_name || "-",
    customerName: dto.customer_name,
    totalAmount: Number(dto.total_amount ?? 0),
    paidAmount: Number(dto.paid_amount ?? 0),
    remainingAmount: Number(dto.remaining_amount ?? Math.max(0, Number(dto.total_amount ?? 0) - Number(dto.paid_amount ?? 0))),
    status: dto.status,
    issuedAt: dto.issued_at,
    dueDate: dto.due_date ?? null,
    journalEntryId: dto.journal_entry_id ?? null,
    createdAt: dto.created_at || dto.issued_at,
    payments: Array.isArray(dto.payments) ? dto.payments.map(mapInvoicePaymentDTO) : [],
  };
}

export function mapAPPurchaseOrderDTO(dto: APPurchaseOrderDTO): APPurchaseOrderViewModel {
  return {
    id: String(dto.id),
    numericId: dto.id,
    poNumber: dto.po_number,
    supplier: dto.supplier,
    purchaseType: dto.purchase_type,
    status: dto.status,
    paymentStatus: dto.payment_status,
    totalAmount: Number(dto.total_amount ?? 0),
    paidAmount: Number(dto.paid_amount ?? 0),
    remainingAmount: Number(dto.remaining_amount ?? Math.max(0, Number(dto.total_amount ?? 0) - Number(dto.paid_amount ?? 0))),
    additionalCost: Number(dto.additional_cost ?? 0),
    receivedAt: dto.received_at ?? null,
    paidAt: dto.paid_at ?? null,
    createdAt: dto.created_at,
    payments: Array.isArray(dto.payments)
      ? dto.payments.map((p) => ({
          id: String(p.id),
          amount: Number(p.amount ?? 0),
          method: p.method || (p.bank_account_name ? `Transfer ${p.bank_account_name}` : "Transfer Bank"),
          bankAccountId: p.bank_account_id ?? null,
          bankAccountName: p.bank_account_name,
          date: p.date,
          note: p.note || "",
          confirmedBy: p.confirmed_by || p.created_by || "",
        }))
      : [],
  };
}

export const invoiceService = {
  getInvoices: async (params?: GetInvoicesParams): Promise<ApiResponse<InvoiceDTO[]>> => {
    const res = await httpGet<InvoiceDTO[]>(endpointUrl("finance/invoices"), true, params);
    return res.data;
  },

  getInvoiceById: async (id: number | string): Promise<ApiResponse<InvoiceDTO>> => {
    const res = await httpGet<InvoiceDTO>(endpointUrl(`finance/invoices/${id}`), true);
    return res.data;
  },

  getInvoiceByOrderId: async (orderId: number | string): Promise<ApiResponse<InvoiceDTO>> => {
    const res = await httpGet<InvoiceDTO>(endpointUrl(`finance/invoices/by-order/${orderId}`), true);
    return res.data;
  },

  createFromOrder: async (salesOrderId: number): Promise<ApiResponse<InvoiceDTO>> => {
    const res = await httpPost<InvoiceDTO>(
      endpointUrl("finance/invoices/from-order"),
      { sales_order_id: salesOrderId },
      true
    );
    return res.data;
  },

  syncSentOrders: async (): Promise<ApiResponse<SyncSentOrdersDTO>> => {
    const res = await httpPost<SyncSentOrdersDTO>(endpointUrl("finance/invoices/sync"), {}, true);
    return res.data;
  },

  recordPayment: async (
    invoiceId: number | string,
    payload: RecordInvoicePaymentPayload
  ): Promise<ApiResponse<InvoiceDTO>> => {
    const res = await httpPost<InvoiceDTO>(
      endpointUrl(`finance/invoices/${invoiceId}/payments`),
      payload,
      true
    );
    return res.data;
  },

  getAPPurchaseOrders: async (
    params?: GetAPPurchaseOrdersParams
  ): Promise<ApiResponse<APPurchaseOrderDTO[]>> => {
    const res = await httpGet<APPurchaseOrderDTO[]>(
      endpointUrl("finance/ap-purchase-orders"),
      true,
      params
    );
    return res.data;
  },

  getAPPOById: async (id: number | string): Promise<ApiResponse<APPurchaseOrderDTO>> => {
    const res = await httpGet<APPurchaseOrderDTO>(
      endpointUrl(`finance/ap-purchase-orders/${id}`),
      true
    );
    return res.data;
  },

  recordPOPayment: async (
    poId: number | string,
    payload: RecordPOPaymentPayload
  ): Promise<ApiResponse<APPurchaseOrderDTO>> => {
    const res = await httpPost<APPurchaseOrderDTO>(
      endpointUrl(`finance/ap-purchase-orders/${poId}/payments`),
      payload,
      true
    );
    return res.data;
  },
};
