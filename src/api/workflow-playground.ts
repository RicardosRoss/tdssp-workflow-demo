import { http } from "@/utils/http";

// ---------------------------------------------------------------------------
// 数据服务（组件库）相关类型
// ---------------------------------------------------------------------------

/** 数据服务条目，代表一个可拖入画布的服务组件 */
export type PlaygroundService = {
  /** 服务 ID */
  id: number;
  /** 服务名称 */
  name: string;
  /** 服务类型，如 COMPUTE、DATA_SOURCE 等 */
  serviceType: string;
  /** 服务摘要描述 */
  summary: string;
  /** 服务分类标签 */
  category: string;
};

/** 获取服务列表的响应结构 */
export type PlaygroundServiceResult = {
  code: number;
  message: string;
  data: PlaygroundService[];
};

// ---------------------------------------------------------------------------
// 工作流保存 / 恢复相关类型
// ---------------------------------------------------------------------------

/** 保存工作流时的请求体 */
export type PlaygroundSavePayload = {
  /** 工作流名称 */
  name: string;
  /** 流程图结构：节点、边和视口信息 */
  graph: {
    nodes: Array<any>;
    edges: Array<any>;
    viewport: Record<string, any>;
  };
};

/** 保存工作流的响应结构 */
export type PlaygroundSaveResult = {
  code: number;
  message: string;
  data: {
    id: number;
    name: string;
    savedAt: string;
    payload: PlaygroundSavePayload;
  };
};

// ---------------------------------------------------------------------------
// 节点执行相关类型
// ---------------------------------------------------------------------------

/** 执行单个工作流节点的请求体 */
export type ExecuteWorkflowNodePayload = {
  /** 要执行的节点 ID */
  nodeId: string;
  /** 节点类型，如 service、start、end 等 */
  nodeType: string;
  /** 节点的配置数据 */
  nodeData: Record<string, unknown>;
  /** 当前执行上下文（包含前面节点的输出） */
  context: Record<string, unknown>;
  /** 运行时信息：当前步数和循环节点的迭代状态 */
  runtime: {
    stepIndex: number;
    loopState: Record<string, { index: number }>;
  };
};

/** 执行单个节点的响应结构 */
export type ExecuteWorkflowNodeResult = {
  code: number;
  message: string;
  data: {
    /** 执行是否成功 */
    success: boolean;
    /** 节点输出结果 */
    output?: Record<string, unknown>;
    /** 需要合并到执行上下文的增量数据 */
    patchContext?: Record<string, unknown>;
    /** 执行性能指标 */
    metrics?: Record<string, unknown>;
    /** 执行失败时的错误信息 */
    error?: {
      code?: string;
      message: string;
    };
  };
};

// ---------------------------------------------------------------------------
// API 函数 — 数据服务
// ---------------------------------------------------------------------------

/** 按关键词搜索可用的数据服务列表 */
export const getPlaygroundServices = (params?: { keyword?: string }) => {
  return http.request<PlaygroundServiceResult>(
    "get",
    "/api/playground/services",
    {
      params
    }
  );
};

// ---------------------------------------------------------------------------
// API 函数 — 工作流保存 / 恢复
// ---------------------------------------------------------------------------

/** 将当前工作流保存到服务端 */
export const savePlaygroundWorkflow = (data: PlaygroundSavePayload) => {
  return http.request<PlaygroundSaveResult>(
    "post",
    "/api/workflow-playground/save",
    { data }
  );
};

/** 向后端发送请求，执行单个工作流节点 */
export const executeWorkflowNode = (data: ExecuteWorkflowNodePayload) => {
  return http.request<ExecuteWorkflowNodeResult>(
    "post",
    "/api/workflow-playground/execute-node",
    { data }
  );
};

// ---------------------------------------------------------------------------
// 训练流模板相关类型与 API
// ---------------------------------------------------------------------------

/** 工作流模板，包含预定义的节点和边 */
export type WorkflowTemplate = {
  id: string;
  name: string;
  summary: string;
  /** 模板的流程图结构 */
  graph: {
    nodes?: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
  /** 启动执行时注入的初始上下文（条件/循环节点依赖此数据） */
  initialContext?: Record<string, unknown>;
};

/** 获取模板列表的响应结构 */
export type WorkflowTemplateListResult = {
  code: number;
  message: string;
  data: WorkflowTemplate[];
};

// ---------------------------------------------------------------------------
// 循环节点配置相关类型与 API
// ---------------------------------------------------------------------------

/** 循环节点的预定义配置 */
export type LoopConfig = {
  id: string;
  /** 循环名称 */
  name: string;
  /** 迭代类型，如 for-each、while 等 */
  iterationType: string;
  /** 最大迭代次数（防止无限循环） */
  maxIterations: number;
  /** 循环描述 */
  summary: string;
  /** 循环表达式 */
  expression: string;
  /** 分类标签 */
  category: string;
  /** 要遍历的集合在上下文中的路径，如 $.items */
  itemsPath?: string;
  /** 每次迭代中当前元素的变量名，如 item */
  itemName?: string;
};

/** 获取循环配置列表的响应结构 */
export type LoopConfigListResult = {
  code: number;
  message: string;
  data: LoopConfig[];
};

/** 获取训练流模板列表 */
export const getWorkflowTemplates = () => {
  return http.request<WorkflowTemplateListResult>(
    "get",
    "/api/workflow-playground/templates"
  );
};

/** 获取循环节点配置列表 */
export const getLoopConfigs = () => {
  return http.request<LoopConfigListResult>(
    "get",
    "/api/workflow-playground/loop-configs"
  );
};
