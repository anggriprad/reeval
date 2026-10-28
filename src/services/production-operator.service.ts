import {
  endpointUrl,
  httpGet,
  httpPost,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface ProductionOperatorItem {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  user_phone?: string;
  completed_jobs_count: number;
  performance_kpi: string;
  is_ready: boolean;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductionOperatorOption {
  id: number;
  user_id: number;
  name: string;
  is_ready: boolean;
}

export interface AssignProductionOperatorPayload {
  user_id: number;
}

export interface GetProductionOperatorsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const productionOperatorService = {
  async getOperators(
    params?: GetProductionOperatorsParams
  ): Promise<ApiResponse<ProductionOperatorItem[]>> {
    const response = await httpGet<ProductionOperatorItem[]>(
      endpointUrl("production/operators"),
      true,
      params
    );
    return response.data;
  },

  async getOperatorOptions(
    onlyReady?: boolean
  ): Promise<ApiResponse<ProductionOperatorOption[]>> {
    const params = onlyReady ? { is_ready: true } : undefined;
    const response = await httpGet<ProductionOperatorOption[]>(
      endpointUrl("production/operators/options"),
      true,
      params
    );
    return response.data;
  },

  async getOperatorById(
    id: number
  ): Promise<ApiResponse<ProductionOperatorItem>> {
    const response = await httpGet<ProductionOperatorItem>(
      endpointUrl(`production/operators/${id}`),
      true
    );
    return response.data;
  },

  async assignOperator(
    payload: AssignProductionOperatorPayload
  ): Promise<ApiResponse<ProductionOperatorItem>> {
    const response = await httpPost<ProductionOperatorItem>(
      endpointUrl("production/operators"),
      payload,
      true
    );
    return response.data;
  },

  async deleteOperator(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`production/operators/${id}`),
      true
    );
    return response.data;
  },
};
