import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWatchlistItemDto } from './dto/watchlist.dto';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  @Get()
  async getWatchlist(
    @Request() req: any,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('filter') filter?: string,
  ) {
    return this.watchlistService.getWatchlist(req.user.id, sort, order, filter);
  }

  @Get(':id')
  async getItem(@Request() req: any, @Param('id') id: string) {
    return this.watchlistService.getItem(req.user.id, id);
  }

  @Post()
  async addItem(@Request() req: any, @Body() dto: CreateWatchlistItemDto) {
    return this.watchlistService.addItem(req.user.id, dto);
  }

  @Post(':id/analyze')
  async refreshAnalysis(@Request() req: any, @Param('id') id: string) {
    return this.watchlistService.refreshAnalysis(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(@Request() req: any, @Param('id') id: string) {
    await this.watchlistService.removeItem(req.user.id, id);
  }
}
