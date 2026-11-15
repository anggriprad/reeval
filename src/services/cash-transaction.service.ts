import { ApiResponse, endpointUrl, httpGet, httpPost } from "@/helpers/axios";
import type {
  ApiAuditFields,
  CashMutationItem,
  DividendSummary,
} from "@/lib/types";

export interface CashTransactionDTO extends ApiAuditFields {
  id: number;
  company_id: number;
  transaction_number: string;
  type: "INFLOW" | "OUTFLOW" | "TRANSFER" | "DIVIDEND";
  source_type: string;
  date: string;
  bank_account_id: number;
  bank_account_name: string;
  to_bank_account_id?: number | null;
  to_bank_account_name?: string;
  coa_account_id?: number | null;
  coa_account_code?: string;
  coa_account_name?: string;
  amount: number;
  description: string;
  journal_entry_id?: number | null;
  journal_entry_number?: string;
  created_at?: string;
}

export interface CashMutationItemDTO extends ApiAuditFields {
  id: number;
  mutation_key: string;
  transaction_number: string;
  direction: "INFLOW" | "OUTFLOW";
  type: "INFLOW" | "OUTFLOW" | "TRANSFER" | "DIVIDEND";
  source_type: string;
  date: string;
  bank_account_id: number;
  bank_account_name: string;
  counterparty_bank_id?: number | null;
  counterparty_bank_name?: string;
  coa_account_id?: number | null;
  coa_account_code?: string;
  coa_account_name?: string;
  amount: number;
  running_balance: number;
  description: string;
  journal_entry_id?: number | null;
  journal_entry_number?: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  created_at?: string;
}

export interface GetCashMutationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  bank_account_id?: number;
  source_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateCashTransactionPayload {
  type: "INFLOW" | "OUTFLOW";
  date: string;
  bank_account_id: number;
  coa_account_id: number;
  amount: number;
  description: string;
}

export interface CreateCashTransferPayload {
  date: string;
  from_bank_account_id: number;
  to_bank_account_id: number;
  amount: number;
  description?: string;
}

export interface CreateDividendPayload {
  date: string;
  bank_account_id: number;
  amount: number;
  notes?: string;
}

export interface DividendSummaryDTO {
  retained_earnings_balance: number;
  last_closing_date?: string | null;
}

export function mapCashMutationDTO(dto: CashMutationItemDTO): CashMutationItem {
  return {
    id: dto.id,
    mutationKey: dto.mutation_key || String(dto.id),
    transactionNumber: dto.transaction_number,
    direction: dto.direction,
    type: dto.type,
    sourceType: dto.source_type,
    date: dto.date,
    bankAccountId: dto.bank_account_id,
    bankAccountName: dto.bank_account_name,
    counterpartyBankId: dto.counterparty_bank_id ?? null,
    counterpartyBankName: dto.counterparty_bank_name,
    coaAccountId: dto.coa_account_id ?? null,
    coaAccountCode: dto.coa_account_code,
    coaAccountName: dto.coa_account_name,
    amount: dto.amount,
    runningBalance: dto.running_balance,
    description: dto.description,
    journalEntryId: dto.journal_entry_id ?? null,
    journalEntryNumber: dto.journal_entry_number,
    referenceType: dto.reference_type,
    referenceId: dto.reference_id,
    referenceNumber: dto.reference_number,
    createdAt: dto.created_at,
    createdById: dto.created_by_id,
    createdBy: dto.created_by,
    createdByUser: dto.created_by_user,
    updatedById: dto.updated_by_id,
    updatedBy: dto.updated_by,
    updatedByUser: dto.updated_by_user,
  };
}

export function mapDividendSummaryDTO(dto: DividendSummaryDTO): DividendSummary {
  return {
    retainedEarningsBalance: dto.retained_earnings_balance,
    lastClosingDate: dto.last_closing_date ?? null,
  };
}

export const cashTransactionService = {
  async getMutations(
    params?: GetCashMutationsParams
  ): Promise<ApiResponse<CashMutationItemDTO[]>> {
    const response = await httpGet<CashMutationItemDTO[]>(
      endpointUrl("finance/cash-transactions"),
      true,
      params
    );
    return response.data;
  },

  async createTransaction(
    payload: CreateCashTransactionPayload
  ): Promise<ApiResponse<CashTransactionDTO>> {
    const response = await httpPost<CashTransactionDTO>(
      endpointUrl("finance/cash-transactions"),
      payload,
      true
    );
    return response.data;
  },

  async createTransfer(
    payload: CreateCashTransferPayload
  ): Promise<ApiResponse<CashTransactionDTO>> {
    const response = await httpPost<CashTransactionDTO>(
      endpointUrl("finance/cash-transfers"),
      payload,
      true
    );
    return response.data;
  },

  async getDividendSummary(): Promise<ApiResponse<DividendSummaryDTO>> {
    const response = await httpGet<DividendSummaryDTO>(
      endpointUrl("finance/dividends/summary"),
      true
    );
    return response.data;
  },

  async createDividend(
    payload: CreateDividendPayload
  ): Promise<ApiResponse<CashTransactionDTO>> {
    const response = await httpPost<CashTransactionDTO>(
      endpointUrl("finance/dividends"),
      payload,
      true
    );
    return response.data;
  },
};
