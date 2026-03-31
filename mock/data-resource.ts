import { defineFakeRoute } from "vite-plugin-fake-server/client";

type DataSourceType =
  | "DATABASE"
  | "OSS"
  | "LFS"
  | "DFS"
  | "BLOCKCHAIN"
  | "MINIO"
  | "API";

type AccessStrategyType =
  | "PUBLIC"
  | "APPLICATION_REQUIRED"
  | "ROLE_BASED"
  | "HYBRID";

type PublishStatusType = "DRAFT" | "PUBLISHED" | "OFFLINE";

interface MockDataSource {
  id: number;
  name: string;
  description: string;
  type: DataSourceType;
  accessStrategy: AccessStrategyType;
  publishStatus: PublishStatusType;
  accessInfo: string;
  metaData: {
    classification: string;
    applicableScenarios: string[];
    technicalSpec: string;
  };
  createdAt: string;
  updatedAt: string;
  publishAt?: string;
  providerId: number;
  providerName: string;
}

const resources: MockDataSource[] = [
  {
    id: 1,
    name: "用户画像数据库",
    description: "包含用户基础属性、行为标签、消费等级等维度数据",
    type: "DATABASE",
    accessStrategy: "APPLICATION_REQUIRED",
    publishStatus: "PUBLISHED",
    accessInfo: "jdbc:mysql://10.0.1.100:3306/user_profile",
    metaData: {
      classification: "用户数据",
      applicableScenarios: ["精准营销", "用户分群", "推荐系统"],
      technicalSpec: "MySQL 8.0, 约 2000 万行, 日增量 5 万行"
    },
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: "2026-03-15T08:30:00Z",
    publishAt: "2025-12-05T14:00:00Z",
    providerId: 1,
    providerName: "数据中心"
  },
  {
    id: 2,
    name: "金融交易流水",
    description: "银行级交易流水数据，含转账、支付、消费等记录",
    type: "DATABASE",
    accessStrategy: "ROLE_BASED",
    publishStatus: "PUBLISHED",
    accessInfo: "jdbc:postgresql://10.0.2.50:5432/txn_records",
    metaData: {
      classification: "金融数据",
      applicableScenarios: ["风控建模", "反欺诈", "合规审计"],
      technicalSpec: "PostgreSQL 14, 约 5 亿行, T+1 更新"
    },
    createdAt: "2025-11-20T09:00:00Z",
    updatedAt: "2026-03-20T12:00:00Z",
    publishAt: "2025-11-25T16:00:00Z",
    providerId: 2,
    providerName: "金融事业部"
  },
  {
    id: 3,
    name: "卫星影像存储",
    description: "高分辨率遥感卫星影像数据集，覆盖全国主要城市",
    type: "OSS",
    accessStrategy: "APPLICATION_REQUIRED",
    publishStatus: "PUBLISHED",
    accessInfo: "oss://data-bucket/satellite-images/",
    metaData: {
      classification: "地理数据",
      applicableScenarios: ["城市规划", "环境监测", "农业估产"],
      technicalSpec: "GeoTIFF 格式, 0.5m 分辨率, 约 2TB"
    },
    createdAt: "2026-01-10T14:00:00Z",
    updatedAt: "2026-03-10T09:00:00Z",
    publishAt: "2026-01-15T10:00:00Z",
    providerId: 3,
    providerName: "地理信息中心"
  },
  {
    id: 4,
    name: "区块链存证数据",
    description: "数据交换过程的链上存证记录，用于审计溯源",
    type: "BLOCKCHAIN",
    accessStrategy: "PUBLIC",
    publishStatus: "PUBLISHED",
    accessInfo: "chain://0xABC123.../evidence",
    metaData: {
      classification: "存证数据",
      applicableScenarios: ["数据溯源", "合规审计", "可信存证"],
      technicalSpec: "Fabric 2.x, 约 500 万条存证记录"
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-03-18T11:00:00Z",
    publishAt: "2026-02-05T09:00:00Z",
    providerId: 4,
    providerName: "区块链实验室"
  },
  {
    id: 5,
    name: "模型训练数据集",
    description: "经过脱敏处理的机器学习训练数据集，含特征和标签",
    type: "LFS",
    accessStrategy: "APPLICATION_REQUIRED",
    publishStatus: "PUBLISHED",
    accessInfo: "lfs://model-data/training-sets/v3/",
    metaData: {
      classification: "AI数据",
      applicableScenarios: ["模型训练", "联邦学习", "迁移学习"],
      technicalSpec: "Parquet 格式, 约 800GB, 50+ 特征维度"
    },
    createdAt: "2026-01-20T13:00:00Z",
    updatedAt: "2026-03-12T15:00:00Z",
    publishAt: "2026-01-25T10:00:00Z",
    providerId: 1,
    providerName: "数据中心"
  },
  {
    id: 6,
    name: "实时天气API",
    description: "全国各城市实时天气数据，含温度、湿度、风速等",
    type: "API",
    accessStrategy: "PUBLIC",
    publishStatus: "PUBLISHED",
    accessInfo: "https://weather.api.internal/v2/realtime",
    metaData: {
      classification: "环境数据",
      applicableScenarios: ["物流优化", "农业决策", "保险定价"],
      technicalSpec: "REST API, JSON 格式, 5 分钟更新"
    },
    createdAt: "2025-10-15T10:00:00Z",
    updatedAt: "2026-03-19T08:00:00Z",
    publishAt: "2025-10-20T14:00:00Z",
    providerId: 5,
    providerName: "气象服务部"
  },
  {
    id: 7,
    name: "分布式日志归档",
    description: "全平台业务日志归档，用于数据分析和故障排查",
    type: "DFS",
    accessStrategy: "ROLE_BASED",
    publishStatus: "PUBLISHED",
    accessInfo: "hdfs://nameservice1/logs/archive/",
    metaData: {
      classification: "运维数据",
      applicableScenarios: ["日志分析", "异常检测", "性能优化"],
      technicalSpec: "HDFS, 约 10TB, 保留 180 天"
    },
    createdAt: "2025-09-01T08:00:00Z",
    updatedAt: "2026-03-17T06:00:00Z",
    publishAt: "2025-09-05T10:00:00Z",
    providerId: 6,
    providerName: "运维平台"
  },
  {
    id: 8,
    name: "客户信用评分表",
    description: "基于多维度数据生成的客户信用评分，仅供授权使用",
    type: "DATABASE",
    accessStrategy: "HYBRID",
    publishStatus: "DRAFT",
    accessInfo: "jdbc:mysql://10.0.3.20:3306/credit_scores",
    metaData: {
      classification: "金融数据",
      applicableScenarios: ["信贷审批", "风险评估", "客户分级"],
      technicalSpec: "MySQL 8.0, 约 500 万行, 月度更新"
    },
    createdAt: "2026-03-01T11:00:00Z",
    updatedAt: "2026-03-28T16:00:00Z",
    providerId: 2,
    providerName: "金融事业部"
  },
  {
    id: 9,
    name: "工业传感器数据",
    description: "IoT 传感器采集的温湿度、振动、压力等实时数据",
    type: "MINIO",
    accessStrategy: "APPLICATION_REQUIRED",
    publishStatus: "DRAFT",
    accessInfo: "minio://iot-bucket/sensor-data/",
    metaData: {
      classification: "工业数据",
      applicableScenarios: ["预测性维护", "质量检测", "能耗优化"],
      technicalSpec: "CSV + Parquet, 约 3TB, 秒级采集"
    },
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-03-25T14:00:00Z",
    providerId: 7,
    providerName: "工业互联网部"
  },
  {
    id: 10,
    name: "公共地理信息库",
    description: "全国行政区划、道路网络、POI 兴趣点等基础地理数据",
    type: "DATABASE",
    accessStrategy: "PUBLIC",
    publishStatus: "OFFLINE",
    accessInfo: "jdbc:postgresql://10.0.4.10:5432/gis_public",
    metaData: {
      classification: "地理数据",
      applicableScenarios: ["地图服务", "路径规划", "商圈分析"],
      technicalSpec: "PostGIS, 季度更新"
    },
    createdAt: "2025-06-01T08:00:00Z",
    updatedAt: "2026-01-10T10:00:00Z",
    publishAt: "2025-06-10T12:00:00Z",
    providerId: 3,
    providerName: "地理信息中心"
  },
  {
    id: 11,
    name: "电商商品数据",
    description: "电商平台商品信息、分类、价格、库存等数据",
    type: "DATABASE",
    accessStrategy: "APPLICATION_REQUIRED",
    publishStatus: "PUBLISHED",
    accessInfo: "jdbc:mysql://10.0.5.30:3306/ecommerce_products",
    metaData: {
      classification: "电商数据",
      applicableScenarios: ["商品推荐", "价格监控", "供应链优化"],
      technicalSpec: "MySQL 8.0, 约 300 万 SKU, 实时更新"
    },
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-03-22T09:00:00Z",
    publishAt: "2026-02-25T14:00:00Z",
    providerId: 8,
    providerName: "电商事业部"
  },
  {
    id: 12,
    name: "医疗影像归档",
    description: "DICOM 格式的医疗影像数据，脱敏后用于科研",
    type: "OSS",
    accessStrategy: "HYBRID",
    publishStatus: "DRAFT",
    accessInfo: "oss://medical-data/imaging-archive/",
    metaData: {
      classification: "医疗数据",
      applicableScenarios: ["AI辅助诊断", "影像分析", "学术研究"],
      technicalSpec: "DICOM, 约 5TB, 严格脱敏处理"
    },
    createdAt: "2026-03-05T08:00:00Z",
    updatedAt: "2026-03-29T11:00:00Z",
    providerId: 9,
    providerName: "医疗健康部"
  }
];

export default defineFakeRoute([
  {
    url: "/api/data-resource/list",
    method: "get",
    response: ({ query }) => {
      const keyword = String(query?.name ?? "")
        .trim()
        .toLowerCase();
      const type = query?.type as string | undefined;
      const status = query?.status as string | undefined;
      const strategy = query?.strategy as string | undefined;

      let filtered = [...resources];

      if (keyword) {
        filtered = filtered.filter(
          item =>
            item.name.toLowerCase().includes(keyword) ||
            item.description.toLowerCase().includes(keyword)
        );
      }
      if (type) {
        filtered = filtered.filter(item => item.type === type);
      }
      if (status) {
        filtered = filtered.filter(item => item.publishStatus === status);
      }
      if (strategy) {
        filtered = filtered.filter(item => item.accessStrategy === strategy);
      }

      return {
        code: 0,
        message: "ok",
        data: {
          content: filtered,
          totalElements: filtered.length,
          pageNumber: Number(query?.page ?? 0),
          pageSize: Number(query?.size ?? 10)
        }
      };
    }
  },
  {
    url: "/api/data-resource/search/prefix",
    method: "get",
    response: ({ query }) => {
      const keyword = String(query?.keyword ?? "")
        .trim()
        .toLowerCase();
      const matched = keyword
        ? resources.filter(
            item =>
              item.name.toLowerCase().startsWith(keyword) ||
              item.description.toLowerCase().includes(keyword)
          )
        : resources;
      return {
        code: 0,
        message: "ok",
        data: matched
      };
    }
  },
  {
    url: "/api/data-resource/:id",
    method: "get",
    response: ({ params }) => {
      const id = Number(params?.id);
      const item = resources.find(r => r.id === id);
      if (!item) {
        return { code: 404, message: "not found", data: null };
      }
      return { code: 0, message: "ok", data: item };
    }
  },
  {
    url: "/api/data-resource/types",
    method: "get",
    response: () => {
      return {
        code: 0,
        message: "ok",
        data: [
          { value: "DATABASE", label: "数据库" },
          { value: "OSS", label: "对象存储" },
          { value: "LFS", label: "大文件存储" },
          { value: "DFS", label: "分布式文件系统" },
          { value: "BLOCKCHAIN", label: "区块链存证" },
          { value: "MINIO", label: "MinIO 存储" },
          { value: "API", label: "外部 API" }
        ]
      };
    }
  }
]);
