import {
  endpointUrl,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  ApiResponse,
} from "@/helpers/axios";

export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

export interface District {
  id: string;
  regency_id: string;
  name: string;
}

export interface DistrictRateInput {
  district_id: string;
  rate: number;
}

export interface SaveAreaShippingRatePayload {
  province_id: string;
  regency_id: string;
  is_flat_city_rate: boolean;
  flat_rate: number;
  district_rates: DistrictRateInput[];
}

export interface DistrictRateResponse {
  district_id: string;
  district_name: string;
  rate: number;
}

export interface ConfiguredArea {
  regency_id: string;
  regency_name: string;
  province_id: string;
  province_name: string;
  is_flat_city_rate: boolean;
  flat_rate: number;
  configured_district_count: number;
  total_districts_in_regency: number;
  district_rates?: DistrictRateResponse[];
}

export interface ShippingRatesOverview {
  is_shipping_rate_enabled: boolean;
  configured_areas: ConfiguredArea[];
}

export interface CalculateShippingRatePayload {
  regency_id: string;
  district_id?: string;
}

export interface CalculateShippingRateResponse {
  is_shipping_rate_enabled: boolean;
  rate: number;
  is_flat_city_rate: boolean;
  applied_level: string;
}

export const shippingRateService = {
  async getOverview(): Promise<ApiResponse<ShippingRatesOverview>> {
    const response = await httpGet<ShippingRatesOverview>(
      endpointUrl("delivery/shipping-rates"),
      true
    );
    return response.data;
  },

  async toggleShippingRate(isEnabled: boolean): Promise<ApiResponse<{ is_shipping_rate_enabled: boolean }>> {
    const response = await httpPut<{ is_shipping_rate_enabled: boolean }>(
      endpointUrl("delivery/shipping-rates/toggle"),
      { is_enabled: isEnabled },
      true
    );
    return response.data;
  },

  async getByRegency(regencyId: string): Promise<ApiResponse<ConfiguredArea>> {
    const response = await httpGet<ConfiguredArea>(
      endpointUrl(`delivery/shipping-rates/regencies/${regencyId}`),
      true
    );
    return response.data;
  },

  async saveArea(payload: SaveAreaShippingRatePayload): Promise<ApiResponse<any>> {
    const response = await httpPost<any>(
      endpointUrl("delivery/shipping-rates"),
      payload,
      true
    );
    return response.data;
  },

  async deleteByRegency(regencyId: string): Promise<ApiResponse<null>> {
    const response = await httpDelete<null>(
      endpointUrl(`delivery/shipping-rates/regencies/${regencyId}`),
      true
    );
    return response.data;
  },

  async calculate(payload: CalculateShippingRatePayload): Promise<ApiResponse<CalculateShippingRateResponse>> {
    const response = await httpPost<CalculateShippingRateResponse>(
      endpointUrl("delivery/shipping-rates/calculate"),
      payload,
      true
    );
    return response.data;
  },

  async getProvinces(): Promise<ApiResponse<Province[]>> {
    const response = await httpGet<Province[]>(
      endpointUrl("delivery/regions/provinces"),
      true
    );
    return response.data;
  },

  async getRegencies(provinceId: string): Promise<ApiResponse<Regency[]>> {
    const response = await httpGet<Regency[]>(
      endpointUrl("delivery/regions/regencies"),
      true,
      { province_id: provinceId }
    );
    return response.data;
  },

  async getDistricts(regencyId: string): Promise<ApiResponse<District[]>> {
    const response = await httpGet<District[]>(
      endpointUrl("delivery/regions/districts"),
      true,
      { regency_id: regencyId }
    );
    return response.data;
  },
};
