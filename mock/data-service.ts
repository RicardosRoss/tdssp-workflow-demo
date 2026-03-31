import { defineFakeRoute } from "vite-plugin-fake-server/client";

type DataServiceType =
  | "COMPUTE"
  | "INTELLIGENCE"
  | "DATA_MARKET"
  | "DATA_GOVERNANCE"
  | "PRIVACY_COMPUTE_PUBLIC"
  | "OTHER";

type DataServiceOperationType =
  | "TEE_CREATE_TASK"
  | "TEE_START_TASK"
  | "TEE_EXECUTE_TASK"
  | "TEE_CANCEL_TASK";

type DataServiceStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DEPRECATED";

interface MockDataService {
  id: number;
  serviceName: string;
  serviceDescription: string;
  serviceType: DataServiceType;
  operationType?: DataServiceOperationType;
  inputDataSpec: string;
  outputDataSpec: string;
  serviceEndpoint: string;
  status: DataServiceStatus;
  metaData: string;
  createdAt: string;
  updatedAt: string;
}

const services: MockDataService[] = [
  {
    id: 1,
    serviceName: "样本预处理",
    serviceDescription:
      "拉取输入数据并进行字段标准化、缺失值填充、异常值剔除等预处理操作",
    serviceType: "COMPUTE",
    inputDataSpec:
      '{"type":"object","properties":{"resourceId":{"type":"number"},"columns":{"type":"array","items":{"type":"string"}}}}',
    outputDataSpec:
      '{"type":"object","properties":{"cleanedResourceId":{"type":"number"},"stats":{"type":"object"}}}',
    serviceEndpoint: "/api/compute/sample-preprocess",
    status: "ACTIVE",
    metaData: '{"category":"数据清洗","avgDuration":"30s","maxConcurrent":5}',
    createdAt: "2025-11-01T10:00:00Z",
    updatedAt: "2026-03-15T08:00:00Z"
  },
  {
    id: 2,
    serviceName: "TEE 联邦求交",
    serviceDescription: "基于 TEE 可信执行环境进行多方隐私集合求交(PSI)",
    serviceType: "PRIVACY_COMPUTE_PUBLIC",
    operationType: "TEE_CREATE_TASK",
    inputDataSpec:
      '{"type":"object","properties":{"partyIds":{"type":"array","items":{"type":"number"}},"keyColumns":{"type":"array","items":{"type":"string"}}}}',
    outputDataSpec:
      '{"type":"object","properties":{"intersectionResourceId":{"type":"number"},"intersectionCount":{"type":"number"}}}',
    serviceEndpoint: "/api/tee/psi",
    status: "ACTIVE",
    metaData:
      '{"category":"隐私计算","avgDuration":"2min","maxConcurrent":3,"protocols":["KKRT","CM20"]}',
    createdAt: "2025-12-10T14:00:00Z",
    updatedAt: "2026-03-20T12:00:00Z"
  },
  {
    id: 3,
    serviceName: "评分卡推理",
    serviceDescription:
      "调用预训练评分卡模型进行风险等级评估，输出 0-1000 分值及对应等级",
    serviceType: "INTELLIGENCE",
    inputDataSpec:
      '{"type":"object","properties":{"resourceId":{"type":"number"},"modelId":{"type":"string"}}}',
    outputDataSpec:
      '{"type":"object","properties":{"scores":{"type":"array","items":{"type":"object"}},"riskLevels":{"type":"object"}}}',
    serviceEndpoint: "/api/intelligence/scorecard",
    status: "ACTIVE",
    metaData:
      '{"category":"模型推理","avgDuration":"5s","maxConcurrent":10,"modelTypes":["credit","fraud"]}',
    createdAt: "2026-01-05T09:00:00Z",
    updatedAt: "2026-03-18T16:00:00Z"
  },
  {
    id: 4,
    serviceName: "数据资产编目",
    serviceDescription:
      "自动扫描数据源并生成数据资产目录，含字段级血缘和分类标签",
    serviceType: "DATA_GOVERNANCE",
    inputDataSpec:
      '{"type":"object","properties":{"sourceId":{"type":"number"},"scanScope":{"type":"string","enum":["full","incremental"]}}}',
    outputDataSpec:
      '{"type":"object","properties":{"catalogId":{"type":"number"},"tableCount":{"type":"number"},"fieldCount":{"type":"number"}}}',
    serviceEndpoint: "/api/governance/catalog",
    status: "ACTIVE",
    metaData: '{"category":"数据治理","avgDuration":"10min","maxConcurrent":1}',
    createdAt: "2026-01-20T11:00:00Z",
    updatedAt: "2026-03-10T09:00:00Z"
  },
  {
    id: 5,
    serviceName: "隐私求交训练",
    serviceDescription:
      "在多方数据上进行隐私保护的联合模型训练，支持 LR、XGBoost 等算法",
    serviceType: "PRIVACY_COMPUTE_PUBLIC",
    operationType: "TEE_EXECUTE_TASK",
    inputDataSpec:
      '{"type":"object","properties":{"partyResources":{"type":"object"},"algorithm":{"type":"string"},"hyperParams":{"type":"object"}}}',
    outputDataSpec:
      '{"type":"object","properties":{"modelId":{"type":"string"},"metrics":{"type":"object"},"trainingLog":{"type":"string"}}}',
    serviceEndpoint: "/api/tee/joint-training",
    status: "ACTIVE",
    metaData:
      '{"category":"隐私计算","avgDuration":"15min","maxConcurrent":2,"algorithms":["LR","XGBoost","SecureBoost"]}',
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-03-22T14:00:00Z"
  },
  {
    id: 6,
    serviceName: "数据市场发布",
    serviceDescription: "将数据产品发布到数据市场，支持定价策略和访问控制配置",
    serviceType: "DATA_MARKET",
    inputDataSpec:
      '{"type":"object","properties":{"productId":{"type":"number"},"pricing":{"type":"object"},"accessPolicy":{"type":"string"}}}',
    outputDataSpec:
      '{"type":"object","properties":{"listingId":{"type":"number"},"publishedAt":{"type":"string"}}}',
    serviceEndpoint: "/api/market/publish",
    status: "ACTIVE",
    metaData: '{"category":"数据市场","avgDuration":"3s","maxConcurrent":5}',
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-03-19T11:00:00Z"
  },
  {
    id: 7,
    serviceName: "规则兜底引擎",
    serviceDescription:
      "当数据规模不足以支撑模型推理时，自动切换到轻量级规则引擎路径",
    serviceType: "INTELLIGENCE",
    inputDataSpec:
      '{"type":"object","properties":{"resourceId":{"type":"number"},"ruleset":{"type":"string"}}}',
    outputDataSpec:
      '{"type":"object","properties":{"decisions":{"type":"array","items":{"type":"object"}},"fallbackUsed":{"type":"boolean"}}}',
    serviceEndpoint: "/api/intelligence/rule-fallback",
    status: "ACTIVE",
    metaData: '{"category":"智能服务","avgDuration":"2s","maxConcurrent":20}',
    createdAt: "2026-02-20T13:00:00Z",
    updatedAt: "2026-03-16T09:00:00Z"
  },
  {
    id: 8,
    serviceName: "TEE 安全聚合",
    serviceDescription:
      "基于 TEE 的安全聚合计算服务，支持多方求和、求均值等统计运算",
    serviceType: "PRIVACY_COMPUTE_PUBLIC",
    operationType: "TEE_START_TASK",
    inputDataSpec:
      '{"type":"object","properties":{"partyResourceIds":{"type":"array","items":{"type":"number"}},"aggregationType":{"type":"string","enum":["SUM","AVG","COUNT","MAX","MIN"]},"groupByColumns":{"type":"array","items":{"type":"string"}}}}',
    outputDataSpec:
      '{"type":"object","properties":{"resultResourceId":{"type":"number"},"aggregationType":{"type":"string"},"recordCount":{"type":"number"}}}',
    serviceEndpoint: "/api/tee/secure-aggregation",
    status: "ACTIVE",
    metaData: '{"category":"隐私计算","avgDuration":"1min","maxConcurrent":5}',
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-25T10:00:00Z"
  },
  {
    id: 9,
    serviceName: "特征工程",
    serviceDescription: "自动化的特征衍生、特征选择和特征编码服务",
    serviceType: "COMPUTE",
    inputDataSpec:
      '{"type":"object","properties":{"resourceId":{"type":"number"},"featureConfig":{"type":"object"}}}',
    outputDataSpec:
      '{"type":"object","properties":{"featureResourceId":{"type":"number"},"featureCount":{"type":"number"},"importanceScores":{"type":"object"}}}',
    serviceEndpoint: "/api/compute/feature-engineering",
    status: "DRAFT",
    metaData: '{"category":"特征处理","avgDuration":"5min","maxConcurrent":3}',
    createdAt: "2026-03-10T14:00:00Z",
    updatedAt: "2026-03-28T16:00:00Z"
  },
  {
    id: 10,
    serviceName: "数据质量检测",
    serviceDescription:
      "对数据资源进行多维度质量检测，包括完整性、一致性、准确性、时效性",
    serviceType: "DATA_GOVERNANCE",
    inputDataSpec:
      '{"type":"object","properties":{"resourceId":{"type":"number"},"checkDimensions":{"type":"array","items":{"type":"string"}}}}',
    outputDataSpec:
      '{"type":"object","properties":{"qualityScore":{"type":"number"},"dimensionScores":{"type":"object"},"issues":{"type":"array"}}}',
    serviceEndpoint: "/api/governance/quality-check",
    status: "DRAFT",
    metaData: '{"category":"数据治理","avgDuration":"3min","maxConcurrent":5}',
    createdAt: "2026-03-15T08:00:00Z",
    updatedAt: "2026-03-27T11:00:00Z"
  },
  {
    id: 11,
    serviceName: "数据脱敏服务",
    serviceDescription:
      "对敏感字段进行自动化脱敏处理，支持多种脱敏规则和自定义策略",
    serviceType: "COMPUTE",
    operationType: "TEE_EXECUTE_TASK",
    inputDataSpec:
      '{"type":"object","properties":{"resourceId":{"type":"number"},"sensitiveColumns":{"type":"array","items":{"type":"string"}},"strategy":{"type":"string","enum":["mask","hash","encrypt","perturb"]}}}',
    outputDataSpec:
      '{"type":"object","properties":{"maskedResourceId":{"type":"number"},"maskedColumns":{"type":"array"}}}',
    serviceEndpoint: "/api/compute/data-masking",
    status: "INACTIVE",
    metaData: '{"category":"数据处理","avgDuration":"1min","maxConcurrent":10}',
    createdAt: "2025-10-01T10:00:00Z",
    updatedAt: "2026-01-15T09:00:00Z"
  },
  {
    id: 12,
    serviceName: "联邦特征筛选",
    serviceDescription: "在多方数据联合中进行隐私保护的特征重要性评估和筛选",
    serviceType: "PRIVACY_COMPUTE_PUBLIC",
    operationType: "TEE_CREATE_TASK",
    inputDataSpec:
      '{"type":"object","properties":{"partyResourceIds":{"type":"array","items":{"type":"number"}},"targetColumn":{"type":"string"},"topK":{"type":"number"}}}',
    outputDataSpec:
      '{"type":"object","properties":{"selectedFeatures":{"type":"array","items":{"type":"string"}},"importanceScores":{"type":"object"}}}',
    serviceEndpoint: "/api/tee/federated-feature-selection",
    status: "DEPRECATED",
    metaData:
      '{"category":"隐私计算","avgDuration":"8min","maxConcurrent":1,"replacedBy":"id:5"}',
    createdAt: "2025-08-01T08:00:00Z",
    updatedAt: "2026-02-10T14:00:00Z"
  }
];

export default defineFakeRoute([
  {
    url: "/api/data-services",
    method: "get",
    response: ({ query }) => {
      const keyword = String(query?.serviceName ?? "")
        .trim()
        .toLowerCase();
      const serviceType = query?.serviceType as string | undefined;
      const status = query?.status as string | undefined;
      const page = Number(query?.page ?? 0);
      const size = Number(query?.size ?? 10);

      let filtered = [...services];

      if (keyword) {
        filtered = filtered.filter(
          item =>
            item.serviceName.toLowerCase().includes(keyword) ||
            item.serviceDescription.toLowerCase().includes(keyword)
        );
      }
      if (serviceType) {
        filtered = filtered.filter(item => item.serviceType === serviceType);
      }
      if (status) {
        filtered = filtered.filter(item => item.status === status);
      }

      const totalElements = filtered.length;
      const totalPages = Math.ceil(totalElements / size);
      const start = page * size;
      const content = filtered.slice(start, start + size);

      return {
        code: 0,
        message: "ok",
        data: {
          content,
          pageNumber: page,
          pageSize: size,
          totalElements,
          totalPages,
          hasNext: page < totalPages - 1,
          hasPrevious: page > 0,
          isFirst: page === 0,
          isLast: page >= totalPages - 1
        }
      };
    }
  },
  {
    url: "/api/data-services/:id",
    method: "get",
    response: ({ params }) => {
      const id = Number(params?.id);
      const item = services.find(s => s.id === id);
      if (!item) {
        return { code: 404, message: "not found", data: null };
      }
      return { code: 0, message: "ok", data: item };
    }
  },
  {
    url: "/api/data-services/search/prefix",
    method: "get",
    response: ({ query }) => {
      const keyword = String(query?.keyword ?? "")
        .trim()
        .toLowerCase();
      const matched = keyword
        ? services.filter(item =>
            item.serviceName.toLowerCase().startsWith(keyword)
          )
        : services;
      return {
        code: 0,
        message: "ok",
        data: matched
      };
    }
  }
]);
