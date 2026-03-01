import * as dotenv from 'dotenv';

// On your machine: reads backend/.env
// In Docker: skipped — Docker already injected the variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(3001);
}
bootstrap();