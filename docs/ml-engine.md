# ML Engine Documentation

## 🧠 Overview

The ML Engine is a Python-based microservice responsible for:
- Technical analysis calculations
- Price predictions
- Target price generation
- News sentiment analysis
- Buy/sell signal generation

## 🏗️ Architecture

```
apps/ml-engine/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analysis.py  # Analysis endpoints
│   │   │   ├── prediction.py # Prediction endpoints
│   │   │   └── health.py    # Health check
│   │   └── deps.py          # Dependencies
│   │
│   ├── services/
│   │   ├── market_data.py   # Yahoo Finance integration
│   │   ├── technical.py     # Technical analysis
│   │   ├── prediction.py    # ML predictions
│   │   ├── sentiment.py     # News sentiment
│   │   └── signals.py       # Signal generation
│   │
│   ├── models/
│   │   ├── lstm_model.py    # LSTM for time series
│   │   ├── random_forest.py # RF for classification
│   │   └── ensemble.py      # Ensemble methods
│   │
│   ├── utils/
│   │   ├── indicators.py    # Technical indicators
│   │   ├── preprocessing.py # Data preprocessing
│   │   └── cache.py         # Redis caching
│   │
│   └── schemas/
│       ├── analysis.py      # Request/response schemas
│       └── prediction.py
│
├── models/                   # Trained model files
│   ├── lstm_stock.h5
│   ├── rf_signals.pkl
│   └── sentiment.pkl
│
├── requirements.txt
├── Dockerfile
└── tests/
```

## 📊 Technical Indicators

### Implemented Indicators

| Indicator | Description | Usage |
|-----------|-------------|-------|
| RSI | Relative Strength Index | Overbought/oversold detection |
| MACD | Moving Average Convergence Divergence | Trend and momentum |
| Bollinger Bands | Volatility bands | Support/resistance, volatility |
| SMA | Simple Moving Average (20, 50, 200) | Trend direction |
| EMA | Exponential Moving Average | Faster trend response |
| ATR | Average True Range | Volatility measurement |
| OBV | On Balance Volume | Volume trend |
| Stochastic | Stochastic Oscillator | Momentum |

### Technical Analysis Service

```python
# services/technical.py

from typing import Dict, Any
import pandas as pd
import numpy as np

class TechnicalAnalysisService:
    """Calculate technical indicators for a given symbol."""
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Perform full technical analysis.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            Dictionary with all indicators and signals
        """
        return {
            "rsi": self._calculate_rsi(df),
            "macd": self._calculate_macd(df),
            "bollinger": self._calculate_bollinger(df),
            "moving_averages": self._calculate_mas(df),
            "support_resistance": self._find_support_resistance(df),
            "trend": self._determine_trend(df),
            "signals": self._generate_signals(df)
        }
    
    def _calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> Dict:
        """Calculate RSI and interpretation."""
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        current_rsi = rsi.iloc[-1]
        
        return {
            "value": round(current_rsi, 2),
            "signal": self._interpret_rsi(current_rsi),
            "history": rsi.tail(30).tolist()
        }
    
    def _interpret_rsi(self, rsi: float) -> str:
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
        """Calculate MACD and signal line."""
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        
        return {
            "macd": round(macd.iloc[-1], 4),
            "signal": round(signal.iloc[-1], 4),
            "histogram": round(histogram.iloc[-1], 4),
            "trend": "bullish" if histogram.iloc[-1] > 0 else "bearish",
            "crossover": self._detect_macd_crossover(macd, signal)
        }
    
    def _find_support_resistance(self, df: pd.DataFrame) -> Dict:
        """Find key support and resistance levels."""
        highs = df['high'].rolling(window=20).max()
        lows = df['low'].rolling(window=20).min()
        
        # Use pivot points and local extrema
        resistance = df['high'].nlargest(5).mean()
        support = df['low'].nsmallest(5).mean()
        
        return {
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "current_position": self._position_in_range(
                df['close'].iloc[-1], support, resistance
            )
        }
```

## 🎯 Target Price Generation

The core feature - generating AI target prices for watchlist items.

### Algorithm

```python
# services/signals.py

class TargetPriceGenerator:
    """Generate buy/sell target prices using ML and technical analysis."""
    
    def generate_targets(
        self, 
        symbol: str,
        current_price: float,
        technical_data: Dict,
        sentiment_score: float
    ) -> TargetPriceResult:
        """
        Generate target prices for a symbol.
        
        Process:
        1. Analyze technical indicators
        2. Get ML price predictions
        3. Analyze sentiment
        4. Calculate risk-adjusted targets
        5. Determine confidence score
        """
        
        # 1. Technical analysis factors
        tech_score = self._score_technicals(technical_data)
        
        # 2. ML predictions
        predictions = self.predictor.predict(symbol, horizons=[7, 30, 90])
        
        # 3. Combine factors
        buy_target = self._calculate_buy_target(
            current_price=current_price,
            support=technical_data['support_resistance']['support'],
            predictions=predictions,
            tech_score=tech_score,
            sentiment=sentiment_score
        )
        
        sell_target = self._calculate_sell_target(
            current_price=current_price,
            resistance=technical_data['support_resistance']['resistance'],
            predictions=predictions,
            tech_score=tech_score,
            sentiment=sentiment_score
        )
        
        stop_loss = self._calculate_stop_loss(
            buy_target=buy_target,
            support=technical_data['support_resistance']['support'],
            atr=technical_data.get('atr', current_price * 0.02)
        )
        
        confidence = self._calculate_confidence(
            tech_score=tech_score,
            prediction_confidence=predictions['confidence'],
            sentiment_score=sentiment_score
        )
        
        recommendation = self._determine_recommendation(
            current_price=current_price,
            buy_target=buy_target,
            sell_target=sell_target,
            confidence=confidence,
            tech_score=tech_score
        )
        
        return TargetPriceResult(
            buy_target=round(buy_target, 2),
            sell_target=round(sell_target, 2),
            stop_loss=round(stop_loss, 2),
            confidence=confidence,
            recommendation=recommendation,
            time_horizon=self._suggest_time_horizon(predictions),
            risk_level=self._assess_risk(technical_data),
            key_factors=self._extract_key_factors(technical_data, sentiment_score)
        )
    
    def _calculate_buy_target(
        self,
        current_price: float,
        support: float,
        predictions: Dict,
        tech_score: float,
        sentiment: float
    ) -> float:
        """
        Calculate optimal buy price.
        
        Logic:
        - If strong bullish signals: target slightly below current
        - If weak signals: target near support levels
        - Adjust based on prediction confidence
        """
        base_discount = 0.03  # 3% below current as starting point
        
        # Adjust based on technical score (-1 to 1)
        # Bullish = less discount needed, Bearish = more discount
        tech_adjustment = tech_score * 0.02
        
        # Adjust based on sentiment
        sentiment_adjustment = sentiment * 0.01
        
        # Consider support level
        support_distance = (current_price - support) / current_price
        support_factor = min(support_distance, 0.10)  # Cap at 10%
        
        total_discount = base_discount - tech_adjustment - sentiment_adjustment
        total_discount = max(0.01, min(total_discount, support_factor))
        
        buy_target = current_price * (1 - total_discount)
        
        # Don't go below strong support
        return max(buy_target, support * 1.02)
    
    def _calculate_sell_target(
        self,
        current_price: float,
        resistance: float,
        predictions: Dict,
        tech_score: float,
        sentiment: float
    ) -> float:
        """
        Calculate optimal sell price.
        
        Logic:
        - Base on resistance levels and predictions
        - Adjust for risk/reward ratio (minimum 2:1)
        """
        # Use prediction for 30-day horizon
        predicted_price = predictions.get('30d', current_price * 1.10)
        
        # Weight between resistance and prediction
        base_target = (resistance * 0.6 + predicted_price * 0.4)
        
        # Ensure minimum profit target
        min_target = current_price * 1.08  # At least 8% profit
        
        return max(base_target, min_target)
    
    def _determine_recommendation(
        self,
        current_price: float,
        buy_target: float,
        sell_target: float,
        confidence: int,
        tech_score: float
    ) -> str:
        """
        Determine recommendation based on all factors.
        
        Returns: 'strong_buy', 'buy', 'hold', 'sell', 'avoid'
        """
        distance_to_buy = (current_price - buy_target) / buy_target * 100
        potential_gain = (sell_target - current_price) / current_price * 100
        
        if confidence >= 80 and distance_to_buy <= 2 and tech_score > 0.5:
            return "strong_buy"
        elif confidence >= 70 and distance_to_buy <= 5 and tech_score > 0:
            return "buy"
        elif confidence < 50 or tech_score < -0.5:
            return "avoid"
        elif potential_gain < 5:
            return "sell"
        else:
            return "hold"
```

## 🤖 ML Models

### 1. LSTM for Price Prediction

```python
# models/lstm_model.py

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

class LSTMPredictor:
    """LSTM model for price prediction."""
    
    def __init__(self, sequence_length: int = 60):
        self.sequence_length = sequence_length
        self.model = self._build_model()
    
    def _build_model(self) -> Sequential:
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(self.sequence_length, 5)),
            Dropout(0.2),
            LSTM(50, return_sequences=True),
            Dropout(0.2),
            LSTM(50),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    def predict(self, data: np.ndarray, days_ahead: int = 7) -> Dict:
        """Predict price for given horizon."""
        # Prepare sequences
        X = self._prepare_sequence(data)
        
        # Make predictions
        predictions = []
        current_seq = X[-1:]
        
        for _ in range(days_ahead):
            pred = self.model.predict(current_seq, verbose=0)
            predictions.append(pred[0, 0])
            # Roll sequence
            current_seq = np.roll(current_seq, -1, axis=1)
            current_seq[0, -1, 0] = pred[0, 0]
        
        return {
            "predictions": predictions,
            "final_price": predictions[-1],
            "trend": "up" if predictions[-1] > predictions[0] else "down",
            "confidence": self._calculate_confidence(predictions)
        }
```

### 2. Random Forest for Signals

```python
# models/random_forest.py

from sklearn.ensemble import RandomForestClassifier
import joblib

class SignalClassifier:
    """Random Forest classifier for buy/sell signals."""
    
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.feature_names = [
            'rsi', 'macd_hist', 'bb_position', 
            'ma20_distance', 'ma50_distance', 'ma200_distance',
            'volume_ratio', 'atr_ratio', 'momentum',
            'sentiment_score'
        ]
    
    def predict_signal(self, features: Dict) -> Dict:
        """
        Predict buy/sell/hold signal.
        
        Returns:
            signal: 'buy', 'sell', 'hold'
            probability: confidence of prediction
            feature_importance: which features drove the decision
        """
        X = self._prepare_features(features)
        
        proba = self.model.predict_proba(X)[0]
        prediction = self.model.predict(X)[0]
        
        signal_map = {0: 'sell', 1: 'hold', 2: 'buy'}
        
        return {
            "signal": signal_map[prediction],
            "probabilities": {
                "buy": round(proba[2] * 100, 1),
                "hold": round(proba[1] * 100, 1),
                "sell": round(proba[0] * 100, 1)
            },
            "confidence": round(max(proba) * 100, 1),
            "feature_importance": self._get_importance(X)
        }
```

## 📰 Sentiment Analysis

```python
# services/sentiment.py

from transformers import pipeline
import requests

class SentimentAnalyzer:
    """Analyze news sentiment for financial assets."""
    
    def __init__(self):
        self.classifier = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert"  # Financial sentiment model
        )
    
    def analyze_symbol(self, symbol: str) -> Dict:
        """
        Get sentiment analysis for a symbol.
        
        Process:
        1. Fetch recent news
        2. Analyze each headline
        3. Aggregate sentiment
        """
        news = self._fetch_news(symbol)
        
        sentiments = []
        for article in news[:10]:  # Analyze top 10 articles
            result = self.classifier(article['title'])[0]
            sentiments.append({
                "title": article['title'],
                "sentiment": result['label'],
                "score": result['score'],
                "source": article['source'],
                "url": article['url'],
                "published": article['published']
            })
        
        # Aggregate
        positive = sum(1 for s in sentiments if s['sentiment'] == 'positive')
        negative = sum(1 for s in sentiments if s['sentiment'] == 'negative')
        neutral = sum(1 for s in sentiments if s['sentiment'] == 'neutral')
        
        total = len(sentiments)
        
        # Calculate composite score (-1 to 1)
        if total > 0:
            composite = (positive - negative) / total
        else:
            composite = 0
        
        return {
            "overall": "positive" if composite > 0.2 else "negative" if composite < -0.2 else "neutral",
            "score": round(composite, 2),
            "breakdown": {
                "positive": positive,
                "neutral": neutral,
                "negative": negative
            },
            "articles": sentiments
        }
```

## 🔌 API Endpoints

### FastAPI Application

```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="InvestAdvisor ML Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analysis_router, prefix="/analyze", tags=["Analysis"])
app.include_router(prediction_router, prefix="/predict", tags=["Predictions"])
app.include_router(health_router, tags=["Health"])
```

### Endpoints

```python
# api/routes/analysis.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class AnalysisRequest(BaseModel):
    symbol: str
    include_sentiment: bool = True
    include_prediction: bool = True

class TargetPriceResponse(BaseModel):
    symbol: str
    current_price: float
    buy_target: float
    sell_target: float
    stop_loss: float
    confidence: int
    recommendation: str
    time_horizon: str
    risk_level: str
    analysis_summary: str
    key_factors: list[str]
    technical_indicators: dict
    sentiment: dict | None
    generated_at: str

@router.post("/target-price/{symbol}", response_model=TargetPriceResponse)
async def generate_target_price(symbol: str, request: AnalysisRequest):
    """
    Generate AI target prices for a symbol.
    
    This is the main endpoint called by the backend to get
    buy/sell targets for watchlist items.
    """
    try:
        # Fetch market data
        market_data = await market_service.get_historical(symbol)
        current_price = market_data['close'].iloc[-1]
        
        # Technical analysis
        technical = technical_service.analyze(market_data)
        
        # Sentiment (optional)
        sentiment = None
        if request.include_sentiment:
            sentiment = await sentiment_service.analyze_symbol(symbol)
        
        # Generate targets
        targets = target_generator.generate_targets(
            symbol=symbol,
            current_price=current_price,
            technical_data=technical,
            sentiment_score=sentiment['score'] if sentiment else 0
        )
        
        return TargetPriceResponse(
            symbol=symbol,
            current_price=current_price,
            **targets.dict(),
            technical_indicators=technical,
            sentiment=sentiment,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-signals")
async def generate_batch_signals(symbols: list[str]):
    """
    Generate signals for multiple symbols at once.
    Used by scheduler for watchlist updates.
    """
    results = []
    for symbol in symbols:
        try:
            result = await generate_target_price(
                symbol, 
                AnalysisRequest(symbol=symbol)
            )
            results.append(result)
        except Exception as e:
            results.append({
                "symbol": symbol,
                "error": str(e)
            })
    
    return {"results": results}
```

## 📈 Model Training

### Training Pipeline

```python
# scripts/train_models.py

def train_signal_classifier():
    """Train the signal classification model."""
    
    # Load historical data for multiple symbols
    symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', ...]
    
    X_train, y_train = [], []
    
    for symbol in symbols:
        data = fetch_historical(symbol, years=5)
        features, labels = prepare_training_data(data)
        X_train.extend(features)
        y_train.extend(labels)
    
    # Train model
    model = SignalClassifier()
    model.fit(X_train, y_train)
    
    # Evaluate
    X_test, y_test = prepare_test_data()
    accuracy = model.score(X_test, y_test)
    print(f"Model accuracy: {accuracy:.2%}")
    
    # Save
    joblib.dump(model, 'models/rf_signals.pkl')


def prepare_training_data(df: pd.DataFrame) -> tuple:
    """
    Prepare training data with labels.
    
    Label logic:
    - If price increased >5% in next 7 days: BUY
    - If price decreased >5% in next 7 days: SELL
    - Otherwise: HOLD
    """
    features = []
    labels = []
    
    for i in range(len(df) - 7):
        # Calculate indicators at point i
        window = df.iloc[:i+1]
        feature_vector = extract_features(window)
        
        # Calculate future return
        future_return = (df['close'].iloc[i+7] - df['close'].iloc[i]) / df['close'].iloc[i]
        
        if future_return > 0.05:
            label = 2  # BUY
        elif future_return < -0.05:
            label = 0  # SELL
        else:
            label = 1  # HOLD
        
        features.append(feature_vector)
        labels.append(label)
    
    return features, labels
```

## 🔧 Configuration

```python
# app/config.py

from pydantic import BaseSettings

class Settings(BaseSettings):
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # External APIs
    YAHOO_FINANCE_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL_MINUTES: int = 60
    
    # Model paths
    LSTM_MODEL_PATH: str = "models/lstm_stock.h5"
    RF_MODEL_PATH: str = "models/rf_signals.pkl"
    SENTIMENT_MODEL: str = "ProsusAI/finbert"
    
    # Analysis settings
    PREDICTION_HORIZONS: list = [7, 30, 90]  # days
    MIN_CONFIDENCE_THRESHOLD: int = 50
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## 📦 Dependencies

```txt
# requirements.txt

fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.5.3

# Data & ML
pandas==2.1.4
numpy==1.26.3
scikit-learn==1.4.0
tensorflow==2.15.0
xgboost==2.0.3

# Finance
yfinance==0.2.35
ta==0.11.0  # Technical analysis

# NLP
transformers==4.36.2
torch==2.1.2

# Utilities
redis==5.0.1
httpx==0.26.0
python-dotenv==1.0.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
```
