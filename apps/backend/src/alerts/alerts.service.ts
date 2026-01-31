import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import { CreateAlertDto, UpdateAlertDto } from './dto/alert.dto';

@Injectable()
export class AlertsService {
  constructor(@Inject('DatabaseService') private db: DatabaseService) {}

  async getAlerts(userId: string, status: string = 'active') {
    let query = `
      SELECT a.*, 
             m.current_price,
             m.asset_name
      FROM alerts a
      LEFT JOIN market_data_cache m ON m.symbol = a.symbol
      WHERE a.user_id = $1
    `;

    if (status === 'active') {
      query += ` AND a.is_active = TRUE`;
    } else if (status === 'triggered') {
      query += ` AND a.last_triggered_at IS NOT NULL`;
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await this.db.query(query, [userId]);

    return {
      alerts: result.rows.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        assetType: a.asset_type,
        assetName: a.asset_name,
        alertType: a.alert_type,
        targetPrice: a.target_price ? Number(a.target_price) : null,
        percentageChange: a.percentage_change ? Number(a.percentage_change) : null,
        currentPrice: a.current_price ? Number(a.current_price) : null,
        isActive: a.is_active,
        isRecurring: a.is_recurring,
        createdAt: a.created_at,
        lastTriggeredAt: a.last_triggered_at,
      })),
    };
  }

  async createAlert(userId: string, dto: CreateAlertDto) {
    const result = await this.db.query(
      `INSERT INTO alerts 
       (user_id, symbol, asset_type, alert_type, target_price, percentage_change, 
        is_recurring, watchlist_item_id, portfolio_item_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        dto.symbol.toUpperCase(),
        dto.assetType || 'stock',
        dto.alertType,
        dto.targetPrice || null,
        dto.percentageChange || null,
        dto.isRecurring || false,
        dto.watchlistItemId || null,
        dto.portfolioItemId || null,
      ],
    );

    return {
      id: result.rows[0].id,
      symbol: result.rows[0].symbol,
      alertType: result.rows[0].alert_type,
      targetPrice: result.rows[0].target_price,
      isActive: result.rows[0].is_active,
    };
  }

  async updateAlert(userId: string, alertId: string, dto: UpdateAlertDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.targetPrice !== undefined) {
      fields.push(`target_price = $${paramIndex++}`);
      values.push(dto.targetPrice);
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(dto.isActive);
    }
    if (dto.isRecurring !== undefined) {
      fields.push(`is_recurring = $${paramIndex++}`);
      values.push(dto.isRecurring);
    }

    if (fields.length === 0) {
      throw new NotFoundException('No fields to update');
    }

    values.push(alertId, userId);
    const result = await this.db.query(
      `UPDATE alerts SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Alert not found');
    }

    return {
      id: result.rows[0].id,
      symbol: result.rows[0].symbol,
      alertType: result.rows[0].alert_type,
      targetPrice: result.rows[0].target_price,
      isActive: result.rows[0].is_active,
    };
  }

  async deleteAlert(userId: string, alertId: string) {
    const result = await this.db.query(
      `DELETE FROM alerts WHERE id = $1 AND user_id = $2`,
      [alertId, userId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Alert not found');
    }
  }

  async getAlertHistory(userId: string, limit: number = 50, offset: number = 0) {
    // #region agent log
    console.log('[DEBUG] getAlertHistory entry:', { userId, limit, offset, limitParsed: Number(limit), offsetParsed: Number(offset) });
    // #endregion
    
    try {
      const safeLimit = Number(limit) || 50;
      const safeOffset = Number(offset) || 0;
      
      // #region agent log
      console.log('[DEBUG] About to execute query:', { userId, safeLimit, safeOffset });
      // #endregion
      
      const result = await this.db.query(
        `SELECT * FROM alert_history 
         WHERE user_id = $1 
         ORDER BY triggered_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, safeLimit, safeOffset],
      );

      // #region agent log
      console.log('[DEBUG] Query executed:', { rowCount: result.rows.length, firstRow: result.rows[0] });
      // #endregion

      const countResult = await this.db.query(
        `SELECT COUNT(*) FROM alert_history WHERE user_id = $1`,
        [userId],
      );

      return {
        history: result.rows.map((h) => ({
          id: h.id,
          symbol: h.symbol,
          alertType: h.alert_type,
          triggeredAt: h.triggered_at,
          priceAtTrigger: Number(h.price_at_trigger),
          targetPrice: h.target_price ? Number(h.target_price) : null,
          emailSent: h.email_sent,
          acknowledged: h.acknowledged,
          actionTaken: h.action_taken,
        })),
        total: parseInt(countResult.rows[0].count, 10),
      };
    } catch (error) {
      // #region agent log
      console.error('[DEBUG] Query failed:', { error: error.message, stack: error.stack });
      // #endregion
      throw error;
    }
  }

  async acknowledgeAlert(userId: string, historyId: string, actionTaken?: string) {
    await this.db.query(
      `UPDATE alert_history 
       SET acknowledged = TRUE, acknowledged_at = NOW(), action_taken = $3
       WHERE id = $1 AND user_id = $2`,
      [historyId, userId, actionTaken || null],
    );
  }
}
