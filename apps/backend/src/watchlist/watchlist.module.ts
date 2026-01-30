import { Module } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { PredictionsModule } from '../predictions/predictions.module';

@Module({
  imports: [MarketDataModule, PredictionsModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
