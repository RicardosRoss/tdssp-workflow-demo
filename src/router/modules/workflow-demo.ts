/** 后台管理系统的整体布局组件（侧边栏 + 顶栏 + 内容区） */
const Layout = () => import("@/layout/index.vue");

/**
 * 工作流模块路由配置
 *
 * 所有工作流相关页面都挂在 /workflow 下，共享同一个 Layout。
 * 注意：playground 路由设置了 showLink: false，不在导航菜单中显示，
 * 而是通过 activePath 指向项目页，使导航高亮保持在"项目页"菜单项上。
 */
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
        /** 不在侧边导航中显示此路由，仅通过项目页内部跳转进入 */
        showLink: false,
        /** 导航菜单高亮仍然指向项目页，避免进入 playground 后菜单高亮丢失 */
        activePath: "/workflow/projects"
      }
    }
  ]
} satisfies RouteConfigsTable;
