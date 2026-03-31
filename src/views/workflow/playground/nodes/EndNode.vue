<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div class="wf-node wf-node-end">
    <span class="wf-node__eyebrow">OUTPUT</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <p class="wf-node__meta">汇总执行结果并结束流程</p>
    <Handle id="in" type="target" :position="Position.Left" />
  </div>
</template>
