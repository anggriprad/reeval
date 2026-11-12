import {
  ApiResponse,
  endpointUrl,
  httpDelete,
  httpGet,
  httpPost,
  httpPut,
} from "@/helpers/axios";
import type {
  AccountCode,
  AccountNormalBalance,
  AccountType,
  ApiAuditFields,
} from "@/lib/types";

export interface ChartOfAccountDTO extends ApiAuditFields {
  id: number;
  company_id: number;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: AccountNormalBalance;
  parent_id?: number | null;
  parent_code?: string;
  parent_name?: string;
  is_header: boolean;
  level: number;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  has_children?: boolean;
  can_delete?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChartOfAccountOptionDTO {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: AccountNormalBalance;
  parent_id?: number | null;
  is_header: boolean;
  level: number;
}

export interface GetChartOfAccountsParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: string;
  created_by_id?: number;
  is_header?: boolean;
  is_system?: boolean;
}

export interface GetChartOfAccountOptionsParams {
  type?: string;
  is_header?: boolean;
}

export interface CreateChartOfAccountPayload {
  name: string;
  type?: AccountType;
  normal_balance?: AccountNormalBalance;
  parent_id?: number | null;
  is_header?: boolean;
  description?: string;
}

export interface UpdateChartOfAccountPayload {
  name: string;
  code?: string;
  type?: AccountType;
  normal_balance?: AccountNormalBalance;
  parent_id?: number | null;
  is_header?: boolean;
  description?: string;
}

export function mapCoaResponseToAccountCode(dto: ChartOfAccountDTO): AccountCode {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    type: dto.type,
    normalBalance: dto.normal_balance,
    parentId: dto.parent_id != null ? String(dto.parent_id) : undefined,
    parentCode: dto.parent_code,
    parentName: dto.parent_name,
    isHeader: dto.is_header,
    level: dto.level,
    description: dto.description || undefined,
    isSystem: dto.is_system,
    isActive: dto.is_active,
    hasChildren: dto.has_children,
    canDelete: dto.can_delete,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdById: dto.created_by_id,
    createdBy: dto.created_by,
    createdByUser: dto.created_by_user,
    updatedById: dto.updated_by_id,
    updatedBy: dto.updated_by,
    updatedByUser: dto.updated_by_user,
  };
}

export const coaService = {
  async getAccounts(
    params?: GetChartOfAccountsParams
  ): Promise<ApiResponse<ChartOfAccountDTO[]>> {
    const response = await httpGet<ChartOfAccountDTO[]>(
      endpointUrl("finance/coa"),
      true,
      params
    );
    return response.data;
  },

  async getOptions(
    params?: GetChartOfAccountOptionsParams
  ): Promise<ApiResponse<ChartOfAccountOptionDTO[]>> {
    const response = await httpGet<ChartOfAccountOptionDTO[]>(
      endpointUrl("finance/coa/options"),
      true,
      params
    );
    return response.data;
  },

  async getById(id: number | string): Promise<ApiResponse<ChartOfAccountDTO>> {
    const response = await httpGet<ChartOfAccountDTO>(
      endpointUrl(`finance/coa/${id}`),
      true
    );
    return response.data;
  },

  async createAccount(
    payload: CreateChartOfAccountPayload
  ): Promise<ApiResponse<ChartOfAccountDTO>> {
    const response = await httpPost<ChartOfAccountDTO>(
      endpointUrl("finance/coa"),
      payload,
      true
    );
    return response.data;
  },

  async updateAccount(
    id: number | string,
    payload: UpdateChartOfAccountPayload
  ): Promise<ApiResponse<ChartOfAccountDTO>> {
    const response = await httpPut<ChartOfAccountDTO>(
      endpointUrl(`finance/coa/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteAccount(id: number | string): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`finance/coa/${id}`),
      true
    );
    return response.data;
  },
};
