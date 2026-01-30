-- InvestAdvisor Database Schema
-- PostgreSQL 16+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- =====================================================
-- REFRESH TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =====================================================
-- PORTFOLIO ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON portfolio_items(symbol);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(10) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    total_amount DECIMAL(20, 2) NOT NULL,
    fees DECIMAL(10, 2) DEFAULT 0,
    
    transaction_date DATE NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio ON transactions(portfolio_item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- =====================================================
-- WATCHLIST ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS watchlist_items (
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
    priority INTEGER DEFAULT 0,
    notes TEXT,
    
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist_items(symbol);

-- =====================================================
-- TARGET PRICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS target_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_item_id UUID NOT NULL REFERENCES watchlist_items(id) ON DELETE CASCADE,
    
    -- Target prices (generated by ML engine)
    buy_target DECIMAL(20, 8) NOT NULL,
    sell_target DECIMAL(20, 8) NOT NULL,
    stop_loss DECIMAL(20, 8),
    
    -- Analysis results
    confidence INTEGER NOT NULL,
    recommendation VARCHAR(20) NOT NULL,
    time_horizon VARCHAR(20),
    risk_level VARCHAR(20),
    
    -- Technical indicators used
    rsi DECIMAL(5, 2),
    macd_signal VARCHAR(20),
    trend VARCHAR(20),
    support_level DECIMAL(20, 8),
    resistance_level DECIMAL(20, 8),
    
    -- Sentiment
    news_sentiment VARCHAR(20),
    sentiment_score DECIMAL(5, 2),
    
    -- Reasoning (for display to user)
    analysis_summary TEXT,
    key_factors JSONB,
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    
    UNIQUE(watchlist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_target_prices_watchlist ON target_prices(watchlist_item_id);
CREATE INDEX IF NOT EXISTS idx_target_prices_confidence ON target_prices(confidence);

-- =====================================================
-- ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
    alert_type VARCHAR(30) NOT NULL,
    
    -- Alert conditions
    target_price DECIMAL(20, 8),
    percentage_change DECIMAL(10, 2),
    
    -- Alert settings
    is_active BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    
    -- References
    watchlist_item_id UUID REFERENCES watchlist_items(id) ON DELETE SET NULL,
    portfolio_item_id UUID REFERENCES portfolio_items(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);

-- =====================================================
-- ALERT HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_history (
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
    action_taken VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_date ON alert_history(triggered_at);

-- =====================================================
-- MARKET DATA CACHE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS market_data_cache (
    symbol VARCHAR(20) PRIMARY KEY,
    asset_type VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    
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

CREATE INDEX IF NOT EXISTS idx_market_data_updated ON market_data_cache(last_updated);

-- =====================================================
-- EMAIL QUEUE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    
    -- Priority
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority, created_at);

-- =====================================================
-- HELPER FUNCTION: Update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers for updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_portfolio_items_updated_at
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_watchlist_items_updated_at
    BEFORE UPDATE ON watchlist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
