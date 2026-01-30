import { Module } from '@nestjs/common';
import { AlertCheckerService } from './alert-checker.service';
import { PriceUpdaterService } from './price-updater.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { EmailModule } from '../email/email.module';
import { PredictionsModule } from '../predictions/predictions.module';

@Module({
  imports: [MarketDataModule, EmailModule, PredictionsModule],
  providers: [AlertCheckerService, PriceUpdaterService],
})
export class SchedulerModule {}
