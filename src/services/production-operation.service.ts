import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export type ProductionWageType = 'FIXED' | 'HOURLY';

export interface ProductionOperationItem {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  wage_type: ProductionWageType;
  cost_per_hour: number;
  fixed_cost: number;
  standard_duration_minutes: number;
  calculated_labor_cost: number;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductionOperationOption {
  id: number;
  name: string;
  wage_type?: string;
  standard_duration_minutes?: number;
  calculated_labor_cost?: number;
}

export interface CreateProductionOperationPayload {
  name: string;
  description?: string;
  wage_type: ProductionWageType;
  cost_per_hour?: number;
  fixed_cost?: number;
  standard_duration_minutes?: number;
}

export interface UpdateProductionOperationPayload {
  name: string;
  description?: string;
  wage_type: ProductionWageType;
  cost_per_hour?: number;
  fixed_cost?: number;
  standard_duration_minutes?: number;
}

export interface GetProductionOperationsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const productionOperationService = {
  async getOperations(
    params?: GetProductionOperationsParams
  ): Promise<ApiResponse<ProductionOperationItem[]>> {
    const response = await httpGet<ProductionOperationItem[]>(
      endpointUrl("production/operations"),
      true,
      params
    );
    return response.data;
  },

  async getOperationOptions(): Promise<ApiResponse<ProductionOperationOption[]>> {
    const response = await httpGet<ProductionOperationOption[]>(
      endpointUrl("production/operations/options"),
      true
    );
    return response.data;
  },

  async getOperationById(
    id: number
  ): Promise<ApiResponse<ProductionOperationItem>> {
    const response = await httpGet<ProductionOperationItem>(
      endpointUrl(`production/operations/${id}`),
      true
    );
    return response.data;
  },

  async createOperation(
    payload: CreateProductionOperationPayload
  ): Promise<ApiResponse<ProductionOperationItem>> {
    const response = await httpPost<ProductionOperationItem>(
      endpointUrl("production/operations"),
      payload,
      true
    );
    return response.data;
  },

  async updateOperation(
    id: number,
    payload: UpdateProductionOperationPayload
  ): Promise<ApiResponse<ProductionOperationItem>> {
    const response = await httpPut<ProductionOperationItem>(
      endpointUrl(`production/operations/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteOperation(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`production/operations/${id}`),
      true
    );
    return response.data;
  },
};
