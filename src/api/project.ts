import { http } from "@/utils/http";

// 类型定义（从typings.d.ts中提取常用类型）
export interface ProjectVO {
  projectId?: string;
  projectName?: string;
  description?: string;
  computeMode?: string;
  computeFunc?: string;
  gmtCreate?: string;
  nodes?: Array<{
    nodeId?: string;
    nodeName?: string;
  }>;
  partyVoteInfos?: Array<{
    action?: string;
  }>;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  computeMode?: string;
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

export interface UpdateProjectRequest {
  projectId: string;
  name: string;
  description?: string;
}

export interface GetProjectRequest {
  projectId: string;
}

export interface ListProjectJobRequest {
  projectId: string;
  pageNum?: number;
  pageSize?: number;
}

// API函数
/** 获取项目列表 */
export const listProject = () => {
  return http.post<ProjectVO[], never>("/api/v1alpha1/project/list");
};

/** 获取项目详情 */
export const getProject = (body: GetProjectRequest) => {
  return http.post<ProjectVO, GetProjectRequest>("/api/v1alpha1/project/get", {
    data: body
  });
};

/** 创建项目 */
export const createProject = (body: CreateProjectRequest) => {
  return http.post<ProjectVO, CreateProjectRequest>(
    "/api/v1alpha1/project/create",
    { data: body }
  );
};

/** 更新项目 */
export const updateProject = (body: UpdateProjectRequest) => {
  return http.post<void, UpdateProjectRequest>("/api/v1alpha1/project/update", {
    data: body
  });
};

/** 删除项目 */
export const deleteProject = (body: GetProjectRequest) => {
  return http.post<void, GetProjectRequest>("/api/v1alpha1/project/delete", {
    data: body
  });
};

/** 获取项目任务列表 */
export const listJob = (body: ListProjectJobRequest) => {
  return http.post<any, ListProjectJobRequest>(
    "/api/v1alpha1/project/job/list",
    { data: body }
  );
};
