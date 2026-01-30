import { Module, Global, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err) => {
          Logger.error('Unexpected error on idle client', err);
        });

        // Test connection
        try {
          const client = await pool.connect();
          client.release();
          Logger.log('✅ Database connected successfully', 'DatabaseModule');
        } catch (error) {
          Logger.error('❌ Database connection failed', error);
          throw error;
        }

        return pool;
      },
    },
    {
      provide: 'DatabaseService',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new DatabaseService(pool),
    },
  ],
  exports: [DATABASE_POOL, 'DatabaseService'],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool?.end();
  }
}

export class DatabaseService {
  constructor(private readonly pool: Pool) {}

  async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const result = await this.pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  }

  async getClient() {
    return this.pool.connect();
  }
}
