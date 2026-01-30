import yfinance as yf
import pandas as pd
from typing import Optional
from datetime import datetime, timedelta


class MarketDataService:
    """Service for fetching market data from Yahoo Finance"""
    
    def __init__(self):
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
    
    def get_historical(
        self, 
        symbol: str, 
        period: str = "6mo",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical price data for a symbol.
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL')
            period: Data period (1mo, 3mo, 6mo, 1y, 2y, 5y)
            interval: Data interval (1d, 1wk, 1mo)
            
        Returns:
            DataFrame with OHLCV data
        """
        cache_key = f"{symbol}:{period}:{interval}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
        
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                return None
            
            # Ensure column names are consistent
            df.columns = [col.capitalize() if col != 'Stock Splits' else col for col in df.columns]
            
            self._set_cache(cache_key, df)
            return df
            
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None
    
    def get_quote(self, symbol: str) -> Optional[dict]:
        """
        Get current quote for a symbol.
        
        Returns:
            Dict with price, change, volume, etc.
        """
        cache_key = f"quote:{symbol}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            
            quote = {
                "symbol": symbol.upper(),
                "price": info.last_price,
                "previous_close": info.previous_close,
                "change": info.last_price - info.previous_close,
                "change_pct": ((info.last_price - info.previous_close) / info.previous_close) * 100,
                "market_cap": getattr(info, 'market_cap', None),
            }
            
            self._set_cache(cache_key, quote, ttl=60)  # Cache for 1 minute
            return quote
            
        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return None
    
    def get_info(self, symbol: str) -> Optional[dict]:
        """Get company info for a symbol"""
        cache_key = f"info:{symbol}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            result = {
                "symbol": symbol.upper(),
                "name": info.get("shortName", symbol),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "dividend_yield": info.get("dividendYield"),
                "beta": info.get("beta"),
            }
            
            self._set_cache(cache_key, result, ttl=3600)  # Cache for 1 hour
            return result
            
        except Exception as e:
            print(f"Error fetching info for {symbol}: {e}")
            return None
    
    def _get_from_cache(self, key: str):
        """Get item from cache if not expired"""
        if key in self._cache:
            item = self._cache[key]
            if datetime.now() < item["expiry"]:
                return item["data"]
            del self._cache[key]
        return None
    
    def _set_cache(self, key: str, data, ttl: int = None):
        """Set item in cache"""
        if ttl is None:
            ttl = self._cache_ttl
        self._cache[key] = {
            "data": data,
            "expiry": datetime.now() + timedelta(seconds=ttl)
        }
