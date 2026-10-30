import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";
import type { Customer, OrderStatus, SalesOrder, SalesOrderItem, OrderComplaint } from "@/lib/types";

export interface SalesOrderItemResponse {
  id: number;
  product_id: number;
  product_code?: string;
  product_name: string;
  variant_id?: number | null;
  variant_label?: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  selected_modifiers?: any;
  is_custom?: boolean;
  custom_notes?: string;
  produced_qty: number;
  shipped_qty: number;
  delivered_qty: number;
  is_bom_customized: boolean;
  custom_bom?: any;
  custom_operation_ids?: any;
  custom_operations?: any;
  unit_custom_processes?: any;
  product?: any;
}

export interface SalesOrderStatusHistoryResponse {
  id: number;
  sales_order_id: number;
  order_number: string;
  from_status: string;
  to_status: string;
  action: string;
  actor_id: number;
  actor_name: string;
  notes?: string;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  items_snapshot?: string;
  is_posted_to_finance: boolean;
  created_at: string;
}

export interface SalesOrderResponse {
  id: number;
  order_number: string;
  status: string;
  created_by_id: number;
  created_by_name: string;
  created_by_phone?: string;
  sales_phone?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city_id?: string;
  customer_city_name?: string;
  customer_district_id?: string;
  customer_district_name?: string;
  order_notes: string;
  admin_notes?: string;
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string | null;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  custom_fields?: Record<string, any>;
  is_custom_process: boolean;
  custom_process_at?: string | null;
  custom_process_by?: string;
  submitted_at?: string | null;
  confirmed_at?: string | null;
  spk_issued_at?: string | null;
  delivered_at?: string | null;
  available_actions?: string[];
  created_at: string;
  updated_at: string;
  items: SalesOrderItemResponse[];
  histories?: SalesOrderStatusHistoryResponse[];
}

export interface CreateSalesOrderItemRequest {
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_label?: string;
  qty: number;
  unit_price: number;
  selected_modifiers?: any;
  is_custom?: boolean;
  custom_notes?: string;
}

export interface CreateSalesOrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city_id?: string;
  customer_city_name?: string;
  customer_district_id?: string;
  customer_district_name?: string;
  shipping_cost?: number;
  order_notes?: string;
  custom_fields?: Record<string, any>;
  items: CreateSalesOrderItemRequest[];
}

export interface UpdateSalesOrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city_id?: string;
  customer_city_name?: string;
  customer_district_id?: string;
  customer_district_name?: string;
  shipping_cost?: number;
  order_notes?: string;
  custom_fields?: Record<string, any>;
  items: CreateSalesOrderItemRequest[];
}

export interface CancelSalesOrderRequest {
  reason: string;
}

export interface ProcessSalesOrderRequest {
  admin_notes?: string;
}

export interface CustomBomItemRequest {
  materialId: string;
  qty: number;
  itemType?: string;
}

export interface CustomOperationItemRequest {
  operationId: string;
  costingMethod?: string;
  fixedLaborCost?: number;
  laborCostPerHour?: number;
  durationMinutes?: number;
}

export interface UnitCustomProcessRequest {
  unitIndex: number;
  isBomCustomized: boolean;
  customBom?: CustomBomItemRequest[];
  customOperationIds?: string[];
  customOperations?: CustomOperationItemRequest[];
}

export interface CustomizeOrderItemRequest {
  id?: number;
  productId: number;
  variantId?: number;
  isBomCustomized: boolean;
  customBom?: CustomBomItemRequest[];
  customOperationIds?: string[];
  customOperations?: CustomOperationItemRequest[];
  unitCustomProcesses?: UnitCustomProcessRequest[];
}

export interface CustomizeOrderProcessRequest {
  items: CustomizeOrderItemRequest[];
}

export interface AvailableMaterialOption {
  id: number;
  code: string;
  name: string;
  category_name: string;
  unit: string;
  unit_cost: number;
  stock: number;
  is_sub_assembly: boolean;
}

export interface AvailableOperationOption {
  id: number;
  name: string;
  wage_type: string;
  cost_per_hour: number;
  fixed_cost: number;
  standard_duration_minutes: number;
}

export interface OrderCustomProcessItemDetail {
  id: number;
  productId: number;
  productName: string;
  variantId?: number;
  variantLabel?: string;
  qty: number;
  unitPrice: number;
  isBomCustomized: boolean;
  defaultBom: CustomBomItemRequest[];
  defaultOperations: CustomOperationItemRequest[];
  customBom: CustomBomItemRequest[];
  customOperationIds: string[];
  customOperations: CustomOperationItemRequest[];
  unitCustomProcesses: UnitCustomProcessRequest[];
}

export interface OrderCustomProcessDetailResponse {
  sales_order_id: number;
  order_number: string;
  status: string;
  is_custom_process: boolean;
  items: OrderCustomProcessItemDetail[];
  available_materials: AvailableMaterialOption[];
  available_operations: AvailableOperationOption[];
}

export interface FormFieldDTO {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  isRequired: boolean;
  order: number;
  options?: string[];
}

export interface FormContainerDTO {
  id: string;
  title: string;
  order: number;
  fields: FormFieldDTO[];
}

export interface DeadlineSettingDTO {
  days: number;
  hours: number;
  minutes: number;
}

export interface SalesOrderConfigResponse {
  show_all_orders_tab: boolean;
  is_custom_form_enabled: boolean;
  form_containers: FormContainerDTO[];
  is_order_deadline_enabled: boolean;
  deadline_processed: DeadlineSettingDTO;
  deadline_ready: DeadlineSettingDTO;
  deadline_shipped: DeadlineSettingDTO;
  strict_so_stock_check: boolean;
  is_shipping_rate_enabled?: boolean;
}

export interface SalesOrderStatusCountsResponse {
  all: number;
  pending: number;
  processing: number;
  ready: number;
  sent: number;
  canceled: number;
  komplain: number;
}

export interface UpdateSalesOrderConfigRequest {
  show_all_orders_tab: boolean;
  is_custom_form_enabled: boolean;
  form_containers: FormContainerDTO[];
  is_order_deadline_enabled?: boolean;
  deadline_processed?: DeadlineSettingDTO;
  deadline_ready?: DeadlineSettingDTO;
  deadline_shipped?: DeadlineSettingDTO;
  strict_so_stock_check?: boolean;
}

export interface CreateComplaintAttachmentRequest {
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface CreateComplaintItemRequest {
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_label?: string;
  qty: number;
  unit_price: number;
}

export interface CreateComplaintRequest {
  customer_id?: number | null;
  category: string;
  description: string;
  items: CreateComplaintItemRequest[];
  attachments?: CreateComplaintAttachmentRequest[];
}

export interface ResolveComplaintRequest {
  resolution: string;
  resolution_notes?: string;
  replacement_source?: string;
  is_return_requested?: boolean;
  refund_bank_account_id?: string;
}

export interface RejectComplaintRequest {
  reason: string;
}

export interface OrderComplaintAttachmentResponse {
  id: number;
  complaint_id: number;
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface OrderComplaintItemResponse {
  id: number;
  complaint_id: number;
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_label?: string;
  qty: number;
  unit_price: number;
}

export interface OrderComplaintResponse {
  id: number;
  complaint_number: string;
  sales_order_id: number;
  sales_order_number: string;
  customer_id?: number | null;
  customer_name: string;
  category: string;
  description: string;
  status: string;
  resolution?: string;
  resolution_notes?: string;
  replacement_source?: string;
  is_return_requested?: boolean;
  rejection_reason?: string;
  rejected_at?: string | null;
  rejected_by?: string;
  resolved_at?: string | null;
  resolved_by?: string;
  replacement_status?: string;
  replacement_wo_id?: number | null;
  created_at: string;
  updated_at: string;
  items: OrderComplaintItemResponse[];
  attachments?: OrderComplaintAttachmentResponse[];
}

export interface GetOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  sales_id?: number | string;
}

export interface GetComplaintsParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}

/**
 * Mapper helper to seamlessly adapt backend response DTO into frontend SalesOrder interface.
 */
export function mapOrderResponseToSalesOrder(dto: SalesOrderResponse): SalesOrder {
  const items: SalesOrderItem[] = (dto.items || []).map((itm) => {
    let mods = itm.selected_modifiers;
    if (typeof mods === "string") {
      try {
        mods = JSON.parse(mods);
      } catch {
        mods = [];
      }
    }

    let customBom = itm.custom_bom;
    if (typeof customBom === "string") {
      try {
        customBom = JSON.parse(customBom);
      } catch {
        customBom = [];
      }
    }

    let customOps = itm.custom_operations;
    if (typeof customOps === "string") {
      try {
        customOps = JSON.parse(customOps);
      } catch {
        customOps = [];
      }
    }

    let customOpIDs = itm.custom_operation_ids;
    if (typeof customOpIDs === "string") {
      try {
        customOpIDs = JSON.parse(customOpIDs);
      } catch {
        customOpIDs = [];
      }
    }

    let unitProcesses = itm.unit_custom_processes;
    if (typeof unitProcesses === "string") {
      try {
        unitProcesses = JSON.parse(unitProcesses);
      } catch {
        unitProcesses = [];
      }
    }

    return {
      id: itm.id ? String(itm.id) : undefined,
      productId: String(itm.product_id),
      variantId: itm.variant_id ? String(itm.variant_id) : undefined,
      productName: itm.product_name,
      variantLabel: itm.variant_label,
      qty: itm.qty,
      unitPrice: itm.unit_price,
      selectedModifiers: Array.isArray(mods) ? mods : [],
      isCustom: Boolean(itm.is_custom),
      customNotes: itm.custom_notes || "",
      producedQty: itm.produced_qty || 0,
      shippedQty: itm.shipped_qty || 0,
      deliveredQty: itm.delivered_qty || 0,
      isBomCustomized: Boolean(itm.is_bom_customized),
      customBom,
      customOperationIds: customOpIDs,
      customOperations: customOps,
      unitCustomProcesses: unitProcesses,
    };
  });

  return {
    id: String(dto.id),
    orderNumber: dto.order_number,
    createdBy: dto.created_by_name || "Sales",
    createdById: dto.created_by_id ? String(dto.created_by_id) : undefined,
    salesPhone: dto.created_by_phone || dto.sales_phone || (dto as any).creator_phone || (dto as any).created_by?.phone || undefined,
    customer: {
      name: dto.customer_name || "",
      phone: dto.customer_phone || "",
      address: dto.customer_address || "",
      city: dto.customer_city_name || undefined,
      district: dto.customer_district_name || undefined,
    },
    items,
    status: (dto.status as OrderStatus) || "PENDING",
    totalAmount: dto.total_amount || 0,
    shippingCost: dto.shipping_cost || 0,
    orderNotes: dto.order_notes || "",
    cancelReason: dto.cancel_reason || "",
    cancelledByRole: dto.cancelled_by || undefined,
    createdAt: dto.created_at || new Date().toISOString(),
    submittedAt: dto.submitted_at || undefined,
    confirmedAt: dto.confirmed_at || undefined,
    spkIssuedAt: dto.spk_issued_at || undefined,
    deliveredAt: dto.delivered_at || undefined,
    adminNotes: dto.admin_notes || undefined,
    isCustomProcess: Boolean(dto.is_custom_process),
    customProcessAt: dto.custom_process_at || undefined,
    customProcessBy: dto.custom_process_by || undefined,
    complaints: [],
  };
}

export function mapComplaintResponseToOrderComplaint(dto: OrderComplaintResponse): OrderComplaint & {
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
} {
  return {
    id: String(dto.id),
    category: dto.category as any,
    description: dto.description || (dto as any).reason || "",
    status: dto.status as any,
    items: (dto.items || []).map((itm) => ({
      productId: String(itm.product_id),
      variantId: itm.variant_id ? String(itm.variant_id) : undefined,
      productName: itm.product_name,
      variantLabel: itm.variant_label,
      qty: itm.qty,
      unitPrice: itm.unit_price,
    })),
    attachments: (dto.attachments || []).map((att) => ({
      id: String(att.id),
      name: att.name,
      type: (att.type === "video" ? "video" : "image") as "image" | "video",
      url: att.url,
      size: att.size,
    })),
    resolution: dto.resolution as any,
    resolutionNotes: dto.resolution_notes,
    replacementSource: dto.replacement_source as any,
    isReturnRequested: dto.is_return_requested,
    rejectionReason: dto.rejection_reason,
    rejectedAt: dto.rejected_at || undefined,
    rejectedBy: dto.rejected_by || undefined,
    createdAt: dto.created_at,
    resolvedAt: dto.resolved_at || undefined,
    replacementStatus: dto.replacement_status as any,
    replacementWOId: dto.replacement_wo_id ? String(dto.replacement_wo_id) : undefined,
    orderId: String(dto.sales_order_id),
    orderNumber: dto.sales_order_number,
    customerName: dto.customer_name,
  };
}

export const orderService = {
  /**
   * 1. GET /api/v1/orders
   * Paginated list of sales orders with server-side filtering.
   */
  async getOrders(params?: GetOrdersParams): Promise<ApiResponse<SalesOrderResponse[]>> {
    const response = await httpGet<SalesOrderResponse[]>(
      endpointUrl("orders"),
      true,
      params
    );
    return response.data;
  },

  /**
   * GET /api/v1/orders/counts
   * Aggregated tab / notification counter across all sales order statuses.
   */
  async getStatusCounts(params?: { sales_id?: number }): Promise<ApiResponse<SalesOrderStatusCountsResponse>> {
    const response = await httpGet<SalesOrderStatusCountsResponse>(
      endpointUrl("orders/counts"),
      true,
      params
    );
    return response.data;
  },

  /**
   * 2. GET /api/v1/orders/:id
   * Single Sales Order detail.
   */
  async getOrderById(id: number | string): Promise<ApiResponse<SalesOrderResponse>> {
    const response = await httpGet<SalesOrderResponse>(
      endpointUrl(`orders/${id}`),
      true
    );
    return response.data;
  },

  /**
   * 3. GET /api/v1/orders/:id/histories
   * Status change histories of a Sales Order.
   */
  async getOrderHistories(id: number | string): Promise<ApiResponse<SalesOrderStatusHistoryResponse[]>> {
    const response = await httpGet<SalesOrderStatusHistoryResponse[]>(
      endpointUrl(`orders/${id}/histories`),
      true
    );
    return response.data;
  },

  /**
   * 4. POST /api/v1/orders
   * Create a new Sales Order.
   */
  async createOrder(payload: CreateSalesOrderRequest): Promise<ApiResponse<SalesOrderResponse>> {
    const response = await httpPost<SalesOrderResponse>(
      endpointUrl("orders"),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 5. PUT /api/v1/orders/:id
   * Update an existing Sales Order.
   */
  async updateOrder(id: number | string, payload: UpdateSalesOrderRequest): Promise<ApiResponse<SalesOrderResponse>> {
    const response = await httpPut<SalesOrderResponse>(
      endpointUrl(`orders/${id}`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 6. PUT /api/v1/orders/:id/process
   * Process a PENDING Sales Order to PROCESSING (issues Work Orders / Job Cards).
   */
  async processOrder(id: number | string, payload?: ProcessSalesOrderRequest): Promise<ApiResponse<SalesOrderResponse>> {
    const response = await httpPut<SalesOrderResponse>(
      endpointUrl(`orders/${id}/process`),
      payload || {},
      true
    );
    return response.data;
  },

  /**
   * 7. PUT /api/v1/orders/:id/cancel
   * Cancel a Sales Order with mandatory reason.
   */
  async cancelOrder(id: number | string, payload: CancelSalesOrderRequest): Promise<ApiResponse<SalesOrderResponse>> {
    const response = await httpPut<SalesOrderResponse>(
      endpointUrl(`orders/${id}/cancel`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 8. GET /api/v1/orders/:id/custom-process
   * Fetch custom process and available material/operation options for an order.
   */
  async getCustomProcessDetail(id: number | string): Promise<ApiResponse<OrderCustomProcessDetailResponse>> {
    const response = await httpGet<OrderCustomProcessDetailResponse>(
      endpointUrl(`orders/${id}/custom-process`),
      true
    );
    return response.data;
  },

  /**
   * 9. PUT /api/v1/orders/:id/custom-process
   * Save customized BOM/operations on order items.
   */
  async customizeProcess(id: number | string, payload: CustomizeOrderProcessRequest): Promise<ApiResponse<SalesOrderResponse>> {
    const response = await httpPut<SalesOrderResponse>(
      endpointUrl(`orders/${id}/custom-process`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 10. GET /api/v1/orders/config
   * Get tenant's sales order form and workflow configuration.
   */
  async getOrderConfig(): Promise<ApiResponse<SalesOrderConfigResponse>> {
    const response = await httpGet<SalesOrderConfigResponse>(
      endpointUrl("orders/config"),
      true
    );
    return response.data;
  },

  /**
   * 11. PUT /api/v1/orders/config
   * Update tenant's sales order form configuration.
   */
  async updateOrderConfig(payload: UpdateSalesOrderConfigRequest): Promise<ApiResponse<SalesOrderConfigResponse>> {
    const response = await httpPut<SalesOrderConfigResponse>(
      endpointUrl("orders/config"),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 12. POST /api/v1/orders/config/reset
   * Reset sales order form configuration to system defaults.
   */
  async resetOrderConfig(): Promise<ApiResponse<SalesOrderConfigResponse>> {
    const response = await httpPost<SalesOrderConfigResponse>(
      endpointUrl("orders/config/reset"),
      {},
      true
    );
    return response.data;
  },

  /**
   * 13. GET /api/v1/orders/complaints
   * List complaints across orders.
   */
  async getComplaints(params?: GetComplaintsParams): Promise<ApiResponse<OrderComplaintResponse[]>> {
    const response = await httpGet<OrderComplaintResponse[]>(
      endpointUrl("orders/complaints"),
      true,
      params
    );
    return response.data;
  },

  /**
   * 14. GET /api/v1/orders/complaints/:id
   * Get single complaint detail.
   */
  async getComplaintById(id: number | string): Promise<ApiResponse<OrderComplaintResponse>> {
    const response = await httpGet<OrderComplaintResponse>(
      endpointUrl(`orders/complaints/${id}`),
      true
    );
    return response.data;
  },

  /**
   * 15. POST /api/v1/orders/:id/complaints
   * File a complaint against a specific Sales Order.
   */
  async createComplaint(orderId: number | string, payload: CreateComplaintRequest): Promise<ApiResponse<OrderComplaintResponse>> {
    const response = await httpPost<OrderComplaintResponse>(
      endpointUrl(`orders/${orderId}/complaints`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 16. POST /api/v1/orders/complaints/:id/resolve
   * Resolve a complaint (refund, replacement, or repair).
   */
  async resolveComplaint(id: number | string, payload: ResolveComplaintRequest): Promise<ApiResponse<OrderComplaintResponse>> {
    const response = await httpPost<OrderComplaintResponse>(
      endpointUrl(`orders/complaints/${id}/resolve`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * 17. POST /api/v1/orders/complaints/:id/reject
   * Reject a complaint with official reason.
   */
  async rejectComplaint(id: number | string, payload: RejectComplaintRequest): Promise<ApiResponse<OrderComplaintResponse>> {
    const response = await httpPost<OrderComplaintResponse>(
      endpointUrl(`orders/complaints/${id}/reject`),
      payload,
      true
    );
    return response.data;
  },
};
