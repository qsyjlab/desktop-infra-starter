# MySQL 按需下载

内置 MySQL 不默认放入仓库，避免仓库过大。

## 1. 下载命令

```bash
pnpm db:download -- --platform all
```

## 2. 常用参数

1. `--platform mac-arm64`
2. `--platform win-x64`
3. `--platform all`
4. `--version 8.0.45`
5. `--force`

## 3. 目录输出

```text
client/resources/mysql/
  mac-arm64/mysql-8.0.45-macos15-arm64/
  win-x64/mysql-8.0.45-winx64/
```

## 4. 使用建议

1. 开发默认使用外部数据库，不必下载内置 MySQL。
2. 仅在需要离线内置数据库方案时，执行下载并打包。

