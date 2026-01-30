# API Design

## 🌐 Base URL

```
Production: https://api.invest-advisor.com/api/v1
Development: http://localhost:3000/api/v1
```

## 🔐 Authentication

All endpoints except `/auth/*` and `/health` require authentication.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Token Flow**:
1. Login → Get access_token (15 min) + refresh_token (7 days)
2. Access token expires → Use refresh endpoint
3. Refresh token expires → Re-login required

---

## 📚 API Endpoints

### Health Check

```
GET /health
```

**Response** `200 OK`:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T10:00:00Z",
  "services": {
    "database": "ok",
    "mlEngine": "ok",
    "redis": "ok"
  }
}
```

---

### Authentication

#### Register

```
POST /auth/register
```

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response** `201 Created`:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### Login

```
POST /auth/login
```

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** `200 OK`:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### Google OAuth

```
POST /auth/google
```

**Request**:
```json
{
  "credential": "google_id_token"
}
```

#### Refresh Token

```
POST /auth/refresh
```

**Request**:
```json
{
  "refreshToken": "eyJ..."
}
```

**Response** `200 OK`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### Get Profile

```
GET /auth/profile
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "currency": "USD",
  "timezone": "America/New_York",
  "emailNotifications": true
}
```

---

### Portfolio

#### Get Portfolio

```
GET /portfolio
```

**Query Parameters**:
- `sort`: `value` | `profit` | `name` | `date` (default: `value`)
- `order`: `asc` | `desc` (default: `desc`)

**Response** `200 OK`:
```json
{
  "summary": {
    "totalInvested": 10000.00,
    "currentValue": 12500.00,
    "profitLoss": 2500.00,
    "profitLossPct": 25.00,
    "todayChange": 150.00,
    "todayChangePct": 1.21
  },
  "items": [
    {
      "id": "uuid",
      "symbol": "AAPL",
      "assetType": "stock",
      "assetName": "Apple Inc.",
      "quantity": 10,
      "avgCost": 150.00,
      "totalCost": 1500.00,
      "currentPrice": 175.50,
      "currentValue": 1755.00,
      "profitLoss": 255.00,
      "profitLossPct": 17.00,
      "lastPriceUpdate": "2026-01-30T10:00:00Z"
    }
  ]
}
```

#### Add Portfolio Item

```
POST /portfolio
```

**Request**:
```json
{
  "symbol": "AAPL",
  "assetType": "stock",
  "quantity": 10,
  "price": 150.00,
  "purchaseDate": "2026-01-15",
  "fees": 1.00,
  "notes": "First purchase"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "symbol": "AAPL",
  "assetType": "stock",
  "assetName": "Apple Inc.",
  "quantity": 10,
  "avgCost": 150.00,
  "totalCost": 1500.00,
  "currentPrice": 175.50,
  "currentValue": 1755.00
}
```

#### Get Portfolio Item

```
GET /portfolio/:id
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "symbol": "AAPL",
  "assetType": "stock",
  "assetName": "Apple Inc.",
  "quantity": 10,
  "avgCost": 150.00,
  "totalCost": 1500.00,
  "currentPrice": 175.50,
  "currentValue": 1755.00,
  "profitLoss": 255.00,
  "profitLossPct": 17.00,
  "transactions": [
    {
      "id": "uuid",
      "type": "buy",
      "quantity": 10,
      "price": 150.00,
      "date": "2026-01-15",
      "fees": 1.00
    }
  ],
  "aiRecommendation": {
    "action": "hold",
    "targetSell": 195.00,
    "stopLoss": 160.00,
    "confidence": 75,
    "reasoning": "Strong uptrend, wait for resistance test"
  }
}
```

#### Add Transaction (Buy More / Sell)

```
POST /portfolio/:id/transactions
```

**Request**:
```json
{
  "type": "buy",
  "quantity": 5,
  "price": 170.00,
  "date": "2026-01-30",
  "fees": 0.50,
  "notes": "Averaging up"
}
```

#### Update Portfolio Item

```
PUT /portfolio/:id
```

**Request**:
```json
{
  "notes": "Long term hold",
  "color": "#4CAF50"
}
```

#### Delete Portfolio Item

```
DELETE /portfolio/:id
```

**Response** `204 No Content`

---

### Watchlist

#### Get Watchlist

```
GET /watchlist
```

**Query Parameters**:
- `sort`: `confidence` | `recommendation` | `potential` | `added` (default: `confidence`)
- `order`: `asc` | `desc` (default: `desc`)
- `filter`: `strong_buy` | `buy` | `hold` | `avoid` (optional)

**Response** `200 OK`:
```json
{
  "items": [
    {
      "id": "uuid",
      "symbol": "NVDA",
      "assetType": "stock",
      "assetName": "NVIDIA Corporation",
      "currentPrice": 875.50,
      "priceChange24h": 12.30,
      "priceChangePct24h": 1.42,
      "addedAt": "2026-01-20T10:00:00Z",
      "targetPrice": {
        "buyTarget": 820.00,
        "sellTarget": 950.00,
        "stopLoss": 780.00,
        "confidence": 82,
        "recommendation": "buy",
        "timeHorizon": "medium",
        "riskLevel": "medium",
        "analysisSummary": "Strong momentum with AI sector growth",
        "keyFactors": [
          "RSI at 45 (neutral)",
          "Above 50-day MA",
          "Positive earnings surprise",
          "High institutional buying"
        ],
        "generatedAt": "2026-01-30T06:00:00Z",
        "validUntil": "2026-01-30T18:00:00Z"
      },
      "distanceToBuyPct": 6.34
    }
  ]
}
```

#### Add to Watchlist

```
POST /watchlist
```

**Request**:
```json
{
  "symbol": "NVDA",
  "assetType": "stock",
  "notes": "Interested in AI growth"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "symbol": "NVDA",
  "assetType": "stock",
  "assetName": "NVIDIA Corporation",
  "currentPrice": 875.50,
  "targetPrice": null,
  "message": "Added to watchlist. Target prices will be generated within 1 hour."
}
```

#### Get Watchlist Item

```
GET /watchlist/:id
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "symbol": "NVDA",
  "assetType": "stock",
  "assetName": "NVIDIA Corporation",
  "currentPrice": 875.50,
  "priceHistory": {
    "1d": [...],
    "1w": [...],
    "1m": [...],
    "3m": [...]
  },
  "targetPrice": {
    "buyTarget": 820.00,
    "sellTarget": 950.00,
    "confidence": 82,
    "recommendation": "buy",
    "technicalIndicators": {
      "rsi": 45.2,
      "macd": "bullish",
      "trend": "uptrend",
      "support": 800.00,
      "resistance": 920.00,
      "movingAverages": {
        "ma20": 860.00,
        "ma50": 840.00,
        "ma200": 750.00
      }
    },
    "sentiment": {
      "overall": "positive",
      "score": 0.65,
      "recentNews": [
        {
          "title": "NVIDIA Reports Record Revenue",
          "sentiment": "positive",
          "source": "Reuters",
          "url": "https://...",
          "publishedAt": "2026-01-29T14:00:00Z"
        }
      ]
    }
  }
}
```

#### Refresh Analysis

```
POST /watchlist/:id/analyze
```

**Response** `200 OK`:
```json
{
  "message": "Analysis queued",
  "estimatedCompletion": "2026-01-30T10:05:00Z"
}
```

#### Remove from Watchlist

```
DELETE /watchlist/:id
```

**Response** `204 No Content`

---

### Alerts

#### Get Alerts

```
GET /alerts
```

**Query Parameters**:
- `status`: `active` | `triggered` | `all` (default: `active`)

**Response** `200 OK`:
```json
{
  "alerts": [
    {
      "id": "uuid",
      "symbol": "AAPL",
      "alertType": "price_below",
      "targetPrice": 170.00,
      "currentPrice": 175.50,
      "isActive": true,
      "isRecurring": false,
      "createdAt": "2026-01-25T10:00:00Z"
    }
  ]
}
```

#### Create Alert

```
POST /alerts
```

**Request**:
```json
{
  "symbol": "AAPL",
  "alertType": "price_below",
  "targetPrice": 170.00,
  "isRecurring": false
}
```

#### Update Alert

```
PUT /alerts/:id
```

**Request**:
```json
{
  "targetPrice": 165.00,
  "isActive": true
}
```

#### Delete Alert

```
DELETE /alerts/:id
```

**Response** `204 No Content`

#### Get Alert History

```
GET /alerts/history
```

**Query Parameters**:
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response** `200 OK`:
```json
{
  "history": [
    {
      "id": "uuid",
      "symbol": "NVDA",
      "alertType": "buy_target",
      "triggeredAt": "2026-01-29T14:30:00Z",
      "priceAtTrigger": 819.50,
      "targetPrice": 820.00,
      "emailSent": true,
      "acknowledged": true,
      "actionTaken": "bought"
    }
  ],
  "total": 15
}
```

---

### Market Data

#### Get Market Overview

```
GET /market/overview
```

**Response** `200 OK`:
```json
{
  "indices": {
    "sp500": { "value": 5050.25, "change": 0.85, "changePct": 0.45 },
    "nasdaq": { "value": 15800.50, "change": 120.30, "changePct": 0.77 },
    "dow": { "value": 38500.00, "change": -50.25, "changePct": -0.13 }
  },
  "crypto": {
    "btc": { "price": 45000.00, "change24h": 2.5 },
    "eth": { "price": 2500.00, "change24h": 3.2 }
  },
  "commodities": {
    "gold": { "price": 2050.00, "change": 0.8 },
    "silver": { "price": 24.50, "change": 1.2 }
  },
  "marketStatus": "open",
  "lastUpdated": "2026-01-30T10:00:00Z"
}
```

#### Search Symbol

```
GET /market/search?q=apple
```

**Response** `200 OK`:
```json
{
  "results": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "type": "stock",
      "exchange": "NASDAQ"
    }
  ]
}
```

#### Get Quote

```
GET /market/quote/:symbol
```

**Response** `200 OK`:
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 175.50,
  "change": 2.30,
  "changePct": 1.33,
  "open": 173.20,
  "high": 176.00,
  "low": 172.80,
  "volume": 45000000,
  "marketCap": 2750000000000,
  "pe": 28.5,
  "lastUpdated": "2026-01-30T10:00:00Z"
}
```

#### Get Price History

```
GET /market/history/:symbol
```

**Query Parameters**:
- `range`: `1d` | `1w` | `1m` | `3m` | `1y` | `5y` (default: `1m`)
- `interval`: `5m` | `15m` | `1h` | `1d` (default: auto based on range)

**Response** `200 OK`:
```json
{
  "symbol": "AAPL",
  "range": "1m",
  "interval": "1d",
  "data": [
    {
      "timestamp": "2026-01-01T00:00:00Z",
      "open": 170.00,
      "high": 172.00,
      "low": 169.50,
      "close": 171.50,
      "volume": 40000000
    }
  ]
}
```

---

### Settings

#### Get Settings

```
GET /settings
```

**Response** `200 OK`:
```json
{
  "currency": "USD",
  "timezone": "America/New_York",
  "theme": "dark",
  "notifications": {
    "email": true,
    "dailySummary": true,
    "weeklySummary": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "minConfidenceAlert": 70
  }
}
```

#### Update Settings

```
PUT /settings
```

**Request**:
```json
{
  "currency": "EUR",
  "timezone": "Europe/London",
  "notifications": {
    "minConfidenceAlert": 80
  }
}
```

---

## ❌ Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2026-01-30T10:00:00Z"
}
```

**Common Status Codes**:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 📊 Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 requests/minute |
| Read operations | 100 requests/minute |
| Write operations | 30 requests/minute |
| Market data | 60 requests/minute |

When rate limited, response includes:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706612400
```
