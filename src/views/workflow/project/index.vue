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

/** 工作区中可切换的子页面类型（目前只有 playground） */
type WorkflowProjectSection = "playground";

const route = useRoute();
const router = useRouter();

// ---------------------------------------------------------------------------
// 基础状态
// ---------------------------------------------------------------------------

/** 项目列表是否正在加载中 */
const loading = ref(false);
/** 创建/编辑表单是否正在提交中 */
const submitting = ref(false);
/** 新建/编辑项目的对话框是否可见 */
const createDialogVisible = ref(false);
/** Element Plus 表单实例引用，用于触发表单验证 */
const projectFormRef = ref<FormInstance>();
/** 从后端获取的项目列表数据 */
const projects = ref<ProjectVO[]>([]);
/** 当前正在编辑的项目 ID（空字符串表示新建模式） */
const editingProjectId = ref("");
/** 项目列表是否已加载完成（用于控制 watch 中的重定向逻辑，避免加载中闪烁） */
const hasLoadedProjects = ref(false);

// ---------------------------------------------------------------------------
// 筛选器
// ---------------------------------------------------------------------------

/** 项目列表的搜索和过滤条件 */
const filters = reactive({
  /** 按项目名称模糊搜索 */
  keyword: "",
  /** 按计算模式精确过滤 */
  computeMode: ""
});

// ---------------------------------------------------------------------------
// 表单相关
// ---------------------------------------------------------------------------

/** 新建/编辑项目的表单数据 */
const projectForm = reactive<
  CreateProjectRequest & {
    /** 选中的训练流模板 ID（目前只有 blank） */
    templateId: string;
  }
>({
  name: "",
  description: "",
  computeMode: "MPC",
  templateId: "federated-circle"
});

/** 表单校验规则 */
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

/** 可选的训练流模板列表（目前只提供空白模板） */
const templateOptions = [
  {
    id: "blank",
    icon: "▤",
    title: "自定义训练流",
    description: "创建一个空白项目，从头配置工作流"
  }
] as const;

// ---------------------------------------------------------------------------
// 计算属性
// ---------------------------------------------------------------------------

/** 根据筛选条件过滤后的项目列表 */
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

/**
 * 工作区状态：根据 URL query 参数和项目列表决定当前应该显示"列表模式"还是"工作区模式"
 *
 * 核心切换逻辑：
 * - URL 有 projectId → workspace 模式（显示训练流画布）
 * - URL 没有 projectId → list 模式（显示项目卡片网格）
 */
const workspaceState = computed(() =>
  resolveWorkflowWorkspaceState({
    projects: projects.value,
    requestedProjectId: route.query.projectId as string | undefined,
    requestedSection: route.query.section as string | undefined
  })
);

/** 当前是否处于工作区模式（已选中某个项目进入编辑） */
const isWorkspaceMode = computed(
  () => workspaceState.value.mode === "workspace"
);

/** 当前选中的完整项目对象（从 projects 数组中按 ID 查找） */
const selectedProject = computed(() => {
  return (
    projects.value.find(
      project => project.projectId === workspaceState.value.selectedProjectId
    ) ?? null
  );
});

/** 工作区中当前激活的子页面组件（目前固定为 Playground） */
const currentSectionComponent = computed<Component>(
  () => WorkflowPlaygroundPage
);

// ---------------------------------------------------------------------------
// 辅助函数：获取项目卡片的统计数字
// ---------------------------------------------------------------------------

/** 获取项目参与的节点数量 */
function getProjectNodeCount(project: ProjectVO) {
  return project.nodes?.length ?? 0;
}

/** 获取项目的训练流数量（当前固定返回 0，待后续实现） */
function getProjectWorkflowCount(_project: ProjectVO) {
  return 0;
}

/** 获取项目的任务（Job）数量 */
function getProjectJobCount(project: ProjectVO) {
  return project.partyVoteInfos?.length ?? 0;
}

// ---------------------------------------------------------------------------
// 数据获取
// ---------------------------------------------------------------------------

/** 从后端获取项目列表 */
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

// ---------------------------------------------------------------------------
// 对话框操作
// ---------------------------------------------------------------------------

/** 打开"新建项目"对话框 */
function openCreateDialog() {
  editingProjectId.value = "";
  resetProjectForm();
  createDialogVisible.value = true;
}

/** 打开"编辑项目"对话框，将项目当前数据填入表单 */
function openEditDialog(project: ProjectVO) {
  editingProjectId.value = project.projectId ?? "";
  projectForm.name = project.projectName ?? "";
  projectForm.description = project.description ?? "";
  projectForm.computeMode = project.computeMode ?? "MPC";
  projectForm.templateId = "blank";
  createDialogVisible.value = true;
}

/** 重置表单到初始状态 */
function resetProjectForm() {
  editingProjectId.value = "";
  projectForm.name = "";
  projectForm.description = "";
  projectForm.computeMode = "MPC";
  projectForm.templateId = "federated-circle";
  projectFormRef.value?.clearValidate();
}

/** 关闭对话框并重置表单 */
function closeCreateDialog() {
  createDialogVisible.value = false;
  resetProjectForm();
}

// ---------------------------------------------------------------------------
// 提交操作（创建 / 更新 / 删除）
// ---------------------------------------------------------------------------

/** 提交创建或更新项目（共用同一个对话框） */
async function submitCreateProject() {
  await projectFormRef.value?.validate();

  submitting.value = true;

  try {
    let nextProjectId = editingProjectId.value;

    if (editingProjectId.value) {
      // 编辑模式：调用更新接口
      await updateProject({
        projectId: editingProjectId.value,
        name: projectForm.name,
        description: projectForm.description
      } satisfies UpdateProjectRequest);
      ElMessage.success("项目更新成功");
    } else {
      // 新建模式：调用创建接口
      const createdProject = await createProject({
        name: projectForm.name,
        description: projectForm.description,
        computeMode: projectForm.computeMode
      } satisfies CreateProjectRequest);

      ElMessage.success("项目创建成功");
      // 创建后自动跳转到该项目的工作区
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

/** 删除项目（带二次确认弹窗） */
async function handleDeleteProject(project: ProjectVO) {
  if (!project.projectId) return;

  try {
    await ElMessageBox.confirm(
      `确认删除项目"${project.projectName || "未命名项目"}"吗？`,
      "删除项目",
      {
        type: "warning",
        confirmButtonText: "删除",
        cancelButtonText: "取消"
      }
    );

    await deleteProject({ projectId: project.projectId });
    ElMessage.success("项目删除成功");

    // 如果删除的是当前打开的项目，自动返回列表
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

// ---------------------------------------------------------------------------
// 路由跳转
// ---------------------------------------------------------------------------

/**
 * 打开指定项目的工作区
 * 通过添加 query 参数切换到 workspace 模式，仍然在同一路由上
 */
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

/** 返回项目列表（清除 query 参数，回到 list 模式） */
function backToProjectList() {
  router.push({ path: "/workflow/projects" });
}

// ---------------------------------------------------------------------------
// 路由同步 Watch
// ---------------------------------------------------------------------------

/**
 * 监听项目列表和 URL query 参数变化，自动修正路由
 * 确保浏览器地址栏始终与实际状态一致（兜底处理边界情况）
 */
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

/** 页面挂载时加载项目列表 */
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
