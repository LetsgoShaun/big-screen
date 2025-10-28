/**
 * 机器人类型
 */
export type RobotType = 'ROBOT' | 'TRACKLESS' | 'AGV'

/**
 * 机器人类型常量
 */
export const RobotType = {
  ROBOT: 'ROBOT',
  TRACKLESS: 'TRACKLESS',
  AGV: 'AGV',
} as const

/**
 * 电站查询参数
 */
export interface StationQueryObj {
  robotType?: RobotType;
  country?: string;
  province?: string;
}

/**
 * 电站信息
 */
export interface StationDto {
  id: number;
  name: string;
  // 纬度
  lat: number;
  // 经度
  lon: number;
  robotNum: number;
  robotType: RobotType;
  // 电站描述
  description: string;
  // 电站容量
  capacity: number;
  // 国家
  country: string;
  // 省份
  province: string;
  // 业主
  owner: string;
  // epc
  epc: string;
  // 运维
  operation: string;
  // 电站图片
  image: string;
}

/**
 * 分页参数
 */
export interface Pageable {
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * 分页响应
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * 统一响应格式
 */
export interface Msg<T> {
  status: string;
  data: T;
  error?: string;
  message?: string;
}

/**
 * 电站统计查询参数
 */
export interface StationStatQueryObj {
  robotType?: RobotType;
  country?: string;
  province?: string;
  
  buildExample(): any;
}

/**
 * 电站统计数据
 */
export interface StationStatDto {
  // 电站数量
  stationNum: number;
  // 机器人数量
  robotNum: number;
  // 电站容量
  stationCapacity: number;
}

