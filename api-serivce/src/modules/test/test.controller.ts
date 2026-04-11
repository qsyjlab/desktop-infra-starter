import { Controller, Get } from '@nestjs/common'
import { createPool } from 'mysql2/promise'
import { ok } from '../../common/types/api-envelope'

function resolveDbConfig() {
  const mode = process.env.DB_MODE || 'none'
  const mysqlUrl = process.env.MYSQL_URL || ''

  if (mysqlUrl) {
    return {
      mode,
      useUrl: true,
      mysqlUrl,
    }
  }

  return {
    mode,
    useUrl: false,
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'desktop_infra',
  }
}

@Controller('test')
export class TestController {
  @Get('ping')
  ping() {
    return ok({
      pong: true as const,
      timestamp: new Date().toISOString(),
    })
  }

  @Get('db')
  async testDb() {
    const config = resolveDbConfig()

    if (config.mode === 'none') {
      return ok({
        connected: false,
        mode: 'none',
        detail: 'DB_MODE=none，未启用数据库检测',
        timestamp: new Date().toISOString(),
      })
    }

    try {
      const pool = config.useUrl
        ? createPool({
            uri: config.mysqlUrl,
            connectionLimit: 2,
            dateStrings: true,
          })
        : createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            connectionLimit: 2,
            dateStrings: true,
          })

      await pool.query('SELECT 1 AS ok')
      await pool.end()

      return ok({
        connected: true,
        mode: config.mode,
        detail: '数据库连接成功',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      return ok({
        connected: false,
        mode: config.mode,
        detail: error instanceof Error ? error.message : '数据库连接失败',
        timestamp: new Date().toISOString(),
      })
    }
  }
}
