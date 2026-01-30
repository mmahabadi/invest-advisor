import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum AlertType {
  PRICE_ABOVE = 'price_above',
  PRICE_BELOW = 'price_below',
  BUY_TARGET = 'buy_target',
  SELL_TARGET = 'sell_target',
  STOP_LOSS = 'stop_loss',
  PERCENTAGE_CHANGE = 'percentage_change',
}

export class CreateAlertDto {
  @IsString()
  symbol: string;

  @IsString()
  @IsOptional()
  assetType?: string;

  @IsEnum(AlertType)
  alertType: AlertType;

  @IsNumber()
  @IsOptional()
  targetPrice?: number;

  @IsNumber()
  @IsOptional()
  percentageChange?: number;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsUUID()
  @IsOptional()
  watchlistItemId?: string;

  @IsUUID()
  @IsOptional()
  portfolioItemId?: string;
}

export class UpdateAlertDto {
  @IsNumber()
  @IsOptional()
  targetPrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
