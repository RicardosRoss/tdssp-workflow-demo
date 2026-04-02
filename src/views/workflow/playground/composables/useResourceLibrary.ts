/**
 * useResourceLibrary — 资源库动态数据获取
 *
 * 职责：
 * - 调用 getDataServiceList 获取活跃数据服务（组件库）
 * - 调用 getDataResourceList 获取已发布数据资源（数据集）
 * - 将 API 响应映射为 ServiceLibraryPanel 所需的 item 格式
 * - 提供加载状态供 UI 展示
 */

import { ref } from "vue";
import {
  getDataServiceList,
  type DataServiceResponse
} from "@/api/data-service";
import {
  getDataResourceList,
  type DataSourceResponse
} from "@/api/data-resource";
import {
  getWorkflowTemplates,
  getLoopConfigs,
  type WorkflowTemplate,
  type LoopConfig
} from "@/api/workflow-playground";

/** ServiceLibraryPanel 所需的 item 类型 */
export interface ResourceLibraryItem {
  id: string | number;
  name: string;
  summary: string;
  badge?: string;
  dragKind: "template" | "service" | "dataset";
  serviceType?: string;
  graph?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
}

/** 将 DataServiceResponse 映射为 ResourceLibraryItem */
function mapServiceItem(svc: DataServiceResponse): ResourceLibraryItem {
  return {
    id: svc.id,
    name: svc.serviceName,
    summary: svc.serviceDescription,
    badge: svc.serviceType,
    dragKind: "service" as const,
    serviceType: svc.serviceType
  };
}

/** 将 DataSourceResponse 映射为 ResourceLibraryItem */
function mapDatasetItem(ds: DataSourceResponse): ResourceLibraryItem {
  return {
    id: ds.id,
    name: ds.name,
    summary: ds.description,
    badge: ds.type,
    dragKind: "dataset" as const
  };
}

/** 单次拉取上限，超出部分暂不分页展示 */
const MAX_RESOURCE_PAGE_SIZE = 200;

export function useResourceLibrary() {
  // ---- 状态 ----
  const services = ref<ResourceLibraryItem[]>([]);
  const datasets = ref<ResourceLibraryItem[]>([]);
  const templates = ref<WorkflowTemplate[]>([]);
  const loops = ref<LoopConfig[]>([]);
  const servicesLoading = ref(false);
  const datasetsLoading = ref(false);
  const templatesLoading = ref(false);
  const loopsLoading = ref(false);

  /** 获取活跃数据服务列表（组件库） */
  async function fetchServices() {
    servicesLoading.value = true;
    try {
      const res = await getDataServiceList({
        status: "ACTIVE",
        size: MAX_RESOURCE_PAGE_SIZE
      });
      services.value = (res.data.content ?? []).map(mapServiceItem);
    } catch (e) {
      console.error("获取数据服务列表失败:", e);
      services.value = [];
    } finally {
      servicesLoading.value = false;
    }
  }

  /** 获取已发布数据资源列表（数据集） */
  async function fetchDatasets() {
    datasetsLoading.value = true;
    try {
      const res = await getDataResourceList({
        status: "PUBLISHED",
        size: MAX_RESOURCE_PAGE_SIZE
      });
      datasets.value = (res.data.content ?? []).map(mapDatasetItem);
    } catch (e) {
      console.error("获取数据资源列表失败:", e);
      datasets.value = [];
    } finally {
      datasetsLoading.value = false;
    }
  }

  /** 获取训练流模板列表 */
  async function fetchTemplates() {
    templatesLoading.value = true;
    try {
      const res = await getWorkflowTemplates();
      templates.value = res.data ?? [];
    } catch (e) {
      console.error("获取训练流模板失败:", e);
      templates.value = [];
    } finally {
      templatesLoading.value = false;
    }
  }

  /** 获取循环节点配置列表 */
  async function fetchLoops() {
    loopsLoading.value = true;
    try {
      const res = await getLoopConfigs();
      loops.value = res.data ?? [];
    } catch (e) {
      console.error("获取循环配置失败:", e);
      loops.value = [];
    } finally {
      loopsLoading.value = false;
    }
  }

  // ---- 返回 ----
  return {
    services,
    datasets,
    templates,
    loops,
    servicesLoading,
    datasetsLoading,
    templatesLoading,
    loopsLoading,
    fetchServices,
    fetchDatasets,
    fetchTemplates,
    fetchLoops
  };
}
