import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseService } from '../database/database.module';

@Controller('health')
export class HealthController {
  constructor(
    @Optional() @Inject('DatabaseService') private db: DatabaseService | null,
    private configService: ConfigService,
  ) {}

  @Get()
  check() {
    // Simple health check for Railway - just return OK
    // Use /health/full for detailed service checks
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('full')
  async checkFull() {
    const services = {
      database: 'unknown',
      mlEngine: 'unknown',
    };

    // Check database
    if (this.db && this.db.isConnected()) {
      try {
        await this.db.query('SELECT 1');
        services.database = 'ok';
      } catch {
        services.database = 'error';
      }
    } else {
      services.database = 'not_configured';
    }

    // Check ML Engine
    try {
      const mlEngineUrl = this.configService.get<string>('ML_ENGINE_URL', 'http://ml-engine:8000');
      await axios.get(`${mlEngineUrl}/health`, { timeout: 5000 });
      services.mlEngine = 'ok';
    } catch {
      services.mlEngine = 'error';
    }

    const allOk = Object.values(services).every((s) => s === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
