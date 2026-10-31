import {
  endpointUrl,
  httpGet,
  httpPost,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface DriverItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  is_ready: boolean;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverOption {
  id: number;
  user_id: number;
  name: string;
  phone?: string;
  is_ready: boolean;
}

export interface AssignDriverPayload {
  user_id: number;
}

export interface GetDriversParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const driverService = {
  async getDrivers(params?: GetDriversParams): Promise<ApiResponse<DriverItem[]>> {
    const response = await httpGet<DriverItem[]>(
      endpointUrl("delivery/drivers"),
      true,
      params
    );
    return response.data;
  },

  async getDriverOptions(onlyReady?: boolean): Promise<ApiResponse<DriverOption[]>> {
    const params: Record<string, any> = { role: "DELIVERY" };
    if (onlyReady) params.is_ready = true;
    const response = await httpGet<any[]>(
      endpointUrl("users/options"),
      true,
      params
    );
    const mapped: DriverOption[] = (response.data?.data || []).map((u: any) => ({
      id: u.id,
      name: u.full_name || u.email,
      phone: u.phone,
      is_ready: u.is_ready,
      user_id: u.id,
    }));
    return {
      ...response.data,
      data: mapped,
    };
  },

  async getDriverById(id: number): Promise<ApiResponse<DriverItem>> {
    const response = await httpGet<DriverItem>(
      endpointUrl(`delivery/drivers/${id}`),
      true
    );
    return response.data;
  },

  async assignDriver(payload: AssignDriverPayload): Promise<ApiResponse<DriverItem>> {
    const response = await httpPost<DriverItem>(
      endpointUrl("delivery/drivers"),
      payload,
      true
    );
    return response.data;
  },

  async deleteDriver(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`delivery/drivers/${id}`),
      true
    );
    return response.data;
  },
};
