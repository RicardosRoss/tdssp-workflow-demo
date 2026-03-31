import type { Node } from "@vue-flow/core";

export interface NodePanelDraft {
  label: string;
  summary: string;
  serviceId: string;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function isServiceNode(node: Node | null | undefined) {
  return node?.type === "service";
}

export function createNodeDraft(node: Node | null | undefined): NodePanelDraft {
  if (!node) {
    return {
      label: "",
      summary: "",
      serviceId: ""
    };
  }

  return {
    label: readString(node.data?.label),
    summary: isServiceNode(node) ? readString(node.data?.summary) : "",
    serviceId:
      isServiceNode(node) && node.data?.serviceId != null
        ? String(node.data.serviceId)
        : ""
  };
}

export function buildNodeDataUpdate(node: Node, draft: NodePanelDraft) {
  const update: Record<string, string> = {
    label: draft.label.trim()
  };

  if (isServiceNode(node)) {
    update.summary = draft.summary.trim();
    update.serviceId = draft.serviceId.trim();
  }

  return update;
}
