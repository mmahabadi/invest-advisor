# Data Model

## 📊 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   users     │       │ portfolio_items │       │ transactions    │
├─────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)     │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ email       │  │    │ user_id (FK)    │  │    │ portfolio_item_id│
│ name        │  └───►│ symbol          │  └───►│ type            │
│ ...         │       │ asset_type      │       │ quantity        │
└─────────────┘       │ quantity        │       │ price           │
                      │ avg_cost        │       │ date            │
                      │ ...             │       │ ...             │
                      └─────────────────┘       └─────────────────┘
        │
        │             ┌─────────────────┐       ┌─────────────────┐
        │             │ watchlist_items │       │ target_prices   │
        │             ├─────────────────┤       ├─────────────────┤
        └────────────►│ id (PK)         │──────►│ id (PK)         │
                      │ user_id (FK)    │       │ watchlist_item_id│
                      │ symbol          │       │ buy_target      │
                      │ asset_type      │       │ sell_target     │
                      │ added_at        │       │ stop_loss       │
                      │ ...             │       │ confidence      │
                      └─────────────────┘       │ ...             │
                                                └─────────────────┘
        │
        │             ┌─────────────────┐       ┌─────────────────┐
        │             │     alerts      │       │ alert_history   │
        │             ├─────────────────┤       ├─────────────────┤
        └────────────►│ id (PK)         │──────►│ id (PK)         │
                      │ user_id (FK)    │       │ alert_id (FK)   │
                      │ symbol          │       │ triggered_at    │
                      │ alert_type      │       │ price_at_trigger│
                      │ condition       │       │ email_sent      │
                      │ ...             │       │ ...             │
                      └─────────────────┘       └─────────────────┘
```

## 📋 Table Definitions

### users
User account information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    theme VARCHAR(10) DEFAULT 'dark',
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    daily_summary BOOLEAN DEFAULT TRUE,
    weekly_report BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    min_confidence_alert INTEGER DEFAULT 70,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### portfolio_items
User's investment holdings.

```sql
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL, -- 'stock', 'etf', 'crypto', 'commodity'
    asset_name VARCHAR(255),
    
    -- Position details
    quantity DECIMAL(20, 8) NOT NULL,
    avg_cost DECIMAL(20, 8) NOT NULL,
    total_cost DECIMAL(20, 2) NOT NULL,
    
    -- Optional fields
    notes TEXT,
    icon VARCHAR(255),
    color VARCHAR(7),
    
    -- Calculated fields (updated by scheduler)
    current_price DECIMAL(20, 8),
    current_value DECIMAL(20, 2),
    profit_loss DECIMAL(20, 2),
    profit_loss_pct DECIMAL(10, 2),
    last_price_update TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_portfolio_user ON portfolio_items(user_id);
CREATE INDEX idx_portfolio_symbol ON portfolio_items(symbol);
```

### transactions
Individual buy/sell transactions for portfolio items.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(10) NOT NULL, -- 'buy', 'sell'
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    total_amount DECIMAL(20, 2) NOT NULL,
    fees DECIMAL(10, 2) DEFAULT 0,
    
    transaction_date DATE NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_portfolio ON transactions(portfolio_item_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
```

### watchlist_items
Assets user wants to monitor.

```sql
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    
    -- Current market data (updated frequently)
    current_price DECIMAL(20, 8),
    price_change_24h DECIMAL(10, 2),
    price_change_pct_24h DECIMAL(10, 2),
    volume_24h DECIMAL(20, 2),
    last_price_update TIMESTAMP,
    
    -- User preferences
    priority INTEGER DEFAULT 0, -- For sorting
    notes TEXT,
    
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_watchlist_user ON watchlist_items(user_id);
CREATE INDEX idx_watchlist_symbol ON watchlist_items(symbol);
```

### target_prices
AI-generated target prices for watchlist items.

```sql
CREATE TABLE target_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_item_id UUID NOT NULL REFERENCES watchlist_items(id) ON DELETE CASCADE,
    
    -- Target prices (generated by ML engine)
    buy_target DECIMAL(20, 8) NOT NULL,
    sell_target DECIMAL(20, 8) NOT NULL,
    stop_loss DECIMAL(20, 8),
    
    -- Analysis results
    confidence INTEGER NOT NULL, -- 0-100
    recommendation VARCHAR(20) NOT NULL, -- 'strong_buy', 'buy', 'hold', 'sell', 'avoid'
    time_horizon VARCHAR(20), -- 'short', 'medium', 'long'
    risk_level VARCHAR(20), -- 'low', 'medium', 'high'
    
    -- Technical indicators used
    rsi DECIMAL(5, 2),
    macd_signal VARCHAR(20), -- 'bullish', 'bearish', 'neutral'
    trend VARCHAR(20), -- 'uptrend', 'downtrend', 'sideways'
    support_level DECIMAL(20, 8),
    resistance_level DECIMAL(20, 8),
    
    -- Sentiment
    news_sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
    sentiment_score DECIMAL(5, 2), -- -1 to 1
    
    -- Reasoning (for display to user)
    analysis_summary TEXT,
    key_factors JSONB, -- Array of factors that influenced the decision
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP, -- Predictions become stale
    
    UNIQUE(watchlist_item_id)
);

CREATE INDEX idx_target_prices_watchlist ON target_prices(watchlist_item_id);
CREATE INDEX idx_target_prices_confidence ON target_prices(confidence);
```

### alerts
User-configured alerts.

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
    alert_type VARCHAR(30) NOT NULL, -- 'price_above', 'price_below', 'buy_target', 'sell_target', 'stop_loss'
    
    -- Alert conditions
    target_price DECIMAL(20, 8),
    percentage_change DECIMAL(10, 2), -- For percentage-based alerts
    
    -- Alert settings
    is_active BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE, -- Re-enable after triggered
    
    -- References
    watchlist_item_id UUID REFERENCES watchlist_items(id) ON DELETE SET NULL,
    portfolio_item_id UUID REFERENCES portfolio_items(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_active ON alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_symbol ON alerts(symbol);
```

### alert_history
Log of triggered alerts.

```sql
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    alert_type VARCHAR(30) NOT NULL,
    
    -- Trigger details
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price_at_trigger DECIMAL(20, 8) NOT NULL,
    target_price DECIMAL(20, 8),
    
    -- Notification status
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    
    -- User response
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    action_taken VARCHAR(20) -- 'bought', 'sold', 'ignored'
);

CREATE INDEX idx_alert_history_user ON alert_history(user_id);
CREATE INDEX idx_alert_history_date ON alert_history(triggered_at);
```

### market_data_cache
Cached market data to reduce API calls.

```sql
CREATE TABLE market_data_cache (
    symbol VARCHAR(20) PRIMARY KEY,
    asset_type VARCHAR(20) NOT NULL,
    
    -- Price data
    current_price DECIMAL(20, 8),
    open_price DECIMAL(20, 8),
    high_24h DECIMAL(20, 8),
    low_24h DECIMAL(20, 8),
    previous_close DECIMAL(20, 8),
    
    -- Change
    price_change DECIMAL(20, 8),
    price_change_pct DECIMAL(10, 2),
    
    -- Volume
    volume DECIMAL(20, 2),
    avg_volume DECIMAL(20, 2),
    
    -- Additional data
    market_cap DECIMAL(30, 2),
    pe_ratio DECIMAL(10, 2),
    dividend_yield DECIMAL(10, 4),
    
    -- Meta
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50)
);

CREATE INDEX idx_market_data_updated ON market_data_cache(last_updated);
```

### email_queue
Queue for sending emails.

```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    email_type VARCHAR(50) NOT NULL, -- 'buy_alert', 'sell_alert', 'daily_summary', etc.
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    
    -- Priority
    priority INTEGER DEFAULT 0, -- Higher = more urgent
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_queue_status ON email_queue(status) WHERE status = 'pending';
CREATE INDEX idx_email_queue_priority ON email_queue(priority, created_at);
```

---

## 🔄 Common Queries

### Get Portfolio Summary
```sql
SELECT 
    SUM(total_cost) as total_invested,
    SUM(current_value) as current_value,
    SUM(profit_loss) as total_profit_loss,
    ROUND(SUM(profit_loss) / NULLIF(SUM(total_cost), 0) * 100, 2) as profit_loss_pct
FROM portfolio_items
WHERE user_id = $1;
```

### Get Watchlist with Targets
```sql
SELECT 
    w.*,
    t.buy_target,
    t.sell_target,
    t.confidence,
    t.recommendation,
    t.analysis_summary,
    ROUND((w.current_price - t.buy_target) / t.buy_target * 100, 2) as distance_to_buy_pct
FROM watchlist_items w
LEFT JOIN target_prices t ON t.watchlist_item_id = w.id
WHERE w.user_id = $1
ORDER BY t.confidence DESC NULLS LAST;
```

### Get Pending Alerts to Check
```sql
SELECT a.*, w.current_price
FROM alerts a
JOIN watchlist_items w ON w.symbol = a.symbol AND w.user_id = a.user_id
WHERE a.is_active = TRUE
AND (
    (a.alert_type = 'price_below' AND w.current_price <= a.target_price)
    OR (a.alert_type = 'price_above' AND w.current_price >= a.target_price)
);
```

---

## 🔐 Data Integrity Rules

1. **Cascade Deletes**: When user deleted, all their data is deleted
2. **Symbol Format**: Always uppercase (AAPL, BTC, ETH)
3. **Unique Constraints**: One portfolio item per symbol per user
4. **Decimal Precision**: 8 decimals for crypto, 2 for fiat values
5. **Timestamps**: All in UTC, frontend converts to user timezone
