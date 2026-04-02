/**
 * useWorkflowPlayground — 工作流 Playground 的核心状态和行为
 *
 * 职责：
 * - 持有 nodes / edges / selectedNodeId 等全局状态
 * - 提供连线、拖放、保存节点等操作方法
 * - 管理"当前拖拽中的服务"中间态
 *
 * 为什么放在 composable：
 * - 这些逻辑和模板没有强绑定
 * - 会被 ServiceLibraryPanel（拖拽起点）和 WorkflowCanvas（拖拽终点）共同使用
 * - 节点选中状态同时影响 WorkflowCanvas（点击）和 NodeInspectorPanel（编辑）
 */

import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { MarkerType, useVueFlow } from "@vue-flow/core";
import type {
  Connection,
  Edge,
  EdgeMouseEvent,
  GraphNode,
  Node,
  NodeMouseEvent
} from "@vue-flow/core";
import { executeWorkflowNode } from "@/api/workflow-playground";
import {
  buildNodeDataUpdate,
  createNodeDraft,
  isServiceNode,
  type NodePanelDraft
} from "../node-panel";
import {
  advanceBarriers,
  advanceLoopState,
  applyServiceExecutionResult,
  createExecutionState,
  findStartNodeIds,
  markNodeExecutionError,
  resetExecutionState,
  resolveNextEdge,
  snapshotExecutionContext,
  startExecutionState,
  validateRunnableGraph
} from "../execution-engine";
import {
  cloneTemplateGraph,
  createDatasetStartNode,
  createLoopNode,
  createServiceNode
} from "../resource-library.mjs";

// ---------------------------------------------------------------------------
// 初始数据
// ---------------------------------------------------------------------------

const initialNodes: Node[] = [
  {
    id: "node-1",
    type: "start",
    position: { x: 80, y: 120 },
    data: { label: "开始节点" }
  },
  {
    id: "node-2",
    type: "end",
    position: { x: 620, y: 120 },
    data: { label: "结束节点" }
  },
  {
    id: "service-1",
    type: "service",
    position: { x: 300, y: 120 },
    data: {
      label: "样本预处理",
      summary: "拉取输入数据并做字段标准化",
      serviceType: "COMPUTE",
      serviceId: 101
    }
  }
];

const initialEdges: Edge[] = [
  {
    id: "edge-1",
    source: "node-1",
    target: "service-1",
    type: "smoothstep",
    markerEnd: MarkerType.ArrowClosed
  },
  {
    id: "edge-2",
    source: "service-1",
    target: "node-2",
    type: "smoothstep",
    markerEnd: MarkerType.ArrowClosed
  }
];

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

type DragResource =
  | {
      dragKind: "template";
      name: string;
      graph: { nodes?: Node[]; edges?: Edge[] };
    }
  | {
      dragKind: "service";
      id: number | string;
      name: string;
      summary: string;
      serviceType: string;
    }
  | {
      dragKind: "dataset";
      id: number | string;
      name: string;
      summary: string;
    }
  | {
      dragKind: "loop";
      id: number | string;
      name: string;
      expression: string;
      iterationType: string;
      maxIterations: number;
    };

export function useWorkflowPlayground() {
  // ---- 核心状态 ----
  // 用 ref 持有，通过 v-model:nodes / v-model:edges 与 VueFlow 双向绑定
  const nodes = ref<Node[]>([...initialNodes]);
  const edges = ref<Edge[]>([...initialEdges]);

  // 当前选中节点 ID（null 表示未选中）
  const selectedNodeId = ref<string | null>(null);

  // 当前选中边 ID（null 表示未选中）
  const selectedEdgeId = ref<string | null>(null);

  // 右侧面板的编辑草稿，跟踪输入框内容
  const draftNodeData = ref<NodePanelDraft>(createNodeDraft(null));

  // 运行时状态：当前执行指针、上下文、节点结果、执行历史
  const executionState = ref(createExecutionState());
  const isStepping = ref(false);
  const isAutoRunning = ref(false);

  // ---- 拖拽中间态 ----
  // 记录"当前从服务库拖出来的那条服务"，drop 后消费并清空
  const dragResource = ref<DragResource | null>(null);

  // ---- VueFlow 实例方法 ----
  const {
    addEdges,
    fitView,
    screenToFlowCoordinate,
    updateNodeData,
    toObject,
    removeNodes,
    removeEdges
  } = useVueFlow();

  // ---- 计算属性 ----

  /** 当前选中的完整 Node 对象，从 nodes 数组中查找 */
  const selectedNode = computed(
    () => nodes.value.find(node => node.id === selectedNodeId.value) ?? null
  );

  /** 选中的是否为 service 类型节点 */
  const selectedNodeIsService = computed(() =>
    isServiceNode(selectedNode.value)
  );

  /** 编辑表单的"保存"按钮是否可用（有变更且标题非空） */
  const canSaveNodeData = computed(() => {
    if (!selectedNode.value) {
      return false;
    }

    const nextData = buildNodeDataUpdate(
      selectedNode.value,
      draftNodeData.value
    );

    if (!nextData.label) {
      return false;
    }

    return Object.entries(nextData).some(
      ([key, value]) =>
        String(selectedNode.value?.data?.[key] ?? "") !== String(value)
    );
  });

  const canStartExecution = computed(
    () => !isStepping.value && executionState.value.status !== "running"
  );

  const canStepExecution = computed(
    () =>
      !isStepping.value &&
      executionState.value.activeNodeIds.length > 0 &&
      executionState.value.status !== "success" &&
      executionState.value.status !== "error"
  );

  const canRunExecution = computed(() => canStepExecution.value);

  const canPauseExecution = computed(
    () => executionState.value.status === "running" && isAutoRunning.value
  );

  const canResetExecution = computed(
    () =>
      executionState.value.activeNodeIds.length > 0 ||
      executionState.value.history.length > 0 ||
      executionState.value.status !== "idle"
  );

  const executionStepCount = computed(
    () => executionState.value.history.length
  );

  // ---- Watch ----

  // 选中节点变化时，重新填充编辑草稿（immediate 保证首次也执行）
  watch(
    selectedNode,
    node => {
      draftNodeData.value = createNodeDraft(node);
    },
    { immediate: true }
  );

  function commitExecutionState(nextState: typeof executionState.value) {
    executionState.value = nextState;
    syncNodeRuntimeData();
  }

  function syncNodeRuntimeData() {
    const activeIds = executionState.value.activeNodeIds;
    const latestHistory = executionState.value.history.at(-1);

    nodes.value = nodes.value.map(node => {
      const runtimeState = executionState.value.nodeStates[node.id];
      const isLastNode = latestHistory?.nodeId === node.id;

      return {
        ...node,
        data: {
          ...node.data,
          runStatus: runtimeState?.status ?? "idle",
          isCurrent: activeIds.includes(node.id),
          lastRouteKey: isLastNode ? (latestHistory?.routeKey ?? "") : "",
          loopIndex: executionState.value.loopState[node.id]?.index ?? 0,
          lastInput: runtimeState?.input,
          lastErrorMessage: runtimeState?.errorMessage ?? "",
          lastOutput: runtimeState?.output
        }
      };
    });
  }

  function readPath(path: string, source: Record<string, unknown>) {
    if (!path.startsWith("$.")) {
      return undefined;
    }

    return path
      .slice(2)
      .split(".")
      .filter(Boolean)
      .reduce<unknown>((current, key) => {
        if (!current || typeof current !== "object") {
          return undefined;
        }

        return (current as Record<string, unknown>)[key];
      }, source);
  }

  function evaluateConditionExpression(expression: string) {
    if (!expression.trim()) {
      return false;
    }

    const executableExpression = expression.replace(
      /\$\.[A-Za-z0-9_.]+/g,
      matched => `readPath(${JSON.stringify(matched)}, context)`
    );

    try {
      return Boolean(
        Function(
          "context",
          "readPath",
          `return (${executableExpression});`
        )(executionState.value.context, readPath)
      );
    } catch {
      return false;
    }
  }

  function getNodeById(nodeId: string | null) {
    if (!nodeId) {
      return null;
    }

    return nodes.value.find(node => node.id === nodeId) ?? null;
  }

  function markNodeRunning(nodeId: string) {
    commitExecutionState({
      ...executionState.value,
      status: "running",
      nodeStates: {
        ...executionState.value.nodeStates,
        [nodeId]: {
          ...executionState.value.nodeStates[nodeId],
          status: "running",
          input: snapshotExecutionContext(executionState.value.context),
          errorMessage: undefined
        }
      }
    });
  }

  function toEngineEdge(edge: Edge | null) {
    if (!edge) return null;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      data: edge.data ?? undefined
    };
  }

  function applyAdvanceBarriers(
    completedNodeId: string,
    currentBarriers: Record<string, number>,
    selectedEdge: Edge | null
  ): { barriers: Record<string, number>; newlyReady: string[] } {
    const engineEdges = edges.value.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      data: e.data ?? undefined
    }));
    const engineNodes = nodes.value.map(n => ({
      id: n.id,
      type: n.type ?? undefined,
      data: n.data as Record<string, unknown> | undefined
    }));
    return advanceBarriers(
      completedNodeId,
      engineEdges,
      currentBarriers,
      engineNodes,
      toEngineEdge(selectedEdge)
    );
  }

  type StepCompletion = {
    nodeId: string;
    edge: Edge | null;
    routeKey?: string;
    nextContext?: Record<string, unknown>;
    nextLoopState?: Record<string, { index: number }>;
  };

  function finalizeMultiStep(completions: StepCompletion[]) {
    if (!completions.length) return;

    let nextContext = { ...executionState.value.context };
    let nextLoopState = { ...executionState.value.loopState };
    let currentBarriers = { ...executionState.value.pendingBarriers };
    const nextNodeStates: typeof executionState.value.nodeStates = {
      ...executionState.value.nodeStates
    };
    const nextHistory = [...executionState.value.history];
    const newlyReadySet = new Set<string>();

    for (const completion of completions) {
      nextNodeStates[completion.nodeId] = {
        ...nextNodeStates[completion.nodeId],
        status: "success"
      };

      nextHistory.push({
        nodeId: completion.nodeId,
        routeKey: completion.routeKey,
        edgeId: completion.edge?.id
      });

      if (completion.nextContext) {
        nextContext = { ...nextContext, ...completion.nextContext };
      }
      if (completion.nextLoopState) {
        nextLoopState = { ...nextLoopState, ...completion.nextLoopState };
      }

      if (completion.edge?.target) {
        const { barriers, newlyReady } = applyAdvanceBarriers(
          completion.nodeId,
          currentBarriers,
          completion.edge
        );
        currentBarriers = barriers;
        for (const id of newlyReady) {
          newlyReadySet.add(id);
        }
      }
    }

    const activeNodeIds = [...newlyReadySet];
    for (const id of activeNodeIds) {
      nextNodeStates[id] = {
        ...nextNodeStates[id],
        status: "ready"
      };
    }

    commitExecutionState({
      ...executionState.value,
      status: activeNodeIds.length > 0 ? "running" : "success",
      currentNodeId: activeNodeIds[0] ?? null,
      activeNodeIds,
      pendingBarriers: currentBarriers,
      context: nextContext,
      loopState: nextLoopState,
      history: nextHistory,
      nodeStates: nextNodeStates
    });
  }

  // ---- MiniMap 颜色 ----

  function nodeColor(node: GraphNode) {
    const colorMap: Record<string, string> = {
      start: "#bae5d3",
      service: "#bfd3ff",
      condition: "#f0d1a7",
      loop: "#e8b4ff",
      end: "#efc2c8"
    };
    return colorMap[node.type ?? "default"] ?? "#5b7cc4";
  }

  function nodeStrokeColor(node: GraphNode) {
    const strokeMap: Record<string, string> = {
      start: "#1f8b67",
      service: "#5b7cc4",
      condition: "#b06a1d",
      loop: "#9c6bce",
      end: "#b45460"
    };
    return strokeMap[node.type ?? "default"] ?? "#bfd3ff";
  }

  // ---- 画布事件 ----

  /** VueFlow 初始化完成，自动适配视口 */
  function handleInit() {
    fitView({ padding: 0.2, duration: 300 });
  }

  /** 点击节点 → 选中 */
  function handleNodeClick({ node }: NodeMouseEvent) {
    selectedNodeId.value = node.id;
  }

  /** 点击画布空白区域 → 取消选中 */
  function handlePaneClick() {
    selectedNodeId.value = null;
  }

  // ---- 连线 ----

  /** 辅助：构造一条标准风格的 Edge */
  function makeEdge(
    edge: Partial<Edge> & Pick<Edge, "id" | "source" | "target">
  ) {
    return {
      type: "smoothstep",
      markerEnd: MarkerType.ArrowClosed,
      ...edge
    } satisfies Edge;
  }

  /** 用户从节点 handle 拉线到另一个 handle 时触发 */
  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }

    const routeKey = connection.sourceHandle ?? "default";

    addEdges([
      makeEdge({
        id: `edge-${connection.source}-${connection.target}-${edges.value.length + 1}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? undefined,
        target: connection.target,
        targetHandle: connection.targetHandle ?? undefined,
        data: {
          routeKey
        }
      })
    ]);
    resetExecution();
  }

  // ---- 拖放（从服务库拖到画布） ----

  /** 拖拽开始：记住正在拖的是哪个服务 */
  function handleDragStart(resource: DragResource) {
    dragResource.value = resource;
  }

  /** 画布 dragover：必须 preventDefault 才能接收 drop */
  function handleCanvasDragOver(event: DragEvent) {
    event.preventDefault();
  }

  /** 用训练流模板替换当前画布（点击或拖入均可调用） */
  function applyTemplate(template: {
    name: string;
    graph: { nodes?: Node[]; edges?: Edge[] };
  }) {
    const graph = cloneTemplateGraph(template);
    if (!graph.nodes?.length && !graph.edges?.length) {
      ElMessage.warning(`模板「${template.name}」内容为空，未加载`);
      return;
    }
    nodes.value = graph.nodes ?? [];
    edges.value = graph.edges ?? [];
    selectedNodeId.value = null;
    selectedEdgeId.value = null;
    resetExecution();
    ElMessage.success(`已加载训练流：${template.name}`);
  }

  /** 画布 drop：把屏幕坐标转成画布坐标，创建新服务节点 */
  function handleCanvasDrop(event: DragEvent) {
    event.preventDefault();
    if (!dragResource.value) {
      return;
    }

    // screenToFlowCoordinate：浏览器屏幕坐标 → VueFlow 画布坐标
    // 因为画布可能被缩放/平移，直接用 clientX/Y 会不准
    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY
    });

    // 不可变更新：创建新数组，不修改原数组
    if (dragResource.value.dragKind === "template") {
      applyTemplate(dragResource.value);
      dragResource.value = null;
      return;
    }

    if (dragResource.value.dragKind === "dataset") {
      nodes.value = [
        ...nodes.value,
        createDatasetStartNode(dragResource.value, position)
      ];
      dragResource.value = null;
      resetExecution();
      return;
    }

    if (dragResource.value.dragKind === "loop") {
      nodes.value = [
        ...nodes.value,
        createLoopNode(dragResource.value, position)
      ];
      dragResource.value = null;
      resetExecution();
      return;
    }

    nodes.value = [
      ...nodes.value,
      createServiceNode(dragResource.value, position)
    ];
    dragResource.value = null;
    resetExecution();
  }

  // ---- 节点编辑（右侧面板） ----

  /** 将右侧面板的编辑内容写回节点 data */
  function handleSaveNode() {
    if (!selectedNode.value) {
      return;
    }

    const nextData = buildNodeDataUpdate(
      selectedNode.value,
      draftNodeData.value
    );

    if (!nextData.label) {
      return;
    }

    updateNodeData(selectedNode.value.id, nextData);
    resetExecution();
  }

  function validateGraph(): string | null {
    return validateRunnableGraph({
      nodes: nodes.value,
      edges: edges.value
    });
  }

  function handleSaveToLocal() {
    const error = validateGraph();
    if (error) {
      ElMessage.error(error);
      return;
    }

    const currentGraph = toObject();
    localStorage.setItem("vue-flow-demo", JSON.stringify(currentGraph));
    ElMessage.success("已保存到本地");
  }

  function handleRestoreFromLocal() {
    const raw = localStorage.getItem("vue-flow-demo");
    if (!raw) {
      ElMessage.warning("没有找到本地保存的数据");
      return;
    }

    const graph = JSON.parse(raw);
    nodes.value = graph.nodes ?? [];
    edges.value = graph.edges ?? [];
    resetExecution();
    ElMessage.success("已从本地恢复");
  }

  async function startExecution(initialContext: Record<string, unknown> = {}) {
    const error = validateGraph();
    if (error) {
      ElMessage.error(error);
      return;
    }

    const engineEdges = edges.value.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      data: e.data ?? undefined
    }));

    const nextState = startExecutionState({
      nodes: nodes.value,
      edges: engineEdges,
      initialContext
    });

    if (
      nextState.activeNodeIds.length === 0 ||
      findStartNodeIds(nodes.value).length === 0
    ) {
      ElMessage.error("流程图缺少开始节点");
      return;
    }

    isAutoRunning.value = false;
    commitExecutionState(nextState);
  }

  async function stepExecution() {
    if (isStepping.value) {
      return;
    }

    if (executionState.value.activeNodeIds.length === 0) {
      return;
    }

    isStepping.value = true;
    try {
      const activeIds = [...executionState.value.activeNodeIds];
      for (const nodeId of activeIds) {
        markNodeRunning(nodeId);
      }

      const syncCompletions: StepCompletion[] = [];
      const asyncNodes: Node[] = [];

      for (const nodeId of activeIds) {
        const node = getNodeById(nodeId);
        if (!node) continue;

        if (node.type === "end") {
          syncCompletions.push({
            nodeId: node.id,
            edge: null
          });
          continue;
        }

        if (node.type === "start") {
          const edge = resolveNextEdge({
            currentNode: node,
            edges: edges.value
          });
          syncCompletions.push({
            nodeId: node.id,
            edge: edge as Edge | null,
            routeKey: "default"
          });
          continue;
        }

        if (node.type === "condition") {
          const routeKey = evaluateConditionExpression(
            String(node.data?.expression ?? "")
          )
            ? "yes"
            : "no";
          const edge = resolveNextEdge({
            currentNode: node,
            edges: edges.value,
            routeKey
          });
          syncCompletions.push({
            nodeId: node.id,
            edge: edge as Edge | null,
            routeKey
          });
          continue;
        }

        if (node.type === "loop") {
          const loopResult = advanceLoopState({
            nodeId: node.id,
            nodeData: (node.data ?? {}) as Record<string, unknown>,
            context: executionState.value.context,
            loopState: executionState.value.loopState
          });

          let nextContext: Record<string, unknown> | undefined;
          if (loopResult.routeKey === "loop-body") {
            const itemsPath = String(node.data?.itemsPath ?? "");
            const itemName = String(node.data?.itemName ?? "");
            const items = Array.isArray(
              readPath(itemsPath, executionState.value.context)
            )
              ? (readPath(itemsPath, executionState.value.context) as unknown[])
              : [];
            const nextIndex = (loopResult.loopState[node.id]?.index ?? 1) - 1;
            if (itemName) {
              nextContext = {
                ...executionState.value.context,
                [itemName]: items[nextIndex]
              };
            }
          }

          const edge = resolveNextEdge({
            currentNode: node,
            edges: edges.value,
            routeKey: loopResult.routeKey
          });
          syncCompletions.push({
            nodeId: node.id,
            edge: edge as Edge | null,
            routeKey: loopResult.routeKey,
            nextContext,
            nextLoopState: loopResult.loopState
          });
          continue;
        }

        if (node.type === "service") {
          asyncNodes.push(node);
        }
      }

      if (asyncNodes.length > 0) {
        const results = await Promise.allSettled(
          asyncNodes.map(node =>
            executeWorkflowNode({
              nodeId: node.id,
              nodeType: node.type ?? "service",
              nodeData: (node.data ?? {}) as Record<string, unknown>,
              context: executionState.value.context,
              runtime: {
                stepIndex: executionState.value.history.length,
                loopState: executionState.value.loopState
              }
            })
          )
        );

        for (let i = 0; i < results.length; i++) {
          const node = asyncNodes[i];
          const result = results[i];

          if (result.status === "rejected") {
            commitExecutionState(
              markNodeExecutionError(executionState.value, {
                nodeId: node.id,
                message:
                  result.reason instanceof Error
                    ? result.reason.message
                    : "服务执行失败"
              })
            );
            isAutoRunning.value = false;
            return;
          }

          if (!result.value.data.success) {
            commitExecutionState(
              markNodeExecutionError(executionState.value, {
                nodeId: node.id,
                message: result.value.data.error?.message ?? "服务执行失败"
              })
            );
            isAutoRunning.value = false;
            return;
          }

          commitExecutionState(
            applyServiceExecutionResult(executionState.value, {
              nodeId: node.id,
              nodeData: (node.data ?? {}) as Record<string, unknown>,
              output: result.value.data.output,
              patchContext: result.value.data.patchContext,
              metrics: result.value.data.metrics
            })
          );

          const edge = resolveNextEdge({
            currentNode: node,
            edges: edges.value
          });
          syncCompletions.push({
            nodeId: node.id,
            edge: edge as Edge | null,
            routeKey: "default"
          });
        }
      }

      finalizeMultiStep(syncCompletions);
    } catch (error) {
      const failedNodeId = executionState.value.activeNodeIds[0];
      if (failedNodeId) {
        commitExecutionState(
          markNodeExecutionError(executionState.value, {
            nodeId: failedNodeId,
            message: error instanceof Error ? error.message : "服务执行失败"
          })
        );
      }
      isAutoRunning.value = false;
    } finally {
      isStepping.value = false;
    }
  }

  async function runExecution() {
    if (isAutoRunning.value) {
      return;
    }

    if (executionState.value.activeNodeIds.length === 0) {
      await startExecution();
    } else if (executionState.value.status === "paused") {
      commitExecutionState({
        ...executionState.value,
        status: "running"
      });
    }

    if (executionState.value.activeNodeIds.length === 0) {
      return;
    }

    isAutoRunning.value = true;

    while (
      isAutoRunning.value &&
      executionState.value.activeNodeIds.length > 0 &&
      executionState.value.status !== "success" &&
      executionState.value.status !== "error"
    ) {
      await stepExecution();
    }

    isAutoRunning.value = false;
  }

  function pauseExecution() {
    isAutoRunning.value = false;

    if (executionState.value.status === "running") {
      commitExecutionState({
        ...executionState.value,
        status: "paused"
      });
    }
  }

  function resetExecution() {
    isStepping.value = false;
    isAutoRunning.value = false;
    commitExecutionState(resetExecutionState(createExecutionState()));
  }

  // ---- 删除 ----

  /** 删除当前选中的节点（第二个参数 true 表示同时删除关联边） */
  function handleDeleteSelectedNode() {
    if (!selectedNode.value) {
      return;
    }

    removeNodes([selectedNode.value.id], true);
    selectedNodeId.value = null;
    resetExecution();
  }

  /** 删除当前选中的边 */
  function handleDeleteSelectedEdge() {
    if (!selectedEdgeId.value) {
      return;
    }

    removeEdges([selectedEdgeId.value]);
    selectedEdgeId.value = null;
    resetExecution();
  }

  /** 点击边 → 选中边 */
  function handleEdgeClick({ edge }: EdgeMouseEvent) {
    selectedEdgeId.value = edge.id;
  }

  // ---- 返回 ----
  // 所有子组件通过解构这个返回值来获取需要的状态和方法
  return {
    // 状态
    nodes,
    edges,
    selectedNodeId,
    draftNodeData,
    dragResource,
    executionState,
    isStepping,

    // 计算属性
    selectedNode,
    selectedNodeIsService,
    canSaveNodeData,
    canStartExecution,
    canStepExecution,
    canRunExecution,
    canPauseExecution,
    canResetExecution,
    executionStepCount,

    // MiniMap 颜色
    nodeColor,
    nodeStrokeColor,

    // 画布事件
    handleInit,
    handleNodeClick,
    handlePaneClick,

    // 连线
    handleConnect,

    // 拖放
    applyTemplate,
    handleDragStart,
    handleCanvasDragOver,
    handleCanvasDrop,

    // 节点编辑
    handleSaveNode,

    // 保存 / 恢复
    handleSaveToLocal,
    handleRestoreFromLocal,

    // 执行
    startExecution,
    stepExecution,
    runExecution,
    pauseExecution,
    resetExecution,

    // 删除
    handleDeleteSelectedNode,
    handleDeleteSelectedEdge,

    // 边选中
    selectedEdgeId,
    handleEdgeClick
  };
}
