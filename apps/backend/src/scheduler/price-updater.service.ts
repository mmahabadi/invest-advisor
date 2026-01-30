import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.module';
import { MarketDataService } from '../market-data/market-data.service';
import { PredictionsService } from '../predictions/predictions.service';

@Injectable()
export class PriceUpdaterService {
  private readonly logger = new Logger(PriceUpdaterService.name);

  constructor(
    @Inject('DatabaseService') private db: DatabaseService,
    private marketDataService: MarketDataService,
    private predictionsService: PredictionsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updatePrices(): Promise<void> {
    this.logger.log('Updating prices...');

    try {
      // Get unique symbols from portfolio and watchlist
      const symbols = await this.db.query(`
        SELECT DISTINCT symbol FROM (
          SELECT symbol FROM portfolio_items
          UNION
          SELECT symbol FROM watchlist_items
        ) AS all_symbols
      `);

      for (const row of symbols.rows) {
        try {
          const quote = await this.marketDataService.getQuote(row.symbol);

          // Update portfolio items
          await this.db.query(
            `UPDATE portfolio_items 
             SET current_price = $1, 
                 current_value = quantity * $1,
                 profit_loss = (quantity * $1) - total_cost,
                 profit_loss_pct = ((quantity * $1) - total_cost) / NULLIF(total_cost, 0) * 100,
                 last_price_update = NOW()
             WHERE symbol = $2`,
            [quote.price, row.symbol],
          );

          // Update watchlist items
          await this.db.query(
            `UPDATE watchlist_items 
             SET current_price = $1,
                 price_change_24h = $2,
                 price_change_pct_24h = $3,
                 last_price_update = NOW()
             WHERE symbol = $4`,
            [quote.price, quote.change, quote.changePct, row.symbol],
          );
        } catch (error) {
          this.logger.warn(`Failed to update price for ${row.symbol}`);
        }
      }

      this.logger.log(`Updated prices for ${symbols.rows.length} symbols`);
    } catch (error) {
      this.logger.error('Price update failed', error);
    }
  }

  @Cron('0 */4 * * *') // Every 4 hours
  async refreshAnalysis(): Promise<void> {
    this.logger.log('Refreshing watchlist analysis...');

    try {
      // Get watchlist items with stale or missing analysis
      const items = await this.db.query(`
        SELECT w.id, w.symbol
        FROM watchlist_items w
        LEFT JOIN target_prices t ON t.watchlist_item_id = w.id
        WHERE t.id IS NULL 
           OR t.valid_until < NOW()
           OR t.generated_at < NOW() - INTERVAL '4 hours'
      `);

      const symbols = items.rows.map((i) => i.symbol);

      if (symbols.length === 0) {
        this.logger.log('No items need analysis refresh');
        return;
      }

      // Get batch analysis from ML engine
      const results = await this.predictionsService.getBatchSignals(symbols);

      // Update database
      for (let i = 0; i < items.rows.length; i++) {
        const item = items.rows[i];
        const analysis = results[i];

        if (analysis && analysis.buyTarget) {
          await this.db.query(
            `INSERT INTO target_prices 
             (watchlist_item_id, buy_target, sell_target, stop_loss, confidence, recommendation,
              time_horizon, risk_level, rsi, macd_signal, trend, support_level, resistance_level,
              news_sentiment, sentiment_score, analysis_summary, key_factors, valid_until)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             ON CONFLICT (watchlist_item_id) 
             DO UPDATE SET 
               buy_target = $2, sell_target = $3, stop_loss = $4, confidence = $5,
               recommendation = $6, time_horizon = $7, risk_level = $8, rsi = $9,
               macd_signal = $10, trend = $11, support_level = $12, resistance_level = $13,
               news_sentiment = $14, sentiment_score = $15, analysis_summary = $16,
               key_factors = $17, valid_until = $18, generated_at = NOW()`,
            [
              item.id,
              analysis.buyTarget,
              analysis.sellTarget,
              analysis.stopLoss,
              analysis.confidence,
              analysis.recommendation,
              analysis.timeHorizon,
              analysis.riskLevel,
              analysis.technicalIndicators?.rsi,
              analysis.technicalIndicators?.macdSignal,
              analysis.technicalIndicators?.trend,
              analysis.technicalIndicators?.support,
              analysis.technicalIndicators?.resistance,
              analysis.sentiment?.overall,
              analysis.sentiment?.score,
              analysis.analysisSummary,
              JSON.stringify(analysis.keyFactors),
              new Date(Date.now() + 4 * 60 * 60 * 1000),
            ],
          );
        }
      }

      this.logger.log(`Refreshed analysis for ${symbols.length} symbols`);
    } catch (error) {
      this.logger.error('Analysis refresh failed', error);
    }
  }
}
