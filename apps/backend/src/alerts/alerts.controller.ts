import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAlertDto, UpdateAlertDto } from './dto/alert.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  async getAlerts(@Request() req: any, @Query('status') status?: string) {
    return this.alertsService.getAlerts(req.user.id, status);
  }

  @Post()
  async createAlert(@Request() req: any, @Body() dto: CreateAlertDto) {
    return this.alertsService.createAlert(req.user.id, dto);
  }

  @Put(':id')
  async updateAlert(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alertsService.updateAlert(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlert(@Request() req: any, @Param('id') id: string) {
    await this.alertsService.deleteAlert(req.user.id, id);
  }

  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // #region agent log
    console.log('[DEBUG] getHistory called:', { userId: req.user?.id, limit, offset, limitType: typeof limit, offsetType: typeof offset });
    // #endregion
    return this.alertsService.getAlertHistory(req.user.id, limit, offset);
  }

  @Post('history/:id/acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') id: string,
    @Body('actionTaken') actionTaken?: string,
  ) {
    await this.alertsService.acknowledgeAlert(req.user.id, id, actionTaken);
  }
}
