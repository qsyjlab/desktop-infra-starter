import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "Desktop Infra Starter Docs",
  description: "Electron + Vue + NestJS 纯框架文档",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "架构设计", link: "/architecture/" },
      { text: "开发指南", link: "/guide/quick-start" },
    ],
    sidebar: {
      "/architecture/": [
        {
          text: "架构设计",
          items: [
            { text: "总览", link: "/architecture/" },
            {
              text: "完整架构设计",
              link: "/architecture/framework-architecture",
            },
          ],
        },
      ],
      "/guide/": [
        {
          text: "开发指南",
          items: [
            { text: "快速开始", link: "/guide/quick-start" },
            { text: "仓库结构", link: "/guide/repo-structure" },
            { text: "运行时配置", link: "/guide/runtime-config" },
            { text: "MySQL 按需下载", link: "/guide/mysql-download" },
            { text: "打包发布", link: "/guide/packaging" },
          ],
        },
      ],
    },
    search: {
      provider: "local",
    },
  },
});
