<!--
  WorkflowCanvas — 中间画布区域

  职责：
  - 渲染 VueFlow 画布（节点、边、背景、小地图、控制器）
  - 接收拖放事件，将服务转为新节点
  - 接收连线事件，创建新边
  - 接收节点点击 / 画布点击，切换选中状态

  通信方式：
  - v-model:nodes / v-model:edges 双向绑定节点和边
  - props：nodeTypes（自定义节点类型映射）
  - emits：init / connect / nodeClick / paneClick / canvasDrop / canvasDragOver
  - 所有事件处理逻辑在 composable 中，本组件只做"绑定"

  为什么单独拆：
  - VueFlow 相关的所有 UI 都集中在这里
  - 可以独立替换画布实现（比如换成其他流程图库）而不影响左右面板
-->
<script setup lang="ts">
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import { PanelPosition, VueFlow } from "@vue-flow/core";
import type {
  Connection,
  Edge,
  EdgeMouseEvent,
  GraphNode,
  Node,
  NodeMouseEvent
} from "@vue-flow/core";
import type { Component } from "vue";

defineProps<{
  /** 自定义节点类型映射 { typeName: Component } */
  nodeTypes: Record<string, Component>;
  /** MiniMap 节点填充色回调 */
  nodeColor: (node: GraphNode) => string;
  /** MiniMap 节点描边色回调 */
  nodeStrokeColor: (node: GraphNode) => string;
}>();

const nodes = defineModel<Node[]>("nodes", { required: true });
const edges = defineModel<Edge[]>("edges", { required: true });

defineEmits<{
  /** VueFlow 初始化完成 */
  init: [];
  /** 用户拉线完成 */
  connect: [connection: Connection];
  /** 点击节点 */
  nodeClick: [event: NodeMouseEvent];
  /** 点击边 */
  edgeClick: [event: EdgeMouseEvent];
  /** 点击画布空白 */
  paneClick: [];
  /** 服务拖放到画布 */
  canvasDrop: [event: DragEvent];
  /** 拖拽经过画布（需要 preventDefault） */
  canvasDragOver: [event: DragEvent];
}>();
</script>

<template>
  <div
    class="demo-page"
    @drop="$emit('canvasDrop', $event)"
    @dragover="$emit('canvasDragOver', $event)"
  >
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      fit-view-on-init
      :node-types="nodeTypes"
      :delete-key-code="['Delete', 'Backspace']"
      @init="$emit('init')"
      @connect="$emit('connect', $event)"
      @node-click="$emit('nodeClick', $event)"
      @edge-click="$emit('edgeClick', $event)"
      @pane-click="$emit('paneClick')"
    >
      <Background pattern="dots" pattern-color="#d8e3ff" :gap="20" />
      <MiniMap
        :node-color="nodeColor"
        :node-stroke-color="nodeStrokeColor"
        :node-border-radius="8"
        zoomable
        pannable
      />
      <Controls :position="PanelPosition.BottomLeft" />
    </VueFlow>
  </div>
</template>

<style lang="scss" scoped>
.demo-page {
  flex: 1 1 auto;
  min-width: 0;
  height: 70vh;
  overflow: hidden;
  background: #f8fbff;
  border: 1px solid #dbe7ff;
  border-radius: 16px;
}
</style>
