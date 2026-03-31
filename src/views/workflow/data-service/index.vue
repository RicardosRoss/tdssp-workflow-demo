<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import {
  getDataServiceList,
  getDataServiceDetail,
  type DataServiceResponse,
  type DataServiceType,
  type DataServiceOperationType,
  type DataServiceStatus
} from "@/api/data-service";

defineOptions({ name: "DataServicePage" });

// ---------------------------------------------------------------------------
// 常量映射
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<DataServiceType, string> = {
  COMPUTE: "计算服务",
  INTELLIGENCE: "智能服务",
  DATA_MARKET: "数据市场",
  DATA_GOVERNANCE: "数据治理",
  PRIVACY_COMPUTE_PUBLIC: "隐私计算",
  OTHER: "其他"
};

const TYPE_TAG: Record<DataServiceType, string> = {
  COMPUTE: "",
  INTELLIGENCE: "success",
  DATA_MARKET: "warning",
  DATA_GOVERNANCE: "info",
  PRIVACY_COMPUTE_PUBLIC: "danger",
  OTHER: "info"
};

const OPERATION_LABEL: Record<DataServiceOperationType, string> = {
  TEE_CREATE_TASK: "TEE 创建任务",
  TEE_START_TASK: "TEE 启动任务",
  TEE_EXECUTE_TASK: "TEE 执行任务",
  TEE_CANCEL_TASK: "TEE 取消任务"
};

const STATUS_TAG: Record<DataServiceStatus, { label: string; type: string }> = {
  ACTIVE: { label: "活跃", type: "success" },
  DRAFT: { label: "草稿", type: "warning" },
  INACTIVE: { label: "停用", type: "info" },
  DEPRECATED: { label: "已废弃", type: "danger" }
};

const typeOptions = Object.entries(TYPE_LABEL).map(([value, label]) => ({
  value,
  label
}));
const statusOptions = Object.entries(STATUS_TAG).map(([value, { label }]) => ({
  value,
  label
}));

// ---------------------------------------------------------------------------
// 查询状态
// ---------------------------------------------------------------------------

const loading = ref(false);
const tableData = ref<DataServiceResponse[]>([]);
const total = ref(0);

const query = reactive({
  serviceName: "",
  serviceType: "" as string,
  status: "" as string,
  page: 1,
  pageSize: 10
});

// ---------------------------------------------------------------------------
// 数据加载
// ---------------------------------------------------------------------------

async function fetchData() {
  loading.value = true;
  try {
    const res = await getDataServiceList({
      serviceName: query.serviceName || undefined,
      serviceType: query.serviceType || undefined,
      status: query.status || undefined,
      page: query.page - 1,
      size: query.pageSize
    });
    tableData.value = res.data.content;
    total.value = res.data.totalElements;
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  fetchData();
}

function handleReset() {
  query.serviceName = "";
  query.serviceType = "";
  query.status = "";
  query.page = 1;
  fetchData();
}

function handlePageChange(page: number) {
  query.page = page;
  fetchData();
}

function handleSizeChange(size: number) {
  query.pageSize = size;
  query.page = 1;
  fetchData();
}

// ---------------------------------------------------------------------------
// 详情抽屉
// ---------------------------------------------------------------------------

const drawerVisible = ref(false);
const drawerLoading = ref(false);
const detail = ref<DataServiceResponse | null>(null);

const detailParsedMeta = computed<Record<string, unknown> | null>(() => {
  if (!detail.value?.metaData) return null;
  try {
    return JSON.parse(detail.value.metaData);
  } catch {
    return null;
  }
});

const detailInputSpec = computed(() => {
  if (!detail.value?.inputDataSpec) return null;
  try {
    return JSON.parse(detail.value.inputDataSpec);
  } catch {
    return null;
  }
});

const detailOutputSpec = computed(() => {
  if (!detail.value?.outputDataSpec) return null;
  try {
    return JSON.parse(detail.value.outputDataSpec);
  } catch {
    return null;
  }
});

async function handleView(row: DataServiceResponse) {
  drawerVisible.value = true;
  drawerLoading.value = true;
  try {
    const res = await getDataServiceDetail(row.id);
    detail.value = res.data;
  } catch {
    detail.value = row;
  } finally {
    drawerLoading.value = false;
  }
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("zh-CN");
}

function formatJson(obj: unknown): string {
  if (!obj) return "";
  return JSON.stringify(obj, null, 2);
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="data-service-page p-4">
    <!-- 搜索筛选栏 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" class="flex flex-wrap gap-2">
        <el-form-item label="名称">
          <el-input
            v-model="query.serviceName"
            placeholder="搜索服务名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="query.serviceType"
            placeholder="全部类型"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" stripe class="w-full">
        <el-table-column
          prop="serviceName"
          label="服务名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="serviceType"
          label="服务类型"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="
                (TYPE_TAG[row.serviceType as DataServiceType] as any) ?? 'info'
              "
              size="small"
            >
              {{
                TYPE_LABEL[row.serviceType as DataServiceType] ??
                row.serviceType
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="operationType"
          label="操作类型"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            {{
              row.operationType
                ? (OPERATION_LABEL[
                    row.operationType as DataServiceOperationType
                  ] ?? row.operationType)
                : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="
                (STATUS_TAG[row.status as DataServiceStatus]?.type as any) ??
                'info'
              "
              size="small"
            >
              {{
                STATUS_TAG[row.status as DataServiceStatus]?.label ?? row.status
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="serviceEndpoint"
          label="服务端点"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <code class="text-xs">{{ row.serviceEndpoint }}</code>
          </template>
        </el-table-column>
        <el-table-column
          prop="serviceDescription"
          label="描述"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="updatedAt"
          label="更新时间"
          width="170"
          align="center"
        >
          <template #default="{ row }">{{
            formatDate(row.updatedAt)
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleView(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="数据服务详情"
      size="520px"
      destroy-on-close
    >
      <div v-loading="drawerLoading">
        <template v-if="detail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="服务名称">{{
              detail.serviceName
            }}</el-descriptions-item>
            <el-descriptions-item label="服务类型">
              <el-tag
                :type="
                  (TYPE_TAG[detail.serviceType as DataServiceType] as any) ??
                  'info'
                "
                size="small"
              >
                {{
                  TYPE_LABEL[detail.serviceType as DataServiceType] ??
                  detail.serviceType
                }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.operationType" label="操作类型">
              {{
                OPERATION_LABEL[
                  detail.operationType as DataServiceOperationType
                ] ?? detail.operationType
              }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag
                :type="
                  (STATUS_TAG[detail.status as DataServiceStatus]
                    ?.type as any) ?? 'info'
                "
                size="small"
              >
                {{
                  STATUS_TAG[detail.status as DataServiceStatus]?.label ??
                  detail.status
                }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="服务端点">
              <code class="text-xs break-all">{{
                detail.serviceEndpoint
              }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="描述">{{
              detail.serviceDescription
            }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{
              formatDate(detail.createdAt)
            }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{
              formatDate(detail.updatedAt)
            }}</el-descriptions-item>
          </el-descriptions>

          <!-- 输入/输出规格 -->
          <el-divider content-position="left">数据规格</el-divider>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="输入规格">
              <pre
                v-if="detailInputSpec"
                class="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40 m-0"
                >{{ formatJson(detailInputSpec) }}</pre
              >
              <span v-else class="text-xs text-gray-400">无</span>
            </el-descriptions-item>
            <el-descriptions-item label="输出规格">
              <pre
                v-if="detailOutputSpec"
                class="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40 m-0"
                >{{ formatJson(detailOutputSpec) }}</pre
              >
              <span v-else class="text-xs text-gray-400">无</span>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 扩展元数据 -->
          <template v-if="detailParsedMeta">
            <el-divider content-position="left">扩展信息</el-divider>
            <el-descriptions :column="1" border>
              <el-descriptions-item
                v-for="(value, key) in detailParsedMeta"
                :key="String(key)"
                :label="String(key)"
              >
                <template v-if="typeof value === 'object'">
                  {{ JSON.stringify(value) }}
                </template>
                <template v-else>{{ value }}</template>
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </template>
      </div>
    </el-drawer>
  </div>
</template>
