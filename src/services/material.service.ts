import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface MaterialChildBOMItem {
  id: number;
  child_material_id: number;
  child_material_code: string;
  child_material_name: string;
  child_material_unit: string;
  child_material_cost: number;
  qty: number;
  subtotal: number;
}

export interface MaterialChildBOMPayload {
  child_material_id: number;
  qty: number;
}

export interface MaterialItem {
  id: number;
  code: string;
  name: string;
  category_id?: number;
  category: string;
  unit: string;
  unit_cost: number;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  min_stock: number;
  stock_status: string;
  total_value: number;
  is_sub_assembly: boolean;
  routing_id?: number;
  routing_name?: string;
  child_bom?: MaterialChildBOMItem[];
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialOption {
  id: number;
  code: string;
  name: string;
  unit: string;
  unit_cost: number;
  stock?: number;
  is_sub_assembly: boolean;
}

export interface CreateMaterialPayload {
  code?: string | null;
  name: string;
  category_id?: number;
  category?: string;
  unit: string;
  unit_cost: number;
  stock: number;
  min_stock: number;
  is_sub_assembly?: boolean;
  routing_id?: number | null;
  child_bom?: MaterialChildBOMPayload[];
}

export interface UpdateMaterialPayload {
  name?: string;
  category_id?: number;
  category?: string;
  unit?: string;
  unit_cost?: number;
  min_stock?: number;
  is_sub_assembly?: boolean;
  routing_id?: number | null;
  child_bom?: MaterialChildBOMPayload[];
  is_active?: boolean;
}

export interface GetMaterialsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  category?: string;
  status?: string;
}

export const materialService = {
  async getMaterials(params?: GetMaterialsParams): Promise<ApiResponse<MaterialItem[]>> {
    const response = await httpGet<MaterialItem[]>(
      endpointUrl("inventory/materials"),
      true,
      params
    );
    return response.data;
  },

  async getMaterialOptions(): Promise<ApiResponse<MaterialOption[]>> {
    const response = await httpGet<MaterialOption[]>(
      endpointUrl("inventory/materials/options"),
      true
    );
    return response.data;
  },

  async getMaterialById(id: number): Promise<ApiResponse<MaterialItem>> {
    const response = await httpGet<MaterialItem>(
      endpointUrl(`inventory/materials/${id}`),
      true
    );
    return response.data;
  },

  async createMaterial(payload: CreateMaterialPayload): Promise<ApiResponse<MaterialItem>> {
    const response = await httpPost<MaterialItem>(
      endpointUrl("inventory/materials"),
      payload,
      true
    );
    return response.data;
  },

  async updateMaterial(
    id: number,
    payload: UpdateMaterialPayload
  ): Promise<ApiResponse<MaterialItem>> {
    const response = await httpPut<MaterialItem>(
      endpointUrl(`inventory/materials/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteMaterial(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`inventory/materials/${id}`),
      true
    );
    return response.data;
  },
};
