from typing import Dict, Any
from textblob import TextBlob
import yfinance as yf


class SentimentAnalyzer:
    """Analyze sentiment from news and other sources"""
    
    def __init__(self):
        self._cache = {}
    
    def analyze_symbol(self, symbol: str) -> Dict[str, Any]:
        """
        Get sentiment analysis for a symbol.
        
        Uses Yahoo Finance news and TextBlob for sentiment.
        """
        try:
            # Fetch news from Yahoo Finance
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            if not news:
                return {
                    "overall": "neutral",
                    "score": 0,
                    "breakdown": {"positive": 0, "neutral": 1, "negative": 0},
                    "articles": []
                }
            
            # Analyze sentiment of each article
            sentiments = []
            for article in news[:10]:  # Analyze top 10
                title = article.get("title", "")
                
                # Use TextBlob for sentiment
                blob = TextBlob(title)
                polarity = blob.sentiment.polarity
                
                if polarity > 0.1:
                    sentiment = "positive"
                elif polarity < -0.1:
                    sentiment = "negative"
                else:
                    sentiment = "neutral"
                
                sentiments.append({
                    "title": title,
                    "sentiment": sentiment,
                    "score": round(polarity, 2),
                    "source": article.get("publisher", "Unknown"),
                    "url": article.get("link", ""),
                    "published": article.get("providerPublishTime"),
                })
            
            # Aggregate results
            positive = sum(1 for s in sentiments if s["sentiment"] == "positive")
            negative = sum(1 for s in sentiments if s["sentiment"] == "negative")
            neutral = sum(1 for s in sentiments if s["sentiment"] == "neutral")
            
            total = len(sentiments)
            
            # Calculate composite score (-1 to 1)
            if total > 0:
                composite = (positive - negative) / total
                avg_score = sum(s["score"] for s in sentiments) / total
            else:
                composite = 0
                avg_score = 0
            
            # Determine overall sentiment
            if composite > 0.2:
                overall = "positive"
            elif composite < -0.2:
                overall = "negative"
            else:
                overall = "neutral"
            
            return {
                "overall": overall,
                "score": round(avg_score, 2),
                "composite": round(composite, 2),
                "breakdown": {
                    "positive": positive,
                    "neutral": neutral,
                    "negative": negative
                },
                "articles": sentiments[:5]  # Return top 5
            }
            
        except Exception as e:
            print(f"Sentiment analysis error for {symbol}: {e}")
            return {
                "overall": "neutral",
                "score": 0,
                "breakdown": {"positive": 0, "neutral": 1, "negative": 0},
                "articles": []
            }
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of arbitrary text"""
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        
        if polarity > 0.1:
            sentiment = "positive"
        elif polarity < -0.1:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        return {
            "sentiment": sentiment,
            "polarity": round(polarity, 3),
            "subjectivity": round(subjectivity, 3),
        }
