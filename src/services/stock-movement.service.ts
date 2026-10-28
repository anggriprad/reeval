import {
  endpointUrl,
  httpGet,
  httpPost,
  ApiResponse,
} from "@/helpers/axios";

export interface StockMovementItem {
  id: number;
  material_id?: number | null;
  material_code?: string;
  material_name: string;
  unit?: string;
  type: string;
  qty: number;
  reference: string;
  reference_type: string;
  reference_id?: number | null;
  date: string;
  stock_category: string;
  is_active: boolean;
}

export interface CreateStockMovementPayload {
  material_id: number;
  type: 'IN' | 'OUT';
  qty: number;
  reference?: string;
  reference_type?: string;
  reference_id?: number;
  date?: string;
}

export interface GetStockMovementsParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: string;
  material_id?: number;
}

export const stockMovementService = {
  async getStockMovements(
    params?: GetStockMovementsParams
  ): Promise<ApiResponse<StockMovementItem[]>> {
    const response = await httpGet<StockMovementItem[]>(
      endpointUrl("inventory/stock-movements"),
      true,
      params
    );
    return response.data;
  },

  async recordStockMovement(
    payload: CreateStockMovementPayload
  ): Promise<ApiResponse<StockMovementItem>> {
    const response = await httpPost<StockMovementItem>(
      endpointUrl("inventory/stock-movements"),
      payload,
      true
    );
    return response.data;
  },
};
