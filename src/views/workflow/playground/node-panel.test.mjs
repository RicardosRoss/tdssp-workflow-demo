import test from "node:test";
import assert from "node:assert/strict";
import { buildNodeDataUpdate, createNodeDraft } from "./node-panel.ts";

test("createNodeDraft exposes service-specific fields for service nodes", () => {
  const node = {
    id: "service-1",
    type: "service",
    position: { x: 0, y: 0 },
    data: {
      label: "样本预处理",
      summary: "拉取输入数据并做字段标准化",
      serviceId: 101
    }
  };

  assert.deepEqual(createNodeDraft(node), {
    label: "样本预处理",
    summary: "拉取输入数据并做字段标准化",
    serviceId: "101",
    outputKey: "",
    expression: "",
    itemsPath: "",
    itemName: "",
    maxIterations: ""
  });
});

test("buildNodeDataUpdate keeps non-service nodes limited to label updates", () => {
  const node = {
    id: "node-1",
    type: "start",
    position: { x: 0, y: 0 },
    data: {
      label: "开始节点"
    }
  };

  assert.deepEqual(
    buildNodeDataUpdate(node, {
      label: "新的开始",
      summary: "不应该写入",
      serviceId: "999",
      outputKey: "",
      expression: "",
      itemsPath: "",
      itemName: "",
      maxIterations: ""
    }),
    {
      label: "新的开始"
    }
  );
});

test("buildNodeDataUpdate writes summary and serviceId for service nodes", () => {
  const node = {
    id: "service-1",
    type: "service",
    position: { x: 0, y: 0 },
    data: {
      label: "样本预处理",
      summary: "旧摘要",
      serviceId: 101
    }
  };

  assert.deepEqual(
    buildNodeDataUpdate(node, {
      label: "新的服务名",
      summary: "新的摘要",
      serviceId: "svc-002",
      outputKey: "serviceResult",
      expression: "",
      itemsPath: "",
      itemName: "",
      maxIterations: ""
    }),
    {
      label: "新的服务名",
      summary: "新的摘要",
      serviceId: "svc-002",
      outputKey: "serviceResult"
    }
  );
});

test("createNodeDraft exposes expression fields for condition nodes", () => {
  const node = {
    id: "cond-1",
    type: "condition",
    data: {
      label: "是否足量",
      expression: "$.preprocessResult.count > 1000"
    }
  };

  assert.equal(
    createNodeDraft(node).expression,
    "$.preprocessResult.count > 1000"
  );
});

test("createNodeDraft exposes loop fields for loop nodes", () => {
  const node = {
    id: "loop-1",
    type: "loop",
    data: {
      label: "遍历名单",
      itemsPath: "$.items",
      itemName: "item"
    }
  };

  assert.equal(createNodeDraft(node).itemsPath, "$.items");
  assert.equal(createNodeDraft(node).itemName, "item");
});
