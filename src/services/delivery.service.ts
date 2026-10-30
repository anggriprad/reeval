import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  ApiResponse,
} from "@/helpers/axios";

export interface DeliveryOrderItem {
  id: number;
  delivery_order_id: number;
  sales_order_id: number;
  sales_order_number: string;
  sales_order_item_id?: number;
  product_id?: number;
  variant_id?: number;
  product_name: string;
  variant_label?: string;
  unit_index: number;
  spk_number?: string;
  qty: number;
  is_replacement?: boolean;
  complaint_id?: string;
}

export interface DeliveryOrderStatusHistory {
  id: number;
  delivery_order_id: number;
  delivery_number: string;
  from_status: string;
  to_status: string;
  action: string;
  actor_id: number;
  actor_name: string;
  notes: string;
  proof_photo?: string;
  created_at: string;
}

export interface DeliveryOrder {
  id: number;
  company_id: number;
  delivery_number: string;
  trip_id?: string;
  trip_number?: string;
  sales_order_id?: number;
  sales_order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  vehicle_id?: number;
  vehicle_plate: string;
  driver_id?: number;
  driver_name: string;
  driver_phone?: string;
  scheduled_date?: string;
  status: 'READY_TO_SHIP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELED' | string;
  loaded_at?: string;
  loaded_by?: string;
  delivered_at?: string;
  receiver_name?: string;
  delivery_proof_note?: string;
  delivery_proof_photo?: string;
  proof_note?: string;
  proof_notes?: string;
  proof_photo?: string;
  notes?: string;
  failure_reason?: string;
  failure_note?: string;
  failure_photo?: string;
  failed_at?: string;
  created_at: string;
  updated_at: string;
  items?: DeliveryOrderItem[];
  histories?: DeliveryOrderStatusHistory[];
}

export interface QueueUnitItem {
  key: string;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  sales_order_item_id?: number;
  product_id?: number;
  product_name: string;
  variant_id?: number;
  variant_label?: string;
  item_index: number;
  unit_index: number;
  unit_number: number;
  total_ordered_qty: number;
  produced_qty: number;
  shipped_qty: number;
  delivered_qty: number;
  spk_number?: string;
  order_created_at: string;
  unit_status: 'READY' | 'IN_PRODUCTION' | 'SHIPPED' | string;
  is_replacement?: boolean;
  complaint_id?: string;
}

export interface QueueOrderGroup {
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  order_created_at: string;
  total_order_units_count: number;
  total_ready_units_count: number;
  child_units: QueueUnitItem[];
  status: string;
}

export interface DeliveryOrderStatusCounts {
  queue: number;
  ready_to_ship: number;
  in_transit: number;
  delivered: number;
  failed: number;
  all: number;
}

export interface GetDeliveryOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  driver_id?: number;
  driver_name?: string;
  trip_id?: string;
}

export interface SelectedUnitItemPayload {
  sales_order_id: number;
  sales_order_number?: string;
  sales_order_item_id?: number;
  unit_index?: number;
  unit_number?: number;
  item_index?: number;
  spk_number?: string;
  product_id?: number;
  variant_id?: number;
  product_name?: string;
  variant_label?: string;
  qty?: number;
  is_replacement?: boolean;
  complaint_id?: string;
}

export interface CreateDeliveryOrderPayload {
  selected_units?: SelectedUnitItemPayload[];
  selected_items?: SelectedUnitItemPayload[];
  sales_order_ids?: number[];
  sales_order_id?: number;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  vehicle_id?: number;
  armada_id?: number;
  armada_name?: string;
  vehicle_plate?: string;
  custom_vehicle_plate?: string;
  trip_id?: string;
  trip_number?: string;
  scheduled_date?: string;
  notes?: string;
}

export interface ConfirmLoadingPayload {
  notes?: string;
  loaded_by?: string;
}

export interface ConfirmDeliveryPayload {
  receiver_name?: string;
  proof_note?: string;
  proof_notes?: string;
  proof_photo?: string;
}

export interface ReportFailedDeliveryPayload {
  reason?: string;
  failure_reason?: string;
  notes?: string;
  failure_note?: string;
  proof_photo?: string;
}

export interface RescheduleDeliveryPayload {
  scheduled_date?: string;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  vehicle_id?: number;
  vehicle_plate?: string;
  notes?: string;
}

export interface CancelDeliveryPayload {
  reason?: string;
  notes?: string;
}

export function resolveDeliveryPhotoUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  const base = (
    process.env.NEXT_PUBLIC_S3_URL ||
    process.env.NEXT_PUBLIC_MINIO_URL ||
    "https://s3.reeval.tech"
  ).replace(/\/+$/, "");

  const cleanPath = trimmed.replace(/^\/+/, "");
  return `${base}/${cleanPath}`;
}

export const deliveryService = {
  async getQueue(params?: { search?: string }): Promise<ApiResponse<QueueOrderGroup[]>> {
    const response = await httpGet<QueueOrderGroup[]>(
      endpointUrl("delivery/orders/queue"),
      true,
      params
    );
    return response.data;
  },

  async getCounts(params?: { driver_id?: number; driver_name?: string }): Promise<ApiResponse<DeliveryOrderStatusCounts>> {
    const response = await httpGet<DeliveryOrderStatusCounts>(
      endpointUrl("delivery/orders/counts"),
      true,
      params
    );
    return response.data;
  },

  async getDeliveryOrders(params?: GetDeliveryOrdersParams): Promise<ApiResponse<DeliveryOrder[]>> {
    const response = await httpGet<DeliveryOrder[]>(
      endpointUrl("delivery/orders"),
      true,
      params
    );
    return response.data;
  },

  async getDeliveryOrderById(id: number | string): Promise<ApiResponse<DeliveryOrder>> {
    const response = await httpGet<DeliveryOrder>(
      endpointUrl(`delivery/orders/${id}`),
      true
    );
    return response.data;
  },

  async getDeliveryOrderHistories(id: number | string): Promise<ApiResponse<DeliveryOrderStatusHistory[]>> {
    const response = await httpGet<DeliveryOrderStatusHistory[]>(
      endpointUrl(`delivery/orders/${id}/histories`),
      true
    );
    return response.data;
  },

  async getTripDetail(tripId: string): Promise<ApiResponse<DeliveryOrder[]>> {
    const response = await httpGet<DeliveryOrder[]>(
      endpointUrl(`delivery/trips/${tripId}`),
      true
    );
    return response.data;
  },

  async createDeliveryOrder(payload: CreateDeliveryOrderPayload): Promise<ApiResponse<DeliveryOrder[]>> {
    const response = await httpPost<DeliveryOrder[]>(
      endpointUrl("delivery/orders"),
      payload,
      true
    );
    return response.data;
  },

  async confirmLoading(id: number | string, payload?: ConfirmLoadingPayload): Promise<ApiResponse<DeliveryOrder>> {
    const response = await httpPut<DeliveryOrder>(
      endpointUrl(`delivery/orders/${id}/confirm-loading`),
      payload || {},
      true
    );
    return response.data;
  },

  async confirmTripLoading(tripId: string, payload?: ConfirmLoadingPayload): Promise<ApiResponse<DeliveryOrder[]>> {
    const response = await httpPut<DeliveryOrder[]>(
      endpointUrl(`delivery/trips/${tripId}/confirm-loading`),
      payload || {},
      true
    );
    return response.data;
  },

  async confirmDelivery(
    id: number | string,
    payload: ConfirmDeliveryPayload | FormData,
    proofFile?: File | Blob
  ): Promise<ApiResponse<DeliveryOrder>> {
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      const response = await httpPut<DeliveryOrder>(
        endpointUrl(`delivery/orders/${id}/confirm-delivery`),
        payload,
        true,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    }

    if (proofFile) {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append("proof_photo", proofFile, (proofFile as File).name || "pod.jpg");

      const response = await httpPut<DeliveryOrder>(
        endpointUrl(`delivery/orders/${id}/confirm-delivery`),
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

    const response = await httpPut<DeliveryOrder>(
      endpointUrl(`delivery/orders/${id}/confirm-delivery`),
      payload,
      true
    );
    return response.data;
  },

  async reportFailed(
    id: number | string,
    payload: ReportFailedDeliveryPayload | FormData,
    proofFile?: File | Blob
  ): Promise<ApiResponse<DeliveryOrder>> {
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      const response = await httpPut<DeliveryOrder>(
        endpointUrl(`delivery/orders/${id}/report-failed`),
        payload,
        true,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    }

    if (proofFile) {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append("proof_photo", proofFile, (proofFile as File).name || "failed.jpg");

      const response = await httpPut<DeliveryOrder>(
        endpointUrl(`delivery/orders/${id}/report-failed`),
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

    const response = await httpPut<DeliveryOrder>(
      endpointUrl(`delivery/orders/${id}/report-failed`),
      payload,
      true
    );
    return response.data;
  },

  async reschedule(id: number | string, payload: RescheduleDeliveryPayload): Promise<ApiResponse<DeliveryOrder>> {
    const response = await httpPut<DeliveryOrder>(
      endpointUrl(`delivery/orders/${id}/reschedule`),
      payload,
      true
    );
    return response.data;
  },

  async cancel(id: number | string, payload: CancelDeliveryPayload): Promise<ApiResponse<DeliveryOrder>> {
    const response = await httpPut<DeliveryOrder>(
      endpointUrl(`delivery/orders/${id}/cancel`),
      payload,
      true
    );
    return response.data;
  },
};
