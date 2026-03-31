<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div class="wf-node wf-node-service">
    <span class="wf-node__eyebrow">DATA SERVICE</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <p class="wf-node__meta">{{ data.summary }}</p>
    <div class="wf-node__chips">
      <span>{{ data.serviceType }}</span>
      <span>ID {{ data.serviceId }}</span>
    </div>
    <Handle id="in" type="target" :position="Position.Left" />
    <Handle id="out" type="source" :position="Position.Right" />
  </div>
</template>
