import pandas as pd
import numpy as np
from typing import Dict, Any


class TechnicalAnalysisService:
    """Calculate technical indicators for market analysis"""
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Perform full technical analysis on OHLCV data.
        
        Args:
            df: DataFrame with Open, High, Low, Close, Volume columns
            
        Returns:
            Dictionary with all indicators and signals
        """
        if df is None or df.empty:
            return {}
        
        # Ensure we have the right columns
        df = df.copy()
        
        return {
            "rsi": self._calculate_rsi(df),
            "macd": self._calculate_macd(df),
            "bollinger_bands": self._calculate_bollinger(df),
            "moving_averages": self._calculate_mas(df),
            "support_resistance": self._find_support_resistance(df),
            "trend": self._determine_trend(df),
            "volume_analysis": self._analyze_volume(df),
            "momentum": self._calculate_momentum(df),
        }
    
    def _calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> Dict:
        """Calculate RSI and interpretation"""
        close = df['Close']
        delta = close.diff()
        
        gain = delta.where(delta > 0, 0).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        
        current_rsi = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else 50
        
        return {
            "value": round(current_rsi, 2),
            "signal": self._interpret_rsi(current_rsi),
            "overbought": current_rsi >= 70,
            "oversold": current_rsi <= 30,
        }
    
    def _interpret_rsi(self, rsi: float) -> str:
        """Interpret RSI value"""
        if rsi >= 70:
            return "overbought"
        elif rsi <= 30:
            return "oversold"
        elif rsi >= 60:
            return "bullish"
        elif rsi <= 40:
            return "bearish"
        return "neutral"
    
    def _calculate_macd(self, df: pd.DataFrame) -> Dict:
        """Calculate MACD and signal line"""
        close = df['Close']
        
        exp1 = close.ewm(span=12, adjust=False).mean()
        exp2 = close.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        
        current_macd = float(macd.iloc[-1])
        current_signal = float(signal.iloc[-1])
        current_hist = float(histogram.iloc[-1])
        
        # Detect crossover
        crossover = None
        if len(histogram) >= 2:
            if histogram.iloc[-2] < 0 and histogram.iloc[-1] > 0:
                crossover = "bullish"
            elif histogram.iloc[-2] > 0 and histogram.iloc[-1] < 0:
                crossover = "bearish"
        
        return {
            "macd": round(current_macd, 4),
            "signal": round(current_signal, 4),
            "histogram": round(current_hist, 4),
            "trend": "bullish" if current_hist > 0 else "bearish",
            "crossover": crossover,
        }
    
    def _calculate_bollinger(self, df: pd.DataFrame, period: int = 20, std_dev: int = 2) -> Dict:
        """Calculate Bollinger Bands"""
        close = df['Close']
        
        sma = close.rolling(window=period).mean()
        std = close.rolling(window=period).std()
        
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        
        current_price = float(close.iloc[-1])
        current_upper = float(upper.iloc[-1])
        current_lower = float(lower.iloc[-1])
        current_middle = float(sma.iloc[-1])
        
        # Calculate position within bands (0-100%)
        band_width = current_upper - current_lower
        if band_width > 0:
            position = ((current_price - current_lower) / band_width) * 100
        else:
            position = 50
        
        return {
            "upper": round(current_upper, 2),
            "middle": round(current_middle, 2),
            "lower": round(current_lower, 2),
            "position": round(position, 2),
            "signal": "overbought" if position > 80 else "oversold" if position < 20 else "neutral",
        }
    
    def _calculate_mas(self, df: pd.DataFrame) -> Dict:
        """Calculate Moving Averages"""
        close = df['Close']
        current_price = float(close.iloc[-1])
        
        mas = {}
        for period in [20, 50, 200]:
            if len(close) >= period:
                ma = float(close.rolling(window=period).mean().iloc[-1])
                mas[f"ma{period}"] = round(ma, 2)
                mas[f"ma{period}_distance"] = round(((current_price - ma) / ma) * 100, 2)
            else:
                mas[f"ma{period}"] = None
                mas[f"ma{period}_distance"] = None
        
        # Determine trend based on MA alignment
        if all(mas.get(f"ma{p}") for p in [20, 50, 200]):
            if mas["ma20"] > mas["ma50"] > mas["ma200"]:
                mas["alignment"] = "bullish"
            elif mas["ma20"] < mas["ma50"] < mas["ma200"]:
                mas["alignment"] = "bearish"
            else:
                mas["alignment"] = "mixed"
        else:
            mas["alignment"] = "insufficient_data"
        
        return mas
    
    def _find_support_resistance(self, df: pd.DataFrame) -> Dict:
        """Find key support and resistance levels"""
        if len(df) < 20:
            return {"support": None, "resistance": None}
        
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        # Use recent data for local levels
        recent = df.tail(60)
        
        # Simple approach: use recent highs/lows
        resistance = float(recent['High'].max())
        support = float(recent['Low'].min())
        
        current_price = float(close.iloc[-1])
        
        return {
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "distance_to_support": round(((current_price - support) / support) * 100, 2),
            "distance_to_resistance": round(((resistance - current_price) / current_price) * 100, 2),
        }
    
    def _determine_trend(self, df: pd.DataFrame) -> Dict:
        """Determine overall price trend"""
        if len(df) < 20:
            return {"direction": "neutral", "strength": "weak"}
        
        close = df['Close']
        
        # Calculate trend over different periods
        change_5d = ((close.iloc[-1] - close.iloc[-5]) / close.iloc[-5]) * 100 if len(close) >= 5 else 0
        change_20d = ((close.iloc[-1] - close.iloc[-20]) / close.iloc[-20]) * 100 if len(close) >= 20 else 0
        change_60d = ((close.iloc[-1] - close.iloc[-60]) / close.iloc[-60]) * 100 if len(close) >= 60 else 0
        
        # Determine direction
        if change_20d > 5:
            direction = "uptrend"
        elif change_20d < -5:
            direction = "downtrend"
        else:
            direction = "sideways"
        
        # Determine strength
        abs_change = abs(change_20d)
        if abs_change > 15:
            strength = "strong"
        elif abs_change > 5:
            strength = "moderate"
        else:
            strength = "weak"
        
        return {
            "direction": direction,
            "strength": strength,
            "change_5d": round(change_5d, 2),
            "change_20d": round(change_20d, 2),
            "change_60d": round(change_60d, 2),
        }
    
    def _analyze_volume(self, df: pd.DataFrame) -> Dict:
        """Analyze volume patterns"""
        if 'Volume' not in df.columns or len(df) < 20:
            return {"trend": "neutral", "relative": 1.0}
        
        volume = df['Volume']
        avg_volume = float(volume.rolling(window=20).mean().iloc[-1])
        current_volume = float(volume.iloc[-1])
        
        relative = current_volume / avg_volume if avg_volume > 0 else 1.0
        
        if relative > 1.5:
            trend = "high"
        elif relative < 0.5:
            trend = "low"
        else:
            trend = "normal"
        
        return {
            "current": int(current_volume),
            "average": int(avg_volume),
            "relative": round(relative, 2),
            "trend": trend,
        }
    
    def _calculate_momentum(self, df: pd.DataFrame) -> Dict:
        """Calculate momentum indicators"""
        close = df['Close']
        
        # Rate of Change (ROC)
        roc_10 = ((close.iloc[-1] - close.iloc[-10]) / close.iloc[-10]) * 100 if len(close) >= 10 else 0
        
        # Stochastic
        if len(df) >= 14:
            low_14 = df['Low'].rolling(window=14).min()
            high_14 = df['High'].rolling(window=14).max()
            k = ((close - low_14) / (high_14 - low_14)) * 100
            stoch_k = float(k.iloc[-1]) if not pd.isna(k.iloc[-1]) else 50
        else:
            stoch_k = 50
        
        return {
            "roc_10": round(roc_10, 2),
            "stochastic_k": round(stoch_k, 2),
            "signal": "bullish" if stoch_k < 20 else "bearish" if stoch_k > 80 else "neutral",
        }
