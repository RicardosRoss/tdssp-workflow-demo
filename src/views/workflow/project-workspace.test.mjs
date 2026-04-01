import test from "node:test";
import assert from "node:assert/strict";
import {
  getProjectComputeModeLabel,
  getWorkflowWorkspaceRedirect,
  resolveWorkflowWorkspaceState,
  WORKFLOW_PROJECT_SECTIONS
} from "./project-workspace.mjs";

test("resolveWorkflowWorkspaceState falls back to list mode without projects", () => {
  assert.deepEqual(
    resolveWorkflowWorkspaceState({
      projects: [],
      requestedProjectId: "missing",
      requestedSection: "data-service"
    }),
    {
      mode: "list",
      selectedProjectId: "",
      selectedSection: "playground",
      sections: WORKFLOW_PROJECT_SECTIONS
    }
  );
});

test("resolveWorkflowWorkspaceState selects requested project and normalizes invalid section", () => {
  assert.deepEqual(
    resolveWorkflowWorkspaceState({
      projects: [
        { projectId: "p-1", projectName: "项目一" },
        { projectId: "p-2", projectName: "项目二" }
      ],
      requestedProjectId: "p-2",
      requestedSection: "unknown"
    }),
    {
      mode: "workspace",
      selectedProjectId: "p-2",
      selectedSection: "playground",
      sections: WORKFLOW_PROJECT_SECTIONS
    }
  );
});

test("resolveWorkflowWorkspaceState keeps project list mode when no project is requested", () => {
  assert.deepEqual(
    resolveWorkflowWorkspaceState({
      projects: [
        { projectId: "p-1", projectName: "项目一" },
        { projectId: "p-2", projectName: "项目二" }
      ]
    }),
    {
      mode: "list",
      selectedProjectId: "",
      selectedSection: "playground",
      sections: WORKFLOW_PROJECT_SECTIONS
    }
  );
});

test("resolveWorkflowWorkspaceState picks the first project when requested one is missing", () => {
  assert.deepEqual(
    resolveWorkflowWorkspaceState({
      projects: [
        { projectId: "p-1", projectName: "项目一" },
        { projectId: "p-2", projectName: "项目二" }
      ],
      requestedProjectId: "missing",
      requestedSection: "data-resource"
    }),
    {
      mode: "workspace",
      selectedProjectId: "p-1",
      selectedSection: "data-resource",
      sections: WORKFLOW_PROJECT_SECTIONS
    }
  );
});

test("getWorkflowWorkspaceRedirect waits until project data has loaded", () => {
  assert.equal(
    getWorkflowWorkspaceRedirect({
      hasLoadedProjects: false,
      mode: "list",
      currentProjectId: "p-1",
      currentSection: "playground",
      selectedProjectId: "",
      selectedSection: "playground"
    }),
    null
  );
});

test("getWorkflowWorkspaceRedirect keeps workspace query once data is ready", () => {
  assert.equal(
    getWorkflowWorkspaceRedirect({
      hasLoadedProjects: true,
      mode: "workspace",
      currentProjectId: "p-1",
      currentSection: "playground",
      selectedProjectId: "p-1",
      selectedSection: "playground"
    }),
    null
  );
});

test("getProjectComputeModeLabel normalizes known compute modes", () => {
  assert.equal(getProjectComputeModeLabel("MPC"), "管道模式");
  assert.equal(getProjectComputeModeLabel("TEE"), "枢纽模式");
  assert.equal(getProjectComputeModeLabel("自定义模式"), "自定义模式");
});
