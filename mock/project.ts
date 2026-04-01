import { defineFakeRoute } from "vite-plugin-fake-server/client";
import {
  deleteProjectRecord,
  createProjectRecord,
  getProjectRecord,
  listProjectRecords,
  updateProjectRecord
} from "./project-store.mjs";

export default defineFakeRoute([
  {
    url: "/api/v1alpha1/project/list",
    method: "post",
    response: () => {
      return listProjectRecords();
    }
  },
  {
    url: "/api/v1alpha1/project/get",
    method: "post",
    response: ({ body }) => {
      const project = getProjectRecord(body?.projectId);

      if (!project) {
        return {
          code: 404,
          message: "project not found",
          data: null
        };
      }

      return project;
    }
  },
  {
    url: "/api/v1alpha1/project/create",
    method: "post",
    response: ({ body }) => {
      return createProjectRecord(body);
    }
  },
  {
    url: "/api/v1alpha1/project/update",
    method: "post",
    response: ({ body }) => {
      const project = updateProjectRecord(body);

      if (!project) {
        return {
          code: 404,
          message: "project not found"
        };
      }

      return {
        code: 0,
        message: "ok"
      };
    }
  },
  {
    url: "/api/v1alpha1/project/delete",
    method: "post",
    response: ({ body }) => {
      const success = deleteProjectRecord(body?.projectId);

      return success
        ? {
            code: 0,
            message: "ok"
          }
        : {
            code: 404,
            message: "project not found"
          };
    }
  },
  {
    url: "/api/v1alpha1/project/job/list",
    method: "post",
    response: ({ body }) => {
      const project = getProjectRecord(body?.projectId);

      return {
        code: 0,
        message: "ok",
        data: {
          content:
            project?.partyVoteInfos?.map((item, index) => ({
              jobId: `${body?.projectId ?? "project"}-job-${index + 1}`,
              action: item.action ?? "CREATED"
            })) ?? [],
          totalElements: project?.partyVoteInfos?.length ?? 0
        }
      };
    }
  }
]);
