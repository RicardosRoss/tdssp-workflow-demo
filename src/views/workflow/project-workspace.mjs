/**
 * project-workspace.mjs
 *
 * 项目工作区的共享状态逻辑。
 * 从 SFC 中抽取出来，方便单元测试直接导入而无需加载 Vue 组件。
 *
 * 核心概念：
 * - 项目页有两种模式：list（项目列表）和 workspace（工作区）
 * - 模式由 URL query 参数驱动：有 projectId → workspace，无 → list
 */

// ---------------------------------------------------------------------------
// 工作区 tab 页定义
// ---------------------------------------------------------------------------

/** 工作区中可切换的三个 tab 页，对应不同的功能区域 */
export const WORKFLOW_PROJECT_SECTIONS = [
  {
    key: "playground",
    label: "训练流",
    description: "场景模板"
  },
  {
    key: "data-service",
    label: "组件库",
    description: "数据服务"
  },
  {
    key: "data-resource",
    label: "数据集",
    description: "数据资源"
  }
];

/**
 * 检查给定值是否为有效的工作区 section key
 * @param value - 待校验的字符串
 * @returns 是否匹配某个 section 的 key
 */
export function isWorkflowProjectSection(value) {
  return WORKFLOW_PROJECT_SECTIONS.some(item => item.key === value);
}

// ---------------------------------------------------------------------------
// 工作区状态解析
// ---------------------------------------------------------------------------

/**
 * 根据项目列表和 URL query 参数，解析出当前应该处于的工作区状态
 *
 * 判断逻辑：
 * 1. 如果项目列表为空 或 URL 没有 projectId → 返回 list 模式（显示项目卡片列表）
 * 2. 如果 URL 有 projectId → 在项目列表中查找匹配项，返回 workspace 模式
 *    - 如果找不到对应项目，降级选第一个项目
 *    - section 如果不是有效值，默认回到 playground
 *
 * @param projects - 从 API 获取的项目列表
 * @param requestedProjectId - URL 中的 projectId query 参数
 * @param requestedSection - URL 中的 section query 参数
 * @returns 包含 mode、selectedProjectId、selectedSection、sections 的工作区状态对象
 */
export function resolveWorkflowWorkspaceState({
  projects,
  requestedProjectId,
  requestedSection
}) {
  if (!projects.length || !requestedProjectId) {
    return {
      mode: "list",
      selectedProjectId: "",
      selectedSection: "playground",
      sections: WORKFLOW_PROJECT_SECTIONS
    };
  }

  const selectedProject =
    projects.find(item => item.projectId === requestedProjectId) ?? projects[0];

  return {
    mode: "workspace",
    selectedProjectId: selectedProject.projectId ?? "",
    selectedSection: isWorkflowProjectSection(requestedSection)
      ? requestedSection
      : "playground",
    sections: WORKFLOW_PROJECT_SECTIONS
  };
}

// ---------------------------------------------------------------------------
// 计算模式标签映射
// ---------------------------------------------------------------------------

/**
 * 将后端的计算模式标识转为中文标签
 * MPC / PIPELINE → 管道模式
 * TEE / HUB → 枢纽模式
 *
 * @param computeMode - 后端返回的计算模式字段，可能为空
 * @returns 对应的中文标签
 */
export function getProjectComputeModeLabel(computeMode) {
  if (!computeMode) return "管道模式";

  const normalized = computeMode.toUpperCase();

  if (
    normalized === "TEE" ||
    normalized === "HUB" ||
    computeMode === "枢纽模式"
  ) {
    return "枢纽模式";
  }

  if (
    normalized === "MPC" ||
    normalized === "PIPELINE" ||
    computeMode === "管道模式"
  ) {
    return "管道模式";
  }

  return computeMode;
}

// ---------------------------------------------------------------------------
// 路由重定向
// ---------------------------------------------------------------------------

/**
 * 根据当前状态判断是否需要自动重定向，确保 URL 与实际状态一致
 *
 * 场景：
 * - list 模式但 URL 残留 projectId → 清除 query，回到纯净的列表 URL
 * - workspace 模式但 URL 中 projectId/section 与实际不一致 → 修正 query
 * - 项目列表还没加载完 → 不做任何操作，避免闪烁
 *
 * @param hasLoadedProjects - 项目列表是否已加载完成
 * @param mode - 当前模式（list 或 workspace）
 * @param currentProjectId - URL 中当前的 projectId
 * @param currentSection - URL 中当前的 section
 * @param selectedProjectId - 实际应选中的 projectId
 * @param selectedSection - 实际应选中的 section
 * @returns 需要重定向时返回目标路由对象，否则返回 null
 */
export function getWorkflowWorkspaceRedirect({
  hasLoadedProjects,
  mode,
  currentProjectId,
  currentSection,
  selectedProjectId,
  selectedSection
}) {
  if (!hasLoadedProjects) {
    return null;
  }

  if (mode === "list" && (currentProjectId || currentSection)) {
    return {
      path: "/workflow/projects"
    };
  }

  if (
    mode === "workspace" &&
    (currentProjectId !== selectedProjectId ||
      currentSection !== selectedSection)
  ) {
    return {
      path: "/workflow/projects",
      query: {
        projectId: selectedProjectId,
        section: selectedSection
      }
    };
  }

  return null;
}
