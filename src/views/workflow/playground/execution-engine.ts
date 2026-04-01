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
    context: {},
    outputsByNodeId: {},
    nodeStates: {},
    history: [],
    loopState: {}
  };
}

export function findStartNodeId(nodes: WorkflowNodeLike[]) {
  return nodes.find(node => node.type === "start")?.id ?? null;
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
  initialContext = {}
}: StartExecutionStateArgs): WorkflowExecutionState {
  const startNodeId = findStartNodeId(nodes);
  const state = createExecutionState();

  if (!startNodeId) {
    return state;
  }

  return {
    ...state,
    status: "running",
    currentNodeId: startNodeId,
    context: { ...initialContext },
    nodeStates: {
      [startNodeId]: {
        status: "ready"
      }
    }
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
