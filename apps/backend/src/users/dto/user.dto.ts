import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationSettingsDto {
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  dailySummary?: boolean;

  @IsBoolean()
  @IsOptional()
  weeklyReport?: boolean;

  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minConfidenceAlert?: number;
}

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  theme?: string;

  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  @IsOptional()
  notifications?: NotificationSettingsDto;
}
