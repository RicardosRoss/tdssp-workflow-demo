/**
 * resource-library.mjs
 *
 * 资源库的静态配置和节点工厂函数。
 * 负责定义资源库标签页，以及根据拖入的资源类型创建对应的 VueFlow 节点。
 */

// ---------------------------------------------------------------------------
// 资源库标签页配置
// ---------------------------------------------------------------------------

/** 资源库左侧面板的三个标签页定义 */
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

// ---------------------------------------------------------------------------
// 模板克隆
// ---------------------------------------------------------------------------

/**
 * 深拷贝训练流模板的流程图数据，避免修改原始模板。
 * 使用 JSON 序列化而非 structuredClone，因为模板数据经过 Vue 响应式系统后
 * 内部嵌套了 Proxy 对象，structuredClone 无法克隆 Proxy。
 */
export function cloneTemplateGraph(template) {
  return JSON.parse(JSON.stringify(template.graph));
}

// ---------------------------------------------------------------------------
// 节点工厂函数
// ---------------------------------------------------------------------------

/**
 * 根据数据服务创建一个 service 类型的 VueFlow 节点
 * 包含服务名称、摘要、类型和 ID
 */
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

/**
 * 根据数据集创建一个 start 类型的 VueFlow 节点
 * 数据集作为流程的入口，携带 datasetId
 */
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

/**
 * 根据循环配置创建一个 loop 类型的 VueFlow 节点
 * 包含循环表达式、迭代类型、最大次数等配置
 */
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
