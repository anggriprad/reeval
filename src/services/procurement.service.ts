import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface PurchaseOrderItemResponse {
  id: number;
  material_id: number;
  material_code?: string;
  material_name: string;
  unit: string;
  qty: number;
  received_qty: number;
  remaining_qty: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseOrderStatusHistoryResponse {
  id: number;
  purchase_order_id: number;
  po_number: string;
  from_status: string;
  to_status: string;
  action: string;
  actor_id: number;
  actor_name: string;
  notes?: string;
  total_amount: number;
  additional_cost: number;
  payment_status: string;
  items_snapshot?: string;
  is_posted_to_finance: boolean;
  created_at: string;
}

export interface PurchaseOrderResponse {
  id: number;
  po_number: string;
  supplier: string;
  created_by: string;
  purchase_type: 'PO' | 'DIRECT';
  status: string;
  payment_status: string;
  total_amount: number;
  additional_cost: number;
  bank_account_id?: number | null;
  received_at?: string | null;
  paid_at?: string | null;
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string | null;
  rejection_reason?: string;
  rejected_by?: string;
  rejected_at?: string | null;
  available_actions?: string[];
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItemResponse[];
  histories?: PurchaseOrderStatusHistoryResponse[];
}

export interface CreateProcurementItemRequest {
  material_id: number;
  qty: number;
  unit_cost: number;
}

export interface CreateProcurementRequest {
  supplier: string;
  purchase_type: 'PO' | 'DIRECT';
  bank_account_id?: number;
  additional_cost?: number;
  items: CreateProcurementItemRequest[];
}

export interface ReceivePOItemRequest {
  material_id: number;
  qty: number;
}

export interface ReceivePORequest {
  received_items?: ReceivePOItemRequest[];
}

export interface RejectPORequest {
  reason: string;
}

export interface CancelPORequest {
  reason: string;
}

export interface CancelRemainingPORequest {
  reason?: string;
}

export interface GetProcurementsParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}

export const procurementService = {
  async getProcurements(params?: GetProcurementsParams): Promise<ApiResponse<PurchaseOrderResponse[]>> {
    const response = await httpGet<PurchaseOrderResponse[]>(
      endpointUrl("inventory/procurements"),
      true,
      params
    );
    return response.data;
  },

  async getProcurementById(id: number | string): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpGet<PurchaseOrderResponse>(
      endpointUrl(`inventory/procurements/${id}`),
      true
    );
    return response.data;
  },

  async getHistories(id: number | string): Promise<ApiResponse<PurchaseOrderStatusHistoryResponse[]>> {
    const response = await httpGet<PurchaseOrderStatusHistoryResponse[]>(
      endpointUrl(`inventory/procurements/${id}/histories`),
      true
    );
    return response.data;
  },

  async createProcurement(payload: CreateProcurementRequest): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpPost<PurchaseOrderResponse>(
      endpointUrl("inventory/procurements"),
      payload,
      true
    );
    return response.data;
  },

  async orderPO(id: number | string): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpPut<PurchaseOrderResponse>(
      endpointUrl(`inventory/procurements/${id}/order`),
      {},
      true
    );
    return response.data;
  },

  async receivePO(
    id: number | string,
    payload?: ReceivePORequest
  ): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpPut<PurchaseOrderResponse>(
      endpointUrl(`inventory/procurements/${id}/receive`),
      payload || {},
      true
    );
    return response.data;
  },

  async rejectPO(
    id: number | string,
    payload: RejectPORequest
  ): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpPut<PurchaseOrderResponse>(
      endpointUrl(`inventory/procurements/${id}/reject`),
      payload,
      true
    );
    return response.data;
  },

  async cancelPO(
    id: number | string,
    payload: CancelPORequest
  ): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpPut<PurchaseOrderResponse>(
      endpointUrl(`inventory/procurements/${id}/cancel`),
      payload,
      true
    );
    return response.data;
  },

  async cancelRemainingPO(
    id: number | string,
    payload?: CancelRemainingPORequest
  ): Promise<ApiResponse<PurchaseOrderResponse>> {
    const response = await httpPut<PurchaseOrderResponse>(
      endpointUrl(`inventory/procurements/${id}/cancel-remaining`),
      payload || {},
      true
    );
    return response.data;
  },

  async deletePO(id: number | string): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`inventory/procurements/${id}`),
      true
    );
    return response.data;
  },

  async getStatusDictionary(module = "inventory"): Promise<ApiResponse<any>> {
    const response = await httpGet<any>(
      endpointUrl("inventory/procurements/status-dictionary"),
      true,
      { module }
    );
    return response.data;
  },
};
