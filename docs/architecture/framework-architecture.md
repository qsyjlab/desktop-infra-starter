# Desktop Infra Starter 架构设计

## 1. 目标

构建一个可复用的 Electron 单机框架模板，满足：

1. 启动桌面应用时可自动拉起 NestJS 接口服务。
2. 支持数据库三种模式：`none`、`external`、`embedded`。
3. 内置数据库资源默认不入仓，通过脚本按需下载。
4. 保持前后端与文档在同一 workspace，便于统一维护。

## 2. Monorepo 结构

```text
desktop-infra-starter-workspace/
  api-serivce/              # NestJS 本地 API
  client/                   # Electron + Vue 客户端
  docs/                     # VitePress 文档站
  scripts/                  # 工程脚本（如下载 MySQL）
  pnpm-workspace.yaml
```

## 3. 包与职责

### 3.1 `@desktop-infra/client`

1. Electron 主进程：进程编排、启动状态管理、窗口管理。
2. Preload：渲染层与主进程通信桥接。
3. Vue 渲染层：框架菜单、运行状态页、连通性测试页。

### 3.2 `@desktop-infra/api-service`

1. NestJS 最小模块化服务。
2. 提供基础健康接口：
   - `GET /health`
   - `GET /ready`
   - `GET /test/ping`
   - `GET /test/db`
3. 暴露 Swagger 文档：`/api-docs`。

### 3.3 `@desktop-infra/docs`

1. 架构文档、开发指南、打包说明。
2. 不承载业务实现或业务流程文档。

## 4. 启动流程

### 4.1 Electron 启动阶段

1. `idle`
2. `starting_embedded_db`（仅 `DB_MODE=embedded`）
3. `starting_api`
4. `ready`
5. `error`

### 4.2 就绪判定

1. 主进程通过 `/ready` 轮询 API。
2. 嵌入式数据库模式下，先检测 MySQL 端口可用。
3. 仅当主进程状态进入 `ready` 时，Preload 才移除启动遮罩。

## 5. 数据库模式设计

### 5.1 `DB_MODE=none`

1. 不启动数据库。
2. `/test/db` 返回未启用状态。

### 5.2 `DB_MODE=external`（默认）

1. 不拉起内置 MySQL。
2. API 读取外部配置：
   - `MYSQL_URL`
   - 或 `MYSQL_HOST/MYSQL_PORT/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE`

### 5.3 `DB_MODE=embedded`

1. Electron 启动并监管本地 MySQL 进程。
2. API 自动使用内置 MySQL 连接参数。
3. 依赖 `client/resources/mysql` 中的二进制资源。

## 6. MySQL 资源策略

1. 仓库默认仅保留 `client/resources/mysql/README.md`。
2. 通过 `scripts/download-mysql.ts` 按需下载：
   - `mac-arm64`
   - `win-x64`
3. 仅在需要内置数据库模式时执行下载。

## 7. 打包策略

1. `api-serivce` 构建后生成 `.pack`，包含运行所需依赖。
2. `client` 打包时将 `.pack` 注入 `extraResources/api-serivce`。
3. MySQL 资源不默认打包；需要内置模式时再下载并加入打包输入。

## 8. 前端分层

```text
client/src/
  views/    # 页面
  store/    # 运行状态
  api/      # axios 封装与接口调用
  utils/    # 菜单等工具
  model/    # 类型定义
  router/   # 路由
```

## 9. 最小交付基线

1. 框架主页。
2. API 连通测试页。
3. DB 连通测试页。
4. 运行时状态页。
5. 环境变量说明页。

