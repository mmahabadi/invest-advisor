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
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePortfolioItemDto,
  AddTransactionDto,
  UpdatePortfolioItemDto,
} from './dto/portfolio.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  @Get()
  async getPortfolio(
    @Request() req: any,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.portfolioService.getPortfolio(req.user.id, sort, order);
  }

  @Get(':id')
  async getItem(@Request() req: any, @Param('id') id: string) {
    return this.portfolioService.getItem(req.user.id, id);
  }

  @Post()
  async addItem(@Request() req: any, @Body() dto: CreatePortfolioItemDto) {
    return this.portfolioService.addItem(req.user.id, dto);
  }

  @Post(':id/transactions')
  async addTransaction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddTransactionDto,
  ) {
    return this.portfolioService.addTransaction(req.user.id, id, dto);
  }

  @Put(':id')
  async updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    return this.portfolioService.updateItem(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(@Request() req: any, @Param('id') id: string) {
    await this.portfolioService.deleteItem(req.user.id, id);
  }
}
