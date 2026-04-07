/**
 * execution-engine.ts
 *
 * 工作流执行引擎的纯逻辑层，不依赖 Vue 响应式系统。
 * 所有函数都是纯函数（无副作用），便于独立单元测试。
 *
 * 核心概念：
 * - 节点（Node）：流程图中的一个处理单元，如开始、结束、服务、条件、循环
 * - 边（Edge）：连接两个节点的有向线，可附带 routeKey 表示分支
 * - 屏障（Barrier）：当一个节点有多个入边时，需等待所有前驱完成后才能执行
 * - 上下文（Context）：节点间传递数据的共享字典
 * - 路由键（RouteKey）：条件/循环节点通过路由键选择走哪条出边
 */
import { isReactive, toRaw } from "vue";

// ------------------------------------··---------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 工作流整体执行状态 */
export type WorkflowExecutionStatus =
  | "idle" // 未开始
  | "running" // 执行中
  | "paused" // 已暂停（自动运行时用户可暂停）
  | "success" // 所有节点执行完成
  | "error"; // 有节点执行失败

/** 单个节点的运行时状态 */
export type NodeRunStatus =
  | "idle" // 未参与执行
  | "ready" // 就绪，等待执行
  | "running" // 正在执行
  | "success" // 执行成功
  | "error" // 执行失败
  | "skipped"; // 被跳过

/** 与 VueFlow Node 兼容的节点最小类型约束 */
export type WorkflowNodeLike = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};

/** 与 VueFlow Edge 兼容的边最小类型约束 */
export type WorkflowEdgeLike = {
  id: string;
  /** 出边节点 ID */
  source: string;
  /** 入边节点 ID */
  target: string;
  /** 边的源端连接点标识（用于区分多出口） */
  sourceHandle?: string | null;
  /** 边的附加数据，如 routeKey */
  data?: {
    routeKey?: string;
  };
};

/** 工作流执行过程中的完整状态快照 */
export interface WorkflowExecutionState {
  /** 整体执行状态 */
  status: WorkflowExecutionStatus;
  /** 当前正在执行的节点 ID（用于向后兼容，实际以 activeNodeIds 为准） */
  currentNodeId: string | null;
  /** 当前所有就绪/运行中的节点 ID 列表（支持并行执行） */
  activeNodeIds: string[];
  /** 屏障计数器：key 为目标节点 ID，value 为剩余等待数 */
  pendingBarriers: Record<string, number>;
  /** 执行上下文：节点间通过此共享数据 */
  context: Record<string, unknown>;
  /** 按节点 ID 索引的输出结果 */
  outputsByNodeId: Record<string, unknown>;
  /** 每个节点的运行时状态（含输入、输出、错误信息等） */
  nodeStates: Record<
    string,
    {
      status: NodeRunStatus;
      input?: unknown;
      output?: unknown;
      errorMessage?: string;
      metrics?: Record<string, unknown>;
    }
  >;
  /** 执行历史记录，按时间顺序记录已完成的节点 */
  history: Array<{
    nodeId: string;
    routeKey?: string;
    edgeId?: string;
  }>;
  /** 循环节点的迭代状态：key 为循环节点 ID */
  loopState: Record<string, { index: number }>;
}

/** resolveNextEdge 函数的参数类型 */
type ResolveNextEdgeArgs = {
  currentNode: WorkflowNodeLike;
  edges: WorkflowEdgeLike[];
  /** 指定要走的分支，用于条件/循环节点 */
  routeKey?: string;
};

/** applyServiceExecutionResult 函数的参数类型 */
type ApplyServiceExecutionResultArgs = {
  nodeId: string;
  nodeData?: Record<string, unknown>;
  /** 服务执行返回的输出数据 */
  output?: unknown;
  /** 服务返回的需要合并到上下文的增量数据 */
  patchContext?: Record<string, unknown>;
  /** 服务返回的执行指标（耗时、数据量等） */
  metrics?: Record<string, unknown>;
};

/** advanceLoopState 函数的参数类型 */
type AdvanceLoopStateArgs = {
  nodeId: string;
  nodeData?: Record<string, unknown>;
  context: Record<string, unknown>;
  loopState: Record<string, { index: number }>;
};

/** startExecutionState 函数的参数类型 */
type StartExecutionStateArgs = {
  nodes: WorkflowNodeLike[];
  edges?: WorkflowEdgeLike[];
  /** 初始上下文数据（可预置变量） */
  initialContext?: Record<string, unknown>;
};

/** markNodeExecutionError 函数的参数类型 */
type MarkNodeExecutionErrorArgs = {
  nodeId: string;
  message: string;
};

// ---------------------------------------------------------------------------
// 状态创建与快照
// ---------------------------------------------------------------------------

/** 创建一个初始的空执行状态 */
export function createExecutionState(): WorkflowExecutionState {
  return {
    status: "idle",
    currentNodeId: null,
    activeNodeIds: [],
    pendingBarriers: {},
    context: {},
    outputsByNodeId: {},
    nodeStates: {},
    history: [],
    loopState: {}
  };
}

/**
 * 深度克隆上下文对象，剥离 Vue 响应式代理
 * Vue 的 reactive/ref 会被递归地转为原始 JS 对象，
 * 模拟执行时上下文传递给后端或序列化时需要纯净数据。
 */
function toPlainCloneable<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => toPlainCloneable(item)) as T;
  }

  if (value && typeof value === "object") {
    const rawValue = isReactive(value) ? toRaw(value) : value;

    return Object.fromEntries(
      Object.entries(rawValue).map(([key, nestedValue]) => [
        key,
        toPlainCloneable(nestedValue)
      ])
    ) as T;
  }

  return value;
}

/** 拍摄当前执行上下文的快照（深拷贝，剥离响应式） */
export function snapshotExecutionContext(
  context: Record<string, unknown>
): Record<string, unknown> {
  return toPlainCloneable(context);
}

// ---------------------------------------------------------------------------
// 节点查找
// ---------------------------------------------------------------------------

/** 查找第一个 start 类型的节点 ID */
export function findStartNodeId(nodes: WorkflowNodeLike[]) {
  return nodes.find(node => node.type === "start")?.id ?? null;
}

/** 查找所有 start 类型的节点 ID（支持多个起点并行执行） */
export function findStartNodeIds(nodes: WorkflowNodeLike[]): string[] {
  return nodes.filter(node => node.type === "start").map(node => node.id);
}

// ---------------------------------------------------------------------------
// 屏障机制
// ---------------------------------------------------------------------------

/**
 * 构建屏障计数映射
 * 扫描所有边，统计每个目标节点有多少不同的源节点指向它。
 * 只有入度 >= 2 的节点才有屏障（需要等待所有前驱完成）。
 */
export function buildBarrierMap(
  nodes: WorkflowNodeLike[],
  edges: WorkflowEdgeLike[]
): Record<string, number> {
  /** key: 目标节点 ID, value: 指向它的源节点集合 */
  const sourcesByTarget: Record<string, Set<string>> = {};
  for (const edge of collectNonBackEdges(nodes, edges)) {
    if (!sourcesByTarget[edge.target]) {
      sourcesByTarget[edge.target] = new Set();
    }
    sourcesByTarget[edge.target].add(edge.source);
  }
  const barriers: Record<string, number> = {};
  for (const [target, sources] of Object.entries(sourcesByTarget)) {
    if (sources.size > 1) {
      barriers[target] = sources.size;
    }
  }
  return barriers;
}

/**
 * 根据最新完成/跳过的前驱，解析哪些目标节点应进入 ready 或 skipped。
 * 与静态 barrier 不同，这里基于"前驱是否已 resolved（success/skipped）"动态判断，
 * 从而支持条件分支未选中路径的跳过传播与汇合节点激活。
 */
export function resolveTriggeredTargetNodes({
  nodes,
  edges,
  nodeStates,
  targetNodeIds
}: {
  nodes: WorkflowNodeLike[];
  edges: WorkflowEdgeLike[];
  nodeStates: WorkflowExecutionState["nodeStates"];
  targetNodeIds: string[];
}) {
  const incomingEdgesByTarget = buildIncomingEdgesByTarget(nodes, edges);
  const outgoingEdgesBySource = buildOutgoingEdgesBySource(edges);
  const readyNodeIds = new Set<string>();
  const skippedNodeIds = new Set<string>();
  const pendingBarriers: Record<string, number> = {};
  const workingNodeStates: WorkflowExecutionState["nodeStates"] = {
    ...nodeStates
  };
  const queue = [...new Set(targetNodeIds)];

  while (queue.length > 0) {
    const targetNodeId = queue.shift()!;
    const targetNode = nodes.find(node => node.id === targetNodeId);
    if (!targetNode || targetNode.type === "start") {
      continue;
    }

    const incomingEdges = incomingEdgesByTarget[targetNodeId] ?? [];
    if (!incomingEdges.length) {
      continue;
    }

    const sourceStatuses = incomingEdges.map(
      edge => workingNodeStates[edge.source]?.status ?? "idle"
    );
    const unresolvedCount = sourceStatuses.filter(
      status => status !== "success" && status !== "skipped"
    ).length;

    if (unresolvedCount > 0) {
      pendingBarriers[targetNodeId] = unresolvedCount;
      continue;
    }

    delete pendingBarriers[targetNodeId];

    if (sourceStatuses.every(status => status === "skipped")) {
      if (workingNodeStates[targetNodeId]?.status !== "skipped") {
        skippedNodeIds.add(targetNodeId);
        workingNodeStates[targetNodeId] = {
          ...workingNodeStates[targetNodeId],
          status: "skipped"
        };
        for (const edge of outgoingEdgesBySource[targetNodeId] ?? []) {
          queue.push(edge.target);
        }
      }
      continue;
    }

    if (workingNodeStates[targetNodeId]?.status !== "running") {
      readyNodeIds.add(targetNodeId);
    }
  }

  return {
    readyNodeIds: [...readyNodeIds],
    skippedNodeIds: [...skippedNodeIds],
    pendingBarriers
  };
}

/**
 * 前驱节点完成后，推进屏障计数器
 * 对于指定边（或该节点的所有出边），将目标节点的屏障计数减 1。
 * 计数归零的节点变为"就绪"，可加入下一轮执行。
 *
 * @param completedNodeId - 刚完成的节点 ID
 * @param edges - 全部边
 * @param currentBarriers - 当前屏障计数
 * @param nodes - 全部节点（用于排除 start 类型）
 * @param selectedEdge - 指定边（条件/循环节点只走一条边时传入）
 * @returns 更新后的屏障计数和新就绪的节点 ID 列表
 */
export function advanceBarriers(
  completedNodeId: string,
  edges: WorkflowEdgeLike[],
  currentBarriers: Record<string, number>,
  nodes: WorkflowNodeLike[],
  selectedEdge: WorkflowEdgeLike | null = null
): { barriers: Record<string, number>; newlyReady: string[] } {
  const nextBarriers = { ...currentBarriers };
  const newlyReady: string[] = [];

  /** 如果指定了边（条件/循环只走一条路），只处理那条边；否则处理所有出边 */
  const edgesToProcess = selectedEdge
    ? [selectedEdge]
    : edges.filter(edge => edge.source === completedNodeId);

  for (const edge of edgesToProcess) {
    const targetId = edge.target;
    if (targetId in nextBarriers) {
      nextBarriers[targetId] -= 1;
      if (nextBarriers[targetId] <= 0) {
        delete nextBarriers[targetId];
        newlyReady.push(targetId);
      }
    } else {
      /** 无屏障的目标节点直接就绪（排除 start 类型，start 不会被中途激活） */
      const targetNode = nodes.find(n => n.id === targetId);
      if (targetNode && targetNode.type !== "start") {
        newlyReady.push(targetId);
      }
    }
  }

  return { barriers: nextBarriers, newlyReady };
}

// ---------------------------------------------------------------------------
// 边路由
// ---------------------------------------------------------------------------

/**
 * 查找当前节点的下一条出边
 * 优先匹配 routeKey，其次匹配 "default"，最后取第一条出边
 *
 * @param currentNode - 当前节点
 * @param edges - 全部边
 * @param routeKey - 期望的路由键（条件/循环节点使用）
 */
export function resolveNextEdge({
  currentNode,
  edges,
  routeKey
}: ResolveNextEdgeArgs) {
  const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
  if (!outgoingEdges.length) {
    return null;
  }

  if (routeKey) {
    return (
      outgoingEdges.find(edge => getEdgeRouteKey(edge) === routeKey) ?? null
    );
  }

  return (
    outgoingEdges.find(edge => getEdgeRouteKey(edge) === "default") ??
    outgoingEdges[0] ??
    null
  );
}

// ---------------------------------------------------------------------------
// 执行结果处理
// ---------------------------------------------------------------------------

/**
 * 将服务节点执行成功的结果应用到执行状态
 * - 将输出写入上下文（通过 outputKey）
 * - 合并服务返回的 patchContext
 * - 记录输出和指标到 nodeStates
 */
export function applyServiceExecutionResult(
  state: WorkflowExecutionState,
  {
    nodeId,
    nodeData,
    output,
    patchContext,
    metrics
  }: ApplyServiceExecutionResultArgs
): WorkflowExecutionState {
  /** 节点配置的输出键名，用于将结果写入上下文 */
  const outputKey =
    typeof nodeData?.outputKey === "string" ? nodeData.outputKey : "";
  const nextContext = {
    ...state.context,
    ...(patchContext ?? {})
  };

  if (outputKey) {
    nextContext[outputKey] = output;
  }

  return {
    ...state,
    context: nextContext,
    outputsByNodeId: {
      ...state.outputsByNodeId,
      [nodeId]: output
    },
    nodeStates: {
      ...state.nodeStates,
      [nodeId]: {
        status: "success",
        output,
        metrics
      }
    }
  };
}

// ---------------------------------------------------------------------------
// 执行启动 / 错误 / 重置
// ---------------------------------------------------------------------------

/**
 * 初始化执行状态
 * - 找到所有 start 节点并标记为 ready
 * - 构建 barrier 映射
 * - 如果 start 节点有 datasetId，将其写入上下文
 */
export function startExecutionState({
  nodes,
  edges = [],
  initialContext = {}
}: StartExecutionStateArgs): WorkflowExecutionState {
  const startNodeIds = findStartNodeIds(nodes);
  const state = createExecutionState();

  if (!startNodeIds.length) {
    return state;
  }

  const nodeStates: Record<string, { status: NodeRunStatus }> = {};
  const context: Record<string, unknown> = { ...initialContext };

  for (const nodeId of startNodeIds) {
    nodeStates[nodeId] = { status: "ready" };
    const startNode = nodes.find(n => n.id === nodeId);
    if (startNode?.data?.datasetId) {
      context[`__start_${nodeId}`] = { datasetId: startNode.data.datasetId };
    }
  }

  const barriers = buildBarrierMap(nodes, edges);

  return {
    ...state,
    status: "running",
    currentNodeId: startNodeIds[0],
    activeNodeIds: [...startNodeIds],
    pendingBarriers: { ...barriers },
    context,
    nodeStates
  };
}

/** 将指定节点标记为执行失败，整体状态变为 error */
export function markNodeExecutionError(
  state: WorkflowExecutionState,
  { nodeId, message }: MarkNodeExecutionErrorArgs
): WorkflowExecutionState {
  return {
    ...state,
    status: "error",
    nodeStates: {
      ...state.nodeStates,
      [nodeId]: {
        ...state.nodeStates[nodeId],
        status: "error",
        errorMessage: message
      }
    }
  };
}

/**
 * 重置执行状态（保留 context 和 nodeStates 供查看，其余清空）
 * 用于用户修改流程图后清除执行结果
 */
export function resetExecutionState(
  state: Partial<WorkflowExecutionState> = {}
): WorkflowExecutionState {
  return {
    ...createExecutionState(),
    ...state,
    status: "idle",
    currentNodeId: null,
    activeNodeIds: [],
    pendingBarriers: {},
    history: []
  };
}

// ---------------------------------------------------------------------------
// 图校验
// ---------------------------------------------------------------------------

/**
 * 校验流程图是否可执行
 * 规则：
 * - 必须包含 start 和 end 节点
 * - 条件节点必须有 yes 和 no 两个出边
 * - 循环节点必须有 loop-body 和 done 两个出边
 *
 * @returns 错误信息字符串，null 表示校验通过
 */
export function validateRunnableGraph({
  nodes,
  edges
}: {
  nodes: WorkflowNodeLike[];
  edges: WorkflowEdgeLike[];
}) {
  const hasStart = nodes.some(node => node.type === "start");
  const hasEnd = nodes.some(node => node.type === "end");

  if (!hasStart) {
    return "Runnable graph must include a start node";
  }

  if (!hasEnd) {
    return "Runnable graph must include an end node";
  }

  for (const node of nodes) {
    const outgoingEdges = edges.filter(edge => edge.source === node.id);

    if (node.type === "condition") {
      const routeKeys = new Set(
        outgoingEdges.map(edge => getEdgeRouteKey(edge))
      );
      if (!routeKeys.has("yes")) {
        return `Condition node ${node.id} is missing a yes route`;
      }
      if (!routeKeys.has("no")) {
        return `Condition node ${node.id} is missing a no route`;
      }
    }

    if (node.type === "loop") {
      const routeKeys = new Set(
        outgoingEdges.map(edge => getEdgeRouteKey(edge))
      );
      if (!routeKeys.has("loop-body")) {
        return `Loop node ${node.id} is missing a loop-body route`;
      }
      if (!routeKeys.has("done")) {
        return `Loop node ${node.id} is missing a done route`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 循环状态推进
// ---------------------------------------------------------------------------

/**
 * 推进循环节点的迭代状态
 * 根据上下文中的数组长度判断是否继续循环
 *
 * @returns routeKey: "loop-body"（继续循环）或 "done"（循环结束）
 */
export function advanceLoopState({
  nodeId,
  nodeData,
  context,
  loopState
}: AdvanceLoopStateArgs) {
  /** 从上下文中读取要遍历的数组 */
  const items = readArrayByPath(context, nodeData?.itemsPath);
  const currentIndex = loopState[nodeId]?.index ?? 0;

  if (currentIndex >= items.length) {
    return {
      routeKey: "done",
      loopState
    };
  }

  return {
    routeKey: "loop-body",
    loopState: {
      ...loopState,
      [nodeId]: { index: currentIndex + 1 }
    }
  };
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

/**
 * 按路径从上下文中读取数组
 * 支持 $.xxx.yyy 格式的点分路径
 * 路径不合法或值不是数组时返回空数组
 */
function readArrayByPath(
  context: Record<string, unknown>,
  pathValue: unknown
): unknown[] {
  if (typeof pathValue !== "string" || !pathValue.startsWith("$.")) {
    return [];
  }

  const keys = pathValue.slice(2).split(".").filter(Boolean);
  let current: unknown = context;

  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return [];
    }
    current = (current as Record<string, unknown>)[key];
  }

  return Array.isArray(current) ? current : [];
}

function collectNonBackEdges(
  nodes: WorkflowNodeLike[],
  edges: WorkflowEdgeLike[]
) {
  /** 查找所有循环节点 ID */
  const loopNodeIds = new Set(
    nodes.filter(n => n.type === "loop").map(n => n.id)
  );

  /**
   * 识别回环边：从循环体节点出发，目标回到循环节点的边。
   * 循环节点的 loop-body 出边指向的节点即为循环体，循环体回指循环节点的边不应计入前驱依赖。
   */
  const loopBodyEdges = edges.filter(
    e => loopNodeIds.has(e.source) && e.sourceHandle === "loop-body"
  );
  const loopBodyNodeIds = new Set(loopBodyEdges.map(e => e.target));
  const backEdgeIds = new Set<string>();

  for (const edge of edges) {
    if (loopNodeIds.has(edge.target) && loopBodyNodeIds.has(edge.source)) {
      backEdgeIds.add(edge.id);
    }
  }

  return edges.filter(edge => !backEdgeIds.has(edge.id));
}

function buildIncomingEdgesByTarget(
  nodes: WorkflowNodeLike[],
  edges: WorkflowEdgeLike[]
) {
  const incomingEdgesByTarget: Record<string, WorkflowEdgeLike[]> = {};

  for (const edge of collectNonBackEdges(nodes, edges)) {
    if (!incomingEdgesByTarget[edge.target]) {
      incomingEdgesByTarget[edge.target] = [];
    }
    incomingEdgesByTarget[edge.target].push(edge);
  }

  return incomingEdgesByTarget;
}

function buildOutgoingEdgesBySource(edges: WorkflowEdgeLike[]) {
  const outgoingEdgesBySource: Record<string, WorkflowEdgeLike[]> = {};

  for (const edge of edges) {
    if (!outgoingEdgesBySource[edge.source]) {
      outgoingEdgesBySource[edge.source] = [];
    }
    outgoingEdgesBySource[edge.source].push(edge);
  }

  return outgoingEdgesBySource;
}

/**
 * 获取边的路由键
 * 优先级：edge.data.routeKey > edge.sourceHandle > "default"
 */
function getEdgeRouteKey(edge: WorkflowEdgeLike) {
  if (edge.data?.routeKey) {
    return edge.data.routeKey;
  }

  if (edge.sourceHandle) {
    return edge.sourceHandle;
  }

  return "default";
}
