import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface ProductCategoryItem {
  id: number;
  company_id: number;
  name: string;
  product_count: number;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryOption {
  id: number;
  name: string;
}

export interface CreateProductCategoryPayload {
  name: string;
}

export interface UpdateProductCategoryPayload {
  name: string;
}

export interface GetProductCategoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const productCategoryService = {
  async getCategories(
    params?: GetProductCategoriesParams
  ): Promise<ApiResponse<ProductCategoryItem[]>> {
    const response = await httpGet<ProductCategoryItem[]>(
      endpointUrl("product/product-categories"),
      true,
      params
    );
    return response.data;
  },

  async getCategoryOptions(): Promise<ApiResponse<ProductCategoryOption[]>> {
    const response = await httpGet<ProductCategoryOption[]>(
      endpointUrl("product/product-categories/options"),
      true
    );
    return response.data;
  },

  async getCategoryById(id: number): Promise<ApiResponse<ProductCategoryItem>> {
    const response = await httpGet<ProductCategoryItem>(
      endpointUrl(`product/product-categories/${id}`),
      true
    );
    return response.data;
  },

  async createCategory(
    payload: CreateProductCategoryPayload
  ): Promise<ApiResponse<ProductCategoryItem>> {
    const response = await httpPost<ProductCategoryItem>(
      endpointUrl("product/product-categories"),
      payload,
      true
    );
    return response.data;
  },

  async updateCategory(
    id: number,
    payload: UpdateProductCategoryPayload
  ): Promise<ApiResponse<ProductCategoryItem>> {
    const response = await httpPut<ProductCategoryItem>(
      endpointUrl(`product/product-categories/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteCategory(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`product/product-categories/${id}`),
      true
    );
    return response.data;
  },
};
