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
import { MarkerType, useVueFlow } from "@vue-flow/core";
import type {
  Connection,
  Edge,
  GraphNode,
  Node,
  NodeMouseEvent
} from "@vue-flow/core";
import type { PlaygroundService } from "@/api/workflow-playground";
import {
  buildNodeDataUpdate,
  createNodeDraft,
  isServiceNode,
  type NodePanelDraft
} from "../node-panel";

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

export function useWorkflowPlayground() {
  // ---- 核心状态 ----
  // 用 ref 持有，通过 v-model:nodes / v-model:edges 与 VueFlow 双向绑定
  const nodes = ref<Node[]>([...initialNodes]);
  const edges = ref<Edge[]>([...initialEdges]);

  // 当前选中节点 ID（null 表示未选中）
  const selectedNodeId = ref<string | null>(null);

  // 右侧面板的编辑草稿，跟踪输入框内容
  const draftNodeData = ref<NodePanelDraft>(createNodeDraft(null));

  // ---- 拖拽中间态 ----
  // 记录"当前从服务库拖出来的那条服务"，drop 后消费并清空
  const dragService = ref<PlaygroundService | null>(null);

  // ---- VueFlow 实例方法 ----
  const { addEdges, fitView, screenToFlowCoordinate, updateNodeData } =
    useVueFlow();

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
      ([key, value]) => String(selectedNode.value?.data?.[key] ?? "") !== value
    );
  });

  // ---- Watch ----

  // 选中节点变化时，重新填充编辑草稿（immediate 保证首次也执行）
  watch(
    selectedNode,
    node => {
      draftNodeData.value = createNodeDraft(node);
    },
    { immediate: true }
  );

  // ---- MiniMap 颜色 ----

  function nodeColor(node: GraphNode) {
    const colorMap: Record<string, string> = {
      start: "#bae5d3",
      service: "#bfd3ff",
      condition: "#f0d1a7",
      end: "#efc2c8"
    };
    return colorMap[node.type ?? "default"] ?? "#5b7cc4";
  }

  function nodeStrokeColor(node: GraphNode) {
    const strokeMap: Record<string, string> = {
      start: "#1f8b67",
      service: "#5b7cc4",
      condition: "#b06a1d",
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

    addEdges([
      makeEdge({
        id: `edge-${connection.source}-${connection.target}-${edges.value.length + 1}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? undefined,
        target: connection.target,
        targetHandle: connection.targetHandle ?? undefined
      })
    ]);
  }

  // ---- 拖放（从服务库拖到画布） ----

  /** 拖拽开始：记住正在拖的是哪个服务 */
  function handleDragStart(service: PlaygroundService) {
    dragService.value = service;
  }

  /** 画布 dragover：必须 preventDefault 才能接收 drop */
  function handleCanvasDragOver(event: DragEvent) {
    event.preventDefault();
  }

  /** 画布 drop：把屏幕坐标转成画布坐标，创建新服务节点 */
  function handleCanvasDrop(event: DragEvent) {
    event.preventDefault();
    if (!dragService.value) {
      return;
    }

    // screenToFlowCoordinate：浏览器屏幕坐标 → VueFlow 画布坐标
    // 因为画布可能被缩放/平移，直接用 clientX/Y 会不准
    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY
    });

    // 不可变更新：创建新数组，不修改原数组
    nodes.value = [
      ...nodes.value,
      {
        id: `service-${Date.now()}`,
        type: "service",
        position,
        data: {
          label: dragService.value.name,
          summary: dragService.value.summary,
          serviceType: dragService.value.serviceType,
          serviceId: dragService.value.id
        }
      }
    ];

    dragService.value = null;
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
  }

  // ---- 返回 ----
  // 所有子组件通过解构这个返回值来获取需要的状态和方法
  return {
    // 状态
    nodes,
    edges,
    selectedNodeId,
    draftNodeData,
    dragService,

    // 计算属性
    selectedNode,
    selectedNodeIsService,
    canSaveNodeData,

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
    handleDragStart,
    handleCanvasDragOver,
    handleCanvasDrop,

    // 节点编辑
    handleSaveNode
  };
}
