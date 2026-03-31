<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div class="wf-node wf-node-start">
    <span class="wf-node__eyebrow">ENTRY</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <p class="wf-node__meta">进入工作流并准备上下文</p>
    <Handle id="out" type="source" :position="Position.Right" />
  </div>
</template>
