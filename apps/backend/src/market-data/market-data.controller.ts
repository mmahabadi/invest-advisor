import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MarketDataService, HistoricalData } from './market-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(private marketDataService: MarketDataService) {}

  @Get('overview')
  async getOverview() {
    return this.marketDataService.getMarketOverview();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    const results = await this.marketDataService.searchSymbol(query);
    return { results };
  }

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    const quote = await this.marketDataService.getQuote(symbol);
    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePct: Math.round(quote.changePct * 100) / 100,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      marketCap: quote.marketCap,
      pe: quote.pe,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('history/:symbol')
  async getHistory(
    @Param('symbol') symbol: string,
    @Query('range') range: string = '1m',
  ): Promise<{ symbol: string; range: string; data: HistoricalData[] }> {
    const data = await this.marketDataService.getPriceHistory(symbol, range);
    return {
      symbol,
      range,
      data,
    };
  }
}
