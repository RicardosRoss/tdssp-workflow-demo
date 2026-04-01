import type { Node } from "@vue-flow/core";

export interface NodePanelDraft {
  label: string;
  summary: string;
  serviceId: string;
  outputKey: string;
  expression: string;
  itemsPath: string;
  itemName: string;
  maxIterations: string;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function isServiceNode(node: Node | null | undefined) {
  return node?.type === "service";
}

export function isConditionNode(node: Node | null | undefined) {
  return node?.type === "condition";
}

export function isLoopNode(node: Node | null | undefined) {
  return node?.type === "loop";
}

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
