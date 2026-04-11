# 运行时配置

## API 相关

1. `API_HOST`：API 监听地址，默认 `127.0.0.1`。
2. `API_PORT`：API 监听端口，默认 `37001`。

## 数据库模式

1. `DB_MODE=none`：不使用数据库。
2. `DB_MODE=external`：连接外部数据库（默认）。
3. `DB_MODE=embedded`：启动内置数据库。

## 外部数据库参数

1. `MYSQL_URL`（优先）
2. `MYSQL_HOST`
3. `MYSQL_PORT`
4. `MYSQL_USER`
5. `MYSQL_PASSWORD`
6. `MYSQL_DATABASE`

## 内置数据库参数

1. `EMBEDDED_MYSQL_ENABLED=true`
2. `EMBEDDED_MYSQL_PORT`（默认 `46307`）

