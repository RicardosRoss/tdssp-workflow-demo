<!--
  ServiceLibraryPanel — 左侧服务库面板

  职责：
  - 展示可拖拽的服务列表
  - 触发 dragstart 事件，将服务信息传递给画布

  通信方式：
  - props：services（服务列表）、dragService（当前正在拖拽的服务）
  - emits：dragStart（拖拽开始时通知父组件记录中间态）

  为什么单独拆：
  - 这块 UI 完全是静态列表 + 拖拽起点，不依赖 VueFlow 实例
  - 可以独立理解、独立测试
-->
<script setup lang="ts">
import type { PlaygroundService } from "@/api/workflow-playground";

defineProps<{
  /** 可用的服务列表 */
  services: PlaygroundService[];
}>();

defineEmits<{
  /**
   * 用户开始拖拽某个服务
   * @param service 被拖拽的服务对象
   */
  dragStart: [service: PlaygroundService];
}>();
</script>

<template>
  <div class="leftPanel">
    <div class="panel-card">
      <span class="panel-card__eyebrow">SERVICE LIBRARY</span>
      <strong class="panel-card__title">服务库</strong>
      <p class="panel-card__hint">拖拽下方服务到右侧画布，即可创建服务节点。</p>
      <ul class="service-list">
        <li
          v-for="item in services"
          :key="item.id"
          class="service-item"
          draggable="true"
          @dragstart="$emit('dragStart', item)"
        >
          <span class="service-item__name">{{ item.name }}</span>
          <span class="service-item__category">{{ item.category }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.leftPanel {
  flex: 0 0 200px;
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 70vh;
  padding: 22px 20px;
  background:
    radial-gradient(
      circle at top right,
      rgb(216 227 255 / 55%),
      transparent 32%
    ),
    linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  border: 1px solid #dbe7ff;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgb(31 51 96 / 8%);
}

.panel-card__eyebrow {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #5b7cc4;
  letter-spacing: 0.12em;
}

.panel-card__title {
  font-size: 22px;
  line-height: 1.3;
  color: #22304b;
}

.panel-card__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #5f6f92;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.service-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: grab;
  background: #fff;
  border: 1px solid #dbe7ff;
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.service-item:hover {
  border-color: #8fb1ff;
  box-shadow: 0 4px 12px rgb(91 124 196 / 12%);
}

.service-item:active {
  cursor: grabbing;
}

.service-item__name {
  font-size: 13px;
  font-weight: 700;
  color: #22304b;
}

.service-item__category {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #5b7cc4;
  background: #e8efff;
  border-radius: 999px;
}

@media (width <= 1080px) {
  .leftPanel {
    flex-basis: auto;
  }

  .panel-card {
    min-height: auto;
  }
}
</style>
