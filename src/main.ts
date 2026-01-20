import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`24Hours Automation Service running on port ${port}`);
  logger.log(`WebSocket endpoint: ws://localhost:${port}/monitor`);
  logger.log(`API endpoint: http://localhost:${port}/api`);
}

bootstrap();
