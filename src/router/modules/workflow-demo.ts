const Layout = () => import("@/layout/index.vue");

export default {
  path: "/workflow",
  name: "Workflow",
  component: Layout,
  redirect: "/workflow/projects",
  meta: {
    icon: "ri/git-branch-line",
    title: "工作流",
    rank: 10
  },
  children: [
    {
      path: "/workflow/projects",
      name: "WorkflowProjects",
      component: () => import("@/views/workflow/project/index.vue"),
      meta: {
        title: "项目页"
      }
    },
    {
      path: "/workflow/data-resource",
      name: "WorkflowDataResource",
      component: () => import("@/views/workflow/data-resource/index.vue"),
      meta: {
        title: "数据资源",
        icon: "ri/database-2-line"
      }
    },
    {
      path: "/workflow/data-service",
      name: "WorkflowDataService",
      component: () => import("@/views/workflow/data-service/index.vue"),
      meta: {
        title: "数据服务",
        icon: "ri/service-line"
      }
    },
    {
      path: "/workflow/playground",
      name: "WorkflowPlayground",
      component: () => import("@/views/workflow/playground/index.vue"),
      meta: {
        title: "流程演示",
        showLink: false,
        activePath: "/workflow/projects"
      }
    }
  ]
} satisfies RouteConfigsTable;
