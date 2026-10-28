import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface PermissionItem {
  id: number;
  code: string;
  module: string;
  description: string;
}

export interface RoleSummary {
  id: number;
  code: string;
  name: string;
}

export interface RoleDetail {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: PermissionItem[];
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string;
  permission_ids?: number[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

export interface GetRolesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const roleService = {
  async getRoles(params?: GetRolesParams): Promise<ApiResponse<RoleDetail[]>> {
    const response = await httpGet<RoleDetail[]>(endpointUrl("roles"), true, params);
    return response.data;
  },

  async getRoleOptions(): Promise<ApiResponse<RoleSummary[]>> {
    const response = await httpGet<RoleSummary[]>(endpointUrl("roles/options"), true);
    return response.data;
  },

  async getAllPermissions(): Promise<ApiResponse<PermissionItem[]>> {
    const response = await httpGet<PermissionItem[]>(endpointUrl("roles/permissions"), true);
    return response.data;
  },

  async getRoleById(id: number): Promise<ApiResponse<RoleDetail>> {
    const response = await httpGet<RoleDetail>(endpointUrl(`roles/${id}`), true);
    return response.data;
  },

  async createRole(payload: CreateRolePayload): Promise<ApiResponse<RoleDetail>> {
    const response = await httpPost<RoleDetail>(endpointUrl("roles"), payload, true);
    return response.data;
  },

  async updateRole(id: number, payload: UpdateRolePayload): Promise<ApiResponse<RoleDetail>> {
    const response = await httpPut<RoleDetail>(endpointUrl(`roles/${id}`), payload, true);
    return response.data;
  },

  async deleteRole(id: number): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(endpointUrl(`roles/${id}`), true);
    return response.data;
  },
};
