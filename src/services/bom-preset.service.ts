import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface BOMPresetItemRequest {
  material_id: number;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface CreateBOMPresetPayload {
  name: string;
  description?: string;
  items: BOMPresetItemRequest[];
}

export interface UpdateBOMPresetPayload {
  name: string;
  description?: string;
  items: BOMPresetItemRequest[];
}

export interface BOMPresetItemResponse {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  unit_cost?: number;
  quantity: number;
  unit: string;
  notes: string;
}

export interface BOMPresetResponse {
  id: number;
  name: string;
  description: string;
  item_count: number;
  total_cost?: number;
  can_delete: boolean;
  is_active: boolean;
  items?: BOMPresetItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface BOMPresetOption {
  id: number;
  name: string;
}

export interface GetBOMPresetsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const bomPresetService = {
  async getPresets(
    params?: GetBOMPresetsParams
  ): Promise<ApiResponse<BOMPresetResponse[]>> {
    const response = await httpGet<BOMPresetResponse[]>(
      endpointUrl("product/bom-presets"),
      true,
      params
    );
    return response.data;
  },

  async getPresetOptions(): Promise<ApiResponse<BOMPresetOption[]>> {
    const response = await httpGet<BOMPresetOption[]>(
      endpointUrl("product/bom-presets/options"),
      true
    );
    return response.data;
  },

  async getPresetById(id: number): Promise<ApiResponse<BOMPresetResponse>> {
    const response = await httpGet<BOMPresetResponse>(
      endpointUrl(`product/bom-presets/${id}`),
      true
    );
    return response.data;
  },

  async createPreset(
    payload: CreateBOMPresetPayload
  ): Promise<ApiResponse<BOMPresetResponse>> {
    const response = await httpPost<BOMPresetResponse>(
      endpointUrl("product/bom-presets"),
      payload,
      true
    );
    return response.data;
  },

  async updatePreset(
    id: number,
    payload: UpdateBOMPresetPayload
  ): Promise<ApiResponse<BOMPresetResponse>> {
    const response = await httpPut<BOMPresetResponse>(
      endpointUrl(`product/bom-presets/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deletePreset(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`product/bom-presets/${id}`),
      true
    );
    return response.data;
  },
};
