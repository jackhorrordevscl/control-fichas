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
    const { exec } = require('child_process');
    console.log('🔄 Ejecutando migraciones Prisma...');
    exec('npx prisma migrate deploy', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Error en migraciones:', error);
      } else {
        console.log('Migraciones completadas:', stdout);
      }
    })
  }
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor corriendo en puerto: ${port}`);
}

bootstrap();
