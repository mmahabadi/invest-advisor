# System Architecture

## 📐 Overview

InvestAdvisor follows a microservices architecture with three main services communicating through REST APIs.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│                     React Web Application                            │
│                   (Vite + TypeScript + TailwindCSS)                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway                                  │
├─────────────────────────────────────────────────────────────────────┤
│                      NestJS Backend                                  │
│              (REST API + Authentication + Business Logic)            │
└──────────┬──────────────────┬───────────────────┬───────────────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌──────────────────┐  ┌───────────────┐  ┌────────────────────────────┐
│   PostgreSQL     │  │  ML Engine    │  │    External Services       │
│   Database       │  │  (FastAPI)    │  │                            │
│                  │  │               │  │  • Yahoo Finance API       │
│  • Users         │  │  • Predictions│  │  • News APIs               │
│  • Portfolio     │  │  • Analysis   │  │  • Email Service (Resend)  │
│  • Watchlist     │  │  • Signals    │  │  • Redis (Caching)         │
│  • Transactions  │  │               │  │                            │
│  • Alerts        │  │               │  │                            │
└──────────────────┘  └───────────────┘  └────────────────────────────┘
```

## 🧩 Components

### 1. Web Application (apps/web)

**Technology**: React + Vite + TypeScript + TailwindCSS

**Responsibilities**:
- User interface for portfolio management
- Watchlist management
- Dashboard with analytics
- Real-time price display
- Alert configuration

**Key Pages**:
- `/` - Dashboard (portfolio overview, alerts)
- `/portfolio` - Portfolio management
- `/watchlist` - Watchlist with AI recommendations
- `/analytics` - Charts and performance analysis
- `/alerts` - Alert configuration and history
- `/settings` - User preferences

### 2. Backend API (apps/backend)

**Technology**: NestJS + TypeScript + PostgreSQL

**Responsibilities**:
- User authentication (JWT)
- Portfolio CRUD operations
- Watchlist management
- Alert management
- Market data aggregation
- Communication with ML Engine
- Email scheduling

**Modules**:
```
src/
├── auth/              # Authentication & authorization
├── users/             # User management
├── portfolio/         # Portfolio operations
├── watchlist/         # Watchlist with target prices
├── market-data/       # Market data fetching & caching
├── alerts/            # Alert management & triggers
├── predictions/       # ML Engine communication
├── email/             # Email notification service
├── scheduler/         # Cron jobs for monitoring
└── common/            # Shared utilities, guards, filters
```

### 3. ML Engine (apps/ml-engine)

**Technology**: Python + FastAPI + Pandas + Scikit-learn + TensorFlow

**Responsibilities**:
- Technical analysis calculations
- Price predictions
- Target price generation
- Buy/sell signal generation
- News sentiment analysis
- Model training and inference

**Endpoints**:
```
POST /analyze/{symbol}       # Get full analysis
POST /predict/{symbol}       # Get price prediction
POST /target-price/{symbol}  # Get AI-generated target prices
POST /signals/{symbols}      # Batch buy/sell signals
POST /sentiment/{symbol}     # News sentiment analysis
GET  /health                 # Health check
```

## 🔄 Data Flow

### Portfolio Tracking Flow
```
User adds investment → Backend validates → Store in DB → Update dashboard
```

### Watchlist Analysis Flow
```
User adds to watchlist
        ↓
Backend stores item
        ↓
Scheduler triggers analysis (every 4 hours)
        ↓
ML Engine analyzes:
  - Technical indicators (RSI, MACD, etc.)
  - Historical patterns
  - News sentiment
        ↓
ML Engine generates:
  - Target buy price
  - Target sell price
  - Confidence score
  - Recommendation
        ↓
Backend stores predictions
        ↓
If target hit → Trigger email alert
```

### Alert Flow
```
Scheduler runs every 15 minutes
        ↓
Fetch current prices for watchlist items
        ↓
Compare with target prices
        ↓
If conditions met:
  - Generate alert
  - Send email notification
  - Log alert history
```

## 🗄️ Database Design

See [data-model.md](./data-model.md) for detailed schema.

**Main Tables**:
- `users` - User accounts
- `portfolio_items` - User's investments
- `watchlist_items` - Items being watched
- `target_prices` - AI-generated targets
- `alerts` - Alert history
- `market_data_cache` - Cached market data

## 🔐 Security

### Authentication
- JWT-based authentication
- Access tokens (15 min) + Refresh tokens (7 days)
- Secure password hashing (bcrypt)

### API Security
- Rate limiting
- Input validation
- CORS configuration
- Helmet security headers

## 📊 Caching Strategy

### Redis Cache
- Market data: 1-5 minutes TTL
- Technical indicators: 1 hour TTL
- Predictions: 4 hours TTL
- User sessions: 7 days TTL

## ⏰ Scheduled Jobs

| Job | Frequency | Description |
|-----|-----------|-------------|
| Price Update | 15 min | Update prices for watchlist items |
| Alert Check | 15 min | Check if any targets are hit |
| Full Analysis | 4 hours | Run ML analysis on watchlist |
| Daily Summary | Daily 8 AM | Send daily portfolio summary |
| Model Retrain | Weekly | Retrain prediction models |

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare                                │
│                    (DNS + CDN + SSL)                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   Vercel        │  │   Railway       │  │   Railway           │
│   (Frontend)    │  │   (Backend)     │  │   (ML Engine)       │
│                 │  │                 │  │                     │
│   React App     │  │   NestJS API    │  │   FastAPI + Models  │
└─────────────────┘  └────────┬────────┘  └──────────┬──────────┘
                              │                      │
                              ▼                      │
                     ┌─────────────────┐            │
                     │   Railway       │◄───────────┘
                     │   (PostgreSQL)  │
                     │                 │
                     │   + Redis       │
                     └─────────────────┘
```

## 🔗 Service Communication

### Backend ↔ ML Engine
- REST API calls
- Request timeout: 30 seconds
- Retry with exponential backoff
- Circuit breaker for resilience

### Backend ↔ External APIs
- Yahoo Finance: Market data
- NewsAPI: News articles
- Resend: Email delivery

## 📈 Scalability Considerations

1. **Horizontal Scaling**: Each service can be scaled independently
2. **Database**: Connection pooling, read replicas if needed
3. **Caching**: Redis cluster for high availability
4. **ML Engine**: GPU instances for model training
5. **Queue**: Bull/Redis for background job processing
