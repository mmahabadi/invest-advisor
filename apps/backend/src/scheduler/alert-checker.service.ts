import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.module';
import { MarketDataService } from '../market-data/market-data.service';
import { EmailService } from '../email/email.service';

interface AlertWithData {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: string;
  alert_type: string;
  target_price: number;
  is_recurring: boolean;
  email: string;
  name: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  current_price: number;
  buy_target: number;
  sell_target: number;
  stop_loss: number;
  confidence: number;
  recommendation: string;
  analysis_summary: string;
  key_factors: string[];
}

@Injectable()
export class AlertCheckerService {
  private readonly logger = new Logger(AlertCheckerService.name);

  constructor(
    @Inject('DatabaseService') private db: DatabaseService,
    private marketDataService: MarketDataService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkAlerts(): Promise<void> {
    this.logger.log('Starting alert check...');

    try {
      const alerts = await this.db.query<AlertWithData>(`
        SELECT 
          a.*,
          u.email,
          u.name,
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
        AND u.email_notifications = TRUE
      `);

      let triggered = 0;
      for (const alert of alerts.rows) {
        const wasTriggered = await this.processAlert(alert);
        if (wasTriggered) triggered++;
      }

      this.logger.log(`Alert check complete. Triggered ${triggered} of ${alerts.rows.length} alerts.`);
    } catch (error) {
      this.logger.error('Alert check failed', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processEmailQueue(): Promise<void> {
    try {
      const sent = await this.emailService.processQueue();
      if (sent > 0) {
        this.logger.log(`Processed ${sent} emails from queue`);
      }
    } catch (error) {
      this.logger.error('Email queue processing failed', error);
    }
  }

  @Cron('0 8 * * *') // Daily at 8 AM UTC
  async sendDailySummaries(): Promise<void> {
    this.logger.log('Generating daily summaries...');

    try {
      const users = await this.db.query(`
        SELECT * FROM users
        WHERE daily_summary = TRUE
        AND email_verified = TRUE
        AND email_notifications = TRUE
      `);

      for (const user of users.rows) {
        await this.generateDailySummary(user);
      }

      this.logger.log(`Sent ${users.rows.length} daily summaries`);
    } catch (error) {
      this.logger.error('Daily summary generation failed', error);
    }
  }

  private async processAlert(alert: AlertWithData): Promise<boolean> {
    // Check quiet hours
    if (this.isInQuietHours(alert)) {
      return false;
    }

    // Get current price if not cached
    let currentPrice = alert.current_price;
    if (!currentPrice) {
      try {
        const quote = await this.marketDataService.getQuote(alert.symbol);
        currentPrice = quote.price;
      } catch {
        return false;
      }
    }

    // Check if alert condition is met
    const isTriggered = this.checkCondition(alert, currentPrice);

    if (isTriggered) {
      await this.triggerAlert(alert, currentPrice);
      return true;
    }

    return false;
  }

  private checkCondition(alert: AlertWithData, price: number): boolean {
    const target = Number(alert.target_price);

    switch (alert.alert_type) {
      case 'price_below':
        return price <= target;
      case 'price_above':
        return price >= target;
      case 'buy_target':
        return Boolean(alert.buy_target && price <= Number(alert.buy_target));
      case 'sell_target':
        return Boolean(alert.sell_target && price >= Number(alert.sell_target));
      case 'stop_loss':
        return Boolean(alert.stop_loss && price <= Number(alert.stop_loss));
      default:
        return false;
    }
  }

  private async triggerAlert(alert: AlertWithData, currentPrice: number): Promise<void> {
    // Log to history
    await this.db.query(
      `INSERT INTO alert_history 
        (alert_id, user_id, symbol, alert_type, triggered_at, price_at_trigger, target_price)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
      [
        alert.id,
        alert.user_id,
        alert.symbol,
        alert.alert_type,
        currentPrice,
        alert.target_price,
      ],
    );

    // Send email based on type
    if (alert.alert_type === 'buy_target' || alert.alert_type === 'price_below') {
      await this.emailService.sendBuyAlert({
        userId: alert.user_id,
        email: alert.email,
        userName: alert.name,
        symbol: alert.symbol,
        currentPrice,
        buyTarget: Number(alert.buy_target) || currentPrice,
        sellTarget: Number(alert.sell_target) || currentPrice * 1.1,
        confidence: alert.confidence || 70,
        recommendation: alert.recommendation || 'buy',
        keyFactors: alert.key_factors || ['Price target reached'],
      });
    } else if (
      alert.alert_type === 'sell_target' ||
      alert.alert_type === 'stop_loss' ||
      alert.alert_type === 'price_above'
    ) {
      await this.emailService.sendSellAlert({
        userId: alert.user_id,
        email: alert.email,
        userName: alert.name,
        symbol: alert.symbol,
        currentPrice,
        alertType: alert.alert_type,
      });
    }

    // Deactivate non-recurring alerts
    if (!alert.is_recurring) {
      await this.db.query(
        `UPDATE alerts SET is_active = FALSE, last_triggered_at = NOW() WHERE id = $1`,
        [alert.id],
      );
    } else {
      await this.db.query(`UPDATE alerts SET last_triggered_at = NOW() WHERE id = $1`, [alert.id]);
    }

    this.logger.log(`Alert triggered: ${alert.alert_type} for ${alert.symbol}`);
  }

  private async generateDailySummary(user: any): Promise<void> {
    try {
      // Get portfolio summary
      const portfolio = await this.db.query(
        `SELECT 
          SUM(total_cost) as total_invested,
          SUM(current_value) as current_value,
          SUM(profit_loss) as profit_loss
         FROM portfolio_items
         WHERE user_id = $1`,
        [user.id],
      );

      // Get watchlist alerts
      const watchlist = await this.db.query(
        `SELECT 
          w.symbol,
          w.current_price,
          t.buy_target
         FROM watchlist_items w
         LEFT JOIN target_prices t ON t.watchlist_item_id = w.id
         WHERE w.user_id = $1
         AND w.current_price IS NOT NULL
         AND t.buy_target IS NOT NULL
         AND w.current_price <= t.buy_target * 1.05`,
        [user.id],
      );

      const portfolioData = portfolio.rows[0];
      const totalValue = Number(portfolioData?.current_value) || 0;

      await this.emailService.sendDailySummary({
        userId: user.id,
        email: user.email,
        userName: user.name,
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        portfolio: {
          totalValue,
          todayChange: 0, // TODO: Calculate from market data
          todayChangePct: 0,
        },
        watchlistAlerts: watchlist.rows.map((w) => ({
          symbol: w.symbol,
          currentPrice: Number(w.current_price),
          buyTarget: Number(w.buy_target),
          isBuyOpportunity: true,
        })),
      });
    } catch (error) {
      this.logger.error(`Failed to generate daily summary for ${user.email}`, error);
    }
  }

  private isInQuietHours(alert: AlertWithData): boolean {
    if (!alert.quiet_hours_start || !alert.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: alert.timezone || 'UTC' }),
    );
    const hours = userTime.getHours();
    const minutes = userTime.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startHours, startMins] = alert.quiet_hours_start.split(':').map(Number);
    const [endHours, endMins] = alert.quiet_hours_end.split(':').map(Number);
    const startTime = startHours * 60 + startMins;
    const endTime = endHours * 60 + endMins;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
}
