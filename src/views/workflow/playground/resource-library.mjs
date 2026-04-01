function makeEdge(id, source, target, routeKey = "default") {
  return {
    id,
    source,
    target,
    data: {
      routeKey
    },
    type: "smoothstep",
    markerEnd: "arrowclosed"
  };
}

export const mockServices = [
  {
    id: 101,
    name: "样本预处理",
    serviceType: "COMPUTE",
    summary: "拉取输入数据并做字段标准化",
    category: "数据清洗"
  },
  {
    id: 208,
    name: "TEE 联邦求交",
    serviceType: "PRIVACY",
    summary: "调用隐私计算服务产出求交结果",
    category: "隐私计算"
  },
  {
    id: 306,
    name: "规则兜底",
    serviceType: "INTELLIGENCE",
    summary: "数据规模不足时走轻量规则路径",
    category: "智能服务"
  },
  {
    id: 412,
    name: "评分卡推理",
    serviceType: "INTELLIGENCE",
    summary: "调用评分推理接口产出风险等级",
    category: "模型推理"
  }
];

export const mockDatasets = [
  {
    id: "dataset-user-profile",
    name: "用户画像样本集",
    summary: "用于联合圈人和用户分群的主样本数据"
  },
  {
    id: "dataset-credit-score",
    name: "信贷评分训练集",
    summary: "用于二分类建模的脱敏训练数据"
  },
  {
    id: "dataset-psi-seed",
    name: "求交输入集",
    summary: "多方隐私求交任务的起始数据集"
  }
];

export const mockLoops = [
  {
    id: "loop-for-each",
    name: "遍历循环",
    iterationType: "FOR_EACH",
    maxIterations: 1000,
    summary: "遍历数组中的每个元素执行子流程",
    expression: "for item in dataset",
    category: "控制流"
  },
  {
    id: "loop-count",
    name: "计数循环",
    iterationType: "COUNT",
    maxIterations: 100,
    summary: "固定次数重复执行子流程",
    expression: "repeat N times",
    category: "控制流"
  },
  {
    id: "loop-while",
    name: "条件循环",
    iterationType: "WHILE",
    maxIterations: 500,
    summary: "满足条件时持续执行子流程",
    expression: "while condition == true",
    category: "控制流"
  }
];

export const mockWorkflowTemplates = [
  {
    id: "template-federated-circle",
    name: "联合圈人模板",
    summary: "预置求交与筛选节点，适合联合圈人场景",
    graph: {
      nodes: [
        {
          id: "template-start-1",
          type: "start",
          position: { x: 80, y: 120 },
          data: {
            label: "求交样本集"
          }
        },
        {
          id: "template-service-1",
          type: "service",
          position: { x: 300, y: 120 },
          data: {
            label: "TEE 联邦求交",
            summary: "调用隐私计算服务产出求交结果",
            serviceType: "PRIVACY",
            serviceId: 208
          }
        },
        {
          id: "template-end-1",
          type: "end",
          position: { x: 560, y: 120 },
          data: {
            label: "圈人结果"
          }
        }
      ],
      edges: [
        makeEdge("template-edge-1", "template-start-1", "template-service-1"),
        makeEdge("template-edge-2", "template-service-1", "template-end-1")
      ]
    }
  },
  {
    id: "template-binary-model",
    name: "二分类建模模板",
    summary: "预置特征工程、评分卡推理链路",
    graph: {
      nodes: [
        {
          id: "binary-start-1",
          type: "start",
          position: { x: 80, y: 160 },
          data: {
            label: "训练数据集"
          }
        },
        {
          id: "binary-service-1",
          type: "service",
          position: { x: 300, y: 160 },
          data: {
            label: "样本预处理",
            summary: "拉取输入数据并做字段标准化",
            serviceType: "COMPUTE",
            serviceId: 101
          }
        },
        {
          id: "binary-service-2",
          type: "service",
          position: { x: 520, y: 160 },
          data: {
            label: "评分卡推理",
            summary: "调用评分推理接口产出风险等级",
            serviceType: "INTELLIGENCE",
            serviceId: 412
          }
        },
        {
          id: "binary-end-1",
          type: "end",
          position: { x: 760, y: 160 },
          data: {
            label: "评分结果"
          }
        }
      ],
      edges: [
        makeEdge("binary-edge-1", "binary-start-1", "binary-service-1"),
        makeEdge("binary-edge-2", "binary-service-1", "binary-service-2"),
        makeEdge("binary-edge-3", "binary-service-2", "binary-end-1")
      ]
    }
  }
];

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
