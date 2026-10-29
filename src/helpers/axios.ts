import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { deleteCookie, getCookie } from "cookies-next";
import { toast } from "sonner";

axios.defaults.withCredentials = false;

const isServer = typeof window === "undefined";

const config = {
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
};

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
  meta?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    server_time: string;
  };
}

export function endpointUrl(url = ""): string {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL || "/api/v1";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return `${cleanBase}${url.toString().replace(/^\//g, "")}`;
}

export function endpointUrlv2(url = ""): string {
  const base = process.env.NEXT_PUBLIC_API_URL_DEV || process.env.BASE_URL_DEV || "/api/v1";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return `${cleanBase}${url.toString().replace(/^\//g, "")}`;
}

export function endpointUrlv2Cetak(url = "", appendToken = false): string {
  const base = process.env.NEXT_PUBLIC_API_URL_V2 || process.env.BASE_URL_V2 || "/api/v1";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  let fullUrl = `${cleanBase}${url.toString().replace(/^\//g, "")}`;
  if (appendToken && typeof window !== "undefined") {
    const token = localStorage.getItem("token") || getCookie("token") || "";
    fullUrl += `${url.includes("?") ? "&" : "?"}token=${token}`;
  }
  return fullUrl;
}

const axiosInstance = axios.create(config);

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || (getCookie("token") as string) || (getCookie("cookieKey") as string) || null;
}

function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  const fromCookie = getCookie("activeCompanyId") as string;
  if (fromCookie) return fromCookie;
  try {
    const raw = localStorage.getItem("company");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {}
  return null;
}

function getAuthHeaders(withAuth: boolean, customHeaders: Record<string, any> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...config.headers,
    ...customHeaders,
  };
  if (customHeaders && "Content-Type" in customHeaders && (customHeaders["Content-Type"] === null || customHeaders["Content-Type"] === undefined)) {
    delete headers["Content-Type"];
  }
  if (withAuth) {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const companyId = getStoredCompanyId();
    if (companyId) {
      headers["x-company-id"] = companyId;
    }
  }
  return headers;
}

axiosInstance.interceptors.request.use((reqConfig) => {
  if (typeof FormData !== "undefined" && reqConfig.data instanceof FormData) {
    if (!reqConfig.headers["Content-Type"] || reqConfig.headers["Content-Type"] === "application/json") {
      reqConfig.headers["Content-Type"] = "multipart/form-data";
    }
  }
  return reqConfig;
});

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const isTokenExpired = error?.response?.status === 401;
    const isAuthRequest =
      error?.config?.url?.includes("auth/login") ||
      error?.config?.url?.includes("auth/change-password");

    if (isTokenExpired && !isAuthRequest) {
      if (typeof window !== "undefined") {
        toast.error("Sesi telah berakhir. Silakan login kembali.");
        localStorage.clear();
        deleteCookie("cookieKey", { path: "/" });
        deleteCookie("token", { path: "/" });
        deleteCookie("user", { path: "/" });
        deleteCookie("role", { path: "/" });
        deleteCookie("activeCompanyId", { path: "/" });
        deleteCookie("mustChangePassword", { path: "/" });
        document.cookie = "cookieKey=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "activeCompanyId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "mustChangePassword=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (error.response && [301, 302].includes(error.response.status)) {
      const redirectUrl = error.response.headers.location;
      if (redirectUrl) {
        return axiosInstance.get(redirectUrl);
      }
    }

    return Promise.reject(error);
  }
);

function httpGet<T = any>(
  url: string,
  withAuth = false,
  params = {},
  configs: Record<string, any> = {}
): Promise<AxiosResponse<ApiResponse<T>>> {
  return axiosInstance.get(url, {
    ...config,
    ...configs,
    params,
    headers: getAuthHeaders(withAuth, configs.headers),
  });
}

function httpGetV2<T = any>(
  url: string,
  withAuth = false,
  params: { [key: string]: any } = {},
  configs: { [key: string]: any } = {}
): Promise<AxiosResponse<T, any>> {
  return axiosInstance.get<T>(url, {
    ...config,
    ...configs,
    params,
    headers: getAuthHeaders(withAuth, configs.headers),
  });
}

const httpPost = <T = any>(
  url: string,
  data: any,
  withAuth = false,
  configs: Record<string, any> = {}
): Promise<AxiosResponse<ApiResponse<T>>> => {
  return axiosInstance.post(url, data, {
    ...config,
    ...configs,
    headers: getAuthHeaders(withAuth, configs.headers),
  });
};

const httpPut = <T = any>(
  url: string,
  data: any,
  withAuth = false,
  configs: Record<string, any> = {}
): Promise<AxiosResponse<ApiResponse<T>>> => {
  return axiosInstance.put(url, data, {
    ...config,
    ...configs,
    headers: getAuthHeaders(withAuth, configs.headers),
  });
};

export const httpPutV2 = async <T = any>(url: string, withAuth = false, data = {}): Promise<AxiosResponse<T>> => {
  const headers = getAuthHeaders(withAuth);
  return axiosInstance.put(url, data, { headers });
};

const httpPatch = <T = any>(
  url: string,
  data: any,
  withAuth = false,
  configs: Record<string, any> = {}
): Promise<AxiosResponse<ApiResponse<T>>> => {
  return axiosInstance.patch(url, data, {
    ...config,
    ...configs,
    headers: getAuthHeaders(withAuth, configs.headers),
  });
};

function httpDelete<T = any>(
  url: string,
  withAuth = false,
  params = {},
  configs: Record<string, any> = {}
): Promise<AxiosResponse<ApiResponse<T>>> {
  return axiosInstance.delete(url, {
    ...config,
    ...configs,
    params,
    headers: getAuthHeaders(withAuth, configs.headers),
  });
}

export default axiosInstance;
export {
  httpGet,
  httpGetV2,
  httpPut,
  httpPatch,
  httpPost,
  httpDelete,
};
