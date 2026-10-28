import { endpointUrl, httpGet, httpPost, ApiResponse } from "@/helpers/axios";
import { deleteCookie } from "cookies-next";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserSummary {
  id: number;
  email: string;
  full_name: string;
  is_superadmin: boolean;
  must_change_password: boolean;
  roles: string[];
  permissions: string[];
  phone?: string;
}

export interface CompanySummary {
  id: number;
  code: string;
  name: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
  user: UserSummary;
  company: CompanySummary;
  companies?: CompanySummary[];
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResult>> {
    const response = await httpPost<LoginResult>(endpointUrl("auth/login"), payload, false);
    return response.data;
  },

  async getProfile(): Promise<ApiResponse<UserSummary>> {
    const response = await httpGet<UserSummary>(endpointUrl("auth/me"), true);
    return response.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<ApiResponse<null>> {
    const response = await httpPost<null>(endpointUrl("auth/change-password"), payload, true);
    return response.data;
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("company");
      localStorage.removeItem("mustChangePassword");

      deleteCookie("token", { path: "/" });
      deleteCookie("cookieKey", { path: "/" });
      deleteCookie("user", { path: "/" });
      deleteCookie("role", { path: "/" });
      deleteCookie("activeCompanyId", { path: "/" });
      deleteCookie("mustChangePassword", { path: "/" });
      deleteCookie("permissions", { path: "/" });

      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "cookieKey=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "activeCompanyId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "mustChangePassword=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "permissions=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      window.location.href = "/login";
    }
  },
};
