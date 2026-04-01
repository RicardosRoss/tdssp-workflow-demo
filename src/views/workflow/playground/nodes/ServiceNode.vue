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
    <p class="wf-node__meta">{{ data.summary }}</p>
    <div class="wf-node__chips">
      <span>{{ data.serviceType }}</span>
      <span>ID {{ data.serviceId }}</span>
      <span>{{ data.runStatus ?? "idle" }}</span>
      <span v-if="data.lastRouteKey">{{ data.lastRouteKey }}</span>
    </div>
    <p
      v-if="data.lastErrorMessage"
      class="wf-node__runtime wf-node__runtime-error"
    >
      {{ data.lastErrorMessage }}
    </p>
    <Handle id="in" type="target" :position="Position.Left" />
    <Handle id="out" type="source" :position="Position.Right" />
  </div>
</template>
