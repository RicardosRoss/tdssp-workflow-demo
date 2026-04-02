import { isReactive, toRaw } from "vue";

export type WorkflowExecutionStatus =
  | "idle"
  | "running"
  | "paused"
  | "success"
  | "error";

export type NodeRunStatus =
  | "idle"
  | "ready"
  | "running"
  | "success"
  | "error"
  | "skipped";

export type WorkflowNodeLike = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};

export type WorkflowEdgeLike = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  data?: {
    routeKey?: string;
  };
};

export interface WorkflowExecutionState {
  status: WorkflowExecutionStatus;
  currentNodeId: string | null;
  activeNodeIds: string[];
  pendingBarriers: Record<string, number>;
  context: Record<string, unknown>;
  outputsByNodeId: Record<string, unknown>;
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
  history: Array<{
    nodeId: string;
    routeKey?: string;
    edgeId?: string;
  }>;
  loopState: Record<string, { index: number }>;
}

type ResolveNextEdgeArgs = {
  currentNode: WorkflowNodeLike;
  edges: WorkflowEdgeLike[];
  routeKey?: string;
};

type ApplyServiceExecutionResultArgs = {
  nodeId: string;
  nodeData?: Record<string, unknown>;
  output?: unknown;
  patchContext?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
};

type AdvanceLoopStateArgs = {
  nodeId: string;
  nodeData?: Record<string, unknown>;
  context: Record<string, unknown>;
  loopState: Record<string, { index: number }>;
};

type StartExecutionStateArgs = {
  nodes: WorkflowNodeLike[];
  edges?: WorkflowEdgeLike[];
  initialContext?: Record<string, unknown>;
};

type MarkNodeExecutionErrorArgs = {
  nodeId: string;
  message: string;
};

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

export function snapshotExecutionContext(
  context: Record<string, unknown>
): Record<string, unknown> {
  return toPlainCloneable(context);
}

export function findStartNodeId(nodes: WorkflowNodeLike[]) {
  return nodes.find(node => node.type === "start")?.id ?? null;
}

export function findStartNodeIds(nodes: WorkflowNodeLike[]): string[] {
  return nodes.filter(node => node.type === "start").map(node => node.id);
}

export function buildBarrierMap(
  nodes: WorkflowNodeLike[],
  edges: WorkflowEdgeLike[]
): Record<string, number> {
  const sourcesByTarget: Record<string, Set<string>> = {};
  for (const edge of edges) {
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

export function advanceBarriers(
  completedNodeId: string,
  edges: WorkflowEdgeLike[],
  currentBarriers: Record<string, number>,
  nodes: WorkflowNodeLike[],
  selectedEdge: WorkflowEdgeLike | null = null
): { barriers: Record<string, number>; newlyReady: string[] } {
  const nextBarriers = { ...currentBarriers };
  const newlyReady: string[] = [];

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
      const targetNode = nodes.find(n => n.id === targetId);
      if (targetNode && targetNode.type !== "start") {
        newlyReady.push(targetId);
      }
    }
  }

  return { barriers: nextBarriers, newlyReady };
}

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

export function advanceLoopState({
  nodeId,
  nodeData,
  context,
  loopState
}: AdvanceLoopStateArgs) {
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

function getEdgeRouteKey(edge: WorkflowEdgeLike) {
  if (edge.data?.routeKey) {
    return edge.data.routeKey;
  }

  if (edge.sourceHandle) {
    return edge.sourceHandle;
  }

  return "default";
}
