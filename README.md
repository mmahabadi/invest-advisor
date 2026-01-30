# InvestAdvisor 📈

An intelligent investment advisor application that monitors markets, analyzes trends, predicts opportunities, and sends email alerts for buy/sell signals.

## 🎯 Overview

InvestAdvisor is a comprehensive investment management platform that helps users:

- **Track Portfolio**: Manually log your investments and track their performance
- **Monitor Watchlist**: Add assets to watchlist and get AI-generated target prices
- **Market Analysis**: Real-time market monitoring with technical and fundamental analysis
- **Smart Predictions**: ML-powered price predictions and buy/sell recommendations
- **Email Alerts**: Automated notifications when opportunities arise

## 🏗️ Project Structure

```
invest-advisor/
├── docs/                      # Comprehensive documentation
│   ├── architecture.md        # System architecture
│   ├── features.md            # Feature specifications
│   ├── data-model.md          # Database schema
│   ├── api-design.md          # API documentation
│   ├── ml-engine.md           # ML/AI engine details
│   ├── email-system.md        # Email notification system
│   ├── tech-stack.md          # Technology stack
│   ├── roadmap.md             # Development roadmap
│   └── ai-instructions.md     # Instructions for AI assistants
│
├── apps/
│   ├── backend/               # NestJS REST API
│   ├── web/                   # React Frontend (Vite)
│   └── ml-engine/             # Python ML Service (FastAPI)
│
├── libs/
│   ├── shared-types/          # TypeScript type definitions
│   └── utils/                 # Shared utilities
│
└── package.json               # Root package configuration
```

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/invest-advisor.git
cd invest-advisor

# Install dependencies
npm install

# Start development servers
npm run dev
```

## 📚 Documentation

For detailed information, see the [docs](./docs/) folder:

- [Architecture](./docs/architecture.md) - System design and components
- [Features](./docs/features.md) - Complete feature list
- [Data Model](./docs/data-model.md) - Database schema
- [API Design](./docs/api-design.md) - REST API endpoints
- [ML Engine](./docs/ml-engine.md) - Machine learning components
- [Tech Stack](./docs/tech-stack.md) - Technologies used
- [Roadmap](./docs/roadmap.md) - Development phases

## 🔑 Key Features

### 1. Portfolio Management
- Manual entry of bought assets (stocks, ETFs, crypto, gold)
- Track purchase price, quantity, and date
- Real-time profit/loss calculation
- Portfolio performance analytics

### 2. Intelligent Watchlist
- Add assets you're interested in
- **AI-generated target prices** (buy/sell points)
- Technical analysis indicators (RSI, MACD, Moving Averages)
- Sentiment analysis from news

### 3. Market Monitoring
- Real-time price tracking via Yahoo Finance API
- News aggregation and sentiment analysis
- Market trend detection
- Sector analysis

### 4. ML-Powered Predictions
- Price prediction models (LSTM, Random Forest)
- Buy/Sell signal generation
- Risk assessment
- Confidence scoring

### 5. Email Notifications
- Buy signals when watchlist items hit target
- Sell alerts for portfolio items
- Daily/weekly market summaries
- Custom alert rules

## 📧 Contact

For questions or support, please open an issue on GitHub.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.
