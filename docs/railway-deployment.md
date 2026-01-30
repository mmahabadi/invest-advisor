# Railway Deployment Guide

This guide explains how to deploy InvestAdvisor to Railway.

## Prerequisites

1. A [Railway](https://railway.app) account
2. Railway CLI installed (optional): `npm install -g @railway/cli`
3. Your repository pushed to GitHub

## Architecture on Railway

The application consists of 4 services:

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway Project                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web       │  │   Backend   │  │     ML Engine       │ │
│  │   (React)   │  │   (NestJS)  │  │     (FastAPI)       │ │
│  │   :8080     │  │   :3000     │  │     :8000           │ │
│  └─────────────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         │                ▼                     │            │
│         │         ┌─────────────┐              │            │
│         │         │  PostgreSQL │◄─────────────┘            │
│         │         │  (Database) │                           │
│         │         └─────────────┘                           │
│         │                │                                  │
│         │                ▼                                  │
│         │         ┌─────────────┐                           │
│         └────────►│    Redis    │                           │
│                   │   (Cache)   │                           │
│                   └─────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Option 1: Railway Dashboard (Recommended)

1. **Create a New Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Add PostgreSQL**
   - In your project, click "New" → "Database" → "PostgreSQL"
   - Railway will automatically create the `DATABASE_URL` variable

3. **Add Redis**
   - Click "New" → "Database" → "Redis"
   - Railway will automatically create the `REDIS_URL` variable

4. **Create Backend Service**
   - Click "New" → "GitHub Repo" → Select your repo
   - Set **Root Directory**: `apps/backend`
   - Add environment variables (see below)
   - Railway will detect the Dockerfile and build

5. **Create ML Engine Service**
   - Click "New" → "GitHub Repo" → Select your repo
   - Set **Root Directory**: `apps/ml-engine`
   - Add environment variables (see below)

6. **Create Web Service**
   - Click "New" → "GitHub Repo" → Select your repo
   - Set **Root Directory**: `apps/web`
   - Add build arguments for environment variables

7. **Generate Domains**
   - For each service, go to Settings → Networking → Generate Domain
   - Note down the URLs for configuration

### Option 2: Railway CLI

```bash
# Login to Railway
railway login

# Create a new project
railway init

# Link to existing project (if already created)
railway link

# Deploy backend
cd apps/backend
railway up

# Deploy ml-engine
cd ../ml-engine
railway up

# Deploy web
cd ../web
railway up
```

## Environment Variables

### Backend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL URL | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | Redis URL | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` | JWT signing secret | Generate a secure random string |
| `JWT_EXPIRES_IN` | Token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `ML_ENGINE_URL` | ML Engine URL | `https://ml-engine-xxx.railway.app` |
| `FRONTEND_URL` | Frontend URL | `https://web-xxx.railway.app` |
| `RESEND_API_KEY` | Resend API key | `re_xxxxx` |
| `EMAIL_FROM` | Sender email | `alerts@yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | From Google Cloud Console |

### ML Engine Service

| Variable | Description | Example |
|----------|-------------|---------|
| `PYTHON_ENV` | Environment | `production` |
| `NEWS_API_KEY` | NewsAPI key | From newsapi.org |

### Web Service (Build Arguments)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend-xxx.railway.app/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |

## Setting Railway Variables with References

Railway supports variable references between services:

```bash
# In Backend service, reference PostgreSQL
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Reference Redis
REDIS_URL=${{Redis.REDIS_URL}}

# Reference other services (after getting their domains)
ML_ENGINE_URL=https://${{ml-engine.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
```

## Database Migration

After deploying the backend, run the database migration:

1. Go to Backend service in Railway
2. Open the "Shell" tab
3. Run:
   ```bash
   npx ts-node -r tsconfig-paths/register src/database/migrate.ts
   ```

Or create a migration script in package.json and run via Railway:
```bash
railway run npm run db:migrate
```

## Custom Domain Setup

1. Go to your service in Railway
2. Settings → Networking → Custom Domain
3. Add your domain (e.g., `api.invest-advisor.com`)
4. Configure DNS:
   - Add a CNAME record pointing to `railway.app`

## Monitoring & Logs

- View logs: Railway Dashboard → Service → Logs
- Metrics: Railway Dashboard → Service → Metrics
- Set up alerts in Railway for deployment failures

## Troubleshooting

### Build Failures

1. Check the build logs in Railway
2. Ensure Dockerfile is correct
3. Verify all dependencies are listed

### Connection Issues

1. Verify environment variables are set correctly
2. Check service URLs are accessible
3. Ensure CORS is configured for your domain

### Database Issues

1. Check PostgreSQL is running
2. Verify `DATABASE_URL` is correctly referenced
3. Check migration has been run

## Cost Optimization

- Railway offers a free tier with limited resources
- For production, consider:
  - Team plan for more resources
  - Scaling replicas based on traffic
  - Using Railway's sleep feature for dev environments

## Security Checklist

- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Enable HTTPS (automatic on Railway)
- [ ] Set proper CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting in production
- [ ] Set up proper Google OAuth redirect URIs
