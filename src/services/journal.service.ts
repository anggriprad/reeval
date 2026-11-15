import { ApiResponse, endpointUrl, httpGet, httpPost } from "@/helpers/axios";
import type {
  AccountType,
  ApiAuditFields,
  ClosingPeriodRecord,
  ClosingPreview,
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
  JournalSourceType,
  LedgerAccountRow,
  LedgerMutationItem,
  LedgerMutations,
  LedgerTrialBalance,
  AccountNormalBalance,
} from "@/lib/types";

export interface JournalEntryLineDTO {
  id: number;
  account_id: number;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryDTO extends ApiAuditFields {
  id: number;
  company_id: number;
  entry_number: string;
  date: string;
  description: string;
  source_type: string;
  source_id?: string | null;
  status: string;
  void_reason?: string;
  voided_at?: string | null;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLineDTO[];
  created_at: string;
  updated_at: string;
}

export interface LedgerAccountRowDTO {
  account_id: number;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: AccountNormalBalance;
  is_header: boolean;
  level: number;
  parent_id?: number | null;
  total_debit: number;
  total_credit: number;
  ending_balance: number;
  entry_count: number;
}

export interface LedgerTrialBalanceDTO {
  items: LedgerAccountRowDTO[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export interface LedgerMutationItemDTO {
  journal_id: number;
  entry_number: string;
  date: string;
  description: string;
  source_type: string;
  source_id?: string | null;
  contra_account: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface LedgerMutationsDTO {
  account: LedgerAccountRowDTO;
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
  mutations: LedgerMutationItemDTO[];
}

export interface GetJournalsParams {
  page?: number;
  per_page?: number;
  search?: string;
  account_id?: number;
  source_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface GetLedgerParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}

export interface GetLedgerMutationsParams {
  start_date?: string;
  end_date?: string;
}

export function mapJournalLineDTO(dto: JournalEntryLineDTO): JournalEntryLine {
  return {
    id: String(dto.id),
    accountId: String(dto.account_id),
    accountCode: dto.account_code,
    accountName: dto.account_name,
    debit: dto.debit,
    credit: dto.credit,
    description: dto.description || undefined,
  };
}

export function mapJournalEntryDTOToJournalEntry(
  dto: JournalEntryDTO
): JournalEntry {
  return {
    id: String(dto.id),
    entryNumber: dto.entry_number,
    date: dto.date,
    description: dto.description,
    sourceType: (dto.source_type || "MANUAL") as JournalSourceType,
    sourceId: dto.source_id || undefined,
    status: (dto.status || "POSTED") as JournalEntryStatus,
    voidReason: dto.void_reason || undefined,
    totalDebit: dto.total_debit,
    totalCredit: dto.total_credit,
    lines: Array.isArray(dto.lines) ? dto.lines.map(mapJournalLineDTO) : [],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdById: dto.created_by_id,
    createdBy: dto.created_by,
    createdByUser: dto.created_by_user,
  };
}

export function mapLedgerAccountRowDTO(
  dto: LedgerAccountRowDTO
): LedgerAccountRow {
  return {
    id: String(dto.account_id),
    accountId: String(dto.account_id),
    code: dto.code,
    name: dto.name,
    type: dto.type,
    normalBalance: dto.normal_balance,
    isHeader: dto.is_header,
    level: dto.level,
    parentId: dto.parent_id ? String(dto.parent_id) : undefined,
    totalDebit: dto.total_debit,
    totalCredit: dto.total_credit,
    endingBalance: dto.ending_balance,
    entryCount: dto.entry_count,
  };
}

export function mapLedgerTrialBalanceDTO(
  dto: LedgerTrialBalanceDTO
): LedgerTrialBalance {
  return {
    items: Array.isArray(dto.items) ? dto.items.map(mapLedgerAccountRowDTO) : [],
    totalDebit: dto.total_debit,
    totalCredit: dto.total_credit,
    isBalanced: dto.is_balanced,
  };
}

export function mapLedgerMutationItemDTO(
  dto: LedgerMutationItemDTO,
  idx: number
): LedgerMutationItem {
  return {
    id: `${dto.journal_id}-${idx}`,
    journalId: String(dto.journal_id),
    entryNumber: dto.entry_number,
    date: dto.date,
    description: dto.description,
    sourceType: (dto.source_type || "MANUAL") as JournalSourceType,
    sourceId: dto.source_id || undefined,
    contraAccount: dto.contra_account || "-",
    debit: dto.debit,
    credit: dto.credit,
    runningBalance: dto.running_balance,
  };
}

export function mapLedgerMutationsDTO(
  dto: LedgerMutationsDTO
): LedgerMutations {
  return {
    account: mapLedgerAccountRowDTO(dto.account),
    openingBalance: dto.opening_balance,
    closingBalance: dto.closing_balance,
    totalDebit: dto.total_debit,
    totalCredit: dto.total_credit,
    mutations: Array.isArray(dto.mutations)
      ? dto.mutations.map(mapLedgerMutationItemDTO)
      : [],
  };
}

export const journalService = {
  async getJournals(
    params?: GetJournalsParams
  ): Promise<ApiResponse<JournalEntryDTO[]>> {
    const response = await httpGet<JournalEntryDTO[]>(
      endpointUrl("finance/journals"),
      true,
      params
    );
    return response.data;
  },

  async getJournalById(
    id: number | string
  ): Promise<ApiResponse<JournalEntryDTO>> {
    const response = await httpGet<JournalEntryDTO>(
      endpointUrl(`finance/journals/${id}`),
      true
    );
    return response.data;
  },

  async getLedger(
    params?: GetLedgerParams
  ): Promise<ApiResponse<LedgerTrialBalanceDTO>> {
    const response = await httpGet<LedgerTrialBalanceDTO>(
      endpointUrl("finance/ledger"),
      true,
      params
    );
    return response.data;
  },

  async getLedgerMutations(
    accountId: number | string,
    params?: GetLedgerMutationsParams
  ): Promise<ApiResponse<LedgerMutationsDTO>> {
    const response = await httpGet<LedgerMutationsDTO>(
      endpointUrl(`finance/ledger/${accountId}/mutations`),
      true,
      params
    );
    return response.data;
  },

  async createManualJournal(
    payload: CreateManualJournalPayload
  ): Promise<ApiResponse<JournalEntryDTO>> {
    const response = await httpPost<JournalEntryDTO>(
      endpointUrl("finance/journals"),
      payload,
      true
    );
    return response.data;
  },

  async getClosingPreview(
    closingDate?: string
  ): Promise<ApiResponse<ClosingPreviewDTO>> {
    const response = await httpGet<ClosingPreviewDTO>(
      endpointUrl("finance/closing/preview"),
      true,
      closingDate ? { closing_date: closingDate } : undefined
    );
    return response.data;
  },

  async getClosingPeriods(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<ClosingPeriodDTO[]>> {
    const response = await httpGet<ClosingPeriodDTO[]>(
      endpointUrl("finance/closing-periods"),
      true,
      params
    );
    return response.data;
  },

  async executeClosing(
    payload: ExecuteClosingPayload
  ): Promise<ApiResponse<ClosingPeriodDTO>> {
    const response = await httpPost<ClosingPeriodDTO>(
      endpointUrl("finance/closing"),
      payload,
      true
    );
    return response.data;
  },
};

export interface CreateManualJournalLinePayload {
  account_id: number;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateManualJournalPayload {
  date: string;
  description: string;
  lines: CreateManualJournalLinePayload[];
}

export interface ClosingAccountPreviewDTO {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  debit: number;
  credit: number;
  closing_amount: number;
}

export interface ClosingPreviewDTO {
  closing_date: string;
  last_closing_date?: string | null;
  retained_earnings_balance: number;
  total_revenue: number;
  total_cogs: number;
  total_expense: number;
  net_income: number;
  can_close: boolean;
  reason?: string;
  accounts: ClosingAccountPreviewDTO[];
}

export interface ExecuteClosingPayload {
  closing_date: string;
  notes?: string;
}

export interface ClosingPeriodDTO extends ApiAuditFields {
  id: number;
  company_id: number;
  closing_date: string;
  period_label: string;
  journal_entry_id: number;
  entry_number: string;
  total_revenue: number;
  total_cogs: number;
  total_expense: number;
  net_income: number;
  notes?: string;
  created_at?: string;
}

export function mapClosingPreviewDTO(dto: ClosingPreviewDTO): ClosingPreview {
  return {
    closingDate: dto.closing_date,
    lastClosingDate: dto.last_closing_date ?? null,
    retainedEarningsBalance: dto.retained_earnings_balance,
    totalRevenue: dto.total_revenue,
    totalCOGS: dto.total_cogs,
    totalExpense: dto.total_expense,
    netIncome: dto.net_income,
    canClose: dto.can_close,
    reason: dto.reason,
    accounts: Array.isArray(dto.accounts)
      ? dto.accounts.map((a) => ({
          accountId: a.account_id,
          accountCode: a.account_code,
          accountName: a.account_name,
          accountType: a.account_type,
          normalBalance: a.normal_balance,
          debit: a.debit,
          credit: a.credit,
          closingAmount: a.closing_amount,
        }))
      : [],
  };
}

export function mapClosingPeriodDTO(dto: ClosingPeriodDTO): ClosingPeriodRecord {
  return {
    id: dto.id,
    companyId: dto.company_id,
    closingDate: dto.closing_date,
    periodLabel: dto.period_label,
    journalEntryId: dto.journal_entry_id,
    entryNumber: dto.entry_number,
    totalRevenue: dto.total_revenue,
    totalCOGS: dto.total_cogs,
    totalExpense: dto.total_expense,
    netIncome: dto.net_income,
    notes: dto.notes,
    createdAt: dto.created_at,
    createdById: dto.created_by_id,
    createdBy: dto.created_by,
    createdByUser: dto.created_by_user,
  };
}
