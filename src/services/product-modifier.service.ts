import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface ProductModifierOptionBOMRequest {
  material_id: number;
  quantity: number;
}

export interface ProductModifierOptionRequest {
  name: string;
  additional_price: number;
  bom?: ProductModifierOptionBOMRequest[];
}

export interface CreateProductModifierGroupPayload {
  name: string;
  select_type: "SINGLE" | "MULTI";
  options: ProductModifierOptionRequest[];
}

export interface UpdateProductModifierGroupPayload {
  name: string;
  select_type: "SINGLE" | "MULTI";
  options: ProductModifierOptionRequest[];
}

export interface ProductModifierOptionBOMResponse {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_unit: string;
  unit_cost?: number;
  quantity: number;
}

export interface ProductModifierOptionResponse {
  id: number;
  name: string;
  additional_price: number;
  bom_cost?: number;
  bom: ProductModifierOptionBOMResponse[];
}

export interface ProductModifierGroupResponse {
  id: number;
  name: string;
  select_type: "SINGLE" | "MULTI";
  options_count: number;
  can_delete: boolean;
  is_active: boolean;
  options?: ProductModifierOptionResponse[];
  created_at: string;
  updated_at: string;
}

export interface ProductModifierGroupOption {
  id: number;
  name: string;
  select_type: "SINGLE" | "MULTI";
}

export interface GetProductModifierGroupsParams {
  page?: number;
  per_page?: number;
  search?: string;
  select_type?: string;
}

export const productModifierService = {
  async getGroups(
    params?: GetProductModifierGroupsParams
  ): Promise<ApiResponse<ProductModifierGroupResponse[]>> {
    const response = await httpGet<ProductModifierGroupResponse[]>(
      endpointUrl("product/modifier-groups"),
      true,
      params
    );
    return response.data;
  },

  async getGroupOptions(): Promise<ApiResponse<ProductModifierGroupOption[]>> {
    const response = await httpGet<ProductModifierGroupOption[]>(
      endpointUrl("product/modifier-groups/options"),
      true
    );
    return response.data;
  },

  async getGroupById(
    id: number
  ): Promise<ApiResponse<ProductModifierGroupResponse>> {
    const response = await httpGet<ProductModifierGroupResponse>(
      endpointUrl(`product/modifier-groups/${id}`),
      true
    );
    return response.data;
  },

  async createGroup(
    payload: CreateProductModifierGroupPayload
  ): Promise<ApiResponse<ProductModifierGroupResponse>> {
    const response = await httpPost<ProductModifierGroupResponse>(
      endpointUrl("product/modifier-groups"),
      payload,
      true
    );
    return response.data;
  },

  async updateGroup(
    id: number,
    payload: UpdateProductModifierGroupPayload
  ): Promise<ApiResponse<ProductModifierGroupResponse>> {
    const response = await httpPut<ProductModifierGroupResponse>(
      endpointUrl(`product/modifier-groups/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteGroup(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`product/modifier-groups/${id}`),
      true
    );
    return response.data;
  },
};
