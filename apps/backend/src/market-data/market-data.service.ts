import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseService } from '../database/database.module';

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: number;
  pe?: number;
}

export interface HistoricalData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Mapping of US tickers to their German (Xetra) equivalents
const US_TO_GERMAN_TICKERS: Record<string, string> = {
  'TSLA': 'TL0',
  'AAPL': 'APC',
  'MSFT': 'MSF',
  'AMZN': 'AMZ',
  'GOOGL': 'ABEA',
  'GOOG': 'ABEC',
  'META': 'FB2A',
  'NVDA': 'NVD',
  'AMD': 'AMD',
  'NFLX': 'NFC',
  'DIS': 'WDP',
  'PYPL': '2PP',
  'INTC': 'INL',
  'CSCO': 'CIS',
  'ORCL': 'ORC',
  'IBM': 'IBM',
  'BA': 'BCO',
  'JPM': 'CMC',
  'V': '3V64',
  'MA': 'M4I',
  'JNJ': 'JNJ',
  'PG': 'PRG',
  'KO': 'CCC3',
  'PEP': 'PEP',
  'MCD': 'MDO',
  'NKE': 'NKE',
  'SBUX': 'SRB',
  'WMT': 'WMT',
  'HD': 'HDI',
  'COST': 'CTO',
  'UNH': 'UNH',
  'PFE': 'PFE',
  'MRK': 'MRK',
  'ABBV': '4AB',
  'LLY': 'LLY',
  'TMO': '1TM',
  'ABT': 'ABT',
  'CVX': 'CHV',
  'XOM': 'XONA',
  'T': 'SOBA',
  'VZ': 'BAC',
  'CRM': '1SF',
  'ADBE': '2AD',
  'NOW': '2SI',
  'UBER': 'UT8',
  'ABNB': '7AB',
  'SQ': '4SQ',
  'SHOP': '1SH',
  'PLTR': 'PTX',
  'COIN': '1QZ',
  'HOOD': '48H',
  'RIVN': '7RN',
  'LCID': '8LC',
  'NIO': 'NT0',
  'F': 'F',
  'GM': '8GM',
};

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cache = new Map<string, { data: any; expiry: number }>();
  private readonly finnhubApiKey: string;
  private readonly finnhubBaseUrl = 'https://finnhub.io/api/v1';

  constructor(
    private configService: ConfigService,
    @Inject('DatabaseService') private db: DatabaseService,
  ) {
    this.finnhubApiKey = this.configService.get<string>('FINNHUB_API_KEY') || '';
    if (!this.finnhubApiKey) {
      this.logger.warn('FINNHUB_API_KEY not configured - falling back to Yahoo Finance');
    } else {
      this.logger.log('Finnhub API configured successfully');
    }
  }

  async getQuote(symbol: string): Promise<QuoteData> {
    const cacheKey = `quote:${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let data: QuoteData;
      
      // Try Finnhub first if API key is configured
      if (this.finnhubApiKey) {
        try {
          data = await this.fetchFinnhubQuote(symbol);
        } catch (finnhubError) {
          this.logger.warn(`Finnhub failed for ${symbol}, trying Yahoo Finance`, finnhubError);
          data = await this.fetchYahooQuote(symbol);
        }
      } else {
        // Fallback to Yahoo Finance
        data = await this.fetchYahooQuote(symbol);
      }
      
      this.setCache(cacheKey, data, 60 * 1000); // Cache for 1 minute
      
      // Update database cache
      await this.updateMarketDataCache(data);
      
      return data;
    } catch (error) {
      // Fallback to database cache
      const dbCache = await this.db.query(
        `SELECT * FROM market_data_cache WHERE symbol = $1`,
        [symbol.toUpperCase()],
      );

      if (dbCache.rows.length > 0) {
        const row = dbCache.rows[0];
        return {
          symbol: row.symbol,
          name: row.asset_name || row.symbol,
          price: Number(row.current_price),
          change: Number(row.price_change) || 0,
          changePct: Number(row.price_change_pct) || 0,
          open: Number(row.open_price) || 0,
          high: Number(row.high_24h) || 0,
          low: Number(row.low_24h) || 0,
          volume: Number(row.volume) || 0,
          marketCap: row.market_cap ? Number(row.market_cap) : undefined,
          pe: row.pe_ratio ? Number(row.pe_ratio) : undefined,
        };
      }

      throw error;
    }
  }

  async getPriceHistory(
    symbol: string,
    range: string = '1m',
  ): Promise<HistoricalData[]> {
    const cacheKey = `history:${symbol}:${range}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let data: HistoricalData[];
      
      // Try Finnhub first if API key is configured
      if (this.finnhubApiKey) {
        try {
          data = await this.fetchFinnhubHistory(symbol, range);
        } catch (finnhubError) {
          this.logger.warn(`Finnhub history failed for ${symbol}, trying Yahoo Finance`, finnhubError);
          data = await this.fetchYahooHistory(symbol, range);
        }
      } else {
        data = await this.fetchYahooHistory(symbol, range);
      }
      
      this.setCache(cacheKey, data, 5 * 60 * 1000); // Cache for 5 minutes
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch history for ${symbol}`, error);
      return [];
    }
  }

  async searchSymbol(query: string) {
    const results: Array<{ symbol: string; name: string; type: string; exchange: string }> = [];
    const upperQuery = query.toUpperCase().trim();
    
    try {
      // Check if query looks like an ISIN (2 letters + 10 alphanumeric)
      const isIsin = /^[A-Z]{2}[A-Z0-9]{10}$/i.test(upperQuery);
      
      // Check if query includes an exchange suffix (e.g., TSLA.DE, AAPL.L)
      const hasExchangeSuffix = /\.[A-Z]{1,3}$/i.test(upperQuery);
      
      // If user explicitly searched for a symbol with exchange suffix, verify it first
      if (hasExchangeSuffix) {
        try {
          const quote = await this.getQuote(upperQuery);
          if (quote && quote.price > 0) {
            results.push({
              symbol: upperQuery,
              name: quote.name || upperQuery,
              type: this.detectAssetType(upperQuery),
              exchange: upperQuery.split('.')[1] || 'Unknown',
            });
          }
        } catch {
          // Symbol doesn't exist, continue with search
        }
      }
      
      // If ISIN, try OpenFIGI API first
      if (isIsin) {
        try {
          const figiResponse = await axios.post(
            'https://api.openfigi.com/v3/mapping',
            [{ idType: 'ID_ISIN', idValue: upperQuery }],
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 5000,
            },
          );
          
          if (figiResponse.data?.[0]?.data) {
            const figiResults = figiResponse.data[0].data;
            for (const item of figiResults.slice(0, 5)) {
              if (item.ticker) {
                // Map exchange to Yahoo Finance suffix
                const suffix = this.getYahooSuffix(item.exchCode);
                const symbol = suffix ? `${item.ticker}${suffix}` : item.ticker;
                if (!results.find(r => r.symbol === symbol)) {
                  results.push({
                    symbol,
                    name: item.name || item.ticker,
                    type: this.mapSecurityType(item.securityType),
                    exchange: item.exchCode || 'Unknown',
                  });
                }
              }
            }
          }
        } catch (e) {
          this.logger.warn('OpenFIGI lookup failed', e);
        }
      }
      
      // Try Finnhub search first if API key is configured
      if (this.finnhubApiKey) {
        const finnhubResults = await this.searchWithFinnhub(query);
        for (const result of finnhubResults) {
          if (!results.find(r => r.symbol === result.symbol)) {
            results.push({ ...result, exchange: 'US' });
          }
        }
      }
      
      // Also try Yahoo Finance search for broader coverage
      try {
        const response = await axios.get(
          `https://query1.finance.yahoo.com/v1/finance/search`,
          {
            params: {
              q: query,
              quotesCount: 15,
              newsCount: 0,
            },
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 5000,
          },
        );

        const yahooResults = response.data.quotes.map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          type: this.mapExchangeToType(q.exchange),
          exchange: q.exchange,
        }));
        
        // Add Yahoo results, avoiding duplicates
        for (const result of yahooResults) {
          if (!results.find(r => r.symbol === result.symbol)) {
            results.push(result);
          }
        }
      } catch (yahooError) {
        this.logger.warn('Yahoo search failed', yahooError);
      }
      
      // Extract base ticker (remove exchange suffix if present)
      const baseTicker = upperQuery.includes('.') ? upperQuery.split('.')[0] : upperQuery;
      
      // Always try to add European exchange variants for common tickers
      if (baseTicker.length >= 1 && baseTicker.length <= 6) {
        // Check if there's a German equivalent for this US ticker
        const germanTicker = US_TO_GERMAN_TICKERS[baseTicker];
        
        // Symbols to check on European exchanges
        const tickersToCheck = germanTicker 
          ? [germanTicker, baseTicker] // Check German ticker first, then original
          : [baseTicker];
        
        const euroChecks: Promise<{ symbol: string; name: string; type: string; exchange: string } | null>[] = [];
        
        for (const ticker of tickersToCheck) {
          // Prioritize .DE (German/Xetra) for German tickers
          const suffixes = germanTicker && ticker === germanTicker 
            ? ['.DE'] // Only check German exchange for German tickers
            : ['.DE', '.L', '.AS', '.PA', '.MI', '.SW'];
          
          for (const suffix of suffixes) {
            const euroSymbol = `${ticker}${suffix}`;
            if (results.find(r => r.symbol === euroSymbol)) continue;
            
            euroChecks.push(
              (async () => {
                try {
                  const quote = await this.getQuote(euroSymbol);
                  if (quote && quote.price > 0) {
                    // For German tickers, show the US ticker in the name for clarity
                    const displayName = germanTicker && ticker === germanTicker
                      ? `${quote.name} (${baseTicker})`
                      : quote.name || euroSymbol;
                    
                    return {
                      symbol: euroSymbol,
                      name: displayName,
                      type: this.detectAssetType(euroSymbol),
                      exchange: suffix.replace('.', ''),
                    };
                  }
                } catch {
                  // Symbol doesn't exist
                }
                return null;
              })()
            );
          }
        }
        
        const euroResults = await Promise.all(euroChecks);
        for (const euroResult of euroResults) {
          if (euroResult && !results.find(r => r.symbol === euroResult.symbol)) {
            results.push(euroResult);
          }
        }
      }
      
      return results.slice(0, 15);
    } catch (e) {
      this.logger.error('Symbol search failed', e);
      return results;
    }
  }
  
  private getYahooSuffix(exchCode: string): string {
    const exchangeMap: Record<string, string> = {
      'LN': '.L',      // London
      'GY': '.DE',     // Germany (Xetra)
      'GR': '.DE',     // Germany
      'NA': '.AS',     // Amsterdam
      'FP': '.PA',     // Paris
      'IM': '.MI',     // Milan
      'SW': '.SW',     // Swiss
      'SS': '.SS',     // Shanghai
      'HK': '.HK',     // Hong Kong
      'T': '.T',       // Tokyo
      'TO': '.TO',     // Toronto
      'AX': '.AX',     // Australia
    };
    return exchangeMap[exchCode] || '';
  }
  
  private mapSecurityType(secType: string): string {
    if (!secType) return 'stock';
    const type = secType.toLowerCase();
    if (type.includes('etp') || type.includes('etf')) return 'etf';
    if (type.includes('fund')) return 'fund';
    if (type.includes('index')) return 'index';
    return 'stock';
  }

  async getMarketOverview() {
    const indices = ['%5EGSPC', '%5EIXIC', '%5EDJI']; // S&P 500, NASDAQ, DOW
    const crypto = ['BTC-USD', 'ETH-USD'];
    const commodities = ['GC=F', 'SI=F']; // Gold, Silver

    const fetchQuotes = async (symbols: string[]) => {
      return Promise.all(
        symbols.map(async (s) => {
          try {
            return await this.getQuote(s);
          } catch {
            return null;
          }
        }),
      );
    };

    const [indexQuotes, cryptoQuotes, commodityQuotes] = await Promise.all([
      fetchQuotes(indices),
      fetchQuotes(crypto),
      fetchQuotes(commodities),
    ]);

    return {
      indices: {
        sp500: indexQuotes[0]
          ? { value: indexQuotes[0].price, change: indexQuotes[0].change, changePct: indexQuotes[0].changePct }
          : null,
        nasdaq: indexQuotes[1]
          ? { value: indexQuotes[1].price, change: indexQuotes[1].change, changePct: indexQuotes[1].changePct }
          : null,
        dow: indexQuotes[2]
          ? { value: indexQuotes[2].price, change: indexQuotes[2].change, changePct: indexQuotes[2].changePct }
          : null,
      },
      crypto: {
        btc: cryptoQuotes[0]
          ? { price: cryptoQuotes[0].price, change24h: cryptoQuotes[0].changePct }
          : null,
        eth: cryptoQuotes[1]
          ? { price: cryptoQuotes[1].price, change24h: cryptoQuotes[1].changePct }
          : null,
      },
      commodities: {
        gold: commodityQuotes[0]
          ? { price: commodityQuotes[0].price, change: commodityQuotes[0].changePct }
          : null,
        silver: commodityQuotes[1]
          ? { price: commodityQuotes[1].price, change: commodityQuotes[1].changePct }
          : null,
      },
      marketStatus: this.getMarketStatus(),
      lastUpdated: new Date().toISOString(),
    };
  }

  private async fetchYahooQuote(symbol: string): Promise<QuoteData> {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        params: {
          interval: '1d',
          range: '1d',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      },
    );

    const result = response.data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePct: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      open: quote.open?.[quote.open.length - 1] || meta.regularMarketPrice,
      high: quote.high?.[quote.high.length - 1] || meta.regularMarketPrice,
      low: quote.low?.[quote.low.length - 1] || meta.regularMarketPrice,
      volume: quote.volume?.[quote.volume.length - 1] || 0,
      marketCap: meta.marketCap,
    };
  }

  private async fetchYahooHistory(symbol: string, range: string): Promise<HistoricalData[]> {
    const rangeMap: Record<string, { range: string; interval: string }> = {
      '1d': { range: '1d', interval: '5m' },
      '1w': { range: '5d', interval: '15m' },
      '1m': { range: '1mo', interval: '1d' },
      '3m': { range: '3mo', interval: '1d' },
      '1y': { range: '1y', interval: '1d' },
      '5y': { range: '5y', interval: '1wk' },
    };

    const config = rangeMap[range] || rangeMap['1m'];

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        params: config,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      },
    );

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];

    return timestamps.map((ts: number, i: number) => ({
      timestamp: new Date(ts * 1000).toISOString(),
      open: quote.open?.[i] || 0,
      high: quote.high?.[i] || 0,
      low: quote.low?.[i] || 0,
      close: quote.close?.[i] || 0,
      volume: quote.volume?.[i] || 0,
    }));
  }

  // ==================== FINNHUB API METHODS ====================
  // Documentation: https://finnhub.io/docs/api

  /**
   * Fetch real-time quote from Finnhub
   */
  private async fetchFinnhubQuote(symbol: string): Promise<QuoteData> {
    // Clean symbol for Finnhub
    const finnhubSymbol = this.getFinnhubSymbol(symbol);
    
    // Check if it's crypto
    if (this.detectAssetType(symbol) === 'crypto') {
      return this.fetchFinnhubCryptoQuote(symbol);
    }
    
    // Fetch quote data
    const [quoteResponse, profileResponse] = await Promise.all([
      axios.get(`${this.finnhubBaseUrl}/quote`, {
        params: { symbol: finnhubSymbol, token: this.finnhubApiKey },
        timeout: 10000,
      }),
      axios.get(`${this.finnhubBaseUrl}/stock/profile2`, {
        params: { symbol: finnhubSymbol, token: this.finnhubApiKey },
        timeout: 10000,
      }).catch(() => ({ data: {} })), // Profile is optional
    ]);
    
    const quote = quoteResponse.data;
    const profile = profileResponse.data;
    
    if (!quote || quote.c === 0) {
      throw new Error(`No quote data from Finnhub for ${symbol}`);
    }
    
    return {
      symbol: symbol,
      name: profile.name || finnhubSymbol,
      price: quote.c, // Current price
      change: quote.d || 0, // Change
      changePct: quote.dp || 0, // Change percent
      open: quote.o || quote.c,
      high: quote.h || quote.c,
      low: quote.l || quote.c,
      volume: 0, // Quote endpoint doesn't include volume
      marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : undefined,
    };
  }

  /**
   * Fetch crypto quote from Finnhub
   */
  private async fetchFinnhubCryptoQuote(symbol: string): Promise<QuoteData> {
    // Convert symbol format (BTC-USD -> BINANCE:BTCUSDT)
    const cryptoSymbol = this.getFinnhubCryptoSymbol(symbol);
    
    const response = await axios.get(`${this.finnhubBaseUrl}/quote`, {
      params: { symbol: cryptoSymbol, token: this.finnhubApiKey },
      timeout: 10000,
    });
    
    const quote = response.data;
    
    if (!quote || quote.c === 0) {
      throw new Error(`No crypto data from Finnhub for ${symbol}`);
    }
    
    return {
      symbol: symbol,
      name: symbol,
      price: quote.c,
      change: quote.d || 0,
      changePct: quote.dp || 0,
      open: quote.o || quote.c,
      high: quote.h || quote.c,
      low: quote.l || quote.c,
      volume: 0,
    };
  }

  /**
   * Fetch historical candle data from Finnhub
   */
  private async fetchFinnhubHistory(symbol: string, range: string): Promise<HistoricalData[]> {
    const finnhubSymbol = this.getFinnhubSymbol(symbol);
    
    // Check if it's crypto
    if (this.detectAssetType(symbol) === 'crypto') {
      return this.fetchFinnhubCryptoHistory(symbol, range);
    }
    
    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    let from: number;
    let resolution: string;
    
    switch (range) {
      case '1d':
        from = now - 86400; // 1 day
        resolution = '5'; // 5 minutes
        break;
      case '1w':
        from = now - 604800; // 7 days
        resolution = '15'; // 15 minutes
        break;
      case '1m':
        from = now - 2592000; // 30 days
        resolution = 'D'; // Daily
        break;
      case '3m':
        from = now - 7776000; // 90 days
        resolution = 'D';
        break;
      case '1y':
        from = now - 31536000; // 365 days
        resolution = 'D';
        break;
      case '5y':
        from = now - 157680000; // 5 years
        resolution = 'W'; // Weekly
        break;
      default:
        from = now - 2592000;
        resolution = 'D';
    }
    
    const response = await axios.get(`${this.finnhubBaseUrl}/stock/candle`, {
      params: {
        symbol: finnhubSymbol,
        resolution,
        from,
        to: now,
        token: this.finnhubApiKey,
      },
      timeout: 10000,
    });
    
    const data = response.data;
    
    if (data.s !== 'ok' || !data.t) {
      return [];
    }
    
    return data.t.map((timestamp: number, i: number) => ({
      timestamp: new Date(timestamp * 1000).toISOString(),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));
  }

  /**
   * Fetch crypto historical data from Finnhub
   */
  private async fetchFinnhubCryptoHistory(symbol: string, range: string): Promise<HistoricalData[]> {
    const cryptoSymbol = this.getFinnhubCryptoSymbol(symbol);
    
    const now = Math.floor(Date.now() / 1000);
    let from: number;
    let resolution: string;
    
    switch (range) {
      case '1d':
        from = now - 86400;
        resolution = '5';
        break;
      case '1w':
        from = now - 604800;
        resolution = '60';
        break;
      case '1m':
        from = now - 2592000;
        resolution = 'D';
        break;
      case '3m':
        from = now - 7776000;
        resolution = 'D';
        break;
      case '1y':
        from = now - 31536000;
        resolution = 'D';
        break;
      default:
        from = now - 2592000;
        resolution = 'D';
    }
    
    const response = await axios.get(`${this.finnhubBaseUrl}/crypto/candle`, {
      params: {
        symbol: cryptoSymbol,
        resolution,
        from,
        to: now,
        token: this.finnhubApiKey,
      },
      timeout: 10000,
    });
    
    const data = response.data;
    
    if (data.s !== 'ok' || !data.t) {
      return [];
    }
    
    return data.t.map((timestamp: number, i: number) => ({
      timestamp: new Date(timestamp * 1000).toISOString(),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));
  }

  /**
   * Search symbols using Finnhub
   */
  async searchWithFinnhub(query: string): Promise<Array<{ symbol: string; name: string; type: string }>> {
    if (!this.finnhubApiKey) return [];
    
    try {
      const response = await axios.get(`${this.finnhubBaseUrl}/search`, {
        params: { q: query, token: this.finnhubApiKey },
        timeout: 5000,
      });
      
      if (response.data?.result) {
        return response.data.result.slice(0, 10).map((item: any) => ({
          symbol: item.symbol,
          name: item.description,
          type: item.type || 'stock',
        }));
      }
    } catch (error) {
      this.logger.warn('Finnhub search failed', error);
    }
    
    return [];
  }

  /**
   * Convert symbol to Finnhub format
   */
  private getFinnhubSymbol(symbol: string): string {
    // Remove exchange suffixes (.DE, .L, etc.)
    const cleanSymbol = symbol.split('.')[0].toUpperCase();
    
    // If it's a German ticker, convert back to US ticker
    const usSymbol = Object.entries(US_TO_GERMAN_TICKERS).find(
      ([, german]) => german === cleanSymbol
    );
    
    return usSymbol ? usSymbol[0] : cleanSymbol;
  }

  /**
   * Convert crypto symbol to Finnhub format
   */
  private getFinnhubCryptoSymbol(symbol: string): string {
    // Convert BTC-USD to BINANCE:BTCUSDT format
    const base = symbol.replace('-USD', '').toUpperCase();
    return `BINANCE:${base}USDT`;
  }

  private async updateMarketDataCache(data: QuoteData) {
    await this.db.query(
      `INSERT INTO market_data_cache 
       (symbol, asset_type, asset_name, current_price, price_change, price_change_pct, 
        open_price, high_24h, low_24h, volume, market_cap, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (symbol) DO UPDATE SET
         current_price = $4, price_change = $5, price_change_pct = $6,
         open_price = $7, high_24h = $8, low_24h = $9, volume = $10,
         market_cap = $11, last_updated = NOW()`,
      [
        data.symbol,
        this.detectAssetType(data.symbol),
        data.name,
        data.price,
        data.change,
        data.changePct,
        data.open,
        data.high,
        data.low,
        data.volume,
        data.marketCap || null,
      ],
    );
  }

  private getFromCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number) {
    this.cache.set(key, { data, expiry: Date.now() + ttl });
  }

  private detectAssetType(symbol: string): string {
    if (symbol.includes('-USD') || symbol.includes('BTC') || symbol.includes('ETH')) {
      return 'crypto';
    }
    if (symbol.includes('=F')) {
      return 'commodity';
    }
    if (symbol.startsWith('^') || symbol.startsWith('%5E')) {
      return 'index';
    }
    return 'stock';
  }

  private mapExchangeToType(exchange: string): string {
    if (exchange === 'CCC') return 'crypto';
    if (exchange === 'CME' || exchange === 'NYM') return 'commodity';
    return 'stock';
  }

  private getMarketStatus(): string {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = nyTime.getHours();
    const day = nyTime.getDay();

    if (day === 0 || day === 6) return 'closed';
    if (hours >= 9.5 && hours < 16) return 'open';
    if (hours >= 4 && hours < 9.5) return 'pre-market';
    if (hours >= 16 && hours < 20) return 'after-hours';
    return 'closed';
  }
}
