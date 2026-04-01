import { defineFakeRoute } from "vite-plugin-fake-server/client";

const services = [
  {
    id: 101,
    name: "样本预处理",
    serviceType: "COMPUTE",
    summary: "拉取输入数据并做字段标准化",
    category: "数据清洗"
  },
  {
    id: 208,
    name: "TEE 联邦求交",
    serviceType: "PRIVACY",
    summary: "调用隐私计算服务产出求交结果",
    category: "隐私计算"
  },
  {
    id: 306,
    name: "规则兜底",
    serviceType: "INTELLIGENCE",
    summary: "数据规模不足时走轻量规则路径",
    category: "智能服务"
  },
  {
    id: 412,
    name: "评分卡推理",
    serviceType: "INTELLIGENCE",
    summary: "调用评分推理接口产出风险等级",
    category: "模型推理"
  }
];

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

  switch (serviceId) {
    case 101:
      return {
        success: true,
        output: {
          datasetId,
          cleanDatasetId: `${datasetId}-clean`,
          count: 1280
        },
        patchContext: {
          traceId: `${body?.nodeId ?? "service"}-${body?.runtime?.stepIndex ?? 0}`
        },
        metrics: {
          durationMs: 120
        }
      };
    case 208:
      return {
        success: true,
        output: {
          intersectionCount: 864,
          secureResultId: `${datasetId}-tee`
        },
        patchContext: {
          secureResultReady: true
        },
        metrics: {
          durationMs: 280
        }
      };
    case 306:
      return {
        success: true,
        output: {
          fallbackRule: "lightweight-rule",
          approved: true
        },
        patchContext: {
          usedFallbackRule: true
        },
        metrics: {
          durationMs: 48
        }
      };
    case 412:
      return {
        success: true,
        output: {
          score: 0.91,
          riskLevel: "LOW"
        },
        patchContext: {
          modelScoreReady: true
        },
        metrics: {
          durationMs: 96
        }
      };
    default:
      return {
        success: false,
        error: {
          code: "SERVICE_NOT_FOUND",
          message: `未找到服务 ID ${serviceId || "unknown"} 的执行器`
        }
      };
  }
}

export default defineFakeRoute([
  {
    url: "/api/playground/services",
    method: "get",
    response: ({ query }) => {
      const keyword = String(query?.keyword ?? "").trim();
      const records = keyword
        ? services.filter(item =>
            [item.name, item.summary, item.category].some(field =>
              field.toLowerCase().includes(keyword.toLowerCase())
            )
          )
        : services;

      return {
        code: 0,
        message: "ok",
        data: records
      };
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
