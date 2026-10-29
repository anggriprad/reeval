import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface ProductionRoutingStepInput {
  operation_id: number;
  step_order: number;
  notes?: string;
}

export interface CreateProductionRoutingPayload {
  name: string;
  description?: string;
  steps: ProductionRoutingStepInput[];
}

export interface UpdateProductionRoutingPayload {
  name: string;
  description?: string;
  steps: ProductionRoutingStepInput[];
}

export interface ProductionRoutingStepItem {
  id: number;
  operation_id: number;
  operation_name: string;
  wage_type: string;
  step_order: number;
  duration_minutes: number;
  labor_cost: number;
  notes?: string;
}

export interface ProductionRoutingItem {
  id: number;
  name: string;
  description?: string;
  total_duration_minutes: number;
  total_labor_cost: number;
  step_count: number;
  can_delete: boolean;
  is_active: boolean;
  steps?: ProductionRoutingStepItem[];
  created_at: string;
  updated_at: string;
}

export interface ProductionRoutingStepOption {
  id: number;
  sequence: number;
  operation_id: number;
  operation_name: string;
  duration_minutes: number;
  costing_method: 'fixed' | 'hourly' | string;
  fixed_labor_cost: number;
  labor_cost_per_hour: number;
}

export interface ProductionRoutingOption {
  id: number;
  name: string;
  step_count?: number;
  total_duration_minutes: number;
  total_labor_cost: number;
  steps?: ProductionRoutingStepOption[];
}

export interface GetProductionRoutingsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const productionRoutingService = {
  async getRoutings(
    params?: GetProductionRoutingsParams
  ): Promise<ApiResponse<ProductionRoutingItem[]>> {
    const response = await httpGet<ProductionRoutingItem[]>(
      endpointUrl("production/routings"),
      true,
      params
    );
    return response.data;
  },

  async getRoutingOptions(): Promise<ApiResponse<ProductionRoutingOption[]>> {
    const response = await httpGet<ProductionRoutingOption[]>(
      endpointUrl("production/routings/options"),
      true
    );
    return response.data;
  },

  async getRoutingById(
    id: number
  ): Promise<ApiResponse<ProductionRoutingItem>> {
    const response = await httpGet<ProductionRoutingItem>(
      endpointUrl(`production/routings/${id}`),
      true
    );
    return response.data;
  },

  async createRouting(
    payload: CreateProductionRoutingPayload
  ): Promise<ApiResponse<ProductionRoutingItem>> {
    const response = await httpPost<ProductionRoutingItem>(
      endpointUrl("production/routings"),
      payload,
      true
    );
    return response.data;
  },

  async updateRouting(
    id: number,
    payload: UpdateProductionRoutingPayload
  ): Promise<ApiResponse<ProductionRoutingItem>> {
    const response = await httpPut<ProductionRoutingItem>(
      endpointUrl(`production/routings/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteRouting(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`production/routings/${id}`),
      true
    );
    return response.data;
  },
};
