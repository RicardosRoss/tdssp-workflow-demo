/**
 * node-panel.ts
 *
 * 节点属性面板的数据模型和转换工具。
 * 负责在 VueFlow Node 对象和右侧编辑面板的表单草稿之间做双向转换。
 */
import type { Node } from "@vue-flow/core";

/**
 * 节点属性面板的编辑草稿类型
 * 所有字段都是字符串，方便表单 input 直接绑定
 */
export interface NodePanelDraft {
  /** 节点标题（所有类型共有） */
  label: string;
  /** 服务摘要（仅 service 类型使用） */
  summary: string;
  /** 服务 ID（仅 service 类型使用） */
  serviceId: string;
  /** 输出到上下文的 key 名（仅 service 类型使用） */
  outputKey: string;
  /** 条件/循环表达式（condition 和 loop 类型使用） */
  expression: string;
  /** 要遍历的集合路径（仅 loop 类型使用） */
  itemsPath: string;
  /** 循环变量名（仅 loop 类型使用） */
  itemName: string;
  /** 最大迭代次数（仅 loop 类型使用） */
  maxIterations: string;
}

/** 安全地将 unknown 值转为 string，非 string 时返回空字符串 */
function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** 判断节点是否为 service（数据服务）类型 */
export function isServiceNode(node: Node | null | undefined) {
  return node?.type === "service";
}

/** 判断节点是否为 condition（条件分支）类型 */
export function isConditionNode(node: Node | null | undefined) {
  return node?.type === "condition";
}

/** 判断节点是否为 loop（循环）类型 */
export function isLoopNode(node: Node | null | undefined) {
  return node?.type === "loop";
}

/**
 * 从 VueFlow Node 对象创建编辑草稿
 * 根据节点类型只提取对应字段，其余留空
 * 传入 null 时返回全空草稿（面板空状态）
 */
export function createNodeDraft(node: Node | null | undefined): NodePanelDraft {
  if (!node) {
    return {
      label: "",
      summary: "",
      serviceId: "",
      outputKey: "",
      expression: "",
      itemsPath: "",
      itemName: "",
      maxIterations: ""
    };
  }

  return {
    label: readString(node.data?.label),
    summary: isServiceNode(node) ? readString(node.data?.summary) : "",
    serviceId:
      isServiceNode(node) && node.data?.serviceId != null
        ? String(node.data.serviceId)
        : "",
    outputKey: isServiceNode(node) ? readString(node.data?.outputKey) : "",
    expression:
      isConditionNode(node) || isLoopNode(node)
        ? readString(node.data?.expression)
        : "",
    itemsPath: isLoopNode(node) ? readString(node.data?.itemsPath) : "",
    itemName: isLoopNode(node) ? readString(node.data?.itemName) : "",
    maxIterations:
      isLoopNode(node) && node.data?.maxIterations != null
        ? String(node.data.maxIterations)
        : ""
  };
}

/**
 * 将编辑草稿转换回可写入节点 data 的更新对象
 * 只包含当前节点类型相关的字段，trim 后写入
 * 用于 updateNodeData 调用
 */
export function buildNodeDataUpdate(node: Node, draft: NodePanelDraft) {
  const update: Record<string, string | number> = {
    label: readString(draft.label).trim()
  };

  if (isServiceNode(node)) {
    update.summary = readString(draft.summary).trim();
    update.serviceId = readString(draft.serviceId).trim();
    update.outputKey = readString(draft.outputKey).trim();
  }

  if (isConditionNode(node)) {
    update.expression = readString(draft.expression).trim();
  }

  if (isLoopNode(node)) {
    update.expression = readString(draft.expression).trim();
    update.itemsPath = readString(draft.itemsPath).trim();
    update.itemName = readString(draft.itemName).trim();

    const maxIterations = readString(draft.maxIterations).trim();
    if (maxIterations) {
      update.maxIterations = Number(maxIterations);
    }
  }

  return update;
}
