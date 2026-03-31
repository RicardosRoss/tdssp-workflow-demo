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
import { markRaw } from "vue";
import type { PlaygroundService } from "@/api/workflow-playground";
import type { Connection, NodeMouseEvent } from "@vue-flow/core";

// vue-flow 样式（必须引入）
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

// 自定义节点组件
import ConditionNode from "./nodes/ConditionNode.vue";
import EndNode from "./nodes/EndNode.vue";
import ServiceNode from "./nodes/ServiceNode.vue";
import StartNode from "./nodes/StartNode.vue";

// 子组件
import NodeInspectorPanel from "./components/NodeInspectorPanel.vue";
import ServiceLibraryPanel from "./components/ServiceLibraryPanel.vue";
import WorkflowCanvas from "./components/WorkflowCanvas.vue";

// 核心状态和行为
import { useWorkflowPlayground } from "./composables/useWorkflowPlayground";

// ---------------------------------------------------------------------------
// 自定义节点类型映射
// markRaw 避免 Vue 对组件对象做深层响应式代理（官方推荐）
// ---------------------------------------------------------------------------
const nodeTypes = {
  start: markRaw(StartNode),
  end: markRaw(EndNode),
  condition: markRaw(ConditionNode),
  service: markRaw(ServiceNode)
};

// ---------------------------------------------------------------------------
// 服务库数据（后续可改为从 API 加载）
// ---------------------------------------------------------------------------
const services: PlaygroundService[] = [
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

// ---------------------------------------------------------------------------
// 从 composable 解构所有状态和方法
// ---------------------------------------------------------------------------
const {
  // 状态
  nodes,
  edges,
  draftNodeData,
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
</script>

<template>
  <div class="playground-page">
    <!-- 左侧：服务库 -->
    <ServiceLibraryPanel :services="services" @drag-start="handleDragStart" />

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
      @save="handleSaveNode"
    />
  </div>
</template>

<style lang="scss" scoped>


@media (width <= 1080px) {
  .playground-page {
    flex-direction: column;
  }
}

.playground-page {
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
