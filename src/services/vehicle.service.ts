import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface Vehicle {
  id: number;
  company_id: number;
  name: string;
  plate_number: string;
  can_delete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleOption {
  id: number;
  name: string;
  plate_number: string;
}

export interface CreateVehiclePayload {
  name: string;
  plate_number: string;
}

export interface UpdateVehiclePayload {
  name: string;
  plate_number: string;
}

export interface GetVehiclesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const vehicleService = {
  async getVehicles(params?: GetVehiclesParams): Promise<ApiResponse<Vehicle[]>> {
    const response = await httpGet<Vehicle[]>(
      endpointUrl("delivery/vehicles"),
      true,
      params
    );
    return response.data;
  },

  async getVehicleOptions(): Promise<ApiResponse<VehicleOption[]>> {
    const response = await httpGet<VehicleOption[]>(
      endpointUrl("delivery/vehicles/options"),
      true
    );
    return response.data;
  },

  async getVehicleById(id: number): Promise<ApiResponse<Vehicle>> {
    const response = await httpGet<Vehicle>(
      endpointUrl(`delivery/vehicles/${id}`),
      true
    );
    return response.data;
  },

  async createVehicle(payload: CreateVehiclePayload): Promise<ApiResponse<Vehicle>> {
    const response = await httpPost<Vehicle>(
      endpointUrl("delivery/vehicles"),
      payload,
      true
    );
    return response.data;
  },

  async updateVehicle(
    id: number,
    payload: UpdateVehiclePayload
  ): Promise<ApiResponse<Vehicle>> {
    const response = await httpPut<Vehicle>(
      endpointUrl(`delivery/vehicles/${id}`),
      payload,
      true
    );
    return response.data;
  },

  async deleteVehicle(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`delivery/vehicles/${id}`),
      true
    );
    return response.data;
  },
};
