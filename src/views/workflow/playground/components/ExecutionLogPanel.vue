<script setup lang="ts">
import dayjs from "dayjs";
import { computed } from "vue";
import {
  buildExecutionLogSummary,
  type WorkflowExecutionLog
} from "../execution-logs";

const props = defineProps<{
  logs: WorkflowExecutionLog[];
  expandedLogId: string | null;
  isSubmitting: boolean;
}>();

defineEmits<{
  toggleLog: [logId: string];
  submitLogs: [];
}>();

const summary = computed(() => buildExecutionLogSummary(props.logs));

function formatTime(value?: string) {
  if (!value) {
    return "暂无";
  }

  return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
}

function formatDuration(value?: number) {
  if (typeof value !== "number") {
    return "进行中";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}s`;
}

function formatValue(value: unknown) {
  if (value == null || value === "") {
    return "暂无";
  }

  return JSON.stringify(value, null, 2);
}

function formatNextNodes(labels: string[]) {
  return labels.length > 0 ? labels.join("、") : "无";
}

function formatStatus(status: WorkflowExecutionLog["status"]) {
  if (status === "success") {
    return "success";
  }

  if (status === "error") {
    return "error";
  }

  return "running";
}
</script>

<template>
  <section class="execution-log-panel">
    <header class="execution-log-panel__header">
      <div>
        <span class="execution-log-panel__eyebrow">RUN LOGS</span>
        <h3 class="execution-log-panel__title">本次运行日志</h3>
      </div>
      <button
        class="execution-log-panel__submit"
        type="button"
        :disabled="!logs.length || isSubmitting"
        @click="$emit('submitLogs')"
      >
        {{ isSubmitting ? "提交中..." : "提交日志到后端" }}
      </button>
    </header>

    <div class="execution-log-panel__summary">
      <span>成功 {{ summary.successCount }}</span>
      <span>失败 {{ summary.errorCount }}</span>
      <span>运行中 {{ summary.runningCount }}</span>
      <span>累计耗时 {{ formatDuration(summary.totalDurationMs) }}</span>
      <span>最近开始 {{ formatTime(summary.latestStartedAt) }}</span>
    </div>

    <div v-if="logs.length === 0" class="execution-log-panel__empty">
      工作流执行后，这里会实时追加当前这一次运行的节点日志。
    </div>

    <div v-else class="execution-log-panel__list">
      <article
        v-for="log in logs"
        :key="log.id"
        class="execution-log-card"
        :class="`is-${log.status}`"
      >
        <button
          type="button"
          class="execution-log-card__summary"
          @click="$emit('toggleLog', log.id)"
        >
          <span
            class="execution-log-card__status"
            :class="`is-${formatStatus(log.status)}`"
          >
            {{ log.status }}
          </span>
          <span>Step {{ log.stepIndex }}</span>
          <span>执行者 {{ log.executor }}</span>
          <span>执行服务 {{ log.serviceName }}</span>
          <span>开始 {{ formatTime(log.startedAt) }}</span>
          <span>耗时 {{ formatDuration(log.durationMs) }}</span>
        </button>

        <div v-if="expandedLogId === log.id" class="execution-log-card__detail">
          <div class="execution-log-card__grid">
            <section class="execution-log-card__block">
              <span class="execution-log-card__label">数据来源</span>
              <pre class="execution-log-card__code">{{
                formatValue(log.dataSource)
              }}</pre>
            </section>

            <section class="execution-log-card__block">
              <span class="execution-log-card__label">数据输出</span>
              <pre class="execution-log-card__code">{{
                formatValue(log.dataOutput)
              }}</pre>
            </section>
          </div>

          <dl class="execution-log-card__meta">
            <div>
              <dt>节点类型</dt>
              <dd>{{ log.nodeType }}</dd>
            </div>
            <div>
              <dt>结束时间</dt>
              <dd>{{ formatTime(log.finishedAt) }}</dd>
            </div>
            <div>
              <dt>下一个节点</dt>
              <dd>{{ formatNextNodes(log.nextNodeLabels) }}</dd>
            </div>
            <div>
              <dt>执行状态</dt>
              <dd>{{ log.status }}</dd>
            </div>
            <div v-if="log.routeKey">
              <dt>命中分支</dt>
              <dd>{{ log.routeKey }}</dd>
            </div>
            <div v-if="log.errorMessage">
              <dt>错误信息</dt>
              <dd>{{ log.errorMessage }}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.execution-log-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background:
    radial-gradient(
      circle at top right,
      rgb(214 228 255 / 85%),
      transparent 32%
    ),
    linear-gradient(
      180deg,
      rgb(255 255 255 / 96%) 0%,
      rgb(246 250 255 / 96%) 100%
    );
  border: 1px solid #dbe7ff;
  border-radius: 20px;
  box-shadow: 0 18px 44px rgb(31 51 96 / 10%);
}

.execution-log-panel__header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.execution-log-panel__eyebrow {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #5b7cc4;
  letter-spacing: 0.12em;
}

.execution-log-panel__title {
  margin: 0;
  font-size: 20px;
  color: #22304b;
}

.execution-log-panel__submit {
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #264374;
  cursor: pointer;
  background: linear-gradient(180deg, #fff 0%, #ebf2ff 100%);
  border: 1px solid #c6d8ff;
  border-radius: 12px;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.execution-log-panel__submit:hover:not(:disabled) {
  border-color: #8fb1ff;
  box-shadow: 0 10px 24px rgb(91 124 196 / 18%);
  transform: translateY(-1px);
}

.execution-log-panel__submit:disabled {
  color: #92a0bd;
  cursor: not-allowed;
  background: #f4f7fc;
  border-color: #dbe4f5;
  box-shadow: none;
}

.execution-log-panel__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: #51627f;
}

.execution-log-panel__summary span {
  padding: 7px 10px;
  background: rgb(255 255 255 / 72%);
  border: 1px solid #deebff;
  border-radius: 999px;
}

.execution-log-panel__empty {
  padding: 18px;
  color: #667796;
  background: rgb(255 255 255 / 82%);
  border: 1px dashed #cad8f6;
  border-radius: 16px;
}

.execution-log-panel__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.execution-log-card {
  overflow: hidden;
  background: rgb(255 255 255 / 88%);
  border: 1px solid #d8e5fb;
  border-radius: 16px;
}

.execution-log-card__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  font-size: 13px;
  color: #31435f;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
}

.execution-log-card__status {
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #345a96;
  text-transform: uppercase;
  border-radius: 999px;
}

.execution-log-card__status.is-running {
  color: #8a5a14;
  background: #fdf0d3;
}

.execution-log-card__status.is-success {
  color: #1f7c60;
  background: #d9f4e8;
}

.execution-log-card__status.is-error {
  color: #a23f4a;
  background: #f8dce1;
}

.execution-log-card__detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px 16px;
  border-top: 1px solid #e4edff;
}

.execution-log-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.execution-log-card__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.execution-log-card__label {
  font-size: 12px;
  font-weight: 700;
  color: #40516f;
}

.execution-log-card__code {
  min-height: 96px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.55;
  color: #20304d;
  background: #f6f9ff;
  border: 1px solid #dde8fb;
  border-radius: 12px;
}

.execution-log-card__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.execution-log-card__meta div {
  padding: 10px 12px;
  background: #f9fbff;
  border: 1px solid #e2ecff;
  border-radius: 12px;
}

.execution-log-card__meta dt {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #6b7e9f;
  letter-spacing: 0.08em;
}

.execution-log-card__meta dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #253654;
}

@media (width <= 960px) {
  .execution-log-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .execution-log-card__grid,
  .execution-log-card__meta {
    grid-template-columns: 1fr;
  }
}
</style>
