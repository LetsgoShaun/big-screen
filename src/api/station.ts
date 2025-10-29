import ApiService from "@/core/services/ApiService.ts";
import type { 
  StationQueryObj, 
  StationDto, 
  StationSaveCmd,
  StationUpdateCmd,
  Pageable, 
  Page, 
  Msg,
  StationStatDto,
  RobotStatDto,
  CountryDto,
  NationDto 
} from "@/types/station.ts";
import type { AxiosResponse } from "axios";

/**
 * 创建电站
 * @param stationData 电站数据
 * @returns Promise<Msg<any>>
 */
export const createStation = async (stationData: StationSaveCmd): Promise<Msg<any>> => {
  try {
    const response: AxiosResponse<Msg<any>> = await ApiService.post(
      "/stations",
      stationData
    );
    return response.data;
  } catch (error) {
    console.error("创建电站失败:", error);
    throw error;
  }
};

/**
 * 更新电站
 * @param id 电站ID
 * @param stationData 电站数据
 * @returns Promise<Msg<any>>
 */
export const updateStation = async (id: number, stationData: StationUpdateCmd): Promise<Msg<any>> => {
  try {
    const response: AxiosResponse<Msg<any>> = await ApiService.put(
      `/stations/${id}`,
      stationData
    );
    return response.data;
  } catch (error) {
    console.error("更新电站失败:", error);
    throw error;
  }
};

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
 * @returns Promise<CountryDto[]>
 */
export const getCountries = async (): Promise<CountryDto[]> => {
  try {
    const response: AxiosResponse<Msg<CountryDto[]>> = await ApiService.get(
      "/index/countries"
    );
    return response.data.data;
  } catch (error) {
    console.error("获取国家列表失败:", error);
    throw error;
  }
};

/**
 * 获取国家列表（用于表单）
 * @returns Promise<NationDto[]>
 */
export const getNations = async (): Promise<NationDto[]> => {
  try {
    const response: AxiosResponse<Msg<NationDto[]>> = await ApiService.get(
      "/nations"
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

/**
 * 获取机器人统计数据
 * @param stationId 电站ID
 * @returns Promise<RobotStatDto>
 */
export const getRobotStat = async (stationId: number): Promise<RobotStatDto> => {
  try {
    const response: AxiosResponse<Msg<RobotStatDto>> = await ApiService.get(
      `/index/${stationId}/robotStat`
    );

    return response.data.data;
  } catch (error) {
    console.error("获取机器人统计数据失败:", error);
    throw error;
  }
};

/**
 * 创建图片URL
 * @param fileName 文件名
 * @returns Promise<string>
 */
export const createUrl = async (fileName: string): Promise<string> => {
  try {
    const response: AxiosResponse<Msg<string>> = await ApiService.get(
      "/files/createUrl",
      {
        params: {
          fileName: fileName
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("创建图片URL失败:", error);
    throw error;
  }
};

