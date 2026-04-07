import test from "node:test";
import assert from "node:assert/strict";
import {
  createExecutionState,
  findStartNodeId,
  resolveNextEdge,
  resolveTriggeredTargetNodes,
  applyServiceExecutionResult,
  advanceLoopState,
  startExecutionState,
  markNodeExecutionError,
  resetExecutionState,
  validateRunnableGraph
} from "./execution-engine.ts";

test("findStartNodeId returns the first start node", () => {
  const nodes = [
    { id: "n1", type: "start", data: {} },
    { id: "n2", type: "service", data: {} }
  ];

  assert.equal(findStartNodeId(nodes), "n1");
});

test("resolveNextEdge picks yes route for condition nodes", () => {
  const edges = [
    { id: "e1", source: "cond-1", target: "end-no", data: { routeKey: "no" } },
    { id: "e2", source: "cond-1", target: "end-yes", data: { routeKey: "yes" } }
  ];

  const edge = resolveNextEdge({
    currentNode: { id: "cond-1", type: "condition", data: {} },
    edges,
    routeKey: "yes"
  });

  assert.equal(edge?.id, "e2");
});

test("applyServiceExecutionResult merges output into context by outputKey", () => {
  const state = createExecutionState();
  const next = applyServiceExecutionResult(state, {
    nodeId: "service-1",
    nodeData: { outputKey: "preprocessResult" },
    output: { count: 1280 }
  });

  assert.deepEqual(next.context.preprocessResult, { count: 1280 });
  assert.deepEqual(next.outputsByNodeId["service-1"], { count: 1280 });
});

test("advanceLoopState routes to done when iteration reaches array end", () => {
  const result = advanceLoopState({
    nodeId: "loop-1",
    nodeData: { itemsPath: "$.items", itemName: "item" },
    context: { items: ["a"] },
    loopState: { "loop-1": { index: 1 } }
  });

  assert.equal(result.routeKey, "done");
});

test("resolveTriggeredTargetNodes readies a join after one branch succeeds and the sibling branch is skipped", () => {
  const nodes = [
    { id: "cond-1", type: "condition", data: {} },
    { id: "yes-service", type: "service", data: {} },
    { id: "no-service", type: "service", data: {} },
    { id: "end-1", type: "end", data: {} }
  ];
  const edges = [
    {
      id: "cond-yes",
      source: "cond-1",
      target: "yes-service",
      data: { routeKey: "yes" }
    },
    {
      id: "cond-no",
      source: "cond-1",
      target: "no-service",
      data: { routeKey: "no" }
    },
    { id: "yes-end", source: "yes-service", target: "end-1" },
    { id: "no-end", source: "no-service", target: "end-1" }
  ];

  const result = resolveTriggeredTargetNodes({
    nodes,
    edges,
    nodeStates: {
      "cond-1": { status: "success" },
      "yes-service": { status: "success" },
      "no-service": { status: "skipped" }
    },
    targetNodeIds: ["end-1"]
  });

  assert.deepEqual(result.readyNodeIds, ["end-1"]);
  assert.deepEqual(result.skippedNodeIds, []);
});

test("resolveTriggeredTargetNodes propagates skipped-only descendants", () => {
  const nodes = [
    { id: "branch-a", type: "service", data: {} },
    { id: "branch-b", type: "service", data: {} },
    { id: "branch-end", type: "end", data: {} }
  ];
  const edges = [
    { id: "a-b", source: "branch-a", target: "branch-b" },
    { id: "b-end", source: "branch-b", target: "branch-end" }
  ];

  const result = resolveTriggeredTargetNodes({
    nodes,
    edges,
    nodeStates: {
      "branch-a": { status: "skipped" }
    },
    targetNodeIds: ["branch-b"]
  });

  assert.deepEqual(result.readyNodeIds, []);
  assert.deepEqual(result.skippedNodeIds, ["branch-b", "branch-end"]);
});

test("resolveTriggeredTargetNodes ignores loop back edges when entering the first iteration", () => {
  const nodes = [
    { id: "start-1", type: "start", data: {} },
    { id: "loop-1", type: "loop", data: {} },
    { id: "service-1", type: "service", data: {} }
  ];
  const edges = [
    { id: "start-loop", source: "start-1", target: "loop-1" },
    {
      id: "loop-body",
      source: "loop-1",
      target: "service-1",
      sourceHandle: "loop-body",
      data: { routeKey: "loop-body" }
    },
    { id: "service-back", source: "service-1", target: "loop-1" }
  ];

  const result = resolveTriggeredTargetNodes({
    nodes,
    edges,
    nodeStates: {
      "start-1": { status: "success" }
    },
    targetNodeIds: ["loop-1"]
  });

  assert.deepEqual(result.readyNodeIds, ["loop-1"]);
  assert.deepEqual(result.skippedNodeIds, []);
});

test("applyServiceExecutionResult merges normalized backend patchContext", () => {
  const state = createExecutionState();
  const next = applyServiceExecutionResult(state, {
    nodeId: "service-1",
    nodeData: { outputKey: "serviceResult" },
    output: { score: 0.98 },
    patchContext: { traceId: "req-1" },
    metrics: { durationMs: 120 }
  });

  assert.equal(next.nodeStates["service-1"].status, "success");
  assert.deepEqual(next.nodeStates["service-1"].output, { score: 0.98 });
  assert.deepEqual(next.context.traceId, "req-1");
});

test("start execution marks start node ready and sets currentNodeId", () => {
  const state = startExecutionState({
    nodes: [{ id: "start-1", type: "start", data: {} }]
  });

  assert.equal(state.currentNodeId, "start-1");
  assert.equal(state.nodeStates["start-1"].status, "ready");
});

test("service execution failure marks node as error and stops auto-run", () => {
  const state = markNodeExecutionError(createExecutionState(), {
    nodeId: "service-1",
    message: "request timeout"
  });

  assert.equal(state.status, "error");
  assert.equal(state.nodeStates["service-1"].status, "error");
});

test("resetExecution clears current node and history", () => {
  const state = resetExecutionState({
    ...createExecutionState(),
    status: "running",
    currentNodeId: "service-1",
    history: [{ nodeId: "start-1" }]
  });

  assert.equal(state.currentNodeId, null);
  assert.deepEqual(state.history, []);
  assert.equal(state.status, "idle");
});

test("validateRunnableGraph rejects workflows without start nodes", () => {
  assert.match(validateRunnableGraph({ nodes: [], edges: [] }), /start/i);
});

test("validateRunnableGraph rejects condition nodes without yes and no routes", () => {
  const error = validateRunnableGraph({
    nodes: [
      { id: "start-1", type: "start", data: {} },
      { id: "cond-1", type: "condition", data: {} },
      { id: "end-1", type: "end", data: {} }
    ],
    edges: [
      {
        id: "e-start",
        source: "start-1",
        target: "cond-1",
        data: { routeKey: "default" }
      },
      { id: "e1", source: "cond-1", target: "end-1", data: { routeKey: "yes" } }
    ]
  });

  assert.match(error, /no/i);
});
