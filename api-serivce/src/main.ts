import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './modules/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: true,
    credentials: true,
  })

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Desktop Infra Starter API')
    .setDescription('最小联调接口（健康检查、链路测试、数据库连通测试）')
    .setVersion('1.0.0')
    .build()

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Desktop Infra Starter API Docs',
  })

  const port = Number(process.env.API_PORT || 37001)
  const host = process.env.API_HOST || '127.0.0.1'

  await app.listen(port, host)

  console.log(`[api-service] listening on http://${host}:${port}`)
  console.log(`[api-service] swagger on http://${host}:${port}/api-docs`)
}

void bootstrap()
