import { http } from "@/utils/http";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 服务类型 */
export type DataServiceType =
  | "COMPUTE"
  | "INTELLIGENCE"
  | "DATA_MARKET"
  | "DATA_GOVERNANCE"
  | "PRIVACY_COMPUTE_PUBLIC"
  | "OTHER";

/** 操作类型 */
export type DataServiceOperationType =
  | "TEE_CREATE_TASK"
  | "TEE_START_TASK"
  | "TEE_EXECUTE_TASK"
  | "TEE_CANCEL_TASK";

/** 服务状态 */
export type DataServiceStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DEPRECATED";

/** 数据服务实体 */
export interface DataServiceResponse {
  id: number;
  serviceName: string;
  serviceDescription: string;
  serviceType: DataServiceType;
  operationType?: DataServiceOperationType;
  inputDataSpec: string;
  outputDataSpec: string;
  serviceEndpoint: string;
  status: DataServiceStatus;
  metaData: string;
  createdAt: string;
  updatedAt: string;
}

/** 分页列表响应 */
export interface DataServicePageResult {
  content: DataServiceResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/** 列表查询参数 */
export interface DataServiceListQuery {
  serviceName?: string;
  serviceType?: string;
  status?: string;
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// API 函数
// ---------------------------------------------------------------------------

/** 获取数据服务分页列表 */
export const getDataServiceList = (params?: DataServiceListQuery) => {
  return http.request<{
    code: number;
    message: string;
    data: DataServicePageResult;
  }>("get", "/api/data-services", { params });
};

/** 获取数据服务详情 */
export const getDataServiceDetail = (id: number) => {
  return http.request<{
    code: number;
    message: string;
    data: DataServiceResponse;
  }>("get", `/api/data-services/${id}`);
};

/** 前缀搜索数据服务 */
export const searchDataService = (keyword: string) => {
  return http.request<{
    code: number;
    message: string;
    data: DataServiceResponse[];
  }>("get", "/api/data-services/search/prefix", { params: { keyword } });
};
