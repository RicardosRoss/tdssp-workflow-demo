// Shared project-page workspace helpers live outside the SFC so both runtime
// code and node tests can import them without pulling Vue component code.
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

export function isWorkflowProjectSection(value) {
  return WORKFLOW_PROJECT_SECTIONS.some(item => item.key === value);
}

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
