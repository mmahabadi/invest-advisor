# Email Notification System

## 📧 Overview

The email system handles all user notifications including:
- Buy/sell alerts when targets are hit
- Daily portfolio summaries
- Weekly performance reports
- News alerts for tracked assets

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Scheduler     │────►│   Email Queue   │────►│   SendGrid     │
│   (Cron Jobs)   │     │   (PostgreSQL)  │     │   (Delivery)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Alert Checker  │     │  Email Worker   │
│  (Every 15 min) │     │  (Processes Q)  │
└─────────────────┘     └─────────────────┘
```

## 📬 Email Types

### 1. Buy Alert

**Trigger**: Watchlist item price reaches buy target
**Priority**: High (send immediately)

```html
Subject: 🟢 BUY ALERT: {{symbol}} reached target price!

Hi {{userName}},

Great news! {{assetName}} ({{symbol}}) has reached your target buy price.

═══════════════════════════════════════════════

📊 MARKET DATA
   Current Price:  ${{currentPrice}}
   Target Price:   ${{buyTarget}}
   Sell Target:    ${{sellTarget}} (+{{potentialGainPct}}%)
   
📈 ANALYSIS
   Confidence:     {{confidence}}%
   Recommendation: {{recommendation}}
   
   Key Factors:
   {{#each keyFactors}}
   • {{this}}
   {{/each}}

═══════════════════════════════════════════════

[View Full Analysis]  [Add to Portfolio]

---
This alert was generated based on your watchlist settings.
Manage your alerts: {{settingsUrl}}

InvestAdvisor
```

### 2. Sell Alert

**Trigger**: Portfolio item reaches sell target
**Priority**: High

```html
Subject: 🔴 SELL ALERT: {{symbol}} reached target!

Hi {{userName}},

{{assetName}} ({{symbol}}) in your portfolio has reached the sell target.

═══════════════════════════════════════════════

💰 YOUR POSITION
   Quantity:       {{quantity}}
   Avg Cost:       ${{avgCost}}
   Current Price:  ${{currentPrice}}
   
📊 PROFIT/LOSS
   Total Gain:     ${{profitLoss}} ({{profitLossPct}}%)
   
📈 RECOMMENDATION
   AI suggests:    {{recommendation}}
   Confidence:     {{confidence}}%
   
   {{analysisSummary}}

═══════════════════════════════════════════════

[View Position]  [Log Sale]

---
InvestAdvisor
```

### 3. Stop Loss Alert

**Trigger**: Portfolio item drops below stop loss
**Priority**: Critical

```html
Subject: ⚠️ STOP LOSS: {{symbol}} dropped below limit!

Hi {{userName}},

URGENT: {{assetName}} ({{symbol}}) has dropped below your stop loss level.

═══════════════════════════════════════════════

⚠️ ALERT DETAILS
   Current Price:  ${{currentPrice}}
   Stop Loss:      ${{stopLoss}}
   Drop:           {{dropPct}}%
   
💰 YOUR POSITION
   Quantity:       {{quantity}}
   Avg Cost:       ${{avgCost}}
   Current Loss:   -${{lossAmount}} ({{lossPct}}%)

═══════════════════════════════════════════════

Consider reviewing your position to limit further losses.

[View Position]  [Log Sale]

---
InvestAdvisor
```

### 4. Daily Summary

**Trigger**: Daily at user's preferred time (default 8 AM)
**Priority**: Normal

```html
Subject: 📊 Daily Summary - {{date}}

Hi {{userName}},

Here's your daily investment summary.

═══════════════════════════════════════════════

💼 PORTFOLIO OVERVIEW
   Total Value:    ${{totalValue}}
   Today's Change: {{todayChange}} ({{todayChangePct}}%)
   
   Top Performer:  {{topPerformer.symbol}} +{{topPerformer.changePct}}%
   Worst:          {{worstPerformer.symbol}} {{worstPerformer.changePct}}%

═══════════════════════════════════════════════

👀 WATCHLIST HIGHLIGHTS

{{#each watchlistAlerts}}
{{#if isBuyOpportunity}}
🟢 {{symbol}}: Near buy target (${{currentPrice}} vs ${{buyTarget}})
{{/if}}
{{/each}}

═══════════════════════════════════════════════

📰 NEWS SUMMARY

{{#each newsItems}}
• {{title}} ({{sentiment}})
{{/each}}

═══════════════════════════════════════════════

[View Dashboard]

---
InvestAdvisor
```

### 5. Weekly Report

**Trigger**: Weekly on Sunday
**Priority**: Normal

```html
Subject: 📈 Weekly Performance Report - Week {{weekNumber}}

Hi {{userName}},

Here's your weekly investment performance report.

═══════════════════════════════════════════════

📊 WEEKLY PERFORMANCE

Portfolio Value:     ${{endValue}}
Weekly Change:       {{weeklyChange}} ({{weeklyChangePct}}%)
YTD Performance:     {{ytdChangePct}}%

═══════════════════════════════════════════════

🏆 TOP PERFORMERS THIS WEEK

{{#each topPerformers}}
{{rank}}. {{symbol}} +{{changePct}}% (${{change}})
{{/each}}

═══════════════════════════════════════════════

📉 UNDERPERFORMERS

{{#each worstPerformers}}
{{rank}}. {{symbol}} {{changePct}}% (${{change}})
{{/each}}

═══════════════════════════════════════════════

🎯 AI RECOMMENDATIONS

{{#each recommendations}}
• {{symbol}}: {{action}} ({{confidence}}% confidence)
  {{reason}}
{{/each}}

═══════════════════════════════════════════════

[View Full Report]

---
InvestAdvisor
```

## 🔧 Implementation

### Email Service

```typescript
// src/email/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private config: ConfigService,
    private db: DatabaseService,
  ) {
    sgMail.setApiKey(this.config.get('SENDGRID_API_KEY'));
  }

  async queueEmail(params: QueueEmailParams): Promise<void> {
    const { userId, type, recipient, subject, html, text, priority = 0 } = params;

    await this.db.query(`
      INSERT INTO email_queue (user_id, email_type, recipient_email, subject, body_html, body_text, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, type, recipient, subject, html, text, priority]);

    this.logger.log(`Email queued: ${type} for ${recipient}`);
  }

  async processQueue(): Promise<void> {
    const pendingEmails = await this.db.query(`
      SELECT * FROM email_queue
      WHERE status = 'pending'
      AND attempts < 3
      ORDER BY priority DESC, created_at ASC
      LIMIT 50
    `);

    for (const email of pendingEmails.rows) {
      await this.sendEmail(email);
    }
  }

  private async sendEmail(email: EmailQueueItem): Promise<void> {
    try {
      await sgMail.send({
        to: email.recipient_email,
        from: {
          email: 'alerts@invest-advisor.com',
          name: 'InvestAdvisor',
        },
        subject: email.subject,
        html: email.body_html,
        text: email.body_text,
      });

      await this.db.query(`
        UPDATE email_queue
        SET status = 'sent', sent_at = NOW()
        WHERE id = $1
      `, [email.id]);

      this.logger.log(`Email sent: ${email.id}`);
    } catch (error) {
      await this.db.query(`
        UPDATE email_queue
        SET attempts = attempts + 1, 
            last_attempt_at = NOW(),
            error_message = $2
        WHERE id = $1
      `, [email.id, error.message]);

      this.logger.error(`Email failed: ${email.id}`, error);
    }
  }

  // Template methods
  async sendBuyAlert(params: BuyAlertParams): Promise<void> {
    const html = this.renderTemplate('buy-alert', params);
    
    await this.queueEmail({
      userId: params.userId,
      type: 'buy_alert',
      recipient: params.email,
      subject: `🟢 BUY ALERT: ${params.symbol} reached target price!`,
      html,
      priority: 10, // High priority
    });
  }

  async sendSellAlert(params: SellAlertParams): Promise<void> {
    const html = this.renderTemplate('sell-alert', params);
    
    await this.queueEmail({
      userId: params.userId,
      type: 'sell_alert',
      recipient: params.email,
      subject: `🔴 SELL ALERT: ${params.symbol} reached target!`,
      html,
      priority: 10,
    });
  }

  async sendDailySummary(params: DailySummaryParams): Promise<void> {
    const html = this.renderTemplate('daily-summary', params);
    
    await this.queueEmail({
      userId: params.userId,
      type: 'daily_summary',
      recipient: params.email,
      subject: `📊 Daily Summary - ${params.date}`,
      html,
      priority: 5,
    });
  }
}
```

### Alert Checker Scheduler

```typescript
// src/scheduler/alert-checker.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { MarketDataService } from '../market-data/market-data.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AlertCheckerService {
  private readonly logger = new Logger(AlertCheckerService.name);

  constructor(
    private db: DatabaseService,
    private marketData: MarketDataService,
    private emailService: EmailService,
  ) {}

  @Cron('*/15 * * * *') // Every 15 minutes
  async checkAlerts(): Promise<void> {
    this.logger.log('Starting alert check...');

    // Get all active alerts with current prices
    const alerts = await this.db.query(`
      SELECT 
        a.*,
        u.email,
        u.name as user_name,
        u.quiet_hours_start,
        u.quiet_hours_end,
        u.timezone,
        w.current_price,
        t.buy_target,
        t.sell_target,
        t.stop_loss,
        t.confidence,
        t.recommendation,
        t.analysis_summary,
        t.key_factors
      FROM alerts a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN watchlist_items w ON w.id = a.watchlist_item_id
      LEFT JOIN target_prices t ON t.watchlist_item_id = w.id
      WHERE a.is_active = TRUE
    `);

    for (const alert of alerts.rows) {
      await this.processAlert(alert);
    }

    this.logger.log(`Alert check complete. Processed ${alerts.rows.length} alerts.`);
  }

  private async processAlert(alert: AlertWithData): Promise<void> {
    // Check quiet hours
    if (this.isInQuietHours(alert)) {
      return;
    }

    // Get current price if not cached
    let currentPrice = alert.current_price;
    if (!currentPrice || this.isPriceStale(alert)) {
      currentPrice = await this.marketData.getPrice(alert.symbol);
    }

    // Check if alert condition is met
    const isTriggered = this.checkCondition(alert, currentPrice);

    if (isTriggered) {
      await this.triggerAlert(alert, currentPrice);
    }
  }

  private checkCondition(alert: AlertWithData, price: number): boolean {
    switch (alert.alert_type) {
      case 'price_below':
        return price <= alert.target_price;
      case 'price_above':
        return price >= alert.target_price;
      case 'buy_target':
        return price <= alert.buy_target;
      case 'sell_target':
        return price >= alert.sell_target;
      case 'stop_loss':
        return price <= alert.stop_loss;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: AlertWithData, currentPrice: number): Promise<void> {
    // Log to history
    await this.db.query(`
      INSERT INTO alert_history 
        (alert_id, user_id, symbol, alert_type, triggered_at, price_at_trigger, target_price)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    `, [alert.id, alert.user_id, alert.symbol, alert.alert_type, currentPrice, alert.target_price]);

    // Send email based on type
    if (alert.alert_type === 'buy_target') {
      await this.emailService.sendBuyAlert({
        userId: alert.user_id,
        email: alert.email,
        userName: alert.user_name,
        symbol: alert.symbol,
        currentPrice,
        buyTarget: alert.buy_target,
        sellTarget: alert.sell_target,
        confidence: alert.confidence,
        recommendation: alert.recommendation,
        keyFactors: alert.key_factors,
      });
    } else if (alert.alert_type === 'sell_target' || alert.alert_type === 'stop_loss') {
      await this.emailService.sendSellAlert({
        userId: alert.user_id,
        email: alert.email,
        userName: alert.user_name,
        symbol: alert.symbol,
        currentPrice,
        alertType: alert.alert_type,
      });
    }

    // Deactivate non-recurring alerts
    if (!alert.is_recurring) {
      await this.db.query(`
        UPDATE alerts SET is_active = FALSE, last_triggered_at = NOW()
        WHERE id = $1
      `, [alert.id]);
    }

    this.logger.log(`Alert triggered: ${alert.alert_type} for ${alert.symbol}`);
  }

  private isInQuietHours(alert: AlertWithData): boolean {
    if (!alert.quiet_hours_start || !alert.quiet_hours_end) {
      return false;
    }
    // Implementation based on user's timezone
    // ...
    return false;
  }
}
```

### Daily Summary Scheduler

```typescript
// src/scheduler/daily-summary.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DailySummaryService {
  @Cron('0 8 * * *') // Every day at 8 AM UTC
  async generateDailySummaries(): Promise<void> {
    // Get users who want daily summaries
    const users = await this.db.query(`
      SELECT * FROM users
      WHERE daily_summary = TRUE
      AND email_verified = TRUE
    `);

    for (const user of users.rows) {
      await this.generateSummaryForUser(user);
    }
  }

  private async generateSummaryForUser(user: User): Promise<void> {
    // Get portfolio summary
    const portfolio = await this.portfolioService.getSummary(user.id);
    
    // Get watchlist highlights
    const watchlist = await this.watchlistService.getHighlights(user.id);
    
    // Get relevant news
    const symbols = [...portfolio.symbols, ...watchlist.symbols];
    const news = await this.newsService.getForSymbols(symbols, 5);
    
    // Send email
    await this.emailService.sendDailySummary({
      userId: user.id,
      email: user.email,
      userName: user.name,
      date: new Date().toLocaleDateString(),
      portfolio,
      watchlist,
      news,
    });
  }
}
```

## 📋 Email Templates

Store templates in `src/email/templates/`:

```
templates/
├── buy-alert.hbs
├── sell-alert.hbs
├── stop-loss-alert.hbs
├── daily-summary.hbs
├── weekly-report.hbs
├── welcome.hbs
├── password-reset.hbs
└── layouts/
    └── base.hbs
```

### Base Layout

```handlebars
<!-- templates/layouts/base.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background-color: #f7fafc;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1a365d;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #1a365d;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 5px;
    }
    .positive { color: #38a169; }
    .negative { color: #e53e3e; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #718096;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📈 InvestAdvisor</div>
    </div>
    
    {{{body}}}
    
    <div class="footer">
      <p>You received this email because you have alerts enabled.</p>
      <p><a href="{{settingsUrl}}">Manage preferences</a> | <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
      <p>© 2026 InvestAdvisor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

## ⚙️ Configuration

```typescript
// Environment variables for email service

EMAIL_FROM=alerts@invest-advisor.com
EMAIL_FROM_NAME=InvestAdvisor
SENDGRID_API_KEY=SG.xxxxx

// Scheduling
DAILY_SUMMARY_HOUR=8  // 8 AM UTC
WEEKLY_REPORT_DAY=0   // Sunday
ALERT_CHECK_INTERVAL=15  // minutes
```

## 📊 Monitoring

Track email metrics:

```sql
-- Email delivery stats
SELECT 
  email_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_send_time
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY email_type, status;

-- Failed emails
SELECT * FROM email_queue
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours';
```
