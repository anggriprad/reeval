import { ApiResponse, endpointUrl, httpGet } from "@/helpers/axios";
import { type CashMutationItemDTO } from "./cash-transaction.service";

export interface AgingSummaryDTO {
  total_outstanding: number;
  unpaid_count: number;
  current: number;
  days_31_to_60: number;
  days_61_to_90: number;
  over_90: number;
}

export interface FinanceOverviewDTO {
  total_bank_balance: number;
  active_bank_count: number;
  total_ar: number;
  unpaid_invoice_count: number;
  total_ap: number;
  unpaid_ap_count: number;
  total_revenue: number;
  total_cogs: number;
  total_expense: number;
  net_profit: number;
  total_cash_inflow: number;
  total_cash_outflow: number;
  ar_aging: AgingSummaryDTO;
  ap_aging: AgingSummaryDTO;
  recent_mutations: CashMutationItemDTO[];
}

export interface ReportLineItemDTO {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  amount: number;
}

export interface IncomeStatementDTO {
  start_date: string;
  end_date: string;
  revenue_items: ReportLineItemDTO[];
  total_revenue: number;
  cogs_items: ReportLineItemDTO[];
  total_cogs: number;
  gross_profit: number;
  expense_items: ReportLineItemDTO[];
  total_expense: number;
  net_profit: number;
}

export interface BalanceSheetDTO {
  as_of_date: string;
  asset_items: ReportLineItemDTO[];
  total_assets: number;
  liability_items: ReportLineItemDTO[];
  total_liabilities: number;
  equity_items: ReportLineItemDTO[];
  current_net_profit: number;
  total_equity: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export interface CashFlowActivityItemDTO {
  label: string;
  source_type: string;
  account_code?: string;
  account_name?: string;
  direction: "INFLOW" | "OUTFLOW" | string;
  amount: number;
}

export interface CashFlowStatementDTO {
  start_date: string;
  end_date: string;
  operating_inflows: number;
  operating_outflows: number;
  net_operating_cash_flow: number;
  operating_items: CashFlowActivityItemDTO[];
  investing_inflows: number;
  investing_outflows: number;
  net_investing_cash_flow: number;
  investing_items: CashFlowActivityItemDTO[];
  financing_inflows: number;
  financing_outflows: number;
  net_financing_cash_flow: number;
  financing_items: CashFlowActivityItemDTO[];
  net_cash_change: number;
  beginning_cash: number;
  ending_cash: number;
}

export interface HPPMaterialLineDTO {
  material_id: number;
  material_name: string;
  unit: string;
  qty: number;
  unit_cost: number;
  total_cost: number;
}

export interface HPPSPKBreakdownDTO {
  work_order_id: number;
  spk_number: string;
  product_name: string;
  variant_name: string;
  status: string;
  target_qty: number;
  material_cost: number;
  planned_labor_cost: number;
  actual_labor_cost: number;
  actual_overhead_cost: number;
  materials_detail: HPPMaterialLineDTO[];
}

export interface HPPAnalysisItemDTO {
  sales_order_id: number;
  sales_order_number: string;
  order_status: string;
  customer_name: string;
  created_at: string;
  gross_selling_price: number;
  refund_amount: number;
  selling_price: number;
  material_cost: number;
  planned_labor_cost: number;
  planned_overhead_cost: number;
  actual_labor_cost: number;
  actual_overhead_cost: number;
  total_hpp: number;
  gross_profit: number;
  gross_margin_percent: number;
  is_estimated: boolean;
  costing_basis: "ACTUAL" | "ESTIMATED_BOM" | "ESTIMATED_PENDING" | string;
  spk_count: number;
  spk_breakdowns: HPPSPKBreakdownDTO[];
  estimated_materials: HPPMaterialLineDTO[];
}

export interface HPPAnalysisViewModel {
  id: string;
  salesOrderId: number;
  orderNumber: string;
  rawStatus: string;
  customerName: string;
  createdAt: string;
  grossSellingPrice: number;
  refundAmount: number;
  sellingPrice: number;
  materialCost: number;
  laborCost: number;
  plannedLaborCost: number;
  actualLaborCost: number;
  totalHPP: number;
  grossProfit: number;
  grossMarginPercent: number;
  isEstimated: boolean;
  costingBasis: string;
  spkCount: number;
  spkBreakdowns: HPPSPKBreakdownDTO[];
  estimatedMaterials: HPPMaterialLineDTO[];
}

export function mapHPPAnalysisItemDTO(dto: HPPAnalysisItemDTO): HPPAnalysisViewModel {
  const laborCost =
    Number(dto.actual_labor_cost ?? 0) > 0
      ? Number(dto.actual_labor_cost)
      : Number(dto.planned_labor_cost ?? 0);
  return {
    id: String(dto.sales_order_id),
    salesOrderId: dto.sales_order_id,
    orderNumber: dto.sales_order_number,
    rawStatus: dto.order_status,
    customerName: dto.customer_name,
    createdAt: dto.created_at,
    grossSellingPrice: Number(dto.gross_selling_price ?? 0),
    refundAmount: Number(dto.refund_amount ?? 0),
    sellingPrice: Number(dto.selling_price ?? 0),
    materialCost: Number(dto.material_cost ?? 0),
    laborCost,
    plannedLaborCost: Number(dto.planned_labor_cost ?? 0),
    actualLaborCost: Number(dto.actual_labor_cost ?? 0),
    totalHPP: Number(dto.total_hpp ?? 0),
    grossProfit: Number(dto.gross_profit ?? 0),
    grossMarginPercent: Number(dto.gross_margin_percent ?? 0),
    isEstimated: Boolean(dto.is_estimated),
    costingBasis: dto.costing_basis || "ACTUAL",
    spkCount: Number(dto.spk_count ?? 0),
    spkBreakdowns: Array.isArray(dto.spk_breakdowns) ? dto.spk_breakdowns : [],
    estimatedMaterials: Array.isArray(dto.estimated_materials) ? dto.estimated_materials : [],
  };
}

export interface GetDateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface GetHPPAnalysisParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  costing_status?: string;
}

export const financeReportService = {
  getOverview: async (): Promise<ApiResponse<FinanceOverviewDTO>> => {
    const res = await httpGet<FinanceOverviewDTO>(endpointUrl("finance/overview"), true);
    return res.data;
  },

  getIncomeStatement: async (
    params?: GetDateRangeParams
  ): Promise<ApiResponse<IncomeStatementDTO>> => {
    const res = await httpGet<IncomeStatementDTO>(
      endpointUrl("finance/reports/income-statement"),
      true,
      params
    );
    return res.data;
  },

  getBalanceSheet: async (params?: {
    as_of_date?: string;
  }): Promise<ApiResponse<BalanceSheetDTO>> => {
    const res = await httpGet<BalanceSheetDTO>(
      endpointUrl("finance/reports/balance-sheet"),
      true,
      params
    );
    return res.data;
  },

  getCashFlowStatement: async (
    params?: GetDateRangeParams
  ): Promise<ApiResponse<CashFlowStatementDTO>> => {
    const res = await httpGet<CashFlowStatementDTO>(
      endpointUrl("finance/reports/cash-flow"),
      true,
      params
    );
    return res.data;
  },

  getHPPAnalysis: async (
    params?: GetHPPAnalysisParams
  ): Promise<ApiResponse<HPPAnalysisItemDTO[]>> => {
    const res = await httpGet<HPPAnalysisItemDTO[]>(
      endpointUrl("finance/reports/hpp-analysis"),
      true,
      params
    );
    return res.data;
  },
};
