import { Controller, Get } from '@nestjs/common'
import { ok } from '../../common/types/api-envelope'

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    const mode = process.env.DB_MODE || 'none'
    return ok({
      status: 'ok',
      mode,
      timestamp: new Date().toISOString(),
    })
  }

  @Get('ready')
  getReady() {
    return ok({
      ready: true,
      timestamp: new Date().toISOString(),
    })
  }
}
