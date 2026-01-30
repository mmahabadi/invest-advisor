import { Controller, Get, Put, Delete, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/user.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getSettings(@Request() req: any) {
    const user = req.user;
    return {
      currency: user.currency,
      timezone: user.timezone,
      theme: user.theme,
      notifications: {
        email: user.email_notifications,
        dailySummary: user.daily_summary,
        weeklyReport: user.weekly_report,
        quietHoursStart: user.quiet_hours_start,
        quietHoursEnd: user.quiet_hours_end,
        minConfidenceAlert: user.min_confidence_alert,
      },
    };
  }

  @Put()
  async updateSettings(@Request() req: any, @Body() dto: UpdateSettingsDto) {
    const updated = await this.usersService.update(req.user.id, {
      currency: dto.currency,
      timezone: dto.timezone,
      theme: dto.theme,
      emailNotifications: dto.notifications?.email,
      dailySummary: dto.notifications?.dailySummary,
      weeklyReport: dto.notifications?.weeklyReport,
      quietHoursStart: dto.notifications?.quietHoursStart,
      quietHoursEnd: dto.notifications?.quietHoursEnd,
      minConfidenceAlert: dto.notifications?.minConfidenceAlert,
    });

    return {
      currency: updated.currency,
      timezone: updated.timezone,
      theme: updated.theme,
      notifications: {
        email: updated.email_notifications,
        dailySummary: updated.daily_summary,
        weeklyReport: updated.weekly_report,
        quietHoursStart: updated.quiet_hours_start,
        quietHoursEnd: updated.quiet_hours_end,
        minConfidenceAlert: updated.min_confidence_alert,
      },
    };
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Request() req: any) {
    await this.usersService.delete(req.user.id);
  }
}
