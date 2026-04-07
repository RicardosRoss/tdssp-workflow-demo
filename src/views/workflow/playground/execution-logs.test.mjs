import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExecutionLogSummary,
  buildSaveExecutionLogsPayload,
  createRunningExecutionLog,
  finishExecutionLog
} from "./execution-logs.ts";

test("createRunningExecutionLog captures node identity and context snapshot", () => {
  const now = "2026-04-07T10:00:00.000Z";
  const log = createRunningExecutionLog({
    id: "log-1",
    stepIndex: 2,
    node: {
      id: "service-1",
      type: "service",
      data: { label: "样本预处理" }
    },
    contextSnapshot: { traceId: "req-1", riskScore: 9 },
    startedAt: now
  });

  assert.equal(log.nodeId, "service-1");
  assert.equal(log.nodeLabel, "样本预处理");
  assert.equal(log.executor, "service-1");
  assert.equal(log.serviceName, "样本预处理");
  assert.equal(log.status, "running");
  assert.deepEqual(log.dataSource, { traceId: "req-1", riskScore: 9 });
  assert.deepEqual(log.nextNodeIds, []);
  assert.deepEqual(log.nextNodeLabels, []);
});

test("finishExecutionLog fills output duration and next nodes", () => {
  const running = createRunningExecutionLog({
    id: "log-2",
    stepIndex: 3,
    node: {
      id: "cond-1",
      type: "condition",
      data: { label: "是否通过" }
    },
    contextSnapshot: { score: 95 },
    startedAt: "2026-04-07T10:00:00.000Z"
  });

  const finished = finishExecutionLog(running, {
    status: "success",
    finishedAt: "2026-04-07T10:00:01.250Z",
    routeKey: "yes",
    dataOutput: { routeDecision: "yes" },
    nextNodes: [{ id: "service-2", label: "YES-脱敏清洗" }]
  });

  assert.equal(finished.status, "success");
  assert.equal(finished.durationMs, 1250);
  assert.equal(finished.routeKey, "yes");
  assert.deepEqual(finished.dataOutput, { routeDecision: "yes" });
  assert.deepEqual(finished.nextNodeIds, ["service-2"]);
  assert.deepEqual(finished.nextNodeLabels, ["YES-脱敏清洗"]);
});

test("finishExecutionLog keeps error logs without fake next nodes", () => {
  const running = createRunningExecutionLog({
    id: "log-3",
    stepIndex: 4,
    node: {
      id: "service-9",
      type: "service",
      data: { label: "特征拼接" }
    },
    contextSnapshot: { traceId: "req-9" },
    startedAt: "2026-04-07T10:00:05.000Z"
  });

  const finished = finishExecutionLog(running, {
    status: "error",
    finishedAt: "2026-04-07T10:00:05.120Z",
    nextNodes: [],
    errorMessage: "timeout"
  });

  assert.equal(finished.status, "error");
  assert.equal(finished.durationMs, 120);
  assert.equal(finished.errorMessage, "timeout");
  assert.deepEqual(finished.nextNodeIds, []);
  assert.deepEqual(finished.nextNodeLabels, []);
});

test("buildExecutionLogSummary aggregates counts and latest timestamp from reverse-ordered logs", () => {
  const summary = buildExecutionLogSummary([
    {
      id: "log-new",
      stepIndex: 3,
      nodeId: "service-2",
      nodeLabel: "输出汇总",
      nodeType: "service",
      executor: "service-2",
      serviceName: "输出汇总",
      startedAt: "2026-04-07T10:00:04.000Z",
      status: "running",
      dataSource: {},
      nextNodeIds: [],
      nextNodeLabels: []
    },
    {
      id: "log-old",
      stepIndex: 1,
      nodeId: "start-1",
      nodeLabel: "开始",
      nodeType: "start",
      executor: "start-1",
      serviceName: "开始",
      startedAt: "2026-04-07T10:00:01.000Z",
      finishedAt: "2026-04-07T10:00:01.200Z",
      durationMs: 200,
      dataSource: {},
      dataOutput: { started: true },
      status: "success",
      nextNodeIds: ["service-1"],
      nextNodeLabels: ["样本预处理"]
    },
    {
      id: "log-error",
      stepIndex: 2,
      nodeId: "service-1",
      nodeLabel: "样本预处理",
      nodeType: "service",
      executor: "service-1",
      serviceName: "样本预处理",
      startedAt: "2026-04-07T10:00:02.000Z",
      finishedAt: "2026-04-07T10:00:03.000Z",
      durationMs: 1000,
      dataSource: {},
      dataOutput: { output: { count: 1 } },
      status: "error",
      nextNodeIds: [],
      nextNodeLabels: [],
      errorMessage: "timeout"
    }
  ]);

  assert.equal(summary.successCount, 1);
  assert.equal(summary.errorCount, 1);
  assert.equal(summary.runningCount, 1);
  assert.equal(summary.totalDurationMs, 1200);
  assert.equal(summary.latestStartedAt, "2026-04-07T10:00:04.000Z");
});

test("buildSaveExecutionLogsPayload preserves workflow metadata and execution order", () => {
  const payload = buildSaveExecutionLogsPayload({
    workflowName: "条件分支-基础演示",
    logs: [
      {
        id: "log-2",
        stepIndex: 2,
        nodeId: "service-1",
        nodeLabel: "样本预处理",
        nodeType: "service",
        executor: "service-1",
        serviceName: "样本预处理",
        startedAt: "2026-04-07T10:00:01.000Z",
        finishedAt: "2026-04-07T10:00:01.800Z",
        durationMs: 800,
        dataSource: { traceId: "req-1" },
        dataOutput: { output: { count: 8 } },
        status: "success",
        nextNodeIds: ["end-1"],
        nextNodeLabels: ["结束"]
      },
      {
        id: "log-1",
        stepIndex: 1,
        nodeId: "start-1",
        nodeLabel: "开始",
        nodeType: "start",
        executor: "start-1",
        serviceName: "开始",
        startedAt: "2026-04-07T10:00:00.000Z",
        finishedAt: "2026-04-07T10:00:00.100Z",
        durationMs: 100,
        dataSource: {},
        dataOutput: { started: true },
        status: "success",
        nextNodeIds: ["service-1"],
        nextNodeLabels: ["样本预处理"]
      }
    ]
  });

  assert.equal(payload.workflowName, "条件分支-基础演示");
  assert.equal(payload.startedAt, "2026-04-07T10:00:00.000Z");
  assert.equal(payload.finishedAt, "2026-04-07T10:00:01.800Z");
  assert.deepEqual(
    payload.logs.map(log => log.id),
    ["log-2", "log-1"]
  );
});
