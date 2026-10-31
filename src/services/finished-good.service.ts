import {
  endpointUrl,
  httpGet,
  httpPost,
  ApiResponse,
} from "@/helpers/axios";

export interface FinishedGoodItem {
  id: number;
  product_id: number;
  variant_id?: number;
  sku: string;
  product_name: string;
  variant_label: string;
  combination: Record<string, string>;
  category_id?: number;
  category_name?: string;
  image_icon?: string;
  image_url?: string;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  unit_hpp: number;
  total_hpp: number;
  potential_revenue: number;
  price: number;
  min_stock?: number;
  unit?: string;
  is_active: boolean;
}

export interface GetFinishedGoodsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  show_empty?: boolean;
}

export interface AllocateFinishedGoodPayload {
  product_id: number;
  variant_id?: number;
  sales_order_id: number;
  sales_order_item_id?: number;
  qty: number;
  purpose?: string;
  complaint_id?: string;
  notes?: string;
  unit_id?: string;
}

export interface AllocateFinishedGoodResponse {
  sales_order_id: number;
  sales_order_item_id?: number;
  order_number: string;
  product_id: number;
  variant_id?: number;
  product_name: string;
  variant_label?: string;
  qty: number;
  allocated_qty: number;
  current_produced: number;
  target_qty: number;
  available_stock: number;
  reserved_stock: number;
  total_stock: number;
  order_status: string;
  message: string;
}

export const finishedGoodService = {
  async getFinishedGoods(
    params?: GetFinishedGoodsParams
  ): Promise<ApiResponse<FinishedGoodItem[]>> {
    const response = await httpGet<FinishedGoodItem[]>(
      endpointUrl("inventory/finished-goods"),
      true,
      params
    );
    return response.data;
  },

  async allocateFinishedGood(
    payload: AllocateFinishedGoodPayload
  ): Promise<ApiResponse<AllocateFinishedGoodResponse>> {
    const response = await httpPost<AllocateFinishedGoodResponse>(
      endpointUrl("inventory/finished-goods/allocate"),
      payload,
      true
    );
    return response.data;
  },
};
