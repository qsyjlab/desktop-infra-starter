# 仓库结构

## 根目录

```text
desktop-infra-starter-workspace/
  api-serivce/
  client/
  docs/
  scripts/
  package.json
  pnpm-workspace.yaml
```

## 各包职责

1. `api-serivce`：NestJS API（最小联调接口）。
2. `client`：Electron + Vue 客户端框架页面。
3. `docs`：VitePress 文档工程。
4. `scripts`：下载与辅助脚本。

## 前端目录规范

```text
client/src/
  views/
  store/
  api/
  utils/
  model/
  router/
```

