import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS - configure based on environment
  const allowedOrigins = [
    frontendUrl,
    // Custom domain
    'https://spend-buddy.com',
    'https://www.spend-buddy.com',
    'http://spend-buddy.com',
    'http://www.spend-buddy.com',
  ];
  
  // In development, also allow localhost
  if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is allowed (exact match, startsWith, or Railway domains)
      const isAllowed = allowedOrigins.some(allowed => 
        origin === allowed || 
        origin.startsWith(allowed) || 
        origin.includes('.railway.app') ||
        origin.includes('spend-buddy.com')
      );
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      logger.warn(`Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Backend API running on port ${port} (${nodeEnv})`);
  logger.log(`📍 API endpoint: http://localhost:${port}/api/v1`);
}

bootstrap();
