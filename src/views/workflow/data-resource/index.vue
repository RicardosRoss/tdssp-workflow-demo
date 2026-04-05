<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import {
  getDataResourceList,
  getDataResourceDetail,
  type DataSourceResponse,
  type DataSourceType,
  type AccessStrategyType,
  type PublishStatusType,
  type MetaData
} from "@/api/data-resource";

defineOptions({ name: "DataResourcePage" });

// ---------------------------------------------------------------------------
// 常量映射
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<DataSourceType, string> = {
  DATABASE: "数据库",
  OSS: "对象存储",
  LFS: "大文件存储",
  DFS: "分布式文件系统",
  BLOCKCHAIN: "区块链存证",
  MINIO: "MinIO 存储",
  API: "外部 API"
};

const STRATEGY_LABEL: Record<AccessStrategyType, string> = {
  PUBLIC: "公开",
  APPLICATION_REQUIRED: "申请访问",
  ROLE_BASED: "角色授权",
  HYBRID: "混合策略"
};

const STATUS_TAG: Record<PublishStatusType, { label: string; type: string }> = {
  PUBLISHED: { label: "已发布", type: "success" },
  DRAFT: { label: "草稿", type: "warning" },
  OFFLINE: { label: "已下线", type: "info" }
};

const typeOptions = Object.entries(TYPE_LABEL).map(([value, label]) => ({
  value,
  label
}));
const statusOptions = Object.entries(STATUS_TAG).map(([value, { label }]) => ({
  value,
  label
}));
const strategyOptions = Object.entries(STRATEGY_LABEL).map(
  ([value, label]) => ({ value, label })
);

// ---------------------------------------------------------------------------
// 查询状态
// ---------------------------------------------------------------------------

const loading = ref(false);
const tableData = ref<DataSourceResponse[]>([]);
const total = ref(0);

const query = reactive({
  name: "",
  type: "" as string,
  status: "" as string,
  strategy: "" as string,
  page: 1,
  pageSize: 10
});

// ---------------------------------------------------------------------------
// 数据加载
// ---------------------------------------------------------------------------

async function fetchData() {
  loading.value = true;
  try {
    const res = await getDataResourceList({
      name: query.name || undefined,
      type: query.type || undefined,
      status: query.status || undefined,
      strategy: query.strategy || undefined,
      page: query.page - 1,
      size: query.pageSize
    });
    tableData.value = res.data.content;
    total.value = res.data.totalElements;
  } catch (e) {
    console.error("获取数据资源列表失败:", e);
    ElMessage.error("获取数据资源列表失败");
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
  query.name = "";
  query.type = "";
  query.status = "";
  query.strategy = "";
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
const detail = ref<DataSourceResponse | null>(null);

const detailMeta = computed<MetaData | null>(() => {
  if (!detail.value?.metaData) return null;
  return detail.value.metaData;
});

async function handleView(row: DataSourceResponse) {
  drawerVisible.value = true;
  drawerLoading.value = true;
  try {
    const res = await getDataResourceDetail(row.id);
    detail.value = res.data;
  } catch (e) {
    ElMessage.error("获取资源详情失败");
    console.error("获取资源详情失败:", e);
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

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="data-resource-page p-4">
    <!-- 搜索筛选栏 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" class="flex flex-wrap gap-2">
        <el-form-item label="名称">
          <el-input
            v-model="query.name"
            placeholder="搜索资源名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="query.type"
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
        <el-form-item label="访问策略">
          <el-select
            v-model="query.strategy"
            placeholder="全部策略"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="opt in strategyOptions"
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
          prop="name"
          label="资源名称"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="type" label="类型" width="140" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{
              TYPE_LABEL[row.type as DataSourceType] ?? row.type
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="accessStrategy"
          label="访问策略"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            {{
              STRATEGY_LABEL[row.accessStrategy as AccessStrategyType] ??
              row.accessStrategy
            }}
          </template>
        </el-table-column>
        <el-table-column
          prop="publishStatus"
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="
                (STATUS_TAG[row.publishStatus as PublishStatusType]
                  ?.type as any) ?? 'info'
              "
              size="small"
            >
              {{
                STATUS_TAG[row.publishStatus as PublishStatusType]?.label ??
                row.publishStatus
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="providerName"
          label="提供方"
          width="130"
          show-overflow-tooltip
        />
        <el-table-column
          prop="description"
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
      title="数据资源详情"
      size="480px"
      destroy-on-close
    >
      <div v-loading="drawerLoading">
        <template v-if="detail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="资源名称">{{
              detail.name
            }}</el-descriptions-item>
            <el-descriptions-item label="资源类型">
              <el-tag size="small" effect="plain">{{
                TYPE_LABEL[detail.type as DataSourceType] ?? detail.type
              }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="访问策略">{{
              STRATEGY_LABEL[detail.accessStrategy as AccessStrategyType] ??
              detail.accessStrategy
            }}</el-descriptions-item>
            <el-descriptions-item label="发布状态">
              <el-tag
                :type="
                  (STATUS_TAG[detail.publishStatus as PublishStatusType]
                    ?.type as any) ?? 'info'
                "
                size="small"
              >
                {{
                  STATUS_TAG[detail.publishStatus as PublishStatusType]
                    ?.label ?? detail.publishStatus
                }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="提供方">{{
              detail.providerName
            }}</el-descriptions-item>
            <el-descriptions-item label="访问信息">
              <code class="text-xs break-all">{{ detail.accessInfo }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="描述">{{
              detail.description
            }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{
              formatDate(detail.createdAt)
            }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{
              formatDate(detail.updatedAt)
            }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.publishAt" label="发布时间">{{
              formatDate(detail.publishAt)
            }}</el-descriptions-item>
          </el-descriptions>

          <!-- 元数据 -->
          <template v-if="detailMeta">
            <el-divider content-position="left">元数据</el-divider>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="分类">{{
                detailMeta.classification
              }}</el-descriptions-item>
              <el-descriptions-item label="适用场景">
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="s in detailMeta.applicableScenarios"
                    :key="s"
                    size="small"
                    type="info"
                    effect="plain"
                  >
                    {{ s }}
                  </el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="技术规格">{{
                detailMeta.technicalSpec
              }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </template>
      </div>
    </el-drawer>
  </div>
</template>
