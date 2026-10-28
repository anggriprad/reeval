import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface MaterialCategory {
  id: number;
  company_id: number;
  name: string;
  sort_order: number;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialCategoryOption {
  id: number;
  name: string;
}

export interface CreateMaterialCategoryPayload {
  name: string;
}

export interface UpdateMaterialCategoryPayload {
  name: string;
}

export interface ReorderMaterialCategoriesPayload {
  item_ids: number[];
}

export interface GetMaterialCategoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const materialCategoryService = {
  async getCategories(params?: GetMaterialCategoriesParams): Promise<ApiResponse<MaterialCategory[]>> {
    const response = await httpGet<MaterialCategory[]>(
      endpointUrl("inventory/material-categories"),
      true,
      params
    );
    return response.data;
  },

  async getCategoryOptions(): Promise<ApiResponse<MaterialCategoryOption[]>> {
    const response = await httpGet<MaterialCategoryOption[]>(
      endpointUrl("inventory/material-categories/options"),
      true
    );
    return response.data;
  },

  async getCategoryById(id: number): Promise<ApiResponse<MaterialCategory>> {
    const response = await httpGet<MaterialCategory>(
      endpointUrl(`inventory/material-categories/${id}`),
      true
    );
    return response.data;
  },

  async createCategory(payload: CreateMaterialCategoryPayload): Promise<ApiResponse<MaterialCategory>> {
    const response = await httpPost<MaterialCategory>(
      endpointUrl("inventory/material-categories"),
      payload,
      true
    );
    return response.data;
  },

  async updateCategory(
    id: number,
    payload: UpdateMaterialCategoryPayload
  ): Promise<ApiResponse<MaterialCategory>> {
    const response = await httpPut<MaterialCategory>(
      endpointUrl(`inventory/material-categories/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteCategory(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`inventory/material-categories/${id}`),
      true
    );
    return response.data;
  },

  async reorderCategories(itemIds: number[]): Promise<ApiResponse<null>> {
    const response = await httpPut<null>(
      endpointUrl("inventory/material-categories/reorder"),
      { item_ids: itemIds },
      true
    );
    return response.data;
  },
};
