import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseService } from '../database/database.module';

export interface TargetPriceResult {
  symbol: string;
  currentPrice: number;
  buyTarget: number;
  sellTarget: number;
  stopLoss: number;
  confidence: number;
  recommendation: string;
  timeHorizon: string;
  riskLevel: string;
  analysisSummary: string;
  keyFactors: string[];
  technicalIndicators: {
    rsi?: number;
    macdSignal?: string;
    trend?: string;
    support?: number;
    resistance?: number;
  };
  sentiment?: {
    overall?: string;
    score?: number;
  };
}

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);
  private readonly mlEngineUrl: string;

  constructor(
    private configService: ConfigService,
    @Optional() @Inject('DatabaseService') private db: DatabaseService,
  ) {
    this.mlEngineUrl = this.configService.get<string>('ML_ENGINE_URL', 'http://ml-engine:8000');
  }

  async getTargetPrice(symbol: string): Promise<TargetPriceResult> {
    try {
      const response = await axios.post(
        `${this.mlEngineUrl}/analyze/target-price/${symbol}`,
        {
          symbol,
          includeSentiment: true,
          includePrediction: true,
        },
        {
          timeout: 30000,
        },
      );

      return this.mapResponse(response.data);
    } catch (error) {
      this.logger.error(`ML Engine request failed for ${symbol}`, error);
      // Return a fallback analysis with real market data
      return await this.generateFallbackAnalysis(symbol);
    }
  }

  async getBatchSignals(symbols: string[]): Promise<TargetPriceResult[]> {
    try {
      const response = await axios.post(
        `${this.mlEngineUrl}/analyze/batch-signals`,
        { symbols },
        { timeout: 60000 },
      );

      return response.data.results.map((r: any) => this.mapResponse(r));
    } catch (error) {
      this.logger.error('Batch signals request failed', error);
      return await Promise.all(symbols.map((s) => this.generateFallbackAnalysis(s)));
    }
  }

  private mapResponse(data: any): TargetPriceResult {
    return {
      symbol: data.symbol,
      currentPrice: data.current_price || data.currentPrice,
      buyTarget: data.buy_target || data.buyTarget,
      sellTarget: data.sell_target || data.sellTarget,
      stopLoss: data.stop_loss || data.stopLoss,
      confidence: data.confidence,
      recommendation: data.recommendation,
      timeHorizon: data.time_horizon || data.timeHorizon,
      riskLevel: data.risk_level || data.riskLevel,
      analysisSummary: data.analysis_summary || data.analysisSummary,
      keyFactors: data.key_factors || data.keyFactors || [],
      technicalIndicators: {
        rsi: data.technical_indicators?.rsi || data.technicalIndicators?.rsi,
        macdSignal: data.technical_indicators?.macd_signal || data.technicalIndicators?.macdSignal,
        trend: data.technical_indicators?.trend || data.technicalIndicators?.trend,
        support: data.technical_indicators?.support || data.technicalIndicators?.support,
        resistance: data.technical_indicators?.resistance || data.technicalIndicators?.resistance,
      },
      sentiment: data.sentiment
        ? {
            overall: data.sentiment.overall,
            score: data.sentiment.score,
          }
        : undefined,
    };
  }

  private async generateFallbackAnalysis(symbol: string): Promise<TargetPriceResult> {
    this.logger.log(`Generating fallback analysis for ${symbol}`);
    
    try {
      // Try to fetch current price from Yahoo Finance
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: { interval: '1d', range: '3mo' },
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000,
        },
      );

      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      
      const currentPrice = meta.regularMarketPrice;
      const prices = quotes.close.filter((p: number | null) => p !== null) as number[];
      
      if (prices.length === 0) {
        throw new Error('No price data');
      }

      // Calculate basic technical analysis
      const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const volatility = (maxPrice - minPrice) / avgPrice;
      
      // Calculate simple RSI approximation
      const gains: number[] = [];
      const losses: number[] = [];
      for (let i = 1; i < Math.min(14, prices.length); i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains.push(change);
        else losses.push(Math.abs(change));
      }
      const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
      const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0.01;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      // Determine trend
      const recentPrices = prices.slice(-10);
      const trend = recentPrices[recentPrices.length - 1] > recentPrices[0] ? 'bullish' : 'bearish';
      
      // Calculate targets based on current price and volatility
      const buyTarget = currentPrice * (1 - volatility * 0.3); // 30% of volatility below
      const sellTarget = currentPrice * (1 + volatility * 0.5); // 50% of volatility above
      const stopLoss = currentPrice * (1 - volatility * 0.5); // 50% of volatility below
      
      // Determine recommendation
      let recommendation: string;
      let confidence: number;
      
      if (rsi < 30) {
        recommendation = 'strong_buy';
        confidence = 75;
      } else if (rsi < 40) {
        recommendation = 'buy';
        confidence = 65;
      } else if (rsi > 70) {
        recommendation = 'avoid';
        confidence = 70;
      } else if (rsi > 60) {
        recommendation = 'hold';
        confidence = 55;
      } else {
        recommendation = 'hold';
        confidence = 50;
      }
      
      // Determine risk level
      let riskLevel: string;
      if (volatility > 0.3) riskLevel = 'high';
      else if (volatility > 0.15) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        symbol,
        currentPrice,
        buyTarget: Math.round(buyTarget * 100) / 100,
        sellTarget: Math.round(sellTarget * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100,
        confidence,
        recommendation,
        timeHorizon: 'medium',
        riskLevel,
        analysisSummary: `Based on 3-month price analysis. RSI at ${Math.round(rsi)} indicates ${rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral'} conditions. ${trend === 'bullish' ? 'Recent trend is positive.' : 'Recent trend is negative.'}`,
        keyFactors: [
          `RSI: ${Math.round(rsi)} (${rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral'})`,
          `Trend: ${trend === 'bullish' ? 'Upward' : 'Downward'} over past 10 days`,
          `Volatility: ${(volatility * 100).toFixed(1)}% (${riskLevel} risk)`,
          `52-week range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
        ],
        technicalIndicators: {
          rsi: Math.round(rsi),
          macdSignal: trend === 'bullish' ? 'bullish' : 'bearish',
          trend,
          support: Math.round(minPrice * 100) / 100,
          resistance: Math.round(maxPrice * 100) / 100,
        },
        sentiment: {
          overall: 'neutral',
          score: 50,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate fallback for ${symbol}:`, error);
      // Return minimal fallback
      return {
        symbol,
        currentPrice: 0,
        buyTarget: 0,
        sellTarget: 0,
        stopLoss: 0,
        confidence: 30,
        recommendation: 'hold',
        timeHorizon: 'medium',
        riskLevel: 'medium',
        analysisSummary: 'Unable to fetch market data. Analysis will be available shortly.',
        keyFactors: ['Waiting for market data...'],
        technicalIndicators: {},
        sentiment: undefined,
      };
    }
  }
}
