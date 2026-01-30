from typing import Dict, Any


class TargetPriceGenerator:
    """Generate buy/sell target prices using technical analysis"""
    
    def generate_targets(
        self,
        symbol: str,
        current_price: float,
        technical_data: Dict[str, Any],
        sentiment_score: float = 0
    ) -> Dict[str, Any]:
        """
        Generate target prices for a symbol.
        
        Args:
            symbol: Stock symbol
            current_price: Current market price
            technical_data: Technical analysis results
            sentiment_score: Sentiment score (-1 to 1)
            
        Returns:
            Dictionary with targets and analysis
        """
        # Calculate technical score (-1 to 1)
        tech_score = self._calculate_tech_score(technical_data)
        
        # Calculate targets
        buy_target = self._calculate_buy_target(
            current_price=current_price,
            support=technical_data.get("support_resistance", {}).get("support", current_price * 0.95),
            tech_score=tech_score,
            sentiment=sentiment_score
        )
        
        sell_target = self._calculate_sell_target(
            current_price=current_price,
            resistance=technical_data.get("support_resistance", {}).get("resistance", current_price * 1.15),
            tech_score=tech_score,
            sentiment=sentiment_score
        )
        
        stop_loss = self._calculate_stop_loss(
            buy_target=buy_target,
            support=technical_data.get("support_resistance", {}).get("support", current_price * 0.90)
        )
        
        # Calculate confidence
        confidence = self._calculate_confidence(
            tech_score=tech_score,
            sentiment_score=sentiment_score,
            technical_data=technical_data
        )
        
        # Determine recommendation
        recommendation = self._determine_recommendation(
            current_price=current_price,
            buy_target=buy_target,
            sell_target=sell_target,
            confidence=confidence,
            tech_score=tech_score
        )
        
        # Generate analysis summary
        key_factors = self._extract_key_factors(technical_data, sentiment_score)
        analysis_summary = self._generate_summary(
            symbol=symbol,
            recommendation=recommendation,
            tech_score=tech_score,
            technical_data=technical_data
        )
        
        return {
            "buy_target": round(buy_target, 2),
            "sell_target": round(sell_target, 2),
            "stop_loss": round(stop_loss, 2),
            "confidence": confidence,
            "recommendation": recommendation,
            "time_horizon": self._suggest_time_horizon(tech_score, technical_data),
            "risk_level": self._assess_risk(technical_data),
            "key_factors": key_factors,
            "analysis_summary": analysis_summary,
        }
    
    def _calculate_tech_score(self, technical_data: Dict) -> float:
        """
        Calculate overall technical score from -1 (very bearish) to 1 (very bullish)
        """
        score = 0
        factors = 0
        
        # RSI contribution
        rsi_data = technical_data.get("rsi", {})
        if rsi_data:
            rsi = rsi_data.get("value", 50)
            if rsi <= 30:
                score += 0.8  # Oversold = bullish
            elif rsi >= 70:
                score -= 0.8  # Overbought = bearish
            elif rsi < 45:
                score += 0.3
            elif rsi > 55:
                score -= 0.3
            factors += 1
        
        # MACD contribution
        macd_data = technical_data.get("macd", {})
        if macd_data:
            if macd_data.get("trend") == "bullish":
                score += 0.5
            else:
                score -= 0.5
            
            if macd_data.get("crossover") == "bullish":
                score += 0.5
            elif macd_data.get("crossover") == "bearish":
                score -= 0.5
            factors += 1
        
        # Moving averages contribution
        ma_data = technical_data.get("moving_averages", {})
        if ma_data:
            alignment = ma_data.get("alignment")
            if alignment == "bullish":
                score += 0.6
            elif alignment == "bearish":
                score -= 0.6
            
            # Price vs MAs
            ma20_dist = ma_data.get("ma20_distance")
            if ma20_dist is not None:
                if ma20_dist > 0:
                    score += min(ma20_dist / 10, 0.3)
                else:
                    score += max(ma20_dist / 10, -0.3)
            factors += 1
        
        # Trend contribution
        trend_data = technical_data.get("trend", {})
        if trend_data:
            direction = trend_data.get("direction")
            strength = trend_data.get("strength")
            
            multiplier = 1.0 if strength == "strong" else 0.7 if strength == "moderate" else 0.4
            
            if direction == "uptrend":
                score += 0.5 * multiplier
            elif direction == "downtrend":
                score -= 0.5 * multiplier
            factors += 1
        
        # Normalize score
        if factors > 0:
            score = score / factors
        
        return max(-1, min(1, score))
    
    def _calculate_buy_target(
        self,
        current_price: float,
        support: float,
        tech_score: float,
        sentiment: float
    ) -> float:
        """Calculate optimal buy price"""
        if support is None:
            support = current_price * 0.95
        
        base_discount = 0.03  # 3% below current as starting point
        
        # Adjust based on technical score
        # Bullish = less discount needed, Bearish = more discount
        tech_adjustment = tech_score * 0.02
        
        # Adjust based on sentiment
        sentiment_adjustment = sentiment * 0.01
        
        # Consider support level
        support_distance = (current_price - support) / current_price
        support_factor = min(support_distance, 0.10)  # Cap at 10%
        
        total_discount = base_discount - tech_adjustment - sentiment_adjustment
        total_discount = max(0.01, min(total_discount, support_factor + 0.02))
        
        buy_target = current_price * (1 - total_discount)
        
        # Don't go below strong support
        return max(buy_target, support * 1.01)
    
    def _calculate_sell_target(
        self,
        current_price: float,
        resistance: float,
        tech_score: float,
        sentiment: float
    ) -> float:
        """Calculate optimal sell price"""
        if resistance is None:
            resistance = current_price * 1.15
        
        # Base target: 10% above current
        base_target = current_price * 1.10
        
        # Adjust based on resistance
        # Weight between resistance and base target
        weighted_target = (resistance * 0.6 + base_target * 0.4)
        
        # Adjust for bullish/bearish conditions
        if tech_score > 0.3:
            # Bullish - aim higher
            weighted_target *= (1 + tech_score * 0.05)
        elif tech_score < -0.3:
            # Bearish - be more conservative
            weighted_target *= (1 + tech_score * 0.03)
        
        # Ensure minimum profit target
        min_target = current_price * 1.08  # At least 8% profit
        
        return max(weighted_target, min_target)
    
    def _calculate_stop_loss(self, buy_target: float, support: float) -> float:
        """Calculate stop loss price"""
        if support is None:
            return buy_target * 0.93
        
        # Set stop loss below support
        stop_loss = min(support * 0.97, buy_target * 0.93)
        
        return stop_loss
    
    def _calculate_confidence(
        self,
        tech_score: float,
        sentiment_score: float,
        technical_data: Dict
    ) -> int:
        """Calculate confidence score (0-100)"""
        # Base confidence
        confidence = 50
        
        # Add based on technical score strength
        confidence += abs(tech_score) * 20
        
        # Add based on sentiment alignment
        if (tech_score > 0 and sentiment_score > 0) or (tech_score < 0 and sentiment_score < 0):
            confidence += 10  # Agreement between signals
        elif (tech_score > 0 and sentiment_score < 0) or (tech_score < 0 and sentiment_score > 0):
            confidence -= 5  # Disagreement
        
        # Add based on clear signals
        rsi = technical_data.get("rsi", {})
        if rsi.get("overbought") or rsi.get("oversold"):
            confidence += 5  # Clear RSI signal
        
        macd = technical_data.get("macd", {})
        if macd.get("crossover"):
            confidence += 5  # Clear MACD crossover
        
        trend = technical_data.get("trend", {})
        if trend.get("strength") == "strong":
            confidence += 5
        
        return min(95, max(30, int(confidence)))
    
    def _determine_recommendation(
        self,
        current_price: float,
        buy_target: float,
        sell_target: float,
        confidence: int,
        tech_score: float
    ) -> str:
        """Determine recommendation based on all factors"""
        distance_to_buy = ((current_price - buy_target) / buy_target) * 100
        potential_gain = ((sell_target - current_price) / current_price) * 100
        
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
    
    def _suggest_time_horizon(self, tech_score: float, technical_data: Dict) -> str:
        """Suggest investment time horizon"""
        trend = technical_data.get("trend", {})
        strength = trend.get("strength", "weak")
        
        if abs(tech_score) > 0.6 and strength == "strong":
            return "short"  # Strong signals - act quickly
        elif abs(tech_score) > 0.3:
            return "medium"
        else:
            return "long"  # Weak signals - need more time
    
    def _assess_risk(self, technical_data: Dict) -> str:
        """Assess risk level"""
        # Check volatility via Bollinger Band width
        bb = technical_data.get("bollinger_bands", {})
        bb_position = bb.get("position", 50)
        
        trend = technical_data.get("trend", {})
        strength = trend.get("strength", "weak")
        
        rsi = technical_data.get("rsi", {})
        is_extreme = rsi.get("overbought") or rsi.get("oversold")
        
        risk_score = 0
        
        # Extreme positions are risky
        if bb_position > 90 or bb_position < 10:
            risk_score += 1
        
        # Extreme RSI is risky
        if is_extreme:
            risk_score += 1
        
        # Strong trends can reverse
        if strength == "strong":
            risk_score += 0.5
        
        # Sideways markets are uncertain
        if trend.get("direction") == "sideways":
            risk_score += 0.5
        
        if risk_score >= 2:
            return "high"
        elif risk_score >= 1:
            return "medium"
        else:
            return "low"
    
    def _extract_key_factors(self, technical_data: Dict, sentiment_score: float) -> list:
        """Extract key factors for the analysis"""
        factors = []
        
        # RSI factor
        rsi = technical_data.get("rsi", {})
        if rsi:
            rsi_val = rsi.get("value", 50)
            if rsi.get("oversold"):
                factors.append(f"RSI at {rsi_val:.0f} (Oversold - potential bounce)")
            elif rsi.get("overbought"):
                factors.append(f"RSI at {rsi_val:.0f} (Overbought - caution advised)")
            else:
                factors.append(f"RSI at {rsi_val:.0f} ({rsi.get('signal', 'neutral').capitalize()})")
        
        # MACD factor
        macd = technical_data.get("macd", {})
        if macd:
            trend = macd.get("trend", "neutral")
            crossover = macd.get("crossover")
            if crossover:
                factors.append(f"MACD {crossover.capitalize()} crossover detected")
            else:
                factors.append(f"MACD showing {trend} momentum")
        
        # Moving averages factor
        ma = technical_data.get("moving_averages", {})
        if ma:
            alignment = ma.get("alignment")
            if alignment == "bullish":
                factors.append("Price above key moving averages (bullish)")
            elif alignment == "bearish":
                factors.append("Price below key moving averages (bearish)")
        
        # Trend factor
        trend = technical_data.get("trend", {})
        if trend:
            direction = trend.get("direction", "sideways")
            strength = trend.get("strength", "weak")
            change = trend.get("change_20d", 0)
            factors.append(f"{strength.capitalize()} {direction} ({change:+.1f}% in 20 days)")
        
        # Support/Resistance
        sr = technical_data.get("support_resistance", {})
        if sr:
            dist_support = sr.get("distance_to_support", 0)
            dist_resistance = sr.get("distance_to_resistance", 0)
            if dist_support < 3:
                factors.append(f"Near support level ({dist_support:.1f}% above)")
            if dist_resistance < 5:
                factors.append(f"Approaching resistance ({dist_resistance:.1f}% below)")
        
        # Sentiment factor
        if sentiment_score > 0.3:
            factors.append("Positive market sentiment")
        elif sentiment_score < -0.3:
            factors.append("Negative market sentiment")
        
        return factors[:6]  # Limit to 6 factors
    
    def _generate_summary(
        self,
        symbol: str,
        recommendation: str,
        tech_score: float,
        technical_data: Dict
    ) -> str:
        """Generate human-readable analysis summary"""
        trend = technical_data.get("trend", {})
        direction = trend.get("direction", "sideways")
        strength = trend.get("strength", "")
        
        rec_text = {
            "strong_buy": "Strong buying opportunity",
            "buy": "Favorable entry point",
            "hold": "Maintain current position",
            "sell": "Consider taking profits",
            "avoid": "Wait for better conditions"
        }.get(recommendation, "Monitor closely")
        
        if tech_score > 0.5:
            outlook = "bullish outlook with strong technical indicators"
        elif tech_score > 0:
            outlook = "moderately bullish with mixed signals"
        elif tech_score > -0.5:
            outlook = "neutral with some caution warranted"
        else:
            outlook = "bearish indicators suggesting caution"
        
        return f"{rec_text}. {symbol} shows {outlook}. Current {strength} {direction} trend."
