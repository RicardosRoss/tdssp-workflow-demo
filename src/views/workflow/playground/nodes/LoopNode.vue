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
    <p class="wf-node__meta">{{ data.expression }}</p>
    <div class="wf-node__chips">
      <span>{{ data.iterationType }}</span>
      <span v-if="data.maxIterations">MAX {{ data.maxIterations }}</span>
      <span>STEP {{ data.loopIndex ?? 0 }}</span>
      <span v-if="data.lastRouteKey">{{ data.lastRouteKey }}</span>
    </div>
    <Handle id="in" type="target" :position="Position.Left" />
    <Handle
      id="loop-body"
      type="source"
      :position="Position.Right"
      :style="{ top: '36%' }"
    />
    <Handle
      id="done"
      type="source"
      :position="Position.Bottom"
      :style="{ left: '50%' }"
    />
  </div>
</template>
