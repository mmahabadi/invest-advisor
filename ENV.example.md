# Environment Variables

Copy these to your `.env` file and fill in the values.

## Backend Configuration

```bash
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invest_advisor

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend Email (https://resend.com)
RESEND_API_KEY=
EMAIL_FROM=alerts@invest-advisor.com
EMAIL_FROM_NAME=InvestAdvisor

# ML Engine
ML_ENGINE_URL=http://localhost:8000

# Finnhub API (https://finnhub.io/ - free tier available)
FINNHUB_API_KEY=

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173
```

## ML Engine Configuration

```bash
PYTHON_ENV=development

# News API (for sentiment analysis)
NEWS_API_KEY=
```

## Frontend Configuration

```bash
VITE_API_URL=http://localhost:3000/api/v1

# Google OAuth (get from https://console.cloud.google.com/apis/credentials)
# Create OAuth 2.0 Client ID for Web Application
# Add http://localhost:5173 to Authorized JavaScript origins
VITE_GOOGLE_CLIENT_ID=
```

## Production (Railway)

### Backend Service Variables

```bash
NODE_ENV=production
PORT=3000

# Database - Use Railway variable reference
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis - Use Railway variable reference
REDIS_URL=${{Redis.REDIS_URL}}

# JWT - Generate a secure random string (32+ chars)
JWT_SECRET=your-super-secure-production-jwt-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ML Engine - Use Railway internal URL or public domain
ML_ENGINE_URL=https://ml-engine-production.up.railway.app

# Frontend URL for CORS and email links
FRONTEND_URL=https://web-production.up.railway.app

# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=alerts@yourdomain.com
EMAIL_FROM_NAME=InvestAdvisor

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Finnhub API (https://finnhub.io/ - free tier available)
FINNHUB_API_KEY=your-finnhub-api-key
```

### ML Engine Service Variables

```bash
PYTHON_ENV=production
NEWS_API_KEY=your-news-api-key
```

### Web Service Build Arguments

```bash
# These are build-time variables for Vite
VITE_API_URL=https://backend-production.up.railway.app/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Railway Variable References

Railway supports referencing variables from other services:

```bash
# Reference PostgreSQL addon
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Reference Redis addon
REDIS_URL=${{Redis.REDIS_URL}}

# Reference another service's domain
ML_ENGINE_URL=https://${{ml-engine.RAILWAY_PUBLIC_DOMAIN}}
```
