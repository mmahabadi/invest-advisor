import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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

  constructor(private configService: ConfigService) {
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
      // Return a fallback analysis
      return this.generateFallbackAnalysis(symbol);
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
      return symbols.map((s) => this.generateFallbackAnalysis(s));
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

  private generateFallbackAnalysis(symbol: string): TargetPriceResult {
    // Generate a basic fallback when ML engine is unavailable
    return {
      symbol,
      currentPrice: 0,
      buyTarget: 0,
      sellTarget: 0,
      stopLoss: 0,
      confidence: 50,
      recommendation: 'hold',
      timeHorizon: 'medium',
      riskLevel: 'medium',
      analysisSummary: 'Unable to generate analysis at this time. Please try again later.',
      keyFactors: ['Analysis temporarily unavailable'],
      technicalIndicators: {},
      sentiment: undefined,
    };
  }
}
