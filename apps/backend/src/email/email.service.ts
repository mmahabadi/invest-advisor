import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as Handlebars from 'handlebars';
import { DatabaseService } from '../database/database.module';

interface QueueEmailParams {
  userId: string;
  type: string;
  recipient: string;
  subject: string;
  html: string;
  text?: string;
  priority?: number;
}

interface BuyAlertParams {
  userId: string;
  email: string;
  userName: string;
  symbol: string;
  assetName?: string;
  currentPrice: number;
  buyTarget: number;
  sellTarget: number;
  confidence: number;
  recommendation: string;
  keyFactors: string[];
}

interface SellAlertParams {
  userId: string;
  email: string;
  userName: string;
  symbol: string;
  currentPrice: number;
  alertType: string;
  quantity?: number;
  avgCost?: number;
  profitLoss?: number;
  profitLossPct?: number;
}

interface DailySummaryParams {
  userId: string;
  email: string;
  userName: string;
  date: string;
  portfolio: {
    totalValue: number;
    todayChange: number;
    todayChangePct: number;
    topPerformer?: { symbol: string; changePct: number };
    worstPerformer?: { symbol: string; changePct: number };
  };
  watchlistAlerts: Array<{
    symbol: string;
    currentPrice: number;
    buyTarget: number;
    isBuyOpportunity: boolean;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor(
    private configService: ConfigService,
    @Inject('DatabaseService') private db: DatabaseService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'alerts@invest-advisor.com');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'InvestAdvisor');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  async queueEmail(params: QueueEmailParams): Promise<void> {
    await this.db.query(
      `INSERT INTO email_queue (user_id, email_type, recipient_email, subject, body_html, body_text, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId,
        params.type,
        params.recipient,
        params.subject,
        params.html,
        params.text || null,
        params.priority || 0,
      ],
    );

    this.logger.log(`Email queued: ${params.type} for ${params.recipient}`);
  }

  async processQueue(): Promise<number> {
    const pendingEmails = await this.db.query(
      `SELECT * FROM email_queue
       WHERE status = 'pending'
       AND attempts < 3
       ORDER BY priority DESC, created_at ASC
       LIMIT 50`,
    );

    let sent = 0;
    for (const email of pendingEmails.rows) {
      const success = await this.sendEmail(email);
      if (success) sent++;
    }

    return sent;
  }

  private async sendEmail(email: any): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email.recipient_email,
        subject: email.subject,
        html: email.body_html,
        text: email.body_text || undefined,
      });

      await this.db.query(
        `UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [email.id],
      );

      this.logger.log(`Email sent: ${email.id}`);
      return true;
    } catch (error: any) {
      await this.db.query(
        `UPDATE email_queue 
         SET attempts = attempts + 1, last_attempt_at = NOW(), error_message = $2
         WHERE id = $1`,
        [email.id, error.message],
      );

      this.logger.error(`Email failed: ${email.id}`, error.message);
      return false;
    }
  }

  async sendBuyAlert(params: BuyAlertParams): Promise<void> {
    const potentialGainPct = ((params.sellTarget - params.currentPrice) / params.currentPrice) * 100;

    const html = this.renderBuyAlertTemplate({
      ...params,
      potentialGainPct: Math.round(potentialGainPct * 100) / 100,
      viewAnalysisUrl: `${this.frontendUrl}/watchlist`,
      addToPortfolioUrl: `${this.frontendUrl}/portfolio/add?symbol=${params.symbol}`,
      settingsUrl: `${this.frontendUrl}/settings`,
    });

    await this.queueEmail({
      userId: params.userId,
      type: 'buy_alert',
      recipient: params.email,
      subject: `🟢 BUY ALERT: ${params.symbol} reached target price!`,
      html,
      priority: 10,
    });
  }

  async sendSellAlert(params: SellAlertParams): Promise<void> {
    const html = this.renderSellAlertTemplate({
      ...params,
      viewPositionUrl: `${this.frontendUrl}/portfolio`,
      settingsUrl: `${this.frontendUrl}/settings`,
    });

    const emoji = params.alertType === 'stop_loss' ? '⚠️' : '🔴';
    const alertLabel = params.alertType === 'stop_loss' ? 'STOP LOSS' : 'SELL ALERT';

    await this.queueEmail({
      userId: params.userId,
      type: params.alertType,
      recipient: params.email,
      subject: `${emoji} ${alertLabel}: ${params.symbol}`,
      html,
      priority: 10,
    });
  }

  async sendDailySummary(params: DailySummaryParams): Promise<void> {
    const html = this.renderDailySummaryTemplate({
      ...params,
      dashboardUrl: `${this.frontendUrl}`,
      settingsUrl: `${this.frontendUrl}/settings`,
    });

    await this.queueEmail({
      userId: params.userId,
      type: 'daily_summary',
      recipient: params.email,
      subject: `📊 Daily Summary - ${params.date}`,
      html,
      priority: 5,
    });
  }

  private renderBuyAlertTemplate(data: any): string {
    const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a202c; background: #f7fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
    .alert-badge { display: inline-block; background: #38a169; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
    .data-section { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .data-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #718096; }
    .value { font-weight: 600; }
    .positive { color: #38a169; }
    .factor-list { margin: 10px 0; padding-left: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #1a365d; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📈 InvestAdvisor</div>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>Great news! <strong>{{assetName}}</strong> ({{symbol}}) has reached your target buy price.</p>
    
    <div style="text-align: center;">
      <span class="alert-badge">🟢 BUY OPPORTUNITY</span>
    </div>
    
    <div class="data-section">
      <h3 style="margin-top: 0;">📊 Market Data</h3>
      <div class="data-row"><span class="label">Current Price:</span> <span class="value">\${{currentPrice}}</span></div>
      <div class="data-row"><span class="label">Target Price:</span> <span class="value">\${{buyTarget}}</span></div>
      <div class="data-row"><span class="label">Sell Target:</span> <span class="value positive">\${{sellTarget}} (+{{potentialGainPct}}%)</span></div>
    </div>
    
    <div class="data-section">
      <h3 style="margin-top: 0;">📈 Analysis</h3>
      <div class="data-row"><span class="label">Confidence:</span> <span class="value">{{confidence}}%</span></div>
      <div class="data-row"><span class="label">Recommendation:</span> <span class="value">{{recommendation}}</span></div>
      
      <p><strong>Key Factors:</strong></p>
      <ul class="factor-list">
        {{#each keyFactors}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{viewAnalysisUrl}}" class="button">View Full Analysis</a>
      <a href="{{addToPortfolioUrl}}" class="button" style="background: #38a169;">Add to Portfolio</a>
    </div>
    
    <div class="footer">
      <p>This alert was generated based on your watchlist settings.</p>
      <p><a href="{{settingsUrl}}">Manage your alerts</a></p>
      <p>© 2026 InvestAdvisor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const compiled = Handlebars.compile(template);
    return compiled(data);
  }

  private renderSellAlertTemplate(data: any): string {
    const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a202c; background: #f7fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
    .alert-badge { display: inline-block; background: #e53e3e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
    .warning-badge { background: #d69e2e; }
    .data-section { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .data-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #718096; }
    .value { font-weight: 600; }
    .positive { color: #38a169; }
    .negative { color: #e53e3e; }
    .button { display: inline-block; padding: 12px 24px; background: #1a365d; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📈 InvestAdvisor</div>
    </div>
    
    <p>Hi {{userName}},</p>
    <p><strong>{{symbol}}</strong> in your portfolio requires your attention.</p>
    
    <div style="text-align: center;">
      <span class="alert-badge {{#if (eq alertType 'stop_loss')}}warning-badge{{/if}}">
        {{#if (eq alertType 'stop_loss')}}⚠️ STOP LOSS{{else}}🔴 SELL SIGNAL{{/if}}
      </span>
    </div>
    
    <div class="data-section">
      <h3 style="margin-top: 0;">📊 Current Position</h3>
      <div class="data-row"><span class="label">Current Price:</span> <span class="value">\${{currentPrice}}</span></div>
      {{#if quantity}}
      <div class="data-row"><span class="label">Quantity:</span> <span class="value">{{quantity}}</span></div>
      {{/if}}
      {{#if avgCost}}
      <div class="data-row"><span class="label">Avg Cost:</span> <span class="value">\${{avgCost}}</span></div>
      {{/if}}
      {{#if profitLoss}}
      <div class="data-row">
        <span class="label">Profit/Loss:</span> 
        <span class="value {{#if (gt profitLoss 0)}}positive{{else}}negative{{/if}}">
          \${{profitLoss}} ({{profitLossPct}}%)
        </span>
      </div>
      {{/if}}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{viewPositionUrl}}" class="button">View Position</a>
    </div>
    
    <div class="footer">
      <p><a href="{{settingsUrl}}">Manage your alerts</a></p>
      <p>© 2026 InvestAdvisor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }

  private renderDailySummaryTemplate(data: any): string {
    const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a202c; background: #f7fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
    .data-section { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .data-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #718096; }
    .value { font-weight: 600; }
    .positive { color: #38a169; }
    .negative { color: #e53e3e; }
    .button { display: inline-block; padding: 12px 24px; background: #1a365d; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📈 InvestAdvisor</div>
      <p style="color: #718096;">Daily Summary - {{date}}</p>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>Here's your daily investment summary.</p>
    
    <div class="data-section">
      <h3 style="margin-top: 0;">💼 Portfolio Overview</h3>
      <div class="data-row"><span class="label">Total Value:</span> <span class="value">\${{portfolio.totalValue}}</span></div>
      <div class="data-row">
        <span class="label">Today's Change:</span> 
        <span class="value {{#if (gt portfolio.todayChange 0)}}positive{{else}}negative{{/if}}">
          \${{portfolio.todayChange}} ({{portfolio.todayChangePct}}%)
        </span>
      </div>
      {{#if portfolio.topPerformer}}
      <div class="data-row"><span class="label">Top Performer:</span> <span class="value positive">{{portfolio.topPerformer.symbol}} +{{portfolio.topPerformer.changePct}}%</span></div>
      {{/if}}
      {{#if portfolio.worstPerformer}}
      <div class="data-row"><span class="label">Worst:</span> <span class="value negative">{{portfolio.worstPerformer.symbol}} {{portfolio.worstPerformer.changePct}}%</span></div>
      {{/if}}
    </div>
    
    {{#if watchlistAlerts.length}}
    <div class="data-section">
      <h3 style="margin-top: 0;">👀 Watchlist Highlights</h3>
      {{#each watchlistAlerts}}
      {{#if isBuyOpportunity}}
      <p>🟢 <strong>{{symbol}}</strong>: Near buy target (\${{currentPrice}} vs \${{buyTarget}})</p>
      {{/if}}
      {{/each}}
    </div>
    {{/if}}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">View Dashboard</a>
    </div>
    
    <div class="footer">
      <p><a href="{{settingsUrl}}">Manage your preferences</a></p>
      <p>© 2026 InvestAdvisor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    Handlebars.registerHelper('gt', (a, b) => a > b);
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }
}
