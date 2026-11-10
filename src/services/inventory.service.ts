import { ApiResponse } from "@/helpers/axios";
import {
  returnedGoodService,
  ReturnedGoodResponse,
  ReturnedGoodCountsResponse,
  GetReturnedGoodsParams,
  ProcessReturnedGoodActionPayload,
  mapReturnedGoodResponseToReturnedGood,
} from "./returned-good.service";
import {
  finishedGoodService,
  AllocateFinishedGoodPayload,
  AllocateFinishedGoodResponse,
  FinishedGoodItem,
  GetFinishedGoodsParams,
} from "./finished-good.service";
import {
  materialService,
  MaterialItem,
  GetMaterialsParams,
} from "./material.service";

export { mapReturnedGoodResponseToReturnedGood };

export const inventoryService = {
  getReturnedGoods(
    params?: GetReturnedGoodsParams
  ): Promise<ApiResponse<ReturnedGoodResponse[]>> {
    return returnedGoodService.getReturnedGoods(params);
  },

  getReturnedGoodCounts(): Promise<ApiResponse<ReturnedGoodCountsResponse>> {
    return returnedGoodService.getReturnedGoodCounts();
  },

  getReturnedGoodById(
    id: number | string
  ): Promise<ApiResponse<ReturnedGoodResponse>> {
    return returnedGoodService.getReturnedGoodById(id);
  },

  receiveReturnedGood(
    id: number | string
  ): Promise<ApiResponse<ReturnedGoodResponse>> {
    return returnedGoodService.receiveReturnedGood(id);
  },

  processReturnedGoodAction(
    id: number | string,
    payload: ProcessReturnedGoodActionPayload
  ): Promise<ApiResponse<ReturnedGoodResponse>> {
    return returnedGoodService.processReturnedGoodAction(id, payload);
  },

  getFinishedGoods(
    params?: GetFinishedGoodsParams
  ): Promise<ApiResponse<FinishedGoodItem[]>> {
    return finishedGoodService.getFinishedGoods(params);
  },

  allocateFinishedGood(
    payload: AllocateFinishedGoodPayload
  ): Promise<ApiResponse<AllocateFinishedGoodResponse>> {
    return finishedGoodService.allocateFinishedGood(payload);
  },

  getMaterials(
    params?: GetMaterialsParams & { limit?: number }
  ): Promise<ApiResponse<MaterialItem[]>> {
    const normalizedParams: GetMaterialsParams | undefined = params
      ? {
          ...params,
          per_page: params.per_page ?? params.limit,
        }
      : undefined;
    return materialService.getMaterials(normalizedParams);
  },
};
