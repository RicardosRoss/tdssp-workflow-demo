import { defineFakeRoute } from "vite-plugin-fake-server/client";

/**
 * 已知服务的 richer mock 输出，仅用于演示。
 * key 取 serviceId（同时兼容旧模板 ID 101/208/306/412 和真实 API ID）。
 * 任何不在表中的 serviceId 一律返回通用成功结果，不报错。
 */
const KNOWN_SERVICE_MOCKS: Record<
  number,
  (ctx: { datasetId: string; traceId: string }) => Record<string, unknown>
> = {
  1: ({ datasetId, traceId }) => ({
    success: true,
    output: {
      datasetId,
      cleanDatasetId: `${datasetId}-clean`,
      count: 1280
    },
    patchContext: { traceId },
    metrics: { durationMs: 120 }
  }),
  2: ({ datasetId, traceId }) => ({
    success: true,
    output: {
      intersectionCount: 864,
      secureResultId: `${datasetId}-tee`
    },
    patchContext: { secureResultReady: true, traceId },
    metrics: { durationMs: 280 }
  }),
  3: ({ traceId }) => ({
    success: true,
    output: { score: 0.91, riskLevel: "LOW" },
    patchContext: { modelScoreReady: true, traceId },
    metrics: { durationMs: 96 }
  }),
  4: ({ traceId }) => ({
    success: true,
    output: { catalogId: Date.now(), tableCount: 12, fieldCount: 87 },
    patchContext: { catalogReady: true, traceId },
    metrics: { durationMs: 480 }
  }),
  5: ({ traceId }) => ({
    success: true,
    output: { modelId: `model-${traceId}`, accuracy: 0.93 },
    patchContext: { modelTrained: true, traceId },
    metrics: { durationMs: 600 }
  }),
  // 旧模板 ID 兼容（resource-library.mjs 静态模板使用）
  101: ctx => KNOWN_SERVICE_MOCKS[1](ctx),
  208: ctx => KNOWN_SERVICE_MOCKS[2](ctx),
  306: ctx => KNOWN_SERVICE_MOCKS[3](ctx),
  412: ctx => KNOWN_SERVICE_MOCKS[4](ctx)
};

function buildServiceExecutionResult(body: {
  nodeId?: string;
  nodeData?: {
    serviceId?: number;
    outputKey?: string;
  };
  context?: Record<string, unknown>;
  runtime?: {
    stepIndex?: number;
  };
}) {
  const serviceId = Number(body?.nodeData?.serviceId ?? 0);
  const datasetId = String(body?.context?.datasetId ?? "ds-demo");
  const traceId = `${body?.nodeId ?? "service"}-${body?.runtime?.stepIndex ?? 0}`;
  const ctx = { datasetId, traceId };

  const mockFn = KNOWN_SERVICE_MOCKS[serviceId];
  if (mockFn) {
    return mockFn(ctx);
  }

  // 动态载入的未知服务：通用成功响应
  return {
    success: true,
    output: {
      result: "ok",
      serviceId,
      message: `服务 ${serviceId} 执行完成`
    },
    patchContext: { traceId },
    metrics: { durationMs: 50 }
  };
}

// ---------------------------------------------------------------------------
// 训练流模板 mock 数据（从 resource-library.mjs 迁入）
// ---------------------------------------------------------------------------

function makeEdge(id, source, target, routeKey = "default") {
  return { id, source, target, data: { routeKey } };
}

const WORKFLOW_TEMPLATES = [
  {
    id: "template-federated-circle",
    name: "联合圈人模板",
    summary: "预置求交与筛选节点，适合联合圈人场景",
    graph: {
      nodes: [
        {
          id: "template-start-1",
          type: "start",
          position: { x: 80, y: 120 },
          data: { label: "求交样本集" }
        },
        {
          id: "template-service-1",
          type: "service",
          position: { x: 300, y: 120 },
          data: {
            label: "TEE 联邦求交",
            summary: "调用隐私计算服务产出求交结果",
            serviceType: "PRIVACY",
            serviceId: 208
          }
        },
        {
          id: "template-end-1",
          type: "end",
          position: { x: 560, y: 120 },
          data: { label: "圈人结果" }
        }
      ],
      edges: [
        makeEdge("template-edge-1", "template-start-1", "template-service-1"),
        makeEdge("template-edge-2", "template-service-1", "template-end-1")
      ]
    }
  },
  {
    id: "template-binary-model",
    name: "二分类建模模板",
    summary: "预置特征工程、评分卡推理链路",
    graph: {
      nodes: [
        {
          id: "binary-start-1",
          type: "start",
          position: { x: 80, y: 160 },
          data: { label: "训练数据集" }
        },
        {
          id: "binary-service-1",
          type: "service",
          position: { x: 300, y: 160 },
          data: {
            label: "样本预处理",
            summary: "拉取输入数据并做字段标准化",
            serviceType: "COMPUTE",
            serviceId: 101
          }
        },
        {
          id: "binary-service-2",
          type: "service",
          position: { x: 520, y: 160 },
          data: {
            label: "评分卡推理",
            summary: "调用评分推理接口产出风险等级",
            serviceType: "INTELLIGENCE",
            serviceId: 412
          }
        },
        {
          id: "binary-end-1",
          type: "end",
          position: { x: 760, y: 160 },
          data: { label: "评分结果" }
        }
      ],
      edges: [
        makeEdge("binary-edge-1", "binary-start-1", "binary-service-1"),
        makeEdge("binary-edge-2", "binary-service-1", "binary-service-2"),
        makeEdge("binary-edge-3", "binary-service-2", "binary-end-1")
      ]
    }
  }
];

const LOOP_CONFIGS = [
  {
    id: "loop-for-each",
    name: "遍历循环",
    iterationType: "FOR_EACH",
    maxIterations: 1000,
    summary: "遍历数组中的每个元素执行子流程",
    expression: "for item in dataset",
    category: "控制流",
    itemsPath: "$.items",
    itemName: "item"
  },
  {
    id: "loop-count",
    name: "计数循环",
    iterationType: "COUNT",
    maxIterations: 100,
    summary: "固定次数重复执行子流程",
    expression: "repeat N times",
    category: "控制流",
    itemsPath: "$.items",
    itemName: "item"
  },
  {
    id: "loop-while",
    name: "条件循环",
    iterationType: "WHILE",
    maxIterations: 500,
    summary: "满足条件时持续执行子流程",
    expression: "while condition == true",
    category: "控制流",
    itemsPath: "$.items",
    itemName: "item"
  }
];

export default defineFakeRoute([
  {
    url: "/api/workflow-playground/templates",
    method: "get",
    response: () => {
      return { code: 0, message: "ok", data: WORKFLOW_TEMPLATES };
    }
  },
  {
    url: "/api/workflow-playground/loop-configs",
    method: "get",
    response: () => {
      return { code: 0, message: "ok", data: LOOP_CONFIGS };
    }
  },
  {
    url: "/api/workflow-playground/save",
    method: "post",
    response: ({ body }) => {
      return {
        code: 0,
        message: "saved",
        data: {
          id: 1,
          name: body?.name ?? "Vue Flow Playground",
          savedAt: new Date().toISOString(),
          payload: body
        }
      };
    }
  },
  {
    url: "/api/workflow-playground/execute-node",
    method: "post",
    response: ({ body }) => {
      return {
        code: 0,
        message: "ok",
        data: buildServiceExecutionResult(body)
      };
    }
  }
]);
