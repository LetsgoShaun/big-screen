import ApiService from "@/core/services/ApiService.ts";
import type { 
  StationQueryObj, 
  StationDto, 
  Pageable, 
  Page, 
  Msg,
  StationStatDto 
} from "@/types/station.ts";
import type { AxiosResponse } from "axios";

/**
 * 获取电站列表
 * @param queryObj 查询参数
 * @param pageable 分页参数
 * @returns Promise<Page<StationDto>>
 */
export const getStationList = async (
  queryObj?: StationQueryObj,
  pageable?: Pageable
): Promise<Page<StationDto>> => {
  try {
    const params: any = {
      params: {
        ...queryObj,
        page: pageable?.page || 0,
        size: pageable?.size || 10,
        sort: pageable?.sort,
      },
    };

    const response: AxiosResponse<Msg<Page<StationDto>>> = await ApiService.get(
      "/stations",
      params
    );

    return response.data.data;
  } catch (error) {
    console.error("获取电站列表失败:", error);
    throw error;
  }
};

/**
 * 获取国家列表
 * @returns Promise<string[]>
 */
export const getCountries = async (): Promise<string[]> => {
  try {
    const response: AxiosResponse<Msg<string[]>> = await ApiService.get(
      "/index/countries"
    );
    return response.data.data;
  } catch (error) {
    console.error("获取国家列表失败:", error);
    throw error;
  }
};

/**
 * 获取省份列表
 * @returns Promise<string[]>
 */
export const getProvinces = async (): Promise<string[]> => {
  try {
    const response: AxiosResponse<Msg<string[]>> = await ApiService.get(
      "/index/getProvinces"
    );
    return response.data.data;
  } catch (error) {
    console.error("获取省份列表失败:", error);
    throw error;
  }
};

/**
 * 获取电站统计数据
 * @param queryObj 查询参数
 * @returns Promise<StationStatDto>
 */
export const getStationStat = async (
  queryObj?: StationQueryObj
): Promise<StationStatDto> => {
  try {
    const params: any = {
      params: {
        ...queryObj,
      },
    };

    const response: AxiosResponse<Msg<StationStatDto>> = await ApiService.get(
      "/index/stationStat",
      params
    );

    return response.data.data;
  } catch (error) {
    console.error("获取电站统计数据失败:", error);
    throw error;
  }
};

