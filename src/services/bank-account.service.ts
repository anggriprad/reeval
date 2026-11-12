import {
  ApiResponse,
  endpointUrl,
  httpDelete,
  httpGet,
  httpPost,
  httpPut,
} from "@/helpers/axios";
import type { ApiAuditFields, BankAccount } from "@/lib/types";

export interface BankAccountDTO extends ApiAuditFields {
  id: number;
  company_id: number;
  name: string;
  account_number?: string;
  initial_balance: number;
  balance: number;
  description?: string;
  is_active: boolean;
  has_transactions?: boolean;
  can_delete?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccountOptionDTO {
  id: number;
  name: string;
  account_number?: string;
  balance: number;
}

export interface GetBankAccountsParams {
  page?: number;
  per_page?: number;
  search?: string;
  created_by_id?: number;
}

export interface CreateBankAccountPayload {
  name: string;
  account_number?: string;
  initial_balance: number;
  description?: string;
}

export interface UpdateBankAccountPayload {
  name: string;
  account_number?: string;
  description?: string;
}

export function mapBankAccountResponseToBankAccount(
  dto: BankAccountDTO
): BankAccount {
  return {
    id: String(dto.id),
    name: dto.name,
    accountNumber: dto.account_number || undefined,
    initialBalance: dto.initial_balance,
    balance: dto.balance,
    description: dto.description || undefined,
    isActive: dto.is_active,
    hasTransactions: dto.has_transactions,
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

export function mapBankAccountOptionToBankAccount(
  dto: BankAccountOptionDTO
): BankAccount {
  return {
    id: String(dto.id),
    name: dto.name,
    accountNumber: dto.account_number || undefined,
    balance: dto.balance,
  };
}

export const bankAccountService = {
  async getAccounts(
    params?: GetBankAccountsParams
  ): Promise<ApiResponse<BankAccountDTO[]>> {
    const response = await httpGet<BankAccountDTO[]>(
      endpointUrl("finance/bank-accounts"),
      true,
      params
    );
    return response.data;
  },

  async getOptions(): Promise<ApiResponse<BankAccountOptionDTO[]>> {
    const response = await httpGet<BankAccountOptionDTO[]>(
      endpointUrl("finance/bank-accounts/options"),
      true
    );
    return response.data;
  },

  async getById(id: number | string): Promise<ApiResponse<BankAccountDTO>> {
    const response = await httpGet<BankAccountDTO>(
      endpointUrl(`finance/bank-accounts/${id}`),
      true
    );
    return response.data;
  },

  async createAccount(
    payload: CreateBankAccountPayload
  ): Promise<ApiResponse<BankAccountDTO>> {
    const response = await httpPost<BankAccountDTO>(
      endpointUrl("finance/bank-accounts"),
      payload,
      true
    );
    return response.data;
  },

  async updateAccount(
    id: number | string,
    payload: UpdateBankAccountPayload
  ): Promise<ApiResponse<BankAccountDTO>> {
    const response = await httpPut<BankAccountDTO>(
      endpointUrl(`finance/bank-accounts/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteAccount(id: number | string): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`finance/bank-accounts/${id}`),
      true
    );
    return response.data;
  },
};
