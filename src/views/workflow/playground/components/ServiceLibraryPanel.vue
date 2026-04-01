<script setup lang="ts">
defineProps<{
  tabs: Array<{
    key: string;
    label: string;
    description: string;
  }>;
  activeTab: string;
  items: Array<{
    id: string | number;
    name: string;
    summary: string;
    badge?: string;
    dragKind: "template" | "service" | "dataset" | "loop";
    serviceType?: string;
    graph?: {
      nodes?: unknown[];
      edges?: unknown[];
    };
  }>;
}>();

defineEmits<{
  dragStart: [
    item: {
      id: string | number;
      name: string;
      summary: string;
      badge?: string;
      dragKind: "template" | "service" | "dataset" | "loop";
      serviceType?: string;
      graph?: {
        nodes?: unknown[];
        edges?: unknown[];
      };
    }
  ];
  itemClick: [
    item: {
      id: string | number;
      name: string;
      summary: string;
      badge?: string;
      dragKind: "template" | "service" | "dataset" | "loop";
      serviceType?: string;
      graph?: {
        nodes?: unknown[];
        edges?: unknown[];
      };
    }
  ];
  tabChange: [tab: string];
  saveToLocal: [];
  restoreFromLocal: [];
}>();
</script>

<template>
  <div class="leftPanel">
    <div class="panel-card">
      <span class="panel-card__eyebrow">RESOURCE LIBRARY</span>
      <strong class="panel-card__title">资源库</strong>
      <p class="panel-card__hint">
        训练流点击或拖入画布即可替换当前工作流，组件库和数据集拖入后生成节点。
      </p>
      <div class="panel-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="panel-tab"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="$emit('tabChange', tab.key)"
        >
          <strong>{{ tab.label }}</strong>
          <small>{{ tab.description }}</small>
        </button>
      </div>
      <ul class="service-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="service-item"
          :class="{ 'service-item--clickable': item.dragKind === 'template' }"
          draggable="true"
          @dragstart="$emit('dragStart', item)"
          @click="item.dragKind === 'template' && $emit('itemClick', item)"
        >
          <div class="service-item__body">
            <span class="service-item__name">{{ item.name }}</span>
            <span class="service-item__summary">{{ item.summary }}</span>
          </div>
          <span v-if="item.badge" class="service-item__category">
            {{ item.badge }}
          </span>
        </li>
      </ul>
      <div class="panel-actions">
        <button
          type="button"
          class="panel-actions__btn panel-actions__btn--primary"
          @click="$emit('saveToLocal')"
        >
          保存到本地
        </button>
        <button
          type="button"
          class="panel-actions__btn"
          @click="$emit('restoreFromLocal')"
        >
          从本地恢复
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.leftPanel {
  flex: 0 0 260px;
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 70vh;
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

.panel-tabs {
  display: flex;
  gap: 6px;
}

.panel-tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 8px 6px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dbe7ff;
  border-radius: 10px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.panel-tab strong {
  font-size: 13px;
  color: #22304b;
}

.panel-tab small {
  font-size: 10px;
  color: #6f7f9f;
}

.panel-tab.is-active {
  background: #eef5ff;
  border-color: #8fb1ff;
}

.service-list {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.service-item {
  display: flex;
  gap: 12px;
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

.service-item--clickable {
  cursor: pointer;
}

.service-item--clickable:active {
  cursor: pointer;
}

.service-item__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.service-item__name {
  font-size: 13px;
  font-weight: 700;
  color: #22304b;
}

.service-item__summary {
  font-size: 12px;
  line-height: 1.5;
  color: #6f7f9f;
}

.service-item__category {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #5b7cc4;
  background: #e8efff;
  border-radius: 999px;
}

.panel-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #dbe7ff;
}

.panel-actions__btn {
  flex: 1;
  padding: 7px 0;
  font-size: 12px;
  font-weight: 600;
  color: #22304b;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.panel-actions__btn:hover {
  border-color: #8fb1ff;
  box-shadow: 0 2px 8px rgb(91 124 196 / 12%);
}

.panel-actions__btn--primary {
  color: #fff;
  background: #5b7cc4;
  border-color: #5b7cc4;
}

.panel-actions__btn--primary:hover {
  background: #4a6bb3;
  border-color: #4a6bb3;
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
