import { http } from "@/utils/http";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 资源存储类型 */
export type DataSourceType =
  | "DATABASE"
  | "OSS"
  | "LFS"
  | "DFS"
  | "BLOCKCHAIN"
  | "MINIO"
  | "API";

/** 访问策略 */
export type AccessStrategyType =
  | "PUBLIC"
  | "APPLICATION_REQUIRED"
  | "ROLE_BASED"
  | "HYBRID";

/** 发布状态 */
export type PublishStatusType = "DRAFT" | "PUBLISHED" | "OFFLINE";

/** 资源元数据 */
export interface MetaData {
  classification: string;
  applicableScenarios: string[];
  technicalSpec: string;
}

/** 数据资源实体 */
export interface DataSourceResponse {
  id: number;
  name: string;
  description: string;
  type: DataSourceType;
  accessStrategy: AccessStrategyType;
  publishStatus: PublishStatusType;
  accessInfo: string;
  metaData: MetaData;
  createdAt: string;
  updatedAt: string;
  publishAt?: string;
  providerId: number;
  providerName: string;
}

/** 分页列表响应 */
export interface DataSourcePageResult {
  content: DataSourceResponse[];
  totalElements: number;
  pageNumber: number;
  pageSize: number;
}

/** 资源类型选项 */
export interface DataSourceTypeOption {
  value: string;
  label: string;
}

/** 列表查询参数 */
export interface DataSourceListQuery {
  name?: string;
  type?: string;
  status?: string;
  strategy?: string;
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// API 函数
// ---------------------------------------------------------------------------

/** 获取数据资源分页列表 */
export const getDataResourceList = (params?: DataSourceListQuery) => {
  return http.request<{
    code: number;
    message: string;
    data: DataSourcePageResult;
  }>("get", "/api/data-resource/list", { params });
};

/** 获取数据资源详情 */
export const getDataResourceDetail = (id: number) => {
  return http.request<{
    code: number;
    message: string;
    data: DataSourceResponse;
  }>("get", `/api/data-resource/${id}`);
};

/** 前缀搜索数据资源 */
export const searchDataResource = (keyword: string) => {
  return http.request<{
    code: number;
    message: string;
    data: DataSourceResponse[];
  }>("get", "/api/data-resource/search/prefix", { params: { keyword } });
};

/** 获取所有资源类型 */
export const getDataResourceTypes = () => {
  return http.request<{
    code: number;
    message: string;
    data: DataSourceTypeOption[];
  }>("get", "/api/data-resource/types");
};
