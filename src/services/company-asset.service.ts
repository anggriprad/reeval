import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface CompanyAssetItem {
  id: number;
  code: string;
  name: string;
  category_id?: number;
  category_name: string;
  category: string;
  acquisition_type: string;
  purchase_date: string;
  purchase_cost: number;
  useful_life_years: number;
  useful_life_months: number;
  salvage_value: number;
  current_book_value: number;
  monthly_depreciation: number;
  accumulated_service_cost: number;
  status: string;
  notes?: string;
  cash_account_id?: string;
  finance_transaction_id?: string;
  is_posted_to_finance: boolean;
  journal_entry_id?: number;
  created_at: string;
  updated_at: string;
}

export interface AssetServiceLogItem {
  id: number;
  asset_id: number;
  asset_code: string;
  asset_name: string;
  service_date: string;
  cost: number;
  description: string;
  service_provider?: string;
  is_posted_to_finance: boolean;
  journal_entry_id?: number;
  created_at: string;
}

export interface AssetDepreciationItem {
  id: number;
  asset_id: number;
  amount: number;
  period_date: string;
  remaining_book_value: number;
  is_posted_to_finance: boolean;
  journal_entry_id?: number;
  created_at: string;
}

export interface CompanyAssetDetail extends CompanyAssetItem {
  service_logs: AssetServiceLogItem[];
  depreciations: AssetDepreciationItem[];
}

export interface GetCompanyAssetsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  category?: string;
  status?: string;
}

export interface CreateCompanyAssetPayload {
  code?: string;
  name: string;
  category?: string;
  category_id?: number;
  acquisition_type?: string;
  purchase_date?: string;
  purchase_cost: number;
  useful_life_years?: number;
  useful_life_months?: number;
  salvage_value?: number;
  status?: string;
  notes?: string;
  cash_account_id?: string;
}

export interface UpdateCompanyAssetPayload {
  code?: string;
  name?: string;
  category?: string;
  category_id?: number;
  acquisition_type?: string;
  purchase_date?: string;
  purchase_cost?: number;
  useful_life_years?: number;
  useful_life_months?: number;
  salvage_value?: number;
  status?: string;
  notes?: string;
  cash_account_id?: string;
}

export interface AddAssetServiceLogPayload {
  service_date: string;
  cost: number;
  description: string;
  service_provider?: string;
}

export interface RecordAssetDepreciationPayload {
  period_date: string;
  amount: number;
  notes?: string;
}

export const companyAssetService = {
  async getAssets(params?: GetCompanyAssetsParams): Promise<ApiResponse<CompanyAssetItem[]>> {
    const response = await httpGet<CompanyAssetItem[]>(
      endpointUrl("inventory/assets"),
      true,
      params
    );
    return response.data;
  },

  async getAssetById(id: number | string): Promise<ApiResponse<CompanyAssetDetail>> {
    const response = await httpGet<CompanyAssetDetail>(
      endpointUrl(`inventory/assets/${id}`),
      true
    );
    return response.data;
  },

  async createAsset(payload: CreateCompanyAssetPayload): Promise<ApiResponse<CompanyAssetDetail>> {
    const response = await httpPost<CompanyAssetDetail>(
      endpointUrl("inventory/assets"),
      payload,
      true
    );
    return response.data;
  },

  async updateAsset(
    id: number | string,
    payload: UpdateCompanyAssetPayload
  ): Promise<ApiResponse<CompanyAssetDetail>> {
    const response = await httpPut<CompanyAssetDetail>(
      endpointUrl(`inventory/assets/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteAsset(id: number | string): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`inventory/assets/${id}`),
      true
    );
    return response.data;
  },

  async getServiceLogs(assetId: number | string): Promise<ApiResponse<AssetServiceLogItem[]>> {
    const response = await httpGet<AssetServiceLogItem[]>(
      endpointUrl(`inventory/assets/${assetId}/services`),
      true
    );
    return response.data;
  },

  async addServiceLog(
    assetId: number | string,
    payload: AddAssetServiceLogPayload
  ): Promise<ApiResponse<AssetServiceLogItem>> {
    const response = await httpPost<AssetServiceLogItem>(
      endpointUrl(`inventory/assets/${assetId}/services`),
      payload,
      true
    );
    return response.data;
  },

  async deleteServiceLog(
    assetId: number | string,
    serviceId: number | string
  ): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`inventory/assets/${assetId}/services/${serviceId}`),
      true
    );
    return response.data;
  },

  async getDepreciations(assetId: number | string): Promise<ApiResponse<AssetDepreciationItem[]>> {
    const response = await httpGet<AssetDepreciationItem[]>(
      endpointUrl(`inventory/assets/${assetId}/depreciations`),
      true
    );
    return response.data;
  },

  async recordDepreciation(
    assetId: number | string,
    payload: RecordAssetDepreciationPayload
  ): Promise<ApiResponse<AssetDepreciationItem>> {
    const response = await httpPost<AssetDepreciationItem>(
      endpointUrl(`inventory/assets/${assetId}/depreciations`),
      payload,
      true
    );
    return response.data;
  },
};
