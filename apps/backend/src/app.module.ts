import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { AlertsModule } from './alerts/alerts.module';
import { MarketDataModule } from './market-data/market-data.module';
import { PredictionsModule } from './predictions/predictions.module';
import { EmailModule } from './email/email.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PortfolioModule,
    WatchlistModule,
    AlertsModule,
    MarketDataModule,
    PredictionsModule,
    EmailModule,
    SchedulerModule,
    HealthModule,
  ],
})
export class AppModule {}
