import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  ApiResponse,
} from "@/helpers/axios";
import { ReturnedGood, ReturnedGoodAction, ReturnedGoodStatus } from "@/lib/types";

export interface ReturnedGoodResponse {
  id: number;
  return_number: string;
  complaint_id: number;
  complaint_number: string;
  complaint_status?: string;
  sales_order_id: number;
  sales_order_number: string;
  customer_id?: number | null;
  customer_name: string;
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_label: string;
  product_image_url?: string;
  product_image_icon?: string;
  qty: number;
  unit_price: number;
  condition_reason: string;
  custom_notes?: string;
  status: string;
  action_taken?: string;
  action_notes?: string;
  returned_at: string;
  received_at?: string | null;
  received_by?: string;
  action_at?: string | null;
  action_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnedGoodCountsResponse {
  awaiting_receival: number;
  received: number;
  restocked: number;
  disassembled: number;
  scrapped: number;
  canceled: number;
  pending_action: number;
  total: number;
}

export interface GetReturnedGoodsParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  sales_order_id?: number;
  complaint_id?: number;
}

export interface DisassembleSalvageItemPayload {
  material_id: number;
  qty: number;
}

export interface ProcessReturnedGoodActionPayload {
  action: 'RESTOCK' | 'DISASSEMBLE' | 'SCRAP' | 'CANCEL';
  notes?: string;
  salvage_materials?: DisassembleSalvageItemPayload[];
  salvaged_materials?: DisassembleSalvageItemPayload[];
}

export function mapReturnedGoodResponseToReturnedGood(dto: ReturnedGoodResponse): ReturnedGood {
  return {
    id: String(dto.id),
    returnNumber: dto.return_number || undefined,
    complaintId: dto.complaint_id ? String(dto.complaint_id) : "",
    complaintNumber: dto.complaint_number || undefined,
    complaintStatus: dto.complaint_status === "DIPROSES" ? "DITANGANI" : dto.complaint_status,
    salesOrderId: String(dto.sales_order_id),
    salesOrderNumber: dto.sales_order_number,
    customerName: dto.customer_name,
    productId: String(dto.product_id),
    variantId: dto.variant_id ? String(dto.variant_id) : undefined,
    productName: dto.product_name,
    variantLabel: dto.variant_label || undefined,
    productImageUrl: dto.product_image_url || undefined,
    productImageIcon: dto.product_image_icon || undefined,
    qty: dto.qty,
    unitPrice: dto.unit_price,
    conditionReason: dto.condition_reason,
    customNotes: dto.custom_notes || undefined,
    returnedAt: dto.returned_at || dto.created_at,
    receivedAt: dto.received_at || undefined,
    receivedBy: dto.received_by || undefined,
    status: (dto.status === "PENDING" ? "AWAITING_RECEIVAL" : dto.status) as ReturnedGoodStatus,
    actionTaken: (dto.action_taken || undefined) as ReturnedGoodAction | undefined,
    actionNotes: dto.action_notes || undefined,
    actionAt: dto.action_at || undefined,
    actionBy: dto.action_by || undefined,
  };
}

export const returnedGoodService = {
  async getReturnedGoods(
    params?: GetReturnedGoodsParams
  ): Promise<ApiResponse<ReturnedGoodResponse[]>> {
    const response = await httpGet<ReturnedGoodResponse[]>(
      endpointUrl("inventory/returned-goods"),
      true,
      params
    );
    return response.data;
  },

  async getReturnedGoodCounts(): Promise<ApiResponse<ReturnedGoodCountsResponse>> {
    const response = await httpGet<ReturnedGoodCountsResponse>(
      endpointUrl("inventory/returned-goods/counts"),
      true
    );
    return response.data;
  },

  async getReturnedGoodById(
    id: number | string
  ): Promise<ApiResponse<ReturnedGoodResponse>> {
    const response = await httpGet<ReturnedGoodResponse>(
      endpointUrl(`inventory/returned-goods/${id}`),
      true
    );
    return response.data;
  },

  async receiveReturnedGood(
    id: number | string
  ): Promise<ApiResponse<ReturnedGoodResponse>> {
    const response = await httpPut<ReturnedGoodResponse>(
      endpointUrl(`inventory/returned-goods/${id}/receive`),
      {},
      true
    );
    return response.data;
  },

  async processReturnedGoodAction(
    id: number | string,
    payload: ProcessReturnedGoodActionPayload
  ): Promise<ApiResponse<ReturnedGoodResponse>> {
    const response = await httpPost<ReturnedGoodResponse>(
      endpointUrl(`inventory/returned-goods/${id}/action`),
      payload,
      true
    );
    return response.data;
  },
};
