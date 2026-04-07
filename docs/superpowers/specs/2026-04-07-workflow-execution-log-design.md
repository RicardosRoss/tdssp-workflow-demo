# 工作流执行日志设计

## 背景

当前工作流 Playground 页面具备节点运行态、执行上下文和执行历史，但缺少“本次运行的执行日志”展示区域。用户无法在工作流逐步执行时直接看到每一步的执行时间、节点输入输出、状态和后继节点，只能零散地从节点状态和右侧详情面板中排查。

本次设计目标是在不改变现有执行引擎职责边界的前提下，为当前页面这一轮工作流运行新增独立的执行日志能力，并在数据结构上预留“显式提交到后端持久化”的扩展点。

## 目标

- 在工作流执行页面下方新增“本次运行日志”区域。
- 每个实际执行过的节点生成一条日志，执行过程中实时追加和更新。
- 日志至少包含：
  - 执行时间：开始时间戳、结束时间戳、耗时
  - 执行者：节点 ID
  - 执行服务：节点标题
  - 数据来源
  - 数据输出
  - 执行状态
  - 下一个节点
- `skipped` 节点不生成日志。
- 并行节点按“一节点一条日志”记录。
- 日志默认折叠，只有点击顶部摘要行才展开详情区。
- 前端先仅维护“当前页面这一次运行”的日志，同时预留手动提交到后端的 payload 结构。

## 非目标

- 不实现跨页面、跨刷新自动恢复的历史日志。
- 不实现后端自动持久化或日志查询页。
- 不把日志逻辑塞进 `history`、`context` 或 `nodeStates` 里复用。
- 不为 `skipped` 节点补单独日志。

## 当前代码现状

### 现有运行态边界

- [`src/views/workflow/playground/execution-engine.ts`](/Users/qingcongyu/tdssp-workflow-demo/src/views/workflow/playground/execution-engine.ts) 中的 `WorkflowExecutionState` 已包含：
  - `context`：共享上下文
  - `nodeStates`：节点状态与最近输入输出
  - `history`：轻量执行轨迹
  - `outputsByNodeId`：节点输出索引
- [`src/views/workflow/playground/composables/useWorkflowPlayground.ts`](/Users/qingcongyu/tdssp-workflow-demo/src/views/workflow/playground/composables/useWorkflowPlayground.ts) 负责运行编排：
  - `markNodeRunning` 在节点进入 `running` 时记录 `lastInput`
  - `finalizeMultiStep` 统一汇总同步步骤结果
  - `stepExecution` 处理 `start / end / condition / loop / service`
- [`src/views/workflow/playground/index.vue`](/Users/qingcongyu/tdssp-workflow-demo/src/views/workflow/playground/index.vue) 当前只有顶部工具栏和中间三栏布局，没有下方日志区域。

### 已有数据可复用点

- 节点进入 `running` 时已经有输入快照，可以作为日志的 `dataSource` 基础。
- 服务节点成功时已有 `output`、`metrics`、`patchContext`。
- 条件/循环节点已有 `routeKey`。
- 执行完成后已有可解析出的 `nextNodeIds`。

## 方案对比

### 方案 A：从 `executionState` 临时派生日志

优点：

- 改动少。
- 不引入新的运行态。

缺点：

- 需要从 `history`、`nodeStates`、`context` 多处拼字段。
- UI 和未来持久化都没有稳定的数据边界。
- 运行中日志不容易表达“开始后再补全”的过程。

### 方案 B：新增独立 `executionLogs`

优点：

- “日志”是单独的一等运行态，边界清晰。
- 适合前端展示，也适合后续提交后端。
- 能天然支持 running -> success/error 的增量补全。

缺点：

- 需要改执行流汇总点，多维护一组状态。

### 方案 C：底层事件流 + UI 聚合

优点：

- 扩展性最强，适合未来做回放/调试时间线。

缺点：

- 明显超出当前范围，复杂度过高。

### 结论

采用方案 B：新增独立的 `executionLogs` 运行态，在节点执行过程中显式创建和补全日志。

## 设计概览

### 数据结构

在 `useWorkflowPlayground` 中新增前端运行态：

```ts
type ExecutionLogStatus = "running" | "success" | "error";

type WorkflowExecutionLog = {
  id: string;
  stepIndex: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  executor: string;
  serviceName: string;
  routeKey?: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  dataSource: unknown;
  dataOutput?: unknown;
  status: ExecutionLogStatus;
  nextNodeIds: string[];
  nextNodeLabels: string[];
  errorMessage?: string;
};
```

字段定义固定为：

- `executor`：节点 ID，用于对应“执行者”
- `serviceName`：节点标题，用于对应“执行服务”
- `dataSource`：节点进入 `running` 时的输入快照
- `dataOutput`：
  - `service` 节点取 `output` 和 `patchContext` 的摘要
  - `condition` 节点记录路由结果
  - `loop` 节点记录当前迭代信息
  - `start/end` 节点记录最小必要摘要
- `nextNodeIds/nextNodeLabels`：仅记录本次真实会走到的后继节点

同时新增前端 UI 控制态：

```ts
const executionLogs = ref<WorkflowExecutionLog[]>([]);
const expandedExecutionLogId = ref<string | null>(null);
```

### 运行时生成规则

#### 创建日志

节点进入 `running` 时立即创建日志：

- 发生位置：`markNodeRunning`
- 动作：
  - 生成唯一日志 ID
  - 记录 `stepIndex`
  - 记录 `startedAt`
  - 记录 `executor = node.id`
  - 记录 `serviceName = node.data.label ?? node.id`
  - 记录 `dataSource = snapshotExecutionContext(context)`
  - `status = "running"`
  - 默认 `nextNodeIds = []`

#### 成功补全日志

节点执行成功后补全已有日志：

- `start/end`
  - 在同步完成路径里补齐 `finishedAt`、`durationMs`
  - `dataOutput` 使用最小摘要
  - `nextNodeIds/nextNodeLabels` 按当前选中的下一条边解析
- `condition`
  - `dataOutput` 记录 `{ routeDecision: routeKey }`
  - `nextNodeIds/nextNodeLabels` 仅记录命中分支
- `loop`
  - `dataOutput` 记录当前迭代索引、命中路由、当前元素变量摘要
- `service`
  - `dataOutput` 记录服务输出与 `patchContext`
  - `nextNodeIds/nextNodeLabels` 取默认出边

#### 失败补全日志

节点执行失败时补全已有日志：

- `status = "error"`
- 记录 `finishedAt`
- 记录 `durationMs`
- 记录 `errorMessage`
- `nextNodeIds/nextNodeLabels` 保持空数组

#### 不生成日志的情况

- `skipped` 节点
- 因图校验未通过而未启动执行
- 因模板切换/重置而尚未开始的一切节点

### UI 布局

在 [`src/views/workflow/playground/index.vue`](/Users/qingcongyu/tdssp-workflow-demo/src/views/workflow/playground/index.vue) 中保持现有顶部工具栏和中间三栏布局不变，在三栏布局下方新增一整块日志面板：

- 标题：`本次运行日志`
- 摘要区：
  - 成功数量
  - 失败数量
  - 累计耗时
  - 最近执行时间
  - `提交日志到后端` 按钮
- 列表区：
  - 默认按时间倒序展示，最新日志在最上面
  - 每条日志是一张卡片
  - 卡片默认折叠，仅显示摘要行

建议新增组件：

- `src/views/workflow/playground/components/ExecutionLogPanel.vue`

职责：

- 接收 `executionLogs`
- 接收 `expandedExecutionLogId`
- 点击摘要行时触发展开/折叠
- 渲染摘要与详情区

### 卡片交互

每条日志卡片分两层：

#### 顶部摘要行（始终可见）

- 状态徽标
- `Step N`
- 执行者：节点 ID
- 执行服务：节点标题
- 开始时间
- 耗时

#### 下方详情区（默认折叠）

仅在点击顶部摘要行后展开，包含：

- 数据来源
- 数据输出
- 下一个节点
- 命中分支（如有）
- 错误信息（如有）

展开规则：

- 默认全部折叠
- 只有点击顶部摘要行才切换展开
- 同一时间只允许展开一条日志
- 再次点击同一条摘要行则折叠

### 日志清理规则

以下动作会清空本次 `executionLogs`：

- `resetExecution`
- 加载模板
- 从本地恢复
- 修改节点配置导致运行态重置

这样保证日志始终只对应“当前页面的这一次运行”。

### 后端持久化预留

第一阶段不自动提交后端，但保留稳定 payload 结构。

可在 `src/api/workflow-playground.ts` 中预留类型与 API：

```ts
type SaveExecutionLogsPayload = {
  workflowName?: string;
  startedAt?: string;
  finishedAt?: string;
  logs: WorkflowExecutionLog[];
};
```

按钮行为设计为显式动作：

- 当存在日志时可点击
- 点击后将当前 `executionLogs` 整体提交
- 前端需要定义明确的提交动作和 payload
- 如果后端接口尚未接入或返回失败，前端提示“执行日志存储接口未接入”或对应错误信息，但不清空本地日志

## 影响文件

### 必改

- [`src/views/workflow/playground/composables/useWorkflowPlayground.ts`](/Users/qingcongyu/tdssp-workflow-demo/src/views/workflow/playground/composables/useWorkflowPlayground.ts)
  - 新增日志运行态
  - 创建/补全/清空日志
  - 暴露日志和展开控制给页面
- [`src/views/workflow/playground/index.vue`](/Users/qingcongyu/tdssp-workflow-demo/src/views/workflow/playground/index.vue)
  - 接入日志面板
  - 调整页面布局，新增下方日志区

### 新增

- `src/views/workflow/playground/components/ExecutionLogPanel.vue`
  - 执行日志面板与交互

### 可选

- [`src/api/workflow-playground.ts`](/Users/qingcongyu/tdssp-workflow-demo/src/api/workflow-playground.ts)
  - 后续持久化 API 类型

## 错误处理

- 节点执行失败时：
  - 保持已有日志条目
  - 把状态改为 `error`
  - 写入错误信息和耗时
  - 不生成虚假的“下一个节点”
- 如果节点标签为空：
  - `serviceName` 回退到 `nodeId`
- 如果输入/输出对象过大：
  - UI 层做格式化和显示裁剪
  - 原始日志数据仍保留完整对象，便于后续提交后端
- 如果连续单步执行与自动执行混用：
  - 统一追加到同一组 `executionLogs`
  - 由 `stepIndex` 和时间戳反映真实顺序

## 测试策略

### 纯逻辑/编排测试

围绕 `useWorkflowPlayground` 的执行流补测试，覆盖：

- 节点进入 `running` 时创建日志
- `service` 成功后补齐输出、时间、下一个节点
- `condition` 成功后补齐 `routeKey` 和命中后继
- `loop` 成功后补齐迭代摘要
- 节点失败时日志进入 `error`
- 并行节点会生成多条日志
- `skipped` 节点不生成日志
- `resetExecution` 清空日志

### UI 测试/人工回归

至少验证：

- 日志区位于工作流区域下方
- 日志默认全部折叠
- 点击摘要行后展开详情
- 同时只展开一条日志
- 自动执行时日志实时滚动追加
- 条件模板中未命中分支不出日志
- 循环模板中每轮循环都会追加对应节点日志

## 风险与权衡

- 日志如果直接存完整 `dataSource/dataOutput`，在大对象场景下 UI 渲染成本会上升。
  - 处理方式：数据层保留原始对象，展示层做折叠和格式化。
- `markNodeRunning` 当前只处理节点状态，接入日志创建后会让该函数职责增加。
  - 处理方式：抽出小型日志辅助函数，避免 composable 继续膨胀。
- 后续若需要日志查询/回放，单纯的“日志结果表”不如事件流灵活。
  - 当前范围内接受这个权衡，避免过度设计。

## 验收标准

- 启动或自动运行工作流后，页面下方出现本次运行日志。
- 每个实际执行的节点都会新增一条日志。
- 每条日志都能看到：
  - 节点 ID
  - 节点标题
  - 开始时间
  - 耗时
  - 执行状态
  - 下一个节点
- 点击摘要行前不展示详情。
- 点击摘要行后展示数据来源、数据输出、命中分支/错误信息。
- `skipped` 节点没有独立日志。
- 重置执行或切换模板后，旧日志被清空。
