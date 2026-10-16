
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

await bootstrap();
