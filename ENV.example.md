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

# SendGrid Email
SENDGRID_API_KEY=

# ML Engine
ML_ENGINE_URL=http://localhost:8000

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
VITE_GOOGLE_CLIENT_ID=
```

## Production (Railway/Vercel)

Set these in your deployment platform:

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=production-secret
SENDGRID_API_KEY=SG.xxx
ML_ENGINE_URL=https://ml.invest-advisor.com
FRONTEND_URL=https://invest-advisor.com
```
