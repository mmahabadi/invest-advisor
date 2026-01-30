import { Module, Global, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Pool | null> => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        
        if (!databaseUrl) {
          Logger.warn('⚠️ DATABASE_URL not set, database features will not work', 'DatabaseModule');
          return null;
        }

        const pool = new Pool({
          connectionString: databaseUrl,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          // Enable SSL in production (required for Railway)
          ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        });

        pool.on('error', (err: Error) => {
          Logger.error('Unexpected error on idle client', err);
        });

        // Test connection
        try {
          const client = await pool.connect();
          client.release();
          Logger.log('✅ Database connected successfully', 'DatabaseModule');
        } catch (error) {
          Logger.error('❌ Database connection failed - app will start but database features won\'t work', error);
          // Don't throw - let the app start anyway for health checks
        }

        return pool;
      },
    },
    {
      provide: 'DatabaseService',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool | null) => new DatabaseService(pool),
    },
  ],
  exports: [DATABASE_POOL, 'DatabaseService'],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);
  
  constructor(
    @Optional() @Inject(DATABASE_POOL) private readonly pool: Pool | null,
  ) {}

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Database pool closed');
    }
  }
}

export class DatabaseService {
  constructor(private readonly pool: Pool | null) {}

  async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    const result = await this.pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  }

  async getClient() {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }
  
  isConnected(): boolean {
    return this.pool !== null;
  }
}
