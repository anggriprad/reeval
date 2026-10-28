import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface ProductAttributeValueItem {
  id: number;
  value: string;
}

export interface ProductAttributeItem {
  id: number;
  name: string;
  can_delete: boolean;
  is_active: boolean;
  values: ProductAttributeValueItem[];
  created_at: string;
  updated_at: string;
}

export interface ProductAttributeOption {
  id: number;
  name: string;
  values: string[];
}

export interface CreateProductAttributePayload {
  name: string;
  values: string[];
}

export interface UpdateProductAttributePayload {
  name: string;
  values: string[];
}

export interface GetProductAttributesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const productAttributeService = {
  async getAttributes(
    params?: GetProductAttributesParams
  ): Promise<ApiResponse<ProductAttributeItem[]>> {
    const response = await httpGet<ProductAttributeItem[]>(
      endpointUrl("product/product-attributes"),
      true,
      params
    );
    return response.data;
  },

  async getAttributeOptions(): Promise<ApiResponse<ProductAttributeOption[]>> {
    const response = await httpGet<ProductAttributeOption[]>(
      endpointUrl("product/product-attributes/options"),
      true
    );
    return response.data;
  },

  async getAttributeById(id: number): Promise<ApiResponse<ProductAttributeItem>> {
    const response = await httpGet<ProductAttributeItem>(
      endpointUrl(`product/product-attributes/${id}`),
      true
    );
    return response.data;
  },

  async createAttribute(
    payload: CreateProductAttributePayload
  ): Promise<ApiResponse<ProductAttributeItem>> {
    const response = await httpPost<ProductAttributeItem>(
      endpointUrl("product/product-attributes"),
      payload,
      true
    );
    return response.data;
  },

  async updateAttribute(
    id: number,
    payload: UpdateProductAttributePayload
  ): Promise<ApiResponse<ProductAttributeItem>> {
    const response = await httpPut<ProductAttributeItem>(
      endpointUrl(`product/product-attributes/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteAttribute(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`product/product-attributes/${id}`),
      true
    );
    return response.data;
  },
};
