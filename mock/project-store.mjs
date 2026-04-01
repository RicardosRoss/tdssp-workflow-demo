const INITIAL_PROJECTS = [
  {
    projectId: "project-mpc-001",
    projectName: "管道 MPC 项目",
    description: "管道模式的项目示例",
    computeMode: "MPC",
    computeFunc: "联合圈人",
    gmtCreate: "2026-03-28T08:00:00Z",
    nodes: [
      { nodeId: "node-1", nodeName: "机构 A" },
      { nodeId: "node-2", nodeName: "机构 B" },
      { nodeId: "node-3", nodeName: "机构 C" }
    ],
    partyVoteInfos: [{ action: "CREATED" }]
  },
  {
    projectId: "project-tee-002",
    projectName: "枢纽 tee-test",
    description: "这是一个测试项目，用于演示工作流功能",
    computeMode: "TEE",
    computeFunc: "二分类建模",
    gmtCreate: "2026-03-29T09:30:00Z",
    nodes: [
      { nodeId: "node-1", nodeName: "数据节点 A" },
      { nodeId: "node-2", nodeName: "TEE 节点" }
    ],
    partyVoteInfos: []
  }
];

let projectRecords = cloneProjects(INITIAL_PROJECTS);
let sequence = 3;

function cloneProjects(projects) {
  return structuredClone(projects);
}

function nowIso() {
  return new Date().toISOString();
}

export function resetProjectRecords() {
  projectRecords = cloneProjects(INITIAL_PROJECTS);
  sequence = 3;
}

export function listProjectRecords() {
  return cloneProjects(projectRecords);
}

export function getProjectRecord(projectId) {
  const project = projectRecords.find(item => item.projectId === projectId);
  return project ? structuredClone(project) : null;
}

export function createProjectRecord(body = {}) {
  const projectId = `project-${String(sequence).padStart(3, "0")}`;
  sequence += 1;

  const project = {
    projectId,
    projectName: body.name ?? "未命名项目",
    description: body.description ?? "",
    computeMode: body.computeMode ?? "MPC",
    computeFunc: body.computeFunc ?? "",
    gmtCreate: nowIso(),
    nodes: body.nodes ?? [],
    partyVoteInfos: []
  };

  projectRecords.unshift(project);
  return structuredClone(project);
}

export function updateProjectRecord(body = {}) {
  const index = projectRecords.findIndex(item => item.projectId === body.projectId);

  if (index === -1) return null;

  const current = projectRecords[index];
  const updated = {
    ...current,
    projectName: body.name ?? current.projectName,
    description: body.description ?? current.description
  };

  projectRecords.splice(index, 1, updated);
  return structuredClone(updated);
}

export function deleteProjectRecord(projectId) {
  const index = projectRecords.findIndex(item => item.projectId === projectId);

  if (index === -1) return false;

  projectRecords.splice(index, 1);
  return true;
}
