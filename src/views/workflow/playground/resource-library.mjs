export const workflowResourceTabs = [
  {
    key: "template",
    label: "训练流",
    description: "拖入后替换当前工作流"
  },
  {
    key: "service",
    label: "组件库",
    description: "拖入后生成服务节点"
  },
  {
    key: "dataset",
    label: "数据集",
    description: "拖入后生成开始节点"
  }
];

export function cloneTemplateGraph(template) {
  return structuredClone(template.graph);
}

export function createServiceNode(service, position) {
  return {
    id: `service-${service.id}-${Date.now()}`,
    type: "service",
    position,
    data: {
      label: service.name,
      summary: service.summary,
      serviceType: service.serviceType,
      serviceId: service.id
    }
  };
}

export function createDatasetStartNode(dataset, position) {
  return {
    id: `dataset-${dataset.id}-${Date.now()}`,
    type: "start",
    position,
    data: {
      label: dataset.name,
      summary: dataset.summary,
      datasetId: dataset.id
    }
  };
}

export function createLoopNode(loopConfig, position) {
  return {
    id: `loop-${loopConfig.id}-${Date.now()}`,
    type: "loop",
    position,
    data: {
      label: loopConfig.name,
      expression: loopConfig.expression,
      iterationType: loopConfig.iterationType,
      maxIterations: loopConfig.maxIterations,
      itemsPath: loopConfig.itemsPath ?? "$.items",
      itemName: loopConfig.itemName ?? "item"
    }
  };
}
