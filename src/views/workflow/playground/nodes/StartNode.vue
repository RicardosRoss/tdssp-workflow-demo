<!--
  StartNode — 工作流入口节点
  表示流程的起点，只有右侧出口 Handle，无入口。
  运行时显示执行状态和是否为当前活跃节点。
-->
<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div
    class="wf-node wf-node-start"
    :class="[
      `is-${data.runStatus ?? 'idle'}`,
      { 'is-current': data.isCurrent }
    ]"
  >
    <span class="wf-node__eyebrow">ENTRY</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <p class="wf-node__meta">进入工作流并准备上下文</p>
    <!-- 运行状态标签 -->
    <div class="wf-node__chips">
      <span>{{ data.runStatus ?? "idle" }}</span>
    </div>
    <!-- 只有右侧出口（source），流程从这里开始向外流动 -->
    <Handle id="out" type="source" :position="Position.Right" />
  </div>
</template>
