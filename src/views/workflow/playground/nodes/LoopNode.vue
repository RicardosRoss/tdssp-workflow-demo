<!--
  LoopNode — 循环节点
  按条件反复执行循环体分支，直到循环结束走 done 分支。
  有两个出口 Handle：loop-body（右侧，继续循环）和 done（底部，循环结束）。
  显示迭代类型、最大次数、当前步数和上次路由键。
-->
<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div
    class="wf-node wf-node-loop"
    :class="[
      `is-${data.runStatus ?? 'idle'}`,
      { 'is-current': data.isCurrent }
    ]"
  >
    <span class="wf-node__eyebrow">LOOP</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <!-- 循环表达式 -->
    <p class="wf-node__meta">{{ data.expression }}</p>
    <!-- 标签区：迭代类型、最大次数、当前步数、路由键 -->
    <div class="wf-node__chips">
      <span>{{ data.iterationType }}</span>
      <span v-if="data.maxIterations">MAX {{ data.maxIterations }}</span>
      <!-- 当前是第几轮迭代 -->
      <span>STEP {{ data.loopIndex ?? 0 }}</span>
      <span v-if="data.lastRouteKey">{{ data.lastRouteKey }}</span>
    </div>
    <!-- 左侧入口 -->
    <Handle id="in" type="target" :position="Position.Left" />
    <!-- 循环体出口（右侧偏上），每轮迭代走这里 -->
    <Handle
      id="loop-body"
      type="source"
      :position="Position.Right"
      :style="{ top: '36%' }"
    />
    <!-- 循环结束出口（底部居中），遍历完后走这里 -->
    <Handle
      id="done"
      type="source"
      :position="Position.Bottom"
      :style="{ left: '50%' }"
    />
  </div>
</template>
