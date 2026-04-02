<!--
  index.vue — 工作流 Playground 容器页

  职责：
  - 组装左 / 中 / 右三个子组件
  - 调用 composable 获取全局状态和方法
  - 注册自定义节点类型（nodeTypes）
  - 将 composable 的方法和子组件的事件对接

  注意：
  - 本文件不应包含业务逻辑，只做"接线"
  - 状态和行为全部来自 useWorkflowPlayground composable
  - 样式只保留布局级和节点主题穿透样式
-->
<script setup lang="ts">
import { computed, markRaw, onMounted, ref } from "vue";
import { ElMessageBox } from "element-plus";
import type {
  Connection,
  EdgeMouseEvent,
  NodeMouseEvent
} from "@vue-flow/core";

// vue-flow 样式（必须引入）
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

// 自定义节点组件
import ConditionNode from "./nodes/ConditionNode.vue";
import EndNode from "./nodes/EndNode.vue";
import LoopNode from "./nodes/LoopNode.vue";
import ServiceNode from "./nodes/ServiceNode.vue";
import StartNode from "./nodes/StartNode.vue";

// 子组件
import NodeInspectorPanel from "./components/NodeInspectorPanel.vue";
import ServiceLibraryPanel from "./components/ServiceLibraryPanel.vue";
import WorkflowCanvas from "./components/WorkflowCanvas.vue";

// 核心状态和行为
import { useWorkflowPlayground } from "./composables/useWorkflowPlayground";
import { workflowResourceTabs } from "./resource-library.mjs";
import { useResourceLibrary } from "./composables/useResourceLibrary";

// ---------------------------------------------------------------------------
// 自定义节点类型映射
// markRaw 避免 Vue 对组件对象做深层响应式代理（官方推荐）
// ---------------------------------------------------------------------------
const nodeTypes = {
  start: markRaw(StartNode),
  end: markRaw(EndNode),
  condition: markRaw(ConditionNode),
  loop: markRaw(LoopNode),
  service: markRaw(ServiceNode)
};

const {
  services: dynamicServices,
  datasets: dynamicDatasets,
  templates: dynamicTemplates,
  loops: dynamicLoops,
  servicesLoading,
  datasetsLoading,
  fetchServices,
  fetchDatasets,
  fetchTemplates,
  fetchLoops
} = useResourceLibrary();

onMounted(() => {
  fetchServices();
  fetchDatasets();
  fetchTemplates();
  fetchLoops();
});

const activeResourceTab = ref<"template" | "service" | "dataset">("template");

function handleResourceTabChange(tab: string) {
  activeResourceTab.value = tab as typeof activeResourceTab.value;
}

function onResourceDragStart(item: {
  id: string | number;
  name: string;
  summary: string;
  badge?: string;
  dragKind: "template" | "service" | "dataset" | "loop";
  serviceType?: string;
  graph?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
}) {
  handleDragStart(item as any);
}

async function onTemplateClick(item: {
  name: string;
  dragKind: "template" | "service" | "dataset" | "loop";
  graph?: { nodes?: unknown[]; edges?: unknown[] };
}) {
  if (item.dragKind !== "template") return;

  try {
    await ElMessageBox.confirm(
      `即将用「${item.name}」替换当前画布，当前工作流将被覆盖，是否继续？`,
      "加载训练流模板",
      {
        confirmButtonText: "确认加载",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
    applyTemplate(item as Parameters<typeof applyTemplate>[0]);
  } catch {
    // 用户取消，无需操作
  }
}

const resourceItems = computed(() => {
  if (activeResourceTab.value === "template") {
    return dynamicTemplates.value.map(item => ({
      ...item,
      dragKind: "template" as const,
      badge: "训练流"
    }));
  }

  if (activeResourceTab.value === "dataset") {
    return dynamicDatasets.value;
  }

  return [
    ...dynamicServices.value,
    ...dynamicLoops.value.map(item => ({
      ...item,
      dragKind: "loop" as const,
      badge: item.category
    }))
  ];
});
// ---------------------------------------------------------------------------
// 从 composable 解构所有状态和方法
// ---------------------------------------------------------------------------
const {
  // 状态
  nodes,
  edges,
  draftNodeData,
  executionState,
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
  handleDragStart,
  handleCanvasDragOver,
  handleCanvasDrop,
  applyTemplate,
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
  handleEdgeClick
} = useWorkflowPlayground();

// ---------------------------------------------------------------------------
// 事件中转：把子组件 emit 的事件桥接到 composable 方法
// ---------------------------------------------------------------------------

function onCanvasDrop(event: DragEvent) {
  handleCanvasDrop(event);
}

function onCanvasDragOver(event: DragEvent) {
  handleCanvasDragOver(event);
}

function onConnect(connection: Connection) {
  handleConnect(connection);
}

function onNodeClick(event: NodeMouseEvent) {
  handleNodeClick(event);
}

function onEdgeClick(event: EdgeMouseEvent) {
  handleEdgeClick(event);
}

const currentExecutionNodeLabel = computed(() => {
  const ids = executionState.value.activeNodeIds;
  if (!ids.length) {
    return "";
  }

  return ids
    .map(id => {
      const node = nodes.value.find(n => n.id === id);
      return String(node?.data?.label ?? id);
    })
    .join(", ");
});
</script>

<template>
  <div class="playground-page">
    <!-- 顶部：执行工具栏 -->
    <div class="execution-toolbar">
      <div class="execution-toolbar__info">
        <span class="execution-toolbar__status">
          状态 {{ executionState.status }}
        </span>
        <span class="execution-toolbar__divider">|</span>
        <span>活跃节点 {{ currentExecutionNodeLabel || "未启动" }}</span>
        <span class="execution-toolbar__divider">|</span>
        <span>已执行 {{ executionStepCount }} 步</span>
      </div>
      <div class="execution-toolbar__actions">
        <button
          type="button"
          :disabled="!canStartExecution"
          @click="() => startExecution()"
        >
          启动
        </button>
        <button
          type="button"
          :disabled="!canStepExecution"
          @click="stepExecution"
        >
          单步
        </button>
        <button
          type="button"
          :disabled="!canRunExecution"
          @click="runExecution"
        >
          自动运行
        </button>
        <button
          type="button"
          :disabled="!canPauseExecution"
          @click="pauseExecution"
        >
          暂停
        </button>
        <button
          type="button"
          :disabled="!canResetExecution"
          @click="resetExecution"
        >
          重置
        </button>
      </div>
    </div>

    <!-- 下方：三栏布局 -->
    <div class="playground-content">
      <!-- 左侧：服务库 -->
      <ServiceLibraryPanel
        :tabs="workflowResourceTabs"
        :active-tab="activeResourceTab"
        :items="resourceItems"
        @tab-change="handleResourceTabChange"
        @drag-start="onResourceDragStart"
        @item-click="onTemplateClick"
        @save-to-local="handleSaveToLocal"
        @restore-from-local="handleRestoreFromLocal"
      />

      <!-- 中间：画布 -->
      <WorkflowCanvas
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :node-color="nodeColor"
        :node-stroke-color="nodeStrokeColor"
        @init="handleInit"
        @connect="onConnect"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @pane-click="handlePaneClick"
        @canvas-drop="onCanvasDrop"
        @canvas-drag-over="onCanvasDragOver"
      />

      <!-- 右侧：节点详情和编辑 -->
      <NodeInspectorPanel
        v-model:draft-node-data="draftNodeData"
        :selected-node="selectedNode"
        :selected-node-is-service="selectedNodeIsService"
        :can-save="canSaveNodeData"
        :execution-context="executionState.context"
        @save="handleSaveNode"
        @delete="handleDeleteSelectedNode"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@media (width <= 1080px) {
  .playground-page {
    flex-direction: column;
  }

  .playground-content {
    flex-direction: column;
  }
}

.playground-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.execution-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgb(255 255 255 / 94%);
  border: 1px solid #dbe7ff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgb(31 51 96 / 12%);
  backdrop-filter: blur(12px);
}

.execution-toolbar__info {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: #4a5b7d;
}

.execution-toolbar__status {
  font-weight: 700;
  color: #22304b;
}

.execution-toolbar__divider {
  color: #d0d9ef;
}

.execution-toolbar__actions {
  display: flex;
  gap: 8px;
}

.execution-toolbar__actions button {
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #29406d;
  cursor: pointer;
  background: linear-gradient(180deg, #fff 0%, #edf3ff 100%);
  border: 1px solid #c8d8ff;
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.execution-toolbar__actions button:hover:not(:disabled) {
  border-color: #8fb1ff;
  box-shadow: 0 8px 18px rgb(91 124 196 / 18%);
  transform: translateY(-1px);
}

.execution-toolbar__actions button:disabled {
  color: #92a0bd;
  cursor: not-allowed;
  background: #f4f7fc;
  border-color: #dbe4f5;
  box-shadow: none;
}

.playground-content {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

/*
 * 节点主题样式
 *
 * 这些样式需要用 :deep() 穿透 scoped 边界，因为 VueFlow 的节点
 * 是动态渲染在子组件的 DOM 树中的。放在 index.vue 是因为：
 * - 只有这一页用到这些节点样式
 * - 节点组件本身（nodes/*.vue）不包含样式，方便统一管理
 */
:deep(.wf-node) {
  --wf-node-accent: #5b7cc4;
  --wf-node-accent-soft: #dfe9ff;
  --wf-node-edge: #bfd3ff;
  --wf-node-edge-strong: #8fb1ff;
  --wf-node-surface: linear-gradient(180deg, #fff 0%, #f6f9ff 100%);
  --wf-node-shadow: rgb(52 92 170 / 12%);

  position: relative;
  box-sizing: border-box;
  width: 208px;
  padding: 16px 18px 18px;
  color: #1f2a44;
  background: var(--wf-node-surface);
  border: 1px solid var(--wf-node-edge);
  border-radius: 18px;
  box-shadow:
    0 18px 40px var(--wf-node-shadow),
    inset 0 1px 0 rgb(255 255 255 / 70%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

:deep(.wf-node.is-current) {
  border-color: var(--wf-node-accent);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 88%),
    0 0 0 5px color-mix(in srgb, var(--wf-node-accent) 28%, transparent),
    0 24px 48px var(--wf-node-shadow);
}

:deep(.wf-node.is-running) {
  transform: translateY(-2px);
}

:deep(.wf-node.is-success) {
  border-color: color-mix(in srgb, var(--wf-node-accent) 68%, #5ad39a);
}

:deep(.wf-node.is-error) {
  border-color: #d36a76;
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 88%),
    0 0 0 5px rgb(211 106 118 / 18%),
    0 24px 48px rgb(180 84 96 / 16%);
}

:deep(.wf-node::before) {
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  content: "";
  background: linear-gradient(
    90deg,
    var(--wf-node-accent) 0%,
    var(--wf-node-accent-soft) 100%
  );
  border-radius: 18px 18px 0 0;
}

:deep(.wf-node__eyebrow) {
  display: block;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--wf-node-accent);
  letter-spacing: 0.1em;
}

:deep(.wf-node__title) {
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
  line-height: 1.3;
  color: #22304b;
}

:deep(.wf-node__meta) {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.55;
  color: #5f6f92;
}

:deep(.wf-node__chips),
:deep(.wf-node__branches) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.wf-node__chips span),
:deep(.wf-node__branches span) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--wf-node-accent);
  background: var(--wf-node-accent-soft);
  border: 1px solid rgb(255 255 255 / 65%);
  border-radius: 999px;
}

:deep(.wf-node__runtime) {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #425677;
}

:deep(.wf-node__runtime-error) {
  color: #b45460;
}

:deep(.wf-node__branches .is-active-branch) {
  color: #fff;
  background: var(--wf-node-accent);
  border-color: transparent;
}

/* ---- 节点类型专属样式 ---- */

:deep(.wf-node-start) {
  --wf-node-accent: #1f8b67;
  --wf-node-accent-soft: #dff6ec;
  --wf-node-edge: #bae5d3;
  --wf-node-edge-strong: #7ac9a4;
  --wf-node-surface: linear-gradient(180deg, #fff 0%, #f2fbf7 100%);
  --wf-node-shadow: rgb(31 139 103 / 12%);

  width: 188px;
}

:deep(.wf-node-service) {
  --wf-node-accent: #5b7cc4;
  --wf-node-accent-soft: #e8efff;
  --wf-node-edge: #bfd3ff;
  --wf-node-edge-strong: #8fb1ff;
  --wf-node-surface: linear-gradient(180deg, #fff 0%, #f6f9ff 100%);
  --wf-node-shadow: rgb(52 92 170 / 12%);
}

:deep(.wf-node-condition) {
  --wf-node-accent: #b06a1d;
  --wf-node-accent-soft: #fff0dc;
  --wf-node-edge: #f0d1a7;
  --wf-node-edge-strong: #d8a15a;
  --wf-node-surface: linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%);
  --wf-node-shadow: rgb(176 106 29 / 12%);

  width: 224px;
}

:deep(.wf-node-end) {
  --wf-node-accent: #b45460;
  --wf-node-accent-soft: #ffe5e8;
  --wf-node-edge: #efc2c8;
  --wf-node-edge-strong: #d98592;
  --wf-node-surface: linear-gradient(180deg, #fff 0%, #fff7f8 100%);
  --wf-node-shadow: rgb(180 84 96 / 12%);

  width: 188px;
}

:deep(.wf-node-loop) {
  --wf-node-accent: #9c6bce;
  --wf-node-accent-soft: #f3e5ff;
  --wf-node-edge: #e8b4ff;
  --wf-node-edge-strong: #d8a1ff;
  --wf-node-surface: linear-gradient(180deg, #fff 0%, #faf7ff 100%);
  --wf-node-shadow: rgb(156 107 206 / 12%);

  width: 224px;
}

/* start / end 节点没有 meta 摘要行，去掉底部间距 */
:deep(.wf-node-start .wf-node__meta),
:deep(.wf-node-end .wf-node__meta) {
  margin-bottom: 0;
}

/* condition 节点的分支标签左右对齐 */
:deep(.wf-node-condition .wf-node__branches) {
  justify-content: space-between;
}

:deep(.wf-node-condition .wf-node__branches span) {
  justify-content: center;
  min-width: 74px;
}

/* 清除 VueFlow 对自定义节点的默认样式 */
:deep(.vue-flow__node-start),
:deep(.vue-flow__node-service),
:deep(.vue-flow__node-condition),
:deep(.vue-flow__node-loop),
:deep(.vue-flow__node-end) {
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

/* hover 效果 */
:deep(.vue-flow__node-start:hover .wf-node),
:deep(.vue-flow__node-service:hover .wf-node),
:deep(.vue-flow__node-condition:hover .wf-node),
:deep(.vue-flow__node-loop:hover .wf-node),
:deep(.vue-flow__node-end:hover .wf-node) {
  border-color: var(--wf-node-edge-strong);
  box-shadow:
    0 24px 48px var(--wf-node-shadow),
    inset 0 1px 0 rgb(255 255 255 / 75%);
  transform: translateY(-1px);
}

/* 选中效果 */
:deep(.vue-flow__node-start.selected .wf-node),
:deep(.vue-flow__node-start:focus-visible .wf-node),
:deep(.vue-flow__node-service.selected .wf-node),
:deep(.vue-flow__node-service:focus-visible .wf-node),
:deep(.vue-flow__node-condition.selected .wf-node),
:deep(.vue-flow__node-condition:focus-visible .wf-node),
:deep(.vue-flow__node-loop.selected .wf-node),
:deep(.vue-flow__node-loop:focus-visible .wf-node),
:deep(.vue-flow__node-end.selected .wf-node),
:deep(.vue-flow__node-end:focus-visible .wf-node) {
  border-color: var(--wf-node-accent);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 85%),
    0 0 0 4px color-mix(in srgb, var(--wf-node-accent) 22%, transparent),
    0 24px 48px var(--wf-node-shadow);
}

/* Handle（连接点）样式 */
:deep(.wf-node .vue-flow__handle) {
  width: 12px;
  height: 12px;
  background: var(--wf-node-accent);
  border: 2px solid #fff;
  box-shadow: 0 0 0 3px rgb(255 255 255 / 65%);
}

/* 布局 */
</style>
