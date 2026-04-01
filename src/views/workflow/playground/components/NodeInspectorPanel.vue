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
import { computed } from "vue";
import type { Node } from "@vue-flow/core";
import type { NodePanelDraft } from "../node-panel";

const props = defineProps<{
  /** 当前选中的节点，null 表示未选中任何节点 */
  selectedNode: Node | null;
  /** 选中的是否为 service 类型 */
  selectedNodeIsService: boolean;
  /** 保存按钮是否可用 */
  canSave: boolean;
  executionContext: Record<string, unknown>;
}>();

const draftNodeData = defineModel<NodePanelDraft>("draftNodeData", {
  required: true
});

defineEmits<{
  /** 用户请求保存编辑内容 */
  save: [];
  /** 用户请求删除当前选中节点 */
  delete: [];
}>();

const selectedNodeIsCondition = computed(
  () => props.selectedNode?.type === "condition"
);
const selectedNodeIsLoop = computed(() => props.selectedNode?.type === "loop");

function formatJson(value: unknown) {
  if (value == null || value === "") {
    return "暂无";
  }

  return JSON.stringify(value, null, 2);
}
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
          点击不同节点后，这里的上下文会切换。保存时只会更新当前节点的 `data`
          配置，并同步清空当前运行态。
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

          <label class="panel-field">
            <span class="panel-field__label">输出上下文 Key</span>
            <input
              v-model="draftNodeData.outputKey"
              class="panel-input"
              type="text"
              placeholder="例如 preprocessResult"
              @keydown.enter.prevent="$emit('save')"
            />
          </label>
        </template>

        <template v-if="selectedNodeIsCondition">
          <label class="panel-field">
            <span class="panel-field__label">条件表达式</span>
            <textarea
              v-model="draftNodeData.expression"
              class="panel-textarea"
              rows="4"
              placeholder="例如 $.preprocessResult.count > 1000"
            />
          </label>
        </template>

        <template v-if="selectedNodeIsLoop">
          <label class="panel-field">
            <span class="panel-field__label">循环表达式</span>
            <textarea
              v-model="draftNodeData.expression"
              class="panel-textarea"
              rows="3"
              placeholder="例如 for item in dataset"
            />
          </label>

          <label class="panel-field">
            <span class="panel-field__label">集合路径</span>
            <input
              v-model="draftNodeData.itemsPath"
              class="panel-input"
              type="text"
              placeholder="例如 $.items"
              @keydown.enter.prevent="$emit('save')"
            />
          </label>

          <label class="panel-field">
            <span class="panel-field__label">循环变量名</span>
            <input
              v-model="draftNodeData.itemName"
              class="panel-input"
              type="text"
              placeholder="例如 item"
              @keydown.enter.prevent="$emit('save')"
            />
          </label>

          <label class="panel-field">
            <span class="panel-field__label">最大迭代次数</span>
            <input
              v-model="draftNodeData.maxIterations"
              class="panel-input"
              type="number"
              min="1"
              placeholder="例如 1000"
              @keydown.enter.prevent="$emit('save')"
            />
          </label>
        </template>

        <div class="panel-runtime">
          <span class="panel-runtime__title">运行态</span>
          <dl class="panel-card__meta">
            <div>
              <dt>节点状态</dt>
              <dd>{{ selectedNode.data?.runStatus ?? "idle" }}</dd>
            </div>
            <div>
              <dt>命中分支</dt>
              <dd>{{ selectedNode.data?.lastRouteKey || "暂无" }}</dd>
            </div>
          </dl>
          <label class="panel-field">
            <span class="panel-field__label">最近一次输入</span>
            <pre class="panel-code">{{
              formatJson(selectedNode.data?.lastInput)
            }}</pre>
          </label>
          <label class="panel-field">
            <span class="panel-field__label">最近一次输出</span>
            <pre class="panel-code">{{
              formatJson(selectedNode.data?.lastOutput)
            }}</pre>
          </label>
          <label class="panel-field">
            <span class="panel-field__label">最近一次错误</span>
            <pre class="panel-code">{{
              formatJson(selectedNode.data?.lastErrorMessage)
            }}</pre>
          </label>
          <label class="panel-field">
            <span class="panel-field__label">当前上下文</span>
            <pre class="panel-code">{{ formatJson(executionContext) }}</pre>
          </label>
        </div>

        <button
          class="panel-save"
          type="button"
          :disabled="!canSave"
          @click="$emit('save')"
        >
          保存节点配置
        </button>

        <!-- 删除按钮 -->
        <button class="panel-delete" type="button" @click="$emit('delete')">
          删除此节点
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

.panel-runtime {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: rgb(248 251 255 / 90%);
  border: 1px solid #dbe7ff;
  border-radius: 14px;
}

.panel-runtime__title {
  font-size: 12px;
  font-weight: 800;
  color: #5b7cc4;
  letter-spacing: 0.08em;
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

.panel-code {
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.55;
  color: #2b3d5d;
  word-break: break-word;
  white-space: pre-wrap;
  background: #fff;
  border: 1px solid #d6e2ff;
  border-radius: 12px;
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

.panel-delete {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #b45460;
  cursor: pointer;
  background: transparent;
  border: 1px solid #efc2c8;
  border-radius: 12px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.panel-delete:hover {
  background: #ffe5e8;
  border-color: #d98592;
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
