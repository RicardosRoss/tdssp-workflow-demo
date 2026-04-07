export type ExecutionLogStatus = "running" | "success" | "error";

export type WorkflowExecutionLog = {
  id: string;
  stepIndex: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  executor: string;
  serviceName: string;
  routeKey?: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  dataSource: unknown;
  dataOutput?: unknown;
  status: ExecutionLogStatus;
  nextNodeIds: string[];
  nextNodeLabels: string[];
  errorMessage?: string;
};

export type WorkflowExecutionLogSummary = {
  successCount: number;
  errorCount: number;
  runningCount: number;
  totalDurationMs: number;
  latestStartedAt: string;
};

export type SaveExecutionLogsPayload = {
  workflowName?: string;
  startedAt?: string;
  finishedAt?: string;
  logs: WorkflowExecutionLog[];
};

export type ServiceExecutionResponseData = {
  success: boolean;
  output?: unknown;
  patchContext?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  error?: {
    code?: string;
    message: string;
  };
};

export type SettledServiceExecutionItem = {
  nodeId: string;
  result: PromiseSettledResult<{
    data: ServiceExecutionResponseData;
  }>;
};

export type SettledServiceExecutionOutcome =
  | {
      nodeId: string;
      status: "success";
      output?: unknown;
      patchContext?: Record<string, unknown>;
      metrics?: Record<string, unknown>;
    }
  | {
      nodeId: string;
      status: "error";
      message: string;
    };

type ExecutionLogNodeLike = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};

type ExecutionLogNextNode = {
  id: string;
  label: string;
};

type CreateRunningExecutionLogArgs = {
  id: string;
  stepIndex: number;
  node: ExecutionLogNodeLike;
  contextSnapshot: unknown;
  startedAt: string;
};

type FinishExecutionLogArgs = {
  status: Extract<ExecutionLogStatus, "success" | "error">;
  finishedAt: string;
  routeKey?: string;
  dataOutput?: unknown;
  nextNodes: ExecutionLogNextNode[];
  errorMessage?: string;
};

function computeDurationMs(startedAt: string, finishedAt: string) {
  return Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
}

export function createRunningExecutionLog({
  id,
  stepIndex,
  node,
  contextSnapshot,
  startedAt
}: CreateRunningExecutionLogArgs): WorkflowExecutionLog {
  const nodeLabel = String(node.data?.label ?? node.id);

  return {
    id,
    stepIndex,
    nodeId: node.id,
    nodeLabel,
    nodeType: node.type ?? "service",
    executor: node.id,
    serviceName: nodeLabel,
    startedAt,
    dataSource: contextSnapshot,
    status: "running",
    nextNodeIds: [],
    nextNodeLabels: []
  };
}

export function finishExecutionLog(
  log: WorkflowExecutionLog,
  {
    status,
    finishedAt,
    routeKey,
    dataOutput,
    nextNodes,
    errorMessage
  }: FinishExecutionLogArgs
): WorkflowExecutionLog {
  return {
    ...log,
    status,
    routeKey,
    finishedAt,
    durationMs: computeDurationMs(log.startedAt, finishedAt),
    dataOutput,
    nextNodeIds: nextNodes.map(node => node.id),
    nextNodeLabels: nextNodes.map(node => node.label),
    errorMessage
  };
}

export function buildExecutionLogSummary(
  logs: WorkflowExecutionLog[]
): WorkflowExecutionLogSummary {
  return logs.reduce<WorkflowExecutionLogSummary>(
    (summary, log) => ({
      successCount: summary.successCount + (log.status === "success" ? 1 : 0),
      errorCount: summary.errorCount + (log.status === "error" ? 1 : 0),
      runningCount: summary.runningCount + (log.status === "running" ? 1 : 0),
      totalDurationMs: summary.totalDurationMs + (log.durationMs ?? 0),
      latestStartedAt:
        !summary.latestStartedAt || summary.latestStartedAt < log.startedAt
          ? log.startedAt
          : summary.latestStartedAt
    }),
    {
      successCount: 0,
      errorCount: 0,
      runningCount: 0,
      totalDurationMs: 0,
      latestStartedAt: ""
    }
  );
}

export function buildSaveExecutionLogsPayload({
  workflowName,
  logs
}: {
  workflowName?: string;
  logs: WorkflowExecutionLog[];
}): SaveExecutionLogsPayload {
  const startedAt = logs.map(log => log.startedAt).sort()[0];
  const finishedAt = logs
    .map(log => log.finishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return {
    workflowName,
    startedAt,
    finishedAt,
    logs
  };
}

export function collectSettledServiceExecutionOutcomes(
  items: SettledServiceExecutionItem[]
): SettledServiceExecutionOutcome[] {
  return items.map(({ nodeId, result }) => {
    if (result.status === "rejected") {
      return {
        nodeId,
        status: "error",
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "服务执行失败"
      };
    }

    if (!result.value.data.success) {
      return {
        nodeId,
        status: "error",
        message: result.value.data.error?.message ?? "服务执行失败"
      };
    }

    return {
      nodeId,
      status: "success",
      output: result.value.data.output,
      patchContext: result.value.data.patchContext,
      metrics: result.value.data.metrics
    };
  });
}
