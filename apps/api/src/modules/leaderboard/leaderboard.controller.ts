import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leaderboards & Results')
@UseGuards(AuthGuard, RolesGuard, CsrfGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Public()
  @Get('slots/:slotId')
  @ApiOperation({ summary: 'Retrieve ranked leaderboard for a specific slot' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSlotLeaderboard(
    @Param('slotId') slotId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.leaderboardService.getSlotLeaderboard(slotId, user, page, limit);
  }

  @Public()
  @Get('finals')
  @ApiOperation({ summary: 'Retrieve ranked leaderboard for final round' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFinalRoundLeaderboard(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.leaderboardService.getFinalRoundLeaderboard(user, page, limit);
  }
}
