# Technology Stack

## 🏗️ Overview

InvestAdvisor is built as a modern microservices application with three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + Vite | User interface |
| Backend | NestJS | REST API & business logic |
| ML Engine | FastAPI + Python | AI/ML predictions |
| Database | PostgreSQL | Data persistence |
| Cache | Redis | Caching & queues |

## 🖥️ Frontend (apps/web)

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Styling |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Data fetching & caching |
| Zustand | 4.x | State management |
| Recharts | 2.x | Charts & visualizations |

### Key Libraries

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.5",
    "recharts": "^2.10.3",
    "date-fns": "^3.2.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.303.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "tailwindcss": "^3.4.1",
    "@types/react": "^18.2.47",
    "eslint": "^8.56.0",
    "prettier": "^3.2.2"
  }
}
```

### Project Structure

```
apps/web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base components (Button, Card, etc.)
│   │   ├── charts/          # Chart components
│   │   └── layout/          # Layout components
│   ├── pages/               # Route pages
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API service layer
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   └── styles/              # Global styles
├── public/                  # Static assets
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🔧 Backend (apps/backend)

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.x | Node.js framework |
| TypeScript | 5.x | Type safety |
| PostgreSQL | 16.x | Database |
| Redis | 7.x | Caching |
| Passport | 0.7.x | Authentication |
| Bull | 5.x | Job queue |

### Key Libraries

```json
{
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/bull": "^10.1.0",
    "passport-jwt": "^4.0.1",
    "passport-google-oauth20": "^2.0.0",
    "pg": "^8.11.3",
    "redis": "^4.6.12",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "@sendgrid/mail": "^8.1.0",
    "axios": "^1.6.5",
    "handlebars": "^4.7.8"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.2.1",
    "@nestjs/testing": "^10.3.0",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

### Project Structure

```
apps/backend/
├── src/
│   ├── auth/                # Authentication module
│   ├── users/               # User management
│   ├── portfolio/           # Portfolio operations
│   ├── watchlist/           # Watchlist management
│   ├── alerts/              # Alert system
│   ├── market-data/         # Market data fetching
│   ├── predictions/         # ML Engine communication
│   ├── email/               # Email service
│   ├── scheduler/           # Cron jobs
│   ├── common/              # Shared utilities
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── decorators/
│   │   └── interceptors/
│   ├── database/            # Database module
│   ├── app.module.ts
│   └── main.ts
├── test/                    # E2E tests
├── nest-cli.json
├── tsconfig.json
└── Dockerfile
```

## 🧠 ML Engine (apps/ml-engine)

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11.x | Language |
| FastAPI | 0.109.x | API framework |
| Pandas | 2.1.x | Data manipulation |
| NumPy | 1.26.x | Numerical computing |
| Scikit-learn | 1.4.x | ML algorithms |
| TensorFlow | 2.15.x | Deep learning |
| Transformers | 4.36.x | NLP/Sentiment |

### Key Libraries

```txt
# requirements.txt

# API
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
python-multipart==0.0.6

# Data Processing
pandas==2.1.4
numpy==1.26.3
scipy==1.11.4

# Machine Learning
scikit-learn==1.4.0
tensorflow==2.15.0
keras==2.15.0
xgboost==2.0.3

# Technical Analysis
ta==0.11.0
yfinance==0.2.35

# NLP / Sentiment
transformers==4.36.2
torch==2.1.2
sentencepiece==0.1.99

# Utilities
httpx==0.26.0
redis==5.0.1
python-dotenv==1.0.0
joblib==1.3.2

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
```

### Project Structure

```
apps/ml-engine/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── api/
│   │   ├── routes/          # API endpoints
│   │   └── deps.py          # Dependencies
│   ├── services/
│   │   ├── market_data.py   # Data fetching
│   │   ├── technical.py     # Technical analysis
│   │   ├── prediction.py    # ML predictions
│   │   ├── sentiment.py     # Sentiment analysis
│   │   └── signals.py       # Signal generation
│   ├── models/              # ML model classes
│   ├── utils/               # Utilities
│   └── schemas/             # Pydantic schemas
├── models/                  # Trained model files
├── tests/
├── requirements.txt
└── Dockerfile
```

## 🗄️ Database (PostgreSQL)

### Configuration

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: invest_advisor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

### Extensions

```sql
-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Encryption
```

## 📦 Cache (Redis)

### Usage

| Use Case | TTL | Description |
|----------|-----|-------------|
| Market data | 5 min | Real-time price cache |
| Technical indicators | 1 hour | Calculated indicators |
| ML predictions | 4 hours | Generated predictions |
| Rate limiting | 1 min | API rate limits |
| Session data | 7 days | User sessions |

### Configuration

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
```

## 🌐 External APIs

### Yahoo Finance

| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| Quote | Current price | 100/min |
| History | Historical data | 100/min |
| Search | Symbol search | 60/min |

```python
import yfinance as yf

# Get stock data
ticker = yf.Ticker("AAPL")
history = ticker.history(period="1mo")
info = ticker.info
```

### NewsAPI (Optional)

```typescript
// News API for sentiment analysis
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

async function getNews(symbol: string) {
  const response = await axios.get(NEWS_API_URL, {
    params: {
      q: symbol,
      apiKey: NEWS_API_KEY,
      pageSize: 10,
      sortBy: 'publishedAt',
    },
  });
  return response.data.articles;
}
```

### SendGrid (Email)

```typescript
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: 'user@example.com',
  from: 'alerts@invest-advisor.com',
  subject: 'Buy Alert',
  html: '<p>...</p>',
});
```

## 🐳 Docker

### Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./apps/backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/invest_advisor
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  ml-engine:
    build: ./apps/ml-engine
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379

  frontend:
    build: ./apps/web
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 🚀 Deployment

### Production Stack

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | invest-advisor.com |
| Backend | Railway | api.invest-advisor.com |
| ML Engine | Railway | ml.invest-advisor.com |
| Database | Railway | PostgreSQL managed |
| Cache | Railway | Redis managed |
| DNS/CDN | Cloudflare | - |

### Environment Variables

```bash
# Backend
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=xxx
SENDGRID_API_KEY=xxx
ML_ENGINE_URL=https://ml.invest-advisor.com
FRONTEND_URL=https://invest-advisor.com

# ML Engine
PYTHON_ENV=production
REDIS_URL=redis://...
NEWS_API_KEY=xxx

# Frontend
VITE_API_URL=https://api.invest-advisor.com
VITE_GOOGLE_CLIENT_ID=xxx
```

## 🧪 Testing

### Backend (Jest)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### ML Engine (Pytest)

```bash
# Run tests
pytest

# With coverage
pytest --cov=app
```

### Frontend (Vitest)

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch
```

## 📊 Monitoring

### Recommended Tools

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking |
| Prometheus + Grafana | Metrics |
| LogTail | Log aggregation |
| Uptime Robot | Uptime monitoring |

### Health Checks

```typescript
// Backend health endpoint
GET /api/v1/health

{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok",
    "mlEngine": "ok"
  }
}
```
