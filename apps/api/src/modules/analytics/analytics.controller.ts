import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@cit9/database';

@ApiTags('Assessment & Question Analytics')
@UseGuards(AuthGuard, RolesGuard, CsrfGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(Role.ADMIN)
  @Get('questions/:questionId')
  @ApiOperation({ summary: 'Get question-level analytics and option distribution (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Question accuracy and option statistics' })
  async getQuestionAnalytics(@Param('questionId') questionId: string) {
    return this.analyticsService.getQuestionAnalytics(questionId);
  }

  @Roles(Role.ADMIN)
  @Get('rounds/:roundId/questions')
  @ApiOperation({ summary: 'Get question-level accuracy summary across a round (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'List of questions with accuracy rates' })
  async getRoundQuestionsAnalytics(@Param('roundId') roundId: string) {
    return this.analyticsService.getRoundQuestionsAnalytics(roundId);
  }

  @Roles(Role.ADMIN)
  @Get('rounds/:roundId/overview')
  @ApiOperation({ summary: 'Get round overview, turnout, and score distribution (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Round overview analytics' })
  async getRoundOverview(@Param('roundId') roundId: string) {
    return this.analyticsService.getRoundOverview(roundId);
  }
}
