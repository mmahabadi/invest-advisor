import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export enum AssetType {
  STOCK = 'stock',
  ETF = 'etf',
  CRYPTO = 'crypto',
  COMMODITY = 'commodity',
}

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
}

export class CreatePortfolioItemDto {
  @IsString()
  symbol: string;

  @IsEnum(AssetType)
  assetType: AssetType;

  @IsNumber()
  @Min(0.00000001)
  quantity: number;

  @IsNumber()
  @Min(0.00000001)
  price: number;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fees?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0.00000001)
  quantity: number;

  @IsNumber()
  @Min(0.00000001)
  price: number;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fees?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePortfolioItemDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
