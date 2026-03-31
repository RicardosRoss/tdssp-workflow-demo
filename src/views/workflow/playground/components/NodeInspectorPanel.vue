<!--
  NodeInspectorPanel — 右侧节点详情和编辑面板

  职责：
  - 显示当前选中节点的基本信息（ID、类型）
  - 提供节点标题编辑输入框
  - 如果是 service 类型节点，额外提供"服务摘要"和"服务 ID"编辑
  - 保存按钮将编辑内容写回节点 data

  通信方式：
  - props：
    - selectedNode：当前选中的 Node 对象（null 表示未选中）
    - selectedNodeIsService：选中节点是否为 service 类型
    - draftNodeData：编辑草稿（v-model 双向绑定）
    - canSave：保存按钮是否可用
  - emits：
    - save：用户点击保存或回车

  为什么单独拆：
  - 边界最清晰：右侧面板只依赖"当前节点"这一个数据源
  - 和 node-panel.ts 天然配合（draft 类型、isServiceNode 判断都已有）
  - 可以独立测试：传入不同 props 就能渲染不同状态
-->
<script setup lang="ts">
import type { Node } from "@vue-flow/core";
import type { NodePanelDraft } from "../node-panel";

defineProps<{
  /** 当前选中的节点，null 表示未选中任何节点 */
  selectedNode: Node | null;
  /** 选中的是否为 service 类型 */
  selectedNodeIsService: boolean;
  /** 保存按钮是否可用 */
  canSave: boolean;
}>();

const draftNodeData = defineModel<NodePanelDraft>("draftNodeData", {
  required: true
});

defineEmits<{
  /** 用户请求保存编辑内容 */
  save: [];
}>();
</script>

<template>
  <div class="rightPanel">
    <div class="panel-card">
      <!-- 已选中节点 → 显示详情和编辑表单 -->
      <template v-if="selectedNode">
        <span class="panel-card__eyebrow">NODE DETAIL</span>
        <strong class="panel-card__title">
          {{ selectedNode.data?.label ?? selectedNode.id }}
        </strong>
        <p class="panel-card__hint">
          点击不同节点后，这里的上下文会切换。保存时只会更新当前节点的
          `data.label`。
        </p>

        <!-- 节点元信息（只读） -->
        <dl class="panel-card__meta">
          <div>
            <dt>节点 ID</dt>
            <dd>{{ selectedNode.id }}</dd>
          </div>
          <div>
            <dt>节点类型</dt>
            <dd>{{ selectedNode.type ?? "default" }}</dd>
          </div>
        </dl>

        <!-- 所有节点都可编辑的字段：标题 -->
        <label class="panel-field">
          <span class="panel-field__label">节点标题</span>
          <input
            v-model="draftNodeData.label"
            class="panel-input"
            type="text"
            placeholder="输入新的节点标题"
            @keydown.enter.prevent="$emit('save')"
          />
        </label>

        <!-- service 类型节点额外可编辑：摘要、服务 ID -->
        <template v-if="selectedNodeIsService">
          <label class="panel-field">
            <span class="panel-field__label">服务摘要</span>
            <textarea
              v-model="draftNodeData.summary"
              class="panel-textarea"
              rows="4"
              placeholder="说明这个服务节点做什么"
            />
          </label>

          <label class="panel-field">
            <span class="panel-field__label">服务 ID</span>
            <input
              v-model="draftNodeData.serviceId"
              class="panel-input"
              type="text"
              placeholder="输入服务 ID"
              @keydown.enter.prevent="$emit('save')"
            />
          </label>
        </template>

        <button
          class="panel-save"
          type="button"
          :disabled="!canSave"
          @click="$emit('save')"
        >
          保存节点配置
        </button>
      </template>

      <!-- 未选中节点 → 空状态提示 -->
      <template v-else>
        <span class="panel-card__eyebrow">NODE DETAIL</span>
        <strong class="panel-card__title">未选中节点</strong>
        <p class="panel-card__hint">
          在左侧画布里点一个节点，这里会显示它的基本信息和可编辑字段。
        </p>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.rightPanel {
  flex: 0 0 320px;
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

.panel-card__meta {
  display: grid;
  gap: 12px;
  margin: 0;
}

.panel-card__meta div {
  padding: 12px 14px;
  background: rgb(255 255 255 / 85%);
  border: 1px solid #dbe7ff;
  border-radius: 12px;
}

.panel-card__meta dt {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #6a7ba1;
}

.panel-card__meta dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #22304b;
}

.panel-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-field__label {
  font-size: 13px;
  font-weight: 700;
  color: #314463;
}

.panel-input {
  width: 100%;
  padding: 11px 13px;
  font-size: 14px;
  color: #22304b;
  background: #fff;
  border: 1px solid #c8d8ff;
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.panel-input:focus {
  outline: none;
  border-color: #5b7cc4;
  box-shadow: 0 0 0 3px rgb(91 124 196 / 15%);
}

.panel-textarea {
  width: 100%;
  min-height: 108px;
  padding: 11px 13px;
  font: inherit;
  color: #22304b;
  resize: vertical;
  background: #fff;
  border: 1px solid #c8d8ff;
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.panel-textarea:focus {
  outline: none;
  border-color: #5b7cc4;
  box-shadow: 0 0 0 3px rgb(91 124 196 / 15%);
}

.panel-save {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #5b7cc4 0%, #7b95d8 100%);
  border: 0;
  border-radius: 12px;
  box-shadow: 0 14px 24px rgb(91 124 196 / 22%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.panel-save:hover:not(:disabled) {
  transform: translateY(-1px);
}

.panel-save:disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.5;
}

@media (width <= 1080px) {
  .rightPanel {
    flex-basis: auto;
  }

  .panel-card {
    min-height: auto;
  }
}
</style>
