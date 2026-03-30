import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://192.168.1.183:5173',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  if (process.env.RUN_MIGRATIONS === 'true') {
    const { execSync } = require('child_process');
    try {
      console.log('🔄 Ejecutando migraciones Prisma...');
      const result = execSync('npx prisma migrate deploy', {
        cwd: __dirname + '/..',
        encoding: 'utf-8'
      });
      console.log('✅ Migraciones completadas:', result);
      } catch (error) {
        console.error('❌ Error en migraciones:', error.message);
      }
    }
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor corriendo en puerto: ${port}`);
}

bootstrap();
