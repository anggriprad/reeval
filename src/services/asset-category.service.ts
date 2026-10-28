import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface AssetCategory {
  id: number;
  company_id: number;
  name: string;
  sort_order: number;
  asset_count?: number;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetCategoryOption {
  id: number;
  name: string;
}

export interface CreateAssetCategoryPayload {
  name: string;
}

export interface UpdateAssetCategoryPayload {
  name: string;
}

export interface ReorderAssetCategoriesPayload {
  item_ids: number[];
}

export interface GetAssetCategoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const assetCategoryService = {
  async getCategories(params?: GetAssetCategoriesParams): Promise<ApiResponse<AssetCategory[]>> {
    const response = await httpGet<AssetCategory[]>(
      endpointUrl("inventory/asset-categories"),
      true,
      params
    );
    return response.data;
  },

  async getCategoryOptions(): Promise<ApiResponse<AssetCategoryOption[]>> {
    const response = await httpGet<AssetCategoryOption[]>(
      endpointUrl("inventory/asset-categories/options"),
      true
    );
    return response.data;
  },

  async getCategoryById(id: number): Promise<ApiResponse<AssetCategory>> {
    const response = await httpGet<AssetCategory>(
      endpointUrl(`inventory/asset-categories/${id}`),
      true
    );
    return response.data;
  },

  async createCategory(payload: CreateAssetCategoryPayload): Promise<ApiResponse<AssetCategory>> {
    const response = await httpPost<AssetCategory>(
      endpointUrl("inventory/asset-categories"),
      payload,
      true
    );
    return response.data;
  },

  async updateCategory(
    id: number,
    payload: UpdateAssetCategoryPayload
  ): Promise<ApiResponse<AssetCategory>> {
    const response = await httpPut<AssetCategory>(
      endpointUrl(`inventory/asset-categories/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteCategory(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`inventory/asset-categories/${id}`),
      true
    );
    return response.data;
  },

  async reorderCategories(itemIds: number[]): Promise<ApiResponse<null>> {
    const response = await httpPut<null>(
      endpointUrl("inventory/asset-categories/reorder"),
      { item_ids: itemIds },
      true
    );
    return response.data;
  },
};
