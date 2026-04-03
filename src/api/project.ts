import { http } from "@/utils/http";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 项目视图对象，对应后端返回的项目完整信息 */
export interface ProjectVO {
  /** 项目唯一标识 */
  projectId?: string;
  /** 项目名称 */
  projectName?: string;
  /** 项目描述 */
  description?: string;
  /** 计算模式：MPC（管道模式）或 TEE（枢纽模式） */
  computeMode?: string;
  /** 计算函数标识 */
  computeFunc?: string;
  /** 创建时间 */
  gmtCreate?: string;
  /** 参与计算的节点列表 */
  nodes?: Array<{
    nodeId?: string;
    nodeName?: string;
  }>;
  /** 各参与方的投票/审批信息 */
  partyVoteInfos?: Array<{
    action?: string;
  }>;
}

/** 创建项目的请求参数 */
export interface CreateProjectRequest {
  /** 项目名称（必填，1~32 个字符） */
  name: string;
  /** 项目描述 */
  description?: string;
  /** 计算模式：MPC 或 TEE */
  computeMode?: string;
  /** 计算函数标识 */
  computeFunc?: string;
  /**
   * 参与节点（前端用于项目数据集展示；后端如不支持可忽略）
   * - 这里用 {nodeId,nodeName} 与 ProjectVO.nodes 对齐
   */
  nodes?: Array<{
    nodeId?: string;
    nodeName?: string;
  }>;
}

/** 更新项目的请求参数（只能改名称和描述） */
export interface UpdateProjectRequest {
  /** 要更新的项目 ID */
  projectId: string;
  /** 新的项目名称 */
  name: string;
  /** 新的项目描述 */
  description?: string;
}

/** 按 ID 查询单个项目的请求参数 */
export interface GetProjectRequest {
  projectId: string;
}

/** 分页查询项目下任务列表的请求参数 */
export interface ListProjectJobRequest {
  /** 项目 ID */
  projectId: string;
  /** 页码（从 1 开始） */
  pageNum?: number;
  /** 每页条数 */
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// API 函数
// ---------------------------------------------------------------------------

/** 获取所有项目列表（不分页） */
export const listProject = () => {
  return http.post<ProjectVO[], never>("/api/v1alpha1/project/list");
};

/** 按 ID 获取单个项目详情 */
export const getProject = (body: GetProjectRequest) => {
  return http.post<ProjectVO, GetProjectRequest>("/api/v1alpha1/project/get", {
    data: body
  });
};

/** 创建新项目，返回创建后的项目对象 */
export const createProject = (body: CreateProjectRequest) => {
  return http.post<ProjectVO, CreateProjectRequest>(
    "/api/v1alpha1/project/create",
    { data: body }
  );
};

/** 更新已有项目的名称和描述 */
export const updateProject = (body: UpdateProjectRequest) => {
  return http.post<void, UpdateProjectRequest>("/api/v1alpha1/project/update", {
    data: body
  });
};

/** 按 ID 删除项目 */
export const deleteProject = (body: GetProjectRequest) => {
  return http.post<void, GetProjectRequest>("/api/v1alpha1/project/delete", {
    data: body
  });
};

/** 分页获取项目下的任务（Job）列表 */
export const listJob = (body: ListProjectJobRequest) => {
  return http.post<any, ListProjectJobRequest>(
    "/api/v1alpha1/project/job/list",
    { data: body }
  );
};
