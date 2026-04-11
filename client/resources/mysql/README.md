# Embedded MySQL Assets (On-Demand)

该目录默认不提交 MySQL 二进制文件。

按需下载命令：

```bash
pnpm db:download -- --platform all
```

可选参数：

- `--platform mac-arm64`
- `--platform win-x64`
- `--platform all`
- `--version 8.0.45`
- `--force`

下载后目录示例：

```text
client/resources/mysql/
  mac-arm64/
    mysql-8.0.45-macos15-arm64/
      bin/mysqld
  win-x64/
    mysql-8.0.45-winx64/
      bin/mysqld.exe
```
