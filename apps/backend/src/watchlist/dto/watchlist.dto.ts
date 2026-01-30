import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AssetType } from '../../portfolio/dto/portfolio.dto';

export class CreateWatchlistItemDto {
  @IsString()
  symbol: string;

  @IsEnum(AssetType)
  assetType: AssetType;

  @IsString()
  @IsOptional()
  notes?: string;
}
