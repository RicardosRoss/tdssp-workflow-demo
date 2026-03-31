import { http } from "@/utils/http";

export type PlaygroundService = {
  id: number;
  name: string;
  serviceType: string;
  summary: string;
  category: string;
};

export type PlaygroundServiceResult = {
  code: number;
  message: string;
  data: PlaygroundService[];
};

export type PlaygroundSavePayload = {
  name: string;
  graph: {
    nodes: Array<any>;
    edges: Array<any>;
    viewport: Record<string, any>;
  };
};

export type PlaygroundSaveResult = {
  code: number;
  message: string;
  data: {
    id: number;
    name: string;
    savedAt: string;
    payload: PlaygroundSavePayload;
  };
};

export const getPlaygroundServices = (params?: { keyword?: string }) => {
  return http.request<PlaygroundServiceResult>(
    "get",
    "/api/playground/services",
    {
      params
    }
  );
};

export const savePlaygroundWorkflow = (data: PlaygroundSavePayload) => {
  return http.request<PlaygroundSaveResult>(
    "post",
    "/api/workflow-playground/save",
    { data }
  );
};
