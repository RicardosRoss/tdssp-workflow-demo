<!--
  EndNode — 工作流出口节点
  表示流程的终点，只有左侧入口 Handle，无出口。
  到达此节点表示工作流执行完成。
-->
<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div
    class="wf-node wf-node-end"
    :class="[
      `is-${data.runStatus ?? 'idle'}`,
      { 'is-current': data.isCurrent }
    ]"
  >
    <span class="wf-node__eyebrow">OUTPUT</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <p class="wf-node__meta">汇总执行结果并结束流程</p>
    <div class="wf-node__chips">
      <span>{{ data.runStatus ?? "idle" }}</span>
    </div>
    <!-- 只有左侧入口（target），流程到这里结束 -->
    <Handle id="in" type="target" :position="Position.Left" />
  </div>
</template>
