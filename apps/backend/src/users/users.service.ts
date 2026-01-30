import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

export interface UpdateUserData {
  name?: string;
  googleId?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  timezone?: string;
  currency?: string;
  theme?: string;
  emailNotifications?: boolean;
  dailySummary?: boolean;
  weeklyReport?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  minConfidenceAlert?: number;
}

@Injectable()
export class UsersService {
  constructor(@Inject('DatabaseService') private db: DatabaseService) {}

  async findByEmail(email: string) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findById(id: string) {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByGoogleId(googleId: string) {
    const result = await this.db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0] || null;
  }

  async create(data: CreateUserData) {
    const result = await this.db.query(
      `INSERT INTO users (email, name, password_hash, google_id, avatar_url, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.email,
        data.name,
        data.passwordHash || null,
        data.googleId || null,
        data.avatarUrl || null,
        data.emailVerified || false,
      ],
    );
    return result.rows[0];
  }

  async update(id: string, data: UpdateUserData) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.googleId !== undefined) {
      fields.push(`google_id = $${paramIndex++}`);
      values.push(data.googleId);
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }
    if (data.emailVerified !== undefined) {
      fields.push(`email_verified = $${paramIndex++}`);
      values.push(data.emailVerified);
    }
    if (data.timezone !== undefined) {
      fields.push(`timezone = $${paramIndex++}`);
      values.push(data.timezone);
    }
    if (data.currency !== undefined) {
      fields.push(`currency = $${paramIndex++}`);
      values.push(data.currency);
    }
    if (data.theme !== undefined) {
      fields.push(`theme = $${paramIndex++}`);
      values.push(data.theme);
    }
    if (data.emailNotifications !== undefined) {
      fields.push(`email_notifications = $${paramIndex++}`);
      values.push(data.emailNotifications);
    }
    if (data.dailySummary !== undefined) {
      fields.push(`daily_summary = $${paramIndex++}`);
      values.push(data.dailySummary);
    }
    if (data.weeklyReport !== undefined) {
      fields.push(`weekly_report = $${paramIndex++}`);
      values.push(data.weeklyReport);
    }
    if (data.quietHoursStart !== undefined) {
      fields.push(`quiet_hours_start = $${paramIndex++}`);
      values.push(data.quietHoursStart);
    }
    if (data.quietHoursEnd !== undefined) {
      fields.push(`quiet_hours_end = $${paramIndex++}`);
      values.push(data.quietHoursEnd);
    }
    if (data.minConfidenceAlert !== undefined) {
      fields.push(`min_confidence_alert = $${paramIndex++}`);
      values.push(data.minConfidenceAlert);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    return result.rows[0];
  }

  async delete(id: string) {
    const result = await this.db.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
