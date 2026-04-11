# 架构设计

本章节仅描述框架层，不包含任何业务需求或业务实现。

## 文档列表

- [完整架构设计](/architecture/framework-architecture)

## 适用范围

1. `client`：Electron + Vue 渲染层与路由层。
2. `api-serivce`：NestJS 本地 API 服务（最小测试接口）。
3. `docs`：VitePress 开发文档站点。
4. `scripts`：按需下载 MySQL 资源与工程辅助脚本。
5. `pnpm workspace`：多包统一依赖与命令编排。
