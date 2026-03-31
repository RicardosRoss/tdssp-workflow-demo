<script setup lang="ts">
import { Handle, Position, type NodeProps } from "@vue-flow/core";

defineProps<NodeProps>();
</script>

<template>
  <div class="wf-node wf-node-condition">
    <span class="wf-node__eyebrow">CONDITION</span>
    <strong class="wf-node__title">{{ data.label }}</strong>
    <p class="wf-node__meta">{{ data.expression }}</p>
    <div class="wf-node__branches">
      <span>YES</span>
      <span>NO</span>
    </div>
    <Handle id="in" type="target" :position="Position.Left" />
    <Handle
      id="yes"
      type="source"
      :position="Position.Right"
      :style="{ top: '36%' }"
    />
    <Handle
      id="no"
      type="source"
      :position="Position.Bottom"
      :style="{ left: '50%' }"
    />
  </div>
</template>
