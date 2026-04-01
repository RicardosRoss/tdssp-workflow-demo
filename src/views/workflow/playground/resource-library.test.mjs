import test from "node:test";
import assert from "node:assert/strict";
import {
  cloneTemplateGraph,
  createDatasetStartNode,
  createLoopNode,
  createServiceNode,
  mockWorkflowTemplates,
  mockDatasets,
  mockLoops,
  mockServices
} from "./resource-library.mjs";

test("cloneTemplateGraph returns a detached graph copy", () => {
  const template = mockWorkflowTemplates[0];
  const graph = cloneTemplateGraph(template);

  assert.notEqual(graph.nodes, template.graph.nodes);
  assert.notEqual(graph.edges, template.graph.edges);
  assert.deepEqual(graph.nodes, template.graph.nodes);
  assert.deepEqual(graph.edges, template.graph.edges);
});

test("createDatasetStartNode builds a start node from dataset metadata", () => {
  const node = createDatasetStartNode(mockDatasets[0], { x: 120, y: 80 });

  assert.equal(node.type, "start");
  assert.equal(node.data.label, mockDatasets[0].name);
  assert.equal(node.data.datasetId, mockDatasets[0].id);
});

test("createServiceNode builds a service node from component metadata", () => {
  const node = createServiceNode(mockServices[0], { x: 360, y: 120 });

  assert.equal(node.type, "service");
  assert.equal(node.data.label, mockServices[0].name);
  assert.equal(node.data.serviceId, mockServices[0].id);
});

test("createLoopNode builds a loop node with iterable defaults", () => {
  const node = createLoopNode(mockLoops[0], { x: 420, y: 180 });

  assert.equal(node.type, "loop");
  assert.equal(node.data.label, mockLoops[0].name);
  assert.equal(node.data.itemsPath, "$.items");
  assert.equal(node.data.itemName, "item");
});
