import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import { MarketDataService } from '../market-data/market-data.service';
import { CreatePortfolioItemDto, AddTransactionDto, UpdatePortfolioItemDto } from './dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @Inject('DatabaseService') private db: DatabaseService,
    private marketDataService: MarketDataService,
  ) {}

  async getPortfolio(userId: string, sort = 'value', order = 'desc') {
    const orderColumn = this.getSortColumn(sort);
    const orderDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const items = await this.db.query(
      `SELECT * FROM portfolio_items 
       WHERE user_id = $1 
       ORDER BY ${orderColumn} ${orderDir} NULLS LAST`,
      [userId],
    );

    // Calculate summary
    let totalInvested = 0;
    let currentValue = 0;
    let todayChange = 0;

    const enrichedItems = await Promise.all(
      items.rows.map(async (item) => {
        // Get latest price if stale
        let price = item.current_price;
        if (!price || this.isPriceStale(item.last_price_update)) {
          try {
            const quote = await this.marketDataService.getQuote(item.symbol);
            price = quote.price;
            await this.updateItemPrice(item.id, quote);
          } catch {
            price = item.current_price || item.avg_cost;
          }
        }

        const itemValue = Number(item.quantity) * price;
        const profitLoss = itemValue - Number(item.total_cost);
        const profitLossPct = (profitLoss / Number(item.total_cost)) * 100;

        totalInvested += Number(item.total_cost);
        currentValue += itemValue;

        return {
          id: item.id,
          symbol: item.symbol,
          assetType: item.asset_type,
          assetName: item.asset_name,
          quantity: Number(item.quantity),
          avgCost: Number(item.avg_cost),
          totalCost: Number(item.total_cost),
          currentPrice: price,
          currentValue: itemValue,
          profitLoss,
          profitLossPct: Math.round(profitLossPct * 100) / 100,
          lastPriceUpdate: item.last_price_update,
        };
      }),
    );

    const totalProfitLoss = currentValue - totalInvested;
    const totalProfitLossPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      summary: {
        totalInvested: Math.round(totalInvested * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        profitLoss: Math.round(totalProfitLoss * 100) / 100,
        profitLossPct: Math.round(totalProfitLossPct * 100) / 100,
        todayChange: Math.round(todayChange * 100) / 100,
        todayChangePct: 0, // TODO: Calculate from market data
      },
      items: enrichedItems,
    };
  }

  async getItem(userId: string, itemId: string) {
    const result = await this.db.query(
      `SELECT * FROM portfolio_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Portfolio item not found');
    }

    const item = result.rows[0];

    // Get transactions
    const transactions = await this.db.query(
      `SELECT * FROM transactions WHERE portfolio_item_id = $1 ORDER BY transaction_date DESC`,
      [itemId],
    );

    // Get current price
    let currentPrice = item.current_price;
    try {
      const quote = await this.marketDataService.getQuote(item.symbol);
      currentPrice = quote.price;
    } catch {
      currentPrice = item.current_price || item.avg_cost;
    }

    const currentValue = Number(item.quantity) * currentPrice;
    const profitLoss = currentValue - Number(item.total_cost);
    const profitLossPct = (profitLoss / Number(item.total_cost)) * 100;

    return {
      id: item.id,
      symbol: item.symbol,
      assetType: item.asset_type,
      assetName: item.asset_name,
      quantity: Number(item.quantity),
      avgCost: Number(item.avg_cost),
      totalCost: Number(item.total_cost),
      currentPrice,
      currentValue,
      profitLoss,
      profitLossPct: Math.round(profitLossPct * 100) / 100,
      notes: item.notes,
      transactions: transactions.rows.map((t) => ({
        id: t.id,
        type: t.type,
        quantity: Number(t.quantity),
        price: Number(t.price),
        totalAmount: Number(t.total_amount),
        fees: Number(t.fees),
        date: t.transaction_date,
        notes: t.notes,
      })),
    };
  }

  async addItem(userId: string, dto: CreatePortfolioItemDto) {
    // Check if already exists
    const existing = await this.db.query(
      `SELECT id FROM portfolio_items WHERE user_id = $1 AND symbol = $2`,
      [userId, dto.symbol.toUpperCase()],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('Symbol already in portfolio. Use transactions to add more.');
    }

    // Get asset info from market data
    let assetName = dto.symbol;
    try {
      const quote = await this.marketDataService.getQuote(dto.symbol);
      assetName = quote.name || dto.symbol;
    } catch {
      // Use symbol as name if fetch fails
    }

    const totalCost = dto.quantity * dto.price + (dto.fees || 0);

    const result = await this.db.query(
      `INSERT INTO portfolio_items 
       (user_id, symbol, asset_type, asset_name, quantity, avg_cost, total_cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        dto.symbol.toUpperCase(),
        dto.assetType,
        assetName,
        dto.quantity,
        dto.price,
        totalCost,
        dto.notes || null,
      ],
    );

    const item = result.rows[0];

    // Create initial transaction
    await this.db.query(
      `INSERT INTO transactions 
       (portfolio_item_id, user_id, type, quantity, price, total_amount, fees, transaction_date, notes)
       VALUES ($1, $2, 'buy', $3, $4, $5, $6, $7, $8)`,
      [
        item.id,
        userId,
        dto.quantity,
        dto.price,
        totalCost,
        dto.fees || 0,
        dto.purchaseDate || new Date().toISOString().split('T')[0],
        dto.notes,
      ],
    );

    return {
      id: item.id,
      symbol: item.symbol,
      assetType: item.asset_type,
      assetName: item.asset_name,
      quantity: Number(item.quantity),
      avgCost: Number(item.avg_cost),
      totalCost: Number(item.total_cost),
    };
  }

  async addTransaction(userId: string, itemId: string, dto: AddTransactionDto) {
    const item = await this.db.query(
      `SELECT * FROM portfolio_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId],
    );

    if (item.rows.length === 0) {
      throw new NotFoundException('Portfolio item not found');
    }

    const currentItem = item.rows[0];
    const totalAmount = dto.quantity * dto.price + (dto.fees || 0);

    // Create transaction
    await this.db.query(
      `INSERT INTO transactions 
       (portfolio_item_id, user_id, type, quantity, price, total_amount, fees, transaction_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        itemId,
        userId,
        dto.type,
        dto.quantity,
        dto.price,
        totalAmount,
        dto.fees || 0,
        dto.date || new Date().toISOString().split('T')[0],
        dto.notes,
      ],
    );

    // Update portfolio item
    let newQuantity: number;
    let newTotalCost: number;
    let newAvgCost: number;

    if (dto.type === 'buy') {
      newQuantity = Number(currentItem.quantity) + dto.quantity;
      newTotalCost = Number(currentItem.total_cost) + totalAmount;
      newAvgCost = newTotalCost / newQuantity;
    } else {
      newQuantity = Number(currentItem.quantity) - dto.quantity;
      // For sells, reduce total cost proportionally
      const costReduction = Number(currentItem.avg_cost) * dto.quantity;
      newTotalCost = Number(currentItem.total_cost) - costReduction;
      newAvgCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
    }

    await this.db.query(
      `UPDATE portfolio_items 
       SET quantity = $1, avg_cost = $2, total_cost = $3
       WHERE id = $4`,
      [newQuantity, newAvgCost, newTotalCost, itemId],
    );

    // If quantity is 0, remove the item
    if (newQuantity <= 0) {
      await this.db.query(`DELETE FROM portfolio_items WHERE id = $1`, [itemId]);
    }

    return { success: true };
  }

  async updateItem(userId: string, itemId: string, dto: UpdatePortfolioItemDto) {
    const result = await this.db.query(
      `UPDATE portfolio_items 
       SET notes = COALESCE($1, notes), color = COALESCE($2, color)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [dto.notes, dto.color, itemId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Portfolio item not found');
    }

    return result.rows[0];
  }

  async deleteItem(userId: string, itemId: string) {
    const result = await this.db.query(
      `DELETE FROM portfolio_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Portfolio item not found');
    }
  }

  private async updateItemPrice(
    itemId: string,
    quote: { price: number; change?: number; changePct?: number },
  ) {
    const value = await this.db.query(`SELECT quantity FROM portfolio_items WHERE id = $1`, [
      itemId,
    ]);
    if (value.rows.length === 0) return;

    const currentValue = Number(value.rows[0].quantity) * quote.price;

    await this.db.query(
      `UPDATE portfolio_items 
       SET current_price = $1, current_value = $2, last_price_update = NOW()
       WHERE id = $3`,
      [quote.price, currentValue, itemId],
    );
  }

  private isPriceStale(lastUpdate: Date | null): boolean {
    if (!lastUpdate) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastUpdate) < fiveMinutesAgo;
  }

  private getSortColumn(sort: string): string {
    const sortMap: Record<string, string> = {
      value: 'current_value',
      profit: 'profit_loss',
      name: 'symbol',
      date: 'created_at',
    };
    return sortMap[sort] || 'current_value';
  }
}
