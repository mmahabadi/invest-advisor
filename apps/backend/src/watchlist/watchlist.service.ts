import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import { MarketDataService } from '../market-data/market-data.service';
import { PredictionsService } from '../predictions/predictions.service';
import { CreateWatchlistItemDto } from './dto/watchlist.dto';

@Injectable()
export class WatchlistService {
  constructor(
    @Inject('DatabaseService') private db: DatabaseService,
    private marketDataService: MarketDataService,
    private predictionsService: PredictionsService,
  ) {}

  async getWatchlist(userId: string, sort = 'confidence', order = 'desc', filter?: string) {
    let query = `
      SELECT 
        w.*,
        t.buy_target,
        t.sell_target,
        t.stop_loss,
        t.confidence,
        t.recommendation,
        t.time_horizon,
        t.risk_level,
        t.analysis_summary,
        t.key_factors,
        t.rsi,
        t.macd_signal,
        t.trend,
        t.support_level,
        t.resistance_level,
        t.news_sentiment,
        t.sentiment_score,
        t.generated_at,
        t.valid_until
      FROM watchlist_items w
      LEFT JOIN target_prices t ON t.watchlist_item_id = w.id
      WHERE w.user_id = $1
    `;

    const params: any[] = [userId];

    if (filter) {
      params.push(filter);
      query += ` AND t.recommendation = $${params.length}`;
    }

    const orderColumn = this.getSortColumn(sort);
    const orderDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${orderColumn} ${orderDir} NULLS LAST`;

    const result = await this.db.query(query, params);

    const items = await Promise.all(
      result.rows.map(async (item) => {
        let currentPrice = item.current_price;

        // Update price if stale
        if (!currentPrice || this.isPriceStale(item.last_price_update)) {
          try {
            const quote = await this.marketDataService.getQuote(item.symbol);
            currentPrice = quote.price;
            await this.updateItemPrice(item.id, quote);
          } catch {
            currentPrice = item.current_price || 0;
          }
        }

        const distanceToBuyPct = item.buy_target
          ? ((currentPrice - item.buy_target) / item.buy_target) * 100
          : null;

        return {
          id: item.id,
          symbol: item.symbol,
          assetType: item.asset_type,
          assetName: item.asset_name,
          currentPrice,
          priceChange24h: item.price_change_24h,
          priceChangePct24h: item.price_change_pct_24h,
          addedAt: item.added_at,
          targetPrice: item.buy_target
            ? {
                buyTarget: Number(item.buy_target),
                sellTarget: Number(item.sell_target),
                stopLoss: item.stop_loss ? Number(item.stop_loss) : null,
                confidence: item.confidence,
                recommendation: item.recommendation,
                timeHorizon: item.time_horizon,
                riskLevel: item.risk_level,
                analysisSummary: item.analysis_summary,
                keyFactors: item.key_factors || [],
                technicalIndicators: {
                  rsi: item.rsi,
                  macdSignal: item.macd_signal,
                  trend: item.trend,
                  support: item.support_level,
                  resistance: item.resistance_level,
                },
                sentiment: {
                  overall: item.news_sentiment,
                  score: item.sentiment_score,
                },
                generatedAt: item.generated_at,
                validUntil: item.valid_until,
              }
            : null,
          distanceToBuyPct: distanceToBuyPct ? Math.round(distanceToBuyPct * 100) / 100 : null,
        };
      }),
    );

    return { items };
  }

  async getItem(userId: string, itemId: string) {
    const result = await this.db.query(
      `SELECT 
        w.*,
        t.buy_target,
        t.sell_target,
        t.stop_loss,
        t.confidence,
        t.recommendation,
        t.time_horizon,
        t.risk_level,
        t.analysis_summary,
        t.key_factors,
        t.rsi,
        t.macd_signal,
        t.trend,
        t.support_level,
        t.resistance_level,
        t.news_sentiment,
        t.sentiment_score,
        t.generated_at
      FROM watchlist_items w
      LEFT JOIN target_prices t ON t.watchlist_item_id = w.id
      WHERE w.id = $1 AND w.user_id = $2`,
      [itemId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Watchlist item not found');
    }

    const item = result.rows[0];

    // Get current quote and history
    let quote: { price: number };
    let priceHistory: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }> = [];
    try {
      quote = await this.marketDataService.getQuote(item.symbol);
      priceHistory = await this.marketDataService.getPriceHistory(item.symbol, '1m');
    } catch {
      quote = { price: item.current_price || 0 };
      priceHistory = [];
    }

    return {
      id: item.id,
      symbol: item.symbol,
      assetType: item.asset_type,
      assetName: item.asset_name,
      currentPrice: quote.price,
      priceHistory: {
        '1m': priceHistory,
      },
      targetPrice: item.buy_target
        ? {
            buyTarget: Number(item.buy_target),
            sellTarget: Number(item.sell_target),
            stopLoss: item.stop_loss ? Number(item.stop_loss) : null,
            confidence: item.confidence,
            recommendation: item.recommendation,
            timeHorizon: item.time_horizon,
            riskLevel: item.risk_level,
            analysisSummary: item.analysis_summary,
            keyFactors: item.key_factors || [],
            technicalIndicators: {
              rsi: item.rsi,
              macdSignal: item.macd_signal,
              trend: item.trend,
              support: Number(item.support_level),
              resistance: Number(item.resistance_level),
            },
            sentiment: {
              overall: item.news_sentiment,
              score: Number(item.sentiment_score),
            },
            generatedAt: item.generated_at,
          }
        : null,
    };
  }

  async addItem(userId: string, dto: CreateWatchlistItemDto) {
    // Check if already exists
    const existing = await this.db.query(
      `SELECT id FROM watchlist_items WHERE user_id = $1 AND symbol = $2`,
      [userId, dto.symbol.toUpperCase()],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('Symbol already in watchlist');
    }

    // Get asset info
    let assetName = dto.symbol;
    let currentPrice = 0;
    try {
      const quote = await this.marketDataService.getQuote(dto.symbol);
      assetName = quote.name || dto.symbol;
      currentPrice = quote.price;
    } catch {
      // Use symbol as name if fetch fails
    }

    const result = await this.db.query(
      `INSERT INTO watchlist_items 
       (user_id, symbol, asset_type, asset_name, current_price, notes, last_price_update)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        userId,
        dto.symbol.toUpperCase(),
        dto.assetType,
        assetName,
        currentPrice,
        dto.notes || null,
      ],
    );

    const item = result.rows[0];

    // Queue analysis (will be processed by ML engine)
    // For now, we'll trigger it asynchronously
    this.triggerAnalysis(item.id, item.symbol).catch(() => {});

    return {
      id: item.id,
      symbol: item.symbol,
      assetType: item.asset_type,
      assetName: item.asset_name,
      currentPrice,
      targetPrice: null,
      message: 'Added to watchlist. Target prices will be generated within 1 hour.',
    };
  }

  async refreshAnalysis(userId: string, itemId: string) {
    const item = await this.db.query(
      `SELECT * FROM watchlist_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId],
    );

    if (item.rows.length === 0) {
      throw new NotFoundException('Watchlist item not found');
    }

    await this.triggerAnalysis(itemId, item.rows[0].symbol);

    return {
      message: 'Analysis queued',
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  async removeItem(userId: string, itemId: string) {
    const result = await this.db.query(
      `DELETE FROM watchlist_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Watchlist item not found');
    }
  }

  private async triggerAnalysis(itemId: string, symbol: string) {
    try {
      const analysis = await this.predictionsService.getTargetPrice(symbol);

      // Store the analysis results
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
          itemId,
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
          new Date(Date.now() + 4 * 60 * 60 * 1000), // Valid for 4 hours
        ],
      );
    } catch (error) {
      console.error(`Failed to analyze ${symbol}:`, error);
    }
  }

  private async updateItemPrice(
    itemId: string,
    quote: { price: number; change?: number; changePct?: number },
  ) {
    await this.db.query(
      `UPDATE watchlist_items 
       SET current_price = $1, price_change_24h = $2, price_change_pct_24h = $3, last_price_update = NOW()
       WHERE id = $4`,
      [quote.price, quote.change || 0, quote.changePct || 0, itemId],
    );
  }

  private isPriceStale(lastUpdate: Date | null): boolean {
    if (!lastUpdate) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastUpdate) < fiveMinutesAgo;
  }

  private getSortColumn(sort: string): string {
    const sortMap: Record<string, string> = {
      confidence: 't.confidence',
      recommendation: 't.recommendation',
      potential: '(t.sell_target - w.current_price)',
      added: 'w.added_at',
    };
    return sortMap[sort] || 't.confidence';
  }
}
