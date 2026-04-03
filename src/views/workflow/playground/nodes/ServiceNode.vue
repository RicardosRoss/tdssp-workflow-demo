<!--
  ServiceNode — 数据服务节点
  表示一次数据服务调用（如数据预处理、模型计算等）。
  有左侧入口和右侧出口，执行时调用后端 API。
  运行时显示服务类型、ID、执行状态和错误信息。
-->
<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div
    class="wf-node wf-node-service"
    :class="[
      `is-${data.runStatus ?? 'idle'}`,
      { 'is-current': data.isCurrent }
    ]"
  >
    <span class="wf-node__eyebrow">DATA SERVICE</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <!-- 服务摘要描述 -->
    <p class="wf-node__meta">{{ data.summary }}</p>
    <!-- 标签区：服务类型、服务 ID、运行状态、上次路由键 -->
    <div class="wf-node__chips">
      <span>{{ data.serviceType }}</span>
      <span>ID {{ data.serviceId }}</span>
      <span>{{ data.runStatus ?? "idle" }}</span>
      <span v-if="data.lastRouteKey">{{ data.lastRouteKey }}</span>
    </div>
    <!-- 执行失败时显示错误信息 -->
    <p
      v-if="data.lastErrorMessage"
      class="wf-node__runtime wf-node__runtime-error"
    >
      {{ data.lastErrorMessage }}
    </p>
    <!-- 左侧入口 -->
    <Handle id="in" type="target" :position="Position.Left" />
    <!-- 右侧出口 -->
    <Handle id="out" type="source" :position="Position.Right" />
  </div>
</template>
