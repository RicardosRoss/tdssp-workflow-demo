import { http } from "@/utils/http";

export type PlaygroundService = {
  id: number;
  name: string;
  serviceType: string;
  summary: string;
  category: string;
};

export type PlaygroundServiceResult = {
  code: number;
  message: string;
  data: PlaygroundService[];
};

export type PlaygroundSavePayload = {
  name: string;
  graph: {
    nodes: Array<any>;
    edges: Array<any>;
    viewport: Record<string, any>;
  };
};

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

export type ExecuteWorkflowNodePayload = {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  context: Record<string, unknown>;
  runtime: {
    stepIndex: number;
    loopState: Record<string, { index: number }>;
  };
};

export type ExecuteWorkflowNodeResult = {
  code: number;
  message: string;
  data: {
    success: boolean;
    output?: Record<string, unknown>;
    patchContext?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    error?: {
      code?: string;
      message: string;
    };
  };
};

export const getPlaygroundServices = (params?: { keyword?: string }) => {
  return http.request<PlaygroundServiceResult>(
    "get",
    "/api/playground/services",
    {
      params
    }
  );
};

export const savePlaygroundWorkflow = (data: PlaygroundSavePayload) => {
  return http.request<PlaygroundSaveResult>(
    "post",
    "/api/workflow-playground/save",
    { data }
  );
};

export const executeWorkflowNode = (data: ExecuteWorkflowNodePayload) => {
  return http.request<ExecuteWorkflowNodeResult>(
    "post",
    "/api/workflow-playground/execute-node",
    { data }
  );
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  summary: string;
  graph: {
    nodes?: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
};

export type WorkflowTemplateListResult = {
  code: number;
  message: string;
  data: WorkflowTemplate[];
};

export type LoopConfig = {
  id: string;
  name: string;
  iterationType: string;
  maxIterations: number;
  summary: string;
  expression: string;
  category: string;
  itemsPath?: string;
  itemName?: string;
};

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
