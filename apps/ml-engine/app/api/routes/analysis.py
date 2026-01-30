from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.market_data import MarketDataService
from app.services.technical import TechnicalAnalysisService
from app.services.signals import TargetPriceGenerator
from app.services.sentiment import SentimentAnalyzer

router = APIRouter()

# Initialize services
market_service = MarketDataService()
technical_service = TechnicalAnalysisService()
target_generator = TargetPriceGenerator()
sentiment_analyzer = SentimentAnalyzer()


class AnalysisRequest(BaseModel):
    symbol: str
    include_sentiment: bool = True
    include_prediction: bool = True


class TargetPriceResponse(BaseModel):
    symbol: str
    current_price: float
    buy_target: float
    sell_target: float
    stop_loss: Optional[float]
    confidence: int
    recommendation: str
    time_horizon: str
    risk_level: str
    analysis_summary: str
    key_factors: list[str]
    technical_indicators: dict
    sentiment: Optional[dict]
    generated_at: str


@router.post("/target-price/{symbol}", response_model=TargetPriceResponse)
async def generate_target_price(symbol: str, request: AnalysisRequest = None):
    """
    Generate AI target prices for a symbol.
    
    This is the main endpoint called by the backend to get
    buy/sell targets for watchlist items.
    """
    try:
        # Fetch market data
        df = market_service.get_historical(symbol)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        current_price = float(df['Close'].iloc[-1])
        
        # Technical analysis
        technical = technical_service.analyze(df)
        
        # Sentiment analysis (optional)
        sentiment = None
        if request is None or request.include_sentiment:
            try:
                sentiment = sentiment_analyzer.analyze_symbol(symbol)
            except Exception:
                sentiment = {"overall": "neutral", "score": 0}
        
        # Generate targets
        targets = target_generator.generate_targets(
            symbol=symbol,
            current_price=current_price,
            technical_data=technical,
            sentiment_score=sentiment.get("score", 0) if sentiment else 0
        )
        
        return TargetPriceResponse(
            symbol=symbol.upper(),
            current_price=round(current_price, 2),
            buy_target=targets["buy_target"],
            sell_target=targets["sell_target"],
            stop_loss=targets["stop_loss"],
            confidence=targets["confidence"],
            recommendation=targets["recommendation"],
            time_horizon=targets["time_horizon"],
            risk_level=targets["risk_level"],
            analysis_summary=targets["analysis_summary"],
            key_factors=targets["key_factors"],
            technical_indicators=technical,
            sentiment=sentiment,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
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
            result = await generate_target_price(symbol, AnalysisRequest(symbol=symbol))
            results.append(result.model_dump())
        except Exception as e:
            results.append({
                "symbol": symbol,
                "error": str(e)
            })
    
    return {"results": results}


@router.get("/technical/{symbol}")
async def get_technical_analysis(symbol: str):
    """Get technical analysis for a symbol"""
    try:
        df = market_service.get_historical(symbol)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        technical = technical_service.analyze(df)
        
        return {
            "symbol": symbol.upper(),
            "analysis": technical,
            "generated_at": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sentiment/{symbol}")
async def get_sentiment(symbol: str):
    """Get sentiment analysis for a symbol"""
    try:
        sentiment = sentiment_analyzer.analyze_symbol(symbol)
        
        return {
            "symbol": symbol.upper(),
            "sentiment": sentiment,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
