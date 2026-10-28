import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";
import { RoleSummary } from "./role.service";

export interface PermissionOverride {
  permission_id: number;
  is_granted: boolean;
}

export interface UserDetail {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  is_superadmin: boolean;
  is_active: boolean;
  is_ready: boolean;
  roles: RoleSummary[];
  overrides: PermissionOverride[];
}

export interface UserOption {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  is_ready: boolean;
}

export interface CreateUserPayload {
  email: string;
  password?: string | null;
  full_name: string;
  phone?: string;
  role_ids?: number[];
}

export interface UpdateUserPayload {
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  is_ready?: boolean;
}

export interface AssignRolesPayload {
  role_ids: number[];
  overrides?: PermissionOverride[];
}

export interface GetUsersParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const userService = {
  async getUsers(params?: GetUsersParams): Promise<ApiResponse<UserDetail[]>> {
    const response = await httpGet<UserDetail[]>(endpointUrl("users"), true, params);
    return response.data;
  },

  async getUserOptions(params?: { is_ready?: boolean }): Promise<ApiResponse<UserOption[]>> {
    const response = await httpGet<UserOption[]>(endpointUrl("users/options"), true, params);
    return response.data;
  },

  async getUserById(id: number): Promise<ApiResponse<UserDetail>> {
    const response = await httpGet<UserDetail>(endpointUrl(`users/${id}`), true);
    return response.data;
  },

  async createUser(payload: CreateUserPayload): Promise<ApiResponse<{ id: number; email: string; full_name: string }>> {
    const response = await httpPost<{ id: number; email: string; full_name: string }>(
      endpointUrl("users"),
      payload,
      true
    );
    return response.data;
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<ApiResponse<UserDetail>> {
    const response = await httpPut<UserDetail>(endpointUrl(`users/${id}`), payload, true);
    return response.data;
  },

  async deleteUser(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(endpointUrl(`users/${id}`), true);
    return response.data;
  },

  async assignRoles(id: number, payload: AssignRolesPayload): Promise<ApiResponse<null>> {
    const response = await httpPost<null>(endpointUrl(`users/${id}/roles`), payload, true);
    return response.data;
  },
};
