# 快速开始

## 1. 安装依赖

```bash
pnpm i
```

## 2. 启动开发模式

```bash
pnpm dev:client
```

说明：

1. 会同时启动 `client` 与 `api-serivce`。
2. 默认 `DB_MODE=external`，不会自动拉起内置 MySQL。

## 3. 单独启动文档

```bash
pnpm dev:docs
```

## 4. 构建

```bash
pnpm build:api
pnpm build:client
pnpm build:docs
```

