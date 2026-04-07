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

/**
 * 条件分支演示模板共享的节点与边构造辅助。
 * 生成 Start → Condition → (YES: 数据清洗) / (NO: 隐私求交) → End 的菱形结构。
 */
function makeConditionDemoGraph(expression: string) {
  return {
    nodes: [
      {
        id: "cond-start-1",
        type: "start",
        position: { x: 80, y: 200 },
        data: { label: "开始" }
      },
      {
        id: "cond-1",
        type: "condition",
        position: { x: 320, y: 200 },
        data: {
          label: `条件: ${expression || "(空)"}`,
          expression
        }
      },
      {
        id: "cond-svc-yes",
        type: "service",
        position: { x: 620, y: 80 },
        data: {
          label: "YES-数据清洗",
          summary: "条件为真时执行数据清洗",
          serviceId: 1,
          outputKey: "cleanResult"
        }
      },
      {
        id: "cond-svc-no",
        type: "service",
        position: { x: 620, y: 340 },
        data: {
          label: "NO-隐私求交",
          summary: "条件为假时执行隐私求交",
          serviceId: 2,
          outputKey: "privacyResult"
        }
      },
      {
        id: "cond-end-1",
        type: "end",
        position: { x: 920, y: 200 },
        data: { label: "结束" }
      }
    ],
    edges: [
      { id: "cond-e-s-c", source: "cond-start-1", target: "cond-1" },
      {
        id: "cond-e-c-yes",
        source: "cond-1",
        target: "cond-svc-yes",
        sourceHandle: "yes",
        data: { routeKey: "yes" }
      },
      {
        id: "cond-e-c-no",
        source: "cond-1",
        target: "cond-svc-no",
        sourceHandle: "no",
        data: { routeKey: "no" }
      },
      {
        id: "cond-e-yes-end",
        source: "cond-svc-yes",
        target: "cond-end-1"
      },
      {
        id: "cond-e-no-end",
        source: "cond-svc-no",
        target: "cond-end-1"
      }
    ]
  };
}

const WORKFLOW_TEMPLATES = [
  // ---- 条件分支演示模板 ----
  {
    id: "template-condition-basic",
    name: "条件分支-基础演示",
    summary: "使用 1 > 0 表达式，验证条件节点基本分支路由（走 YES 分支）",
    graph: makeConditionDemoGraph("1 > 0")
  },
  {
    id: "template-condition-context",
    name: "条件分支-上下文变量",
    summary:
      "使用 $.score > 80 表达式，需在启动时注入上下文 {score: N} 来决定分支",
    graph: makeConditionDemoGraph("$.score > 80")
  },
  {
    id: "template-condition-malformed",
    name: "条件分支-异常表达式",
    summary: "使用非法表达式 >>>，验证条件节点在求值失败时回退到 NO 分支",
    graph: makeConditionDemoGraph(">>>")
  },
  // ---- 场景模板：条件节点 ----
  {
    id: "template-scenario-risk-approval",
    name: "场景-风控审批条件分支",
    summary:
      "根据风险评分自动路由：评分 > 0.8 走高风险通道（TEE 联邦求交），否则走低风险通道（数据清洗）",
    initialContext: { riskScore: 0.91 },
    graph: {
      nodes: [
        {
          id: "risk-start",
          type: "start",
          position: { x: 80, y: 220 },
          data: { label: "风控数据输入" }
        },
        {
          id: "risk-cond",
          type: "condition",
          position: { x: 320, y: 220 },
          data: {
            label: "风险评分判断",
            expression: "$.riskScore > 0.8"
          }
        },
        {
          id: "risk-svc-high",
          type: "service",
          position: { x: 620, y: 80 },
          data: {
            label: "高风险-TEE求交",
            summary: "高风险通道：调用隐私计算联邦求交",
            serviceId: 2,
            outputKey: "highRiskResult"
          }
        },
        {
          id: "risk-svc-low",
          type: "service",
          position: { x: 620, y: 380 },
          data: {
            label: "低风险-数据清洗",
            summary: "低风险通道：执行数据标准化清洗",
            serviceId: 1,
            outputKey: "lowRiskResult"
          }
        },
        {
          id: "risk-end",
          type: "end",
          position: { x: 920, y: 220 },
          data: { label: "审批完成" }
        }
      ],
      edges: [
        { id: "risk-e-s-c", source: "risk-start", target: "risk-cond" },
        {
          id: "risk-e-c-yes",
          source: "risk-cond",
          target: "risk-svc-high",
          sourceHandle: "yes",
          data: { routeKey: "yes" }
        },
        {
          id: "risk-e-c-no",
          source: "risk-cond",
          target: "risk-svc-low",
          sourceHandle: "no",
          data: { routeKey: "no" }
        },
        {
          id: "risk-e-yes-end",
          source: "risk-svc-high",
          target: "risk-end"
        },
        {
          id: "risk-e-no-end",
          source: "risk-svc-low",
          target: "risk-end"
        }
      ]
    }
  },
  // ---- 场景模板：循环节点 ----
  {
    id: "template-scenario-batch-feature",
    name: "场景-批量特征工程循环",
    summary:
      "遍历 $.items 数组（3 个数据集），对每条数据执行数据清洗服务，完成后汇总输出",
    initialContext: {
      items: [
        { datasetId: "ds-001", name: "用户画像" },
        { datasetId: "ds-002", name: "交易流水" },
        { datasetId: "ds-003", name: "行为日志" }
      ]
    },
    graph: {
      nodes: [
        {
          id: "loop-start",
          type: "start",
          position: { x: 80, y: 220 },
          data: { label: "数据集列表" }
        },
        {
          id: "loop-foreach",
          type: "loop",
          position: { x: 320, y: 220 },
          data: {
            label: "遍历数据集",
            expression: "for item in $.items",
            iterationType: "FOR_EACH",
            maxIterations: 10,
            itemsPath: "$.items",
            itemName: "item"
          }
        },
        {
          id: "loop-svc-clean",
          type: "service",
          position: { x: 620, y: 220 },
          data: {
            label: "数据清洗",
            summary: "对当前数据集执行字段标准化清洗",
            serviceId: 1,
            outputKey: "cleanResult"
          }
        },
        {
          id: "loop-end",
          type: "end",
          position: { x: 920, y: 220 },
          data: { label: "批量处理完成" }
        }
      ],
      edges: [
        { id: "loop-e-s-l", source: "loop-start", target: "loop-foreach" },
        {
          id: "loop-e-l-body",
          source: "loop-foreach",
          target: "loop-svc-clean",
          sourceHandle: "loop-body",
          data: { routeKey: "loop-body" }
        },
        {
          id: "loop-e-l-done",
          source: "loop-foreach",
          target: "loop-end",
          sourceHandle: "done",
          data: { routeKey: "done" }
        },
        {
          id: "loop-e-body-back",
          source: "loop-svc-clean",
          target: "loop-foreach"
        }
      ]
    }
  },
  // ---- 原有模板 ----
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

const SAVED_WORKFLOW_EXECUTION_LOGS: Array<Record<string, unknown>> = [];

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
    url: "/api/workflow-playground/save-execution-logs",
    method: "post",
    response: ({ body }) => {
      const record = {
        id: SAVED_WORKFLOW_EXECUTION_LOGS.length + 1,
        workflowName: body?.workflowName ?? "当前工作流",
        savedAt: new Date().toISOString(),
        logCount: Array.isArray(body?.logs) ? body.logs.length : 0,
        payload: body
      };

      SAVED_WORKFLOW_EXECUTION_LOGS.push(record);

      return {
        code: 0,
        message: "saved",
        data: record
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
