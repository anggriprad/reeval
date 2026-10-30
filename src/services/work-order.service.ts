import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  ApiResponse,
} from "@/helpers/axios";
import type { WorkOrder, JobCard, BOMItem, SelectedModifierGroup } from "@/lib/types";

export interface JobCardLogResponse {
  id: number;
  job_card_id: number;
  action: string;
  operator_id?: number | null;
  pic_name: string;
  duration_minutes: number;
  notes: string;
  timestamp: string;
}

export interface JobCardResponse {
  id: number;
  work_order_id: number;
  operation_id: number;
  operation_name: string;
  sequence: number;
  target_qty: number;
  completed_qty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  operator_id?: number | null;
  pic_name: string;
  planned_minutes: number;
  actual_minutes: number;
  total_duration_minutes: number;
  paused_minutes: number;
  costing_method: string;
  fixed_labor_cost: number;
  labor_cost_per_hour: number;
  started_at?: string | null;
  completed_at?: string | null;
  last_started_at?: string | null;
  last_paused_at?: string | null;
  logs?: JobCardLogResponse[];
}

export interface WorkOrderResponse {
  id: number;
  spk_number: string;
  sales_order_id?: number | null;
  sales_order_number: string;
  sales_order_item_id?: number | null;
  unit_index: number;
  product_id?: number | null;
  variant_id?: number | null;
  sub_assembly_id?: number | null;
  product_name: string;
  variant_name: string;
  target_qty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  material_cost: number;
  planned_labor_cost: number;
  actual_labor_cost: number;
  materials_consumed: any;
  is_custom: boolean;
  custom_notes?: string;
  is_sub_assembly: boolean;
  cancel_reason?: string;
  canceled_by?: string;
  canceled_at?: string | null;
  issued_at: string;
  completed_at?: string | null;
  total_duration_minutes: number;
  job_cards: JobCardResponse[];
  available_actions?: string[];
}

export interface WorkOrderKPIStep {
  sequence: number;
  operation_name: string;
  pic_name: string;
  planned_minutes: number;
  actual_minutes: number;
  diff_minutes: number;
  is_delayed: boolean;
  status: string;
  labor_cost: number;
}

export interface WorkOrderKPIResponse {
  work_order_id: number;
  spk_number: string;
  product_name: string;
  target_qty: number;
  total_planned_minutes: number;
  total_actual_minutes: number;
  total_diff_minutes: number;
  time_efficiency_rate: number;
  total_planned_labor_cost: number;
  total_actual_labor_cost: number;
  labor_cost_variance: number;
  steps: WorkOrderKPIStep[];
}

export interface ProductionAnalyticsOperationItem {
  id: number;
  name: string;
  target_mins: number;
  avg_actual_mins: number;
  diff_mins: number;
  completed_count: number;
  delay_percentage: number;
  is_bottleneck: boolean;
  costing_method: string;
}

export interface ProductionAnalyticsOperatorItem {
  id: number;
  name: string;
  role: string;
  completed_count: number;
  total_hours: string;
  efficiency_score: number;
  on_time_ratio: string;
  total_earned_cost: number;
}

export interface ProductionAnalyticsResponse {
  period: string;
  time_efficiency_rate: number;
  spk_completion_rate: number;
  total_planned_labor_cost: number;
  total_actual_labor_cost: number;
  labor_cost_savings: number;
  avg_lead_time_hours: string;
  total_work_orders: number;
  completed_work_orders: number;
  active_work_orders: number;
  operations?: ProductionAnalyticsOperationItem[];
  operators?: ProductionAnalyticsOperatorItem[];
  operation_analytics?: ProductionAnalyticsOperationItem[];
  operator_analytics?: ProductionAnalyticsOperatorItem[];
}

export interface WorkOrderStatusCountsResponse {
  active: number;
  completed: number;
  canceled: number;
}

export interface UpdateWorkOrderJobCardPayload {
  job_card_id: number;
  operator_id?: number;
  pic_name: string;
  actual_minutes?: number;
  notes?: string;
}

export interface UpdateWorkOrderPayload {
  custom_notes?: string;
  job_cards?: UpdateWorkOrderJobCardPayload[];
  job_card_id?: number;
  operator_id?: number;
  pic_name?: string;
  notes?: string;
}

export interface GetWorkOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
  spk_type?: string;
  search?: string;
}

export interface CreateManualWorkOrderPayload {
  category: 'NORMAL' | 'WIP';
  product_id?: number;
  variant_id?: number;
  sub_assembly_id?: number;
  target_qty: number;
  custom_notes?: string;
}

export interface CancelWorkOrderPayload {
  reason: string;
}

export interface StartJobCardPayload {
  operator_id?: number;
  pic_name?: string;
  notes?: string;
}

export interface PauseJobCardPayload {
  operator_id?: number;
  pic_name?: string;
  notes?: string;
}

export interface AssignJobCardOperatorPayload {
  operator_id?: number;
  pic_name: string;
  notes?: string;
}

export interface CompleteJobCardPayload {
  completed_qty: number;
  pic_name?: string;
  operator_id?: number;
  actual_minutes?: number;
  notes?: string;
}

// ── Adapters ─────────────────────────────────────────────────────────────────

export function mapJobCardResponseToJobCard(dto: JobCardResponse): JobCard {
  return {
    id: String(dto.id),
    workOrderId: String(dto.work_order_id),
    operationId: String(dto.operation_id),
    operationName: dto.operation_name,
    sequence: dto.sequence,
    status: dto.status,
    targetQty: dto.target_qty,
    completedQty: dto.completed_qty,
    operatorId: dto.operator_id ? String(dto.operator_id) : undefined,
    picName: dto.pic_name || undefined,
    startedAt: dto.started_at || undefined,
    completedAt: dto.completed_at || undefined,
    actualMinutes: dto.actual_minutes,
    plannedMinutes: dto.planned_minutes,
  };
}

export function mapWorkOrderResponseToWorkOrder(dto: WorkOrderResponse): WorkOrder {
  let parsedMaterials: BOMItem[] = [];
  if (dto.materials_consumed) {
    if (Array.isArray(dto.materials_consumed)) {
      parsedMaterials = dto.materials_consumed;
    } else if (typeof dto.materials_consumed === 'string') {
      try {
        const decoded = JSON.parse(dto.materials_consumed);
        if (Array.isArray(decoded)) parsedMaterials = decoded;
      } catch {
        parsedMaterials = [];
      }
    }
  }

  return {
    id: String(dto.id),
    spkNumber: dto.spk_number,
    salesOrderId: dto.sales_order_id ? String(dto.sales_order_id) : '',
    salesOrderNumber: dto.sales_order_number || '',
    productId: dto.product_id ? String(dto.product_id) : undefined,
    variantId: dto.variant_id ? String(dto.variant_id) : undefined,
    unitIndex: dto.unit_index || 1,
    productName: dto.product_name,
    variantName: dto.variant_name || undefined,
    status: dto.status,
    jobCards: (dto.job_cards || []).map(mapJobCardResponseToJobCard),
    materialsConsumed: parsedMaterials,
    materialCost: dto.material_cost || 0,
    plannedLaborCost: dto.planned_labor_cost || 0,
    actualLaborCost: dto.actual_labor_cost || 0,
    issuedAt: dto.issued_at,
    completedAt: dto.completed_at || undefined,
    isCustom: Boolean(dto.is_custom),
    customNotes: dto.custom_notes || undefined,
    isSubAssembly: Boolean(dto.is_sub_assembly),
    subAssemblyId: dto.sub_assembly_id ? String(dto.sub_assembly_id) : undefined,
    cancelReason: dto.cancel_reason || undefined,
    canceledAt: dto.canceled_at || undefined,
  };
}

// ── Service Definition ────────────────────────────────────────────────────────

export const workOrderService = {
  /**
   * List paginated work orders with server-side filters.
   */
  async getWorkOrders(
    params?: GetWorkOrdersParams,
    configs?: Record<string, any>
  ): Promise<ApiResponse<WorkOrderResponse[]>> {
    const response = await httpGet<WorkOrderResponse[]>(
      endpointUrl("production/work-orders"),
      true,
      params,
      configs
    );
    return response.data;
  },

  /**
   * Get real-time counter for each status tab (active, completed, canceled).
   */
  async getStatusCounts(): Promise<ApiResponse<WorkOrderStatusCountsResponse>> {
    const response = await httpGet<WorkOrderStatusCountsResponse>(
      endpointUrl("production/work-orders/counts"),
      true
    );
    return response.data;
  },

  /**
   * Get single work order detail.
   */
  async getWorkOrderById(id: number | string): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpGet<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${id}`),
      true
    );
    return response.data;
  },

  /**
   * Get KPI analysis for a single work order.
   */
  async getWorkOrderKPI(id: number | string): Promise<ApiResponse<WorkOrderKPIResponse>> {
    const response = await httpGet<WorkOrderKPIResponse>(
      endpointUrl(`production/work-orders/${id}/kpi`),
      true
    );
    return response.data;
  },

  /**
   * Create a manual work order (Normal / WIP).
   */
  async createManualWorkOrder(payload: CreateManualWorkOrderPayload): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPost<WorkOrderResponse>(
      endpointUrl("production/work-orders"),
      payload,
      true
    );
    return response.data;
  },

  /**
   * Update work order details or revise assigned job card operators.
   */
  async updateWorkOrder(
    id: number | string,
    payload: UpdateWorkOrderPayload
  ): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPut<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${id}`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * Cancel a work order with mandatory reason.
   */
  async cancelWorkOrder(id: number | string, payload: CancelWorkOrderPayload): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPut<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${id}/cancel`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * Start execution of a job card step.
   */
  async startJobCard(
    woId: number | string,
    jcId: number | string,
    payload?: StartJobCardPayload
  ): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPut<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${woId}/job-cards/${jcId}/start`),
      payload || {},
      true
    );
    return response.data;
  },

  /**
   * Pause execution of a job card step.
   */
  async pauseJobCard(
    woId: number | string,
    jcId: number | string,
    payload?: PauseJobCardPayload
  ): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPut<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${woId}/job-cards/${jcId}/pause`),
      payload || {},
      true
    );
    return response.data;
  },

  /**
   * Assign or update PIC operator on a job card step.
   */
  async assignJobCardOperator(
    woId: number | string,
    jcId: number | string,
    payload: AssignJobCardOperatorPayload
  ): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPut<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${woId}/job-cards/${jcId}/assign`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * Complete a job card step.
   */
  async completeJobCard(
    woId: number | string,
    jcId: number | string,
    payload: CompleteJobCardPayload
  ): Promise<ApiResponse<WorkOrderResponse>> {
    const response = await httpPut<WorkOrderResponse>(
      endpointUrl(`production/work-orders/${woId}/job-cards/${jcId}/complete`),
      payload,
      true
    );
    return response.data;
  },

  /**
   * Get audit log history of a job card.
   */
  async getJobCardLogs(
    woId: number | string,
    jcId: number | string
  ): Promise<ApiResponse<JobCardLogResponse[]>> {
    const response = await httpGet<JobCardLogResponse[]>(
      endpointUrl(`production/work-orders/${woId}/job-cards/${jcId}/logs`),
      true
    );
    return response.data;
  },

  /**
   * Get production KPI analytics (bottlenecks, operator leaderboard, cost savings).
   */
  async getAnalytics(period?: string): Promise<ApiResponse<ProductionAnalyticsResponse>> {
    const response = await httpGet<ProductionAnalyticsResponse>(
      endpointUrl("production/analytics"),
      true,
      period ? { period } : undefined
    );
    return response.data;
  },
};
