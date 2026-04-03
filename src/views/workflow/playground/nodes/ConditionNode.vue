<!--
  ConditionNode — 条件分支节点
  根据表达式求值结果走 "yes" 或 "no" 分支。
  有两个出口 Handle：yes（右侧）和 no（底部）。
  运行时高亮命中的分支。
-->
<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div
    class="wf-node wf-node-condition"
    :class="[
      `is-${data.runStatus ?? 'idle'}`,
      { 'is-current': data.isCurrent }
    ]"
  >
    <span class="wf-node__eyebrow">CONDITION</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <!-- 显示条件表达式 -->
    <p class="wf-node__meta">{{ data.expression }}</p>
    <!-- 分支标签，运行时高亮命中的分支 -->
    <div class="wf-node__branches">
      <span :class="{ 'is-active-branch': data.lastRouteKey === 'yes' }"
        >YES</span
      >
      <span :class="{ 'is-active-branch': data.lastRouteKey === 'no' }"
        >NO</span
      >
    </div>
    <p class="wf-node__runtime">状态 {{ data.runStatus ?? "idle" }}</p>
    <!-- 左侧入口 -->
    <Handle id="in" type="target" :position="Position.Left" />
    <!-- YES 分支出口（右侧偏上） -->
    <Handle
      id="yes"
      type="source"
      :position="Position.Right"
      :style="{ top: '36%' }"
    />
    <!-- NO 分支出口（底部居中） -->
    <Handle
      id="no"
      type="source"
      :position="Position.Bottom"
      :style="{ left: '50%' }"
    />
  </div>
</template>
