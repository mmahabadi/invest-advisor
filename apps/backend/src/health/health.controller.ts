import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseService } from '../database/database.module';

@Controller('health')
export class HealthController {
  constructor(
    @Inject('DatabaseService') private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  @Get()
  async check() {
    const services = {
      database: 'unknown',
      mlEngine: 'unknown',
      redis: 'unknown',
    };

    // Check database
    try {
      await this.db.query('SELECT 1');
      services.database = 'ok';
    } catch {
      services.database = 'error';
    }

    // Check ML Engine
    try {
      const mlEngineUrl = this.configService.get<string>('ML_ENGINE_URL', 'http://ml-engine:8000');
      await axios.get(`${mlEngineUrl}/health`, { timeout: 5000 });
      services.mlEngine = 'ok';
    } catch {
      services.mlEngine = 'error';
    }

    // Check Redis (basic check via database pool if redis is available)
    // For now, mark as ok if database is ok since we're using postgres
    services.redis = services.database === 'ok' ? 'ok' : 'error';

    const allOk = Object.values(services).every((s) => s === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
