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
    <div class="wf-node__chips">
      <span>{{ data.runStatus ?? "idle" }}</span>
    </div>
    <Handle id="out" type="source" :position="Position.Right" />
  </div>
</template>
