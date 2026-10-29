import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";
import type { Product, VariantType } from "@/lib/types";

export interface VariantBOMItemRequest {
  material_id: number;
  qty: number;
}

export interface ProductVariantRequest {
  id?: number;
  sku: string;
  combination: Record<string, string>;
  price: number;
  estimated_hours?: number;
  routing_id?: number;
  preset_id?: number;
  is_custom_bom: boolean;
  initial_stock?: number;
  min_stock?: number;
  unit?: string;
  bom: VariantBOMItemRequest[];
  custom_bom?: VariantBOMItemRequest[];
}

export interface CreateProductPayload {
  category_id: number;
  name: string;
  description?: string;
  image_icon?: string;
  image_url?: string;
  default_routing_id?: number;
  default_estimated_hours?: number;
  has_variants: boolean;
  variant_types_json: string;
  modifier_group_ids?: number[];
  variants: ProductVariantRequest[];
}

export type UpdateProductPayload = CreateProductPayload;

export interface VariantBOMItemResponse {
  id: number;
  material_id: number;
  material_name: string;
  material_code: string;
  unit: string;
  unit_cost: number;
  qty: number;
  subtotal_cost: number;
}

export interface ProductVariantResponse {
  id: number;
  sku: string;
  combination: Record<string, string>;
  price: number;
  estimated_hours: number;
  routing_id?: number;
  routing_name?: string;
  preset_id?: number;
  preset_name?: string;
  is_custom_bom: boolean;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  min_stock: number;
  unit: string;
  bom_cost: number;
  labor_cost: number;
  unit_hpp: number;
  total_hpp: number;
  potential_revenue: number;
  bom_items: VariantBOMItemResponse[];
  is_active: boolean;
}

export interface ProductListItem {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  image_icon: string;
  image_url: string;
  base_price: number;
  min_price: number;
  max_price: number;
  variant_count: number;
  default_estimated_hours: number;
  variant_types_json: string;
  modifier_group_ids?: number[];
  variants: ProductVariantResponse[];
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductDetail {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  image_icon: string;
  image_url: string;
  base_price: number;
  default_routing_id?: number;
  default_routing_name?: string;
  default_estimated_hours: number;
  has_variants: boolean;
  variant_types_json: string;
  modifier_group_ids?: number[];
  variants: ProductVariantResponse[];
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantOptionDTO {
  id: number;
  sku: string;
  label: string;
  price: number;
  stock: number;
}

export interface ProductOption {
  id: number;
  name: string;
  variants?: ProductVariantOptionDTO[];
}

export interface GetProductsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
}

export function resolveProductImageUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const base = (
    process.env.NEXT_PUBLIC_S3_URL ||
    process.env.NEXT_PUBLIC_MINIO_URL ||
    "https://s3.reeval.tech"
  ).replace(/\/+$/, "");

  let pathOnly = trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.includes("minio.reeval.tech/products/")) {
      const idx = trimmed.indexOf("/products/");
      pathOnly = trimmed.slice(idx);
    } else {
      return trimmed;
    }
  }

  const cleanPath = pathOnly.replace(/^\/+/, "");
  return `${base}/${cleanPath}`;
}

export function mapProductDetailToProduct(detail: ProductDetail): Product {
  let variantTypes: VariantType[] = [];
  try {
    if (detail.variant_types_json) {
      variantTypes = JSON.parse(detail.variant_types_json);
    }
  } catch {}

  const variants = (detail.variants || []).map((v) => ({
    id: String(v.id),
    sku: v.sku,
    combination: v.combination || {},
    price: v.price,
    estimatedHours: v.estimated_hours,
    routingId: v.routing_id ? String(v.routing_id) : undefined,
    presetId: v.preset_id ? String(v.preset_id) : undefined,
    isCustomBOM: Boolean(v.is_custom_bom),
    bom: (v.bom_items || []).map((item) => ({
      materialId: String(item.material_id),
      qty: item.qty,
    })),
    initialStock: v.stock,
    isActive: v.is_active,
  }));

  return {
    id: String(detail.id),
    name: detail.name,
    description: detail.description,
    category: detail.category_name || String(detail.category_id),
    imageIcon: detail.image_icon || "Box",
    image: detail.image_url ? resolveProductImageUrl(detail.image_url) : undefined,
    basePrice: detail.base_price,
    defaultRoutingId: detail.default_routing_id
      ? String(detail.default_routing_id)
      : undefined,
    defaultEstimatedHours: detail.default_estimated_hours,
    variantTypes,
    variants,
    modifierGroupIds: (detail.modifier_group_ids || []).map(String),
    isActive: detail.is_active,
  };
}

export const productService = {
  async getProducts(
    params?: GetProductsParams
  ): Promise<ApiResponse<ProductListItem[]>> {
    const response = await httpGet<ProductListItem[]>(
      endpointUrl("product/products"),
      true,
      params
    );
    return response.data;
  },

  async getProductOptions(): Promise<ApiResponse<ProductOption[]>> {
    const response = await httpGet<ProductOption[]>(
      endpointUrl("product/products/options"),
      true
    );
    return response.data;
  },

  async getProductById(id: number | string): Promise<ApiResponse<ProductDetail>> {
    const response = await httpGet<ProductDetail>(
      endpointUrl(`product/products/${id}`),
      true
    );
    return response.data;
  },

  async createProduct(
    payload: CreateProductPayload,
    imageFile?: File | Blob
  ): Promise<ApiResponse<ProductDetail>> {
    if (imageFile) {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append("image", imageFile, (imageFile as File).name || "product.jpg");

      const response = await httpPost<ProductDetail>(
        endpointUrl("product/products"),
        formData,
        true,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    }

    const response = await httpPost<ProductDetail>(
      endpointUrl("product/products"),
      payload,
      true
    );
    return response.data;
  },

  async updateProduct(
    id: number | string,
    payload: UpdateProductPayload,
    imageFile?: File | Blob
  ): Promise<ApiResponse<ProductDetail>> {
    if (imageFile) {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append("image", imageFile, (imageFile as File).name || "product.jpg");

      const response = await httpPut<ProductDetail>(
        endpointUrl(`product/products/${id}`),
        formData,
        true,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    }

    const response = await httpPut<ProductDetail>(
      endpointUrl(`product/products/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteProduct(id: number | string): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`product/products/${id}`),
      true
    );
    return response.data;
  },
};
