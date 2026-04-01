<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from "vue";
import {
  createProject,
  deleteProject,
  listProject,
  updateProject,
  type CreateProjectRequest,
  type ProjectVO,
  type UpdateProjectRequest
} from "@/api/project";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules
} from "element-plus";
import { useRoute, useRouter } from "vue-router";
import WorkflowPlaygroundPage from "@/views/workflow/playground/index.vue";
import {
  getWorkflowWorkspaceRedirect,
  getProjectComputeModeLabel,
  resolveWorkflowWorkspaceState
} from "../project-workspace.mjs";

defineOptions({ name: "WorkflowProjectPage" });

type WorkflowProjectSection = "playground";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const submitting = ref(false);
const createDialogVisible = ref(false);
const projectFormRef = ref<FormInstance>();
const projects = ref<ProjectVO[]>([]);
const editingProjectId = ref("");
const hasLoadedProjects = ref(false);

const filters = reactive({
  keyword: "",
  computeMode: ""
});

const projectForm = reactive<
  CreateProjectRequest & {
    templateId: string;
  }
>({
  name: "",
  description: "",
  computeMode: "MPC",
  templateId: "federated-circle"
});

const projectFormRules: FormRules<typeof projectForm> = {
  name: [
    { required: true, message: "请输入项目名称", trigger: "blur" },
    {
      min: 1,
      max: 32,
      message: "项目名称长度需在 1 到 32 个字符之间",
      trigger: "blur"
    }
  ]
};

const templateOptions = [
  {
    id: "blank",
    icon: "▤",
    title: "自定义训练流",
    description: "创建一个空白项目，从头配置工作流"
  }
] as const;

const filteredProjects = computed(() => {
  return projects.value.filter(project => {
    const name = project.projectName ?? "";
    const keywordMatched =
      !filters.keyword ||
      name.toLowerCase().includes(filters.keyword.toLowerCase());
    const modeMatched =
      !filters.computeMode || project.computeMode === filters.computeMode;

    return keywordMatched && modeMatched;
  });
});

const workspaceState = computed(() =>
  resolveWorkflowWorkspaceState({
    projects: projects.value,
    requestedProjectId: route.query.projectId as string | undefined,
    requestedSection: route.query.section as string | undefined
  })
);

const isWorkspaceMode = computed(
  () => workspaceState.value.mode === "workspace"
);

const selectedProject = computed(() => {
  return (
    projects.value.find(
      project => project.projectId === workspaceState.value.selectedProjectId
    ) ?? null
  );
});

const currentSectionComponent = computed<Component>(
  () => WorkflowPlaygroundPage
);

function getProjectNodeCount(project: ProjectVO) {
  return project.nodes?.length ?? 0;
}

function getProjectWorkflowCount(_project: ProjectVO) {
  return 0;
}

function getProjectJobCount(project: ProjectVO) {
  return project.partyVoteInfos?.length ?? 0;
}

async function fetchProjects() {
  hasLoadedProjects.value = false;
  loading.value = true;

  try {
    projects.value = await listProject();
  } catch (error) {
    projects.value = [];
    console.error(error);
    ElMessage.error("项目列表加载失败");
  } finally {
    hasLoadedProjects.value = true;
    loading.value = false;
  }
}

function openCreateDialog() {
  editingProjectId.value = "";
  resetProjectForm();
  createDialogVisible.value = true;
}

function openEditDialog(project: ProjectVO) {
  editingProjectId.value = project.projectId ?? "";
  projectForm.name = project.projectName ?? "";
  projectForm.description = project.description ?? "";
  projectForm.computeMode = project.computeMode ?? "MPC";
  projectForm.templateId = "blank";
  createDialogVisible.value = true;
}

function resetProjectForm() {
  editingProjectId.value = "";
  projectForm.name = "";
  projectForm.description = "";
  projectForm.computeMode = "MPC";
  projectForm.templateId = "federated-circle";
  projectFormRef.value?.clearValidate();
}

function closeCreateDialog() {
  createDialogVisible.value = false;
  resetProjectForm();
}

async function submitCreateProject() {
  await projectFormRef.value?.validate();

  submitting.value = true;

  try {
    let nextProjectId = editingProjectId.value;

    if (editingProjectId.value) {
      await updateProject({
        projectId: editingProjectId.value,
        name: projectForm.name,
        description: projectForm.description
      } satisfies UpdateProjectRequest);
      ElMessage.success("项目更新成功");
    } else {
      const createdProject = await createProject({
        name: projectForm.name,
        description: projectForm.description,
        computeMode: projectForm.computeMode
      } satisfies CreateProjectRequest);

      ElMessage.success("项目创建成功");
      nextProjectId =
        createdProject?.projectId ||
        projects.value.find(
          item => item.projectName === createdProject?.projectName
        )?.projectId ||
        "";
    }

    createDialogVisible.value = false;
    resetProjectForm();
    await fetchProjects();

    if (nextProjectId) {
      openProject(nextProjectId);
    }
  } catch (error) {
    console.error(error);
    ElMessage.error("项目创建失败");
  } finally {
    submitting.value = false;
  }
}

async function handleDeleteProject(project: ProjectVO) {
  if (!project.projectId) return;

  try {
    await ElMessageBox.confirm(
      `确认删除项目“${project.projectName || "未命名项目"}”吗？`,
      "删除项目",
      {
        type: "warning",
        confirmButtonText: "删除",
        cancelButtonText: "取消"
      }
    );

    await deleteProject({ projectId: project.projectId });
    ElMessage.success("项目删除成功");

    if (workspaceState.value.selectedProjectId === project.projectId) {
      backToProjectList();
    }

    await fetchProjects();
  } catch (error) {
    if (error === "cancel") return;
    console.error(error);
    ElMessage.error("项目删除失败");
  }
}

function openProject(
  projectId: string,
  section: WorkflowProjectSection = "playground"
) {
  router.push({
    path: "/workflow/projects",
    query: {
      projectId,
      section
    }
  });
}

function backToProjectList() {
  router.push({ path: "/workflow/projects" });
}

watch(
  () => [projects.value, route.query.projectId, route.query.section] as const,
  () => {
    const { mode, selectedProjectId, selectedSection } = workspaceState.value;
    const currentProjectId = route.query.projectId as string | undefined;
    const currentSection = route.query.section as string | undefined;

    const redirect = getWorkflowWorkspaceRedirect({
      hasLoadedProjects: hasLoadedProjects.value,
      mode,
      currentProjectId,
      currentSection,
      selectedProjectId,
      selectedSection
    });

    if (redirect) {
      router.replace(redirect);
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchProjects();
});
</script>

<template>
  <div class="workflow-project-page">
    <section v-if="!isWorkspaceMode" class="workflow-project-list">
      <div class="workflow-project-list__toolbar">
        <div class="workflow-project-list__filters">
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="搜索项目"
            class="workflow-project-list__search"
          />
          <el-select
            v-model="filters.computeMode"
            clearable
            placeholder="全部计算模式"
            class="workflow-project-list__mode"
          >
            <el-option label="管道模式" value="MPC" />
            <el-option label="枢纽模式" value="TEE" />
          </el-select>
        </div>
        <el-button type="primary" @click="openCreateDialog">新建项目</el-button>
      </div>

      <el-empty
        v-if="!loading && !filteredProjects.length"
        description="暂无项目，可先创建一个项目"
      />

      <div v-else v-loading="loading" class="workflow-project-list__grid">
        <article
          v-for="project in filteredProjects"
          :key="project.projectId"
          class="workflow-project-card"
          role="button"
          tabindex="0"
          @click="openProject(project.projectId || '')"
          @keydown.enter="openProject(project.projectId || '')"
          @keydown.space.prevent="openProject(project.projectId || '')"
        >
          <div class="workflow-project-card__header">
            <div class="workflow-project-card__title-row">
              <span class="workflow-project-card__mode">
                {{ getProjectComputeModeLabel(project.computeMode) }}
              </span>
              <div class="workflow-project-card__actions">
                <el-button
                  link
                  type="primary"
                  @click.stop="openEditDialog(project)"
                >
                  编辑
                </el-button>
                <el-button
                  link
                  type="danger"
                  @click.stop="handleDeleteProject(project)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <h3>{{ project.projectName || "未命名项目" }}</h3>
          </div>
          <p class="workflow-project-card__desc">
            {{ project.description || "暂无项目描述" }}
          </p>
          <div class="workflow-project-card__stats">
            <div class="workflow-project-card__stat">
              <span>参与节点</span>
              <strong>{{ getProjectNodeCount(project) }}</strong>
            </div>
            <div class="workflow-project-card__stat">
              <span>训练流</span>
              <strong>{{ getProjectWorkflowCount(project) }}</strong>
            </div>
            <div class="workflow-project-card__stat">
              <span>任务数</span>
              <strong>{{ getProjectJobCount(project) }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="workflow-project-workspace">
      <main class="workflow-project-workspace__content">
        <div class="workflow-project-workspace__header">
          <div class="workflow-project-workspace__project">
            <el-button link type="primary" @click="backToProjectList">
              返回项目页
            </el-button>
            <h2>{{ selectedProject?.projectName || "工作流项目" }}</h2>
            <p>{{ selectedProject?.description || "暂无项目描述" }}</p>
          </div>
        </div>
        <component :is="currentSectionComponent" />
      </main>
    </section>

    <el-dialog
      v-model="createDialogVisible"
      :title="editingProjectId ? '编辑项目' : '新建项目'"
      width="720px"
      destroy-on-close
      @closed="resetProjectForm"
    >
      <el-form
        ref="projectFormRef"
        :model="projectForm"
        :rules="projectFormRules"
        label-position="left"
        label-width="104px"
      >
        <el-form-item label="项目名称" prop="name" required>
          <el-input
            v-model="projectForm.name"
            maxlength="32"
            show-word-limit
            placeholder="请输入中文、大小写英文、数字、下划线、中划线，32个字"
          />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            maxlength="128"
            show-word-limit
            :rows="4"
            placeholder="请输入 128 字符以内的介绍"
          />
        </el-form-item>
        <el-form-item label="计算模式">
          <el-radio-group v-model="projectForm.computeMode">
            <el-radio value="MPC">管道模式</el-radio>
            <el-radio value="TEE">枢纽模式</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!editingProjectId" label="训练流模板">
          <div class="workflow-template-grid">
            <button
              v-for="template in templateOptions"
              :key="template.id"
              type="button"
              class="workflow-template-card"
              :class="{
                'is-selected': projectForm.templateId === template.id
              }"
              @click="projectForm.templateId = template.id"
            >
              <div class="workflow-template-card__icon">
                {{ template.icon }}
              </div>
              <strong>{{ template.title }}</strong>
              <span>{{ template.description }}</span>
            </button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeCreateDialog">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitCreateProject"
        >
          {{ editingProjectId ? "保存" : "创建" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.workflow-project-page {
  height: 100%;
}

.workflow-project-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workflow-project-list__toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border: 1px solid #e8edf7;
  border-radius: 12px;
}

.workflow-project-list__filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.workflow-project-list__search {
  width: 220px;
}

.workflow-project-list__mode {
  width: 180px;
}

.workflow-project-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.workflow-project-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: stretch;
  padding: 20px 22px;
  text-align: left;
  cursor: pointer;
  background: linear-gradient(180deg, #f9fbff 0%, #f2f6ff 100%);
  border: 1px solid #edf2fc;
  border-radius: 16px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.workflow-project-card:hover {
  border-color: #7eb0ff;
  box-shadow: 0 16px 32px rgb(64 111 190 / 12%);
  transform: translateY(-2px);
}

.workflow-project-card__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workflow-project-card__title-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.workflow-project-card__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.workflow-project-card__header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1d2b44;
}

.workflow-project-card__mode {
  display: inline-flex;
  width: fit-content;
  padding: 2px 8px;
  font-size: 12px;
  color: #ef8b1f;
  background: rgb(239 139 31 / 10%);
  border-radius: 999px;
}

.workflow-project-card__desc {
  min-height: 40px;
  margin: 0;
  color: #7a869a;
}

.workflow-project-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding-top: 20px;
  border-top: 1px solid #e8edf7;
}

.workflow-project-card__stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workflow-project-card__stat span {
  font-size: 13px;
  color: #6c7890;
}

.workflow-project-card__stat strong {
  font-size: 28px;
  font-weight: 600;
  color: #1f2a44;
}

.workflow-project-workspace {
  min-height: calc(100vh - 170px);
}

.workflow-project-workspace__header {
  padding: 0 0 12px;
}

.workflow-project-workspace__project h2 {
  margin: 8px 0;
  font-size: 20px;
  color: #1f2a44;
}

.workflow-project-workspace__project p {
  margin: 0;
  color: #77839b;
}

.workflow-project-workspace__content {
  min-width: 0;
  padding: 16px;
  background: #fff;
  border: 1px solid #e8edf7;
  border-radius: 16px;
}

.workflow-template-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
}

.workflow-template-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 156px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8edf7;
  border-radius: 14px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.workflow-template-card.is-selected {
  background: #eef5ff;
  border-color: #409eff;
}

.workflow-template-card__icon {
  font-size: 28px;
  line-height: 1;
  color: #409eff;
  letter-spacing: 6px;
}

.workflow-template-card strong {
  font-size: 18px;
  color: #1f2a44;
}

.workflow-template-card span {
  color: #8490a7;
}

@media (width <= 960px) {
  .workflow-project-list__toolbar,
  .workflow-project-list__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .workflow-project-workspace {
    min-height: auto;
  }

  .workflow-project-list__search,
  .workflow-project-list__mode {
    width: 100%;
  }
}
</style>
