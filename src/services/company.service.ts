import { endpointUrl, httpGet, httpPut, ApiResponse } from "@/helpers/axios";

export interface CompanyDetail {
  id: number;
  code: string;
  name: string;
  tax_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency_code: string;
  is_active: boolean;
}

export interface UpdateCompanyPayload {
  name?: string;
  tax_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency_code?: string;
  is_active?: boolean;
}

export const companyService = {
  async getCurrentCompany(): Promise<ApiResponse<CompanyDetail>> {
    const response = await httpGet<CompanyDetail>(endpointUrl("companies/current"), true);
    return response.data;
  },

  async updateCurrentCompany(payload: UpdateCompanyPayload): Promise<ApiResponse<CompanyDetail>> {
    const response = await httpPut<CompanyDetail>(endpointUrl("companies/current"), payload, true);
    return response.data;
  },

  async updateCompany(id: number, payload: UpdateCompanyPayload): Promise<ApiResponse<CompanyDetail>> {
    const response = await httpPut<CompanyDetail>(endpointUrl(`companies/${id}`), payload, true);
    return response.data;
  },
};
