# 打包发布

## 1. API 打包

`client` 打包前会执行：

1. `api-serivce` 构建
2. `api-serivce/scripts/prepare-pack.ts` 生成 `.pack`

`.pack` 包含：

1. `dist/`
2. `package.json`
3. 生产依赖 `node_modules`

## 2. Electron 打包

`electron-builder` 从 `extraResources` 注入：

1. `../api-serivce/.pack` -> `resources/api-serivce`

如需内置数据库，再额外确保 `client/resources/mysql` 中存在下载后的资源。

## 3. 发布策略建议

1. 默认发布外部数据库模式（体积更小）。
2. 内置数据库版本单独发布（离线可用）。

