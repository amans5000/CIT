import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { SelectSlotDto } from './dto/select-slot.dto';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Exam Attempts')
@UseGuards(AuthGuard, CsrfGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('select-slot')
  @ApiOperation({ summary: 'Register/select a slot for the assessment round' })
  @SwaggerResponse({ status: 201, description: 'Registered for slot' })
  async selectSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectSlotDto,
  ) {
    return this.attemptsService.selectSlot(user.id, dto.slotId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start or resume an exam attempt (Validates server slot window)' })
  @SwaggerResponse({ status: 200, description: 'Attempt in progress' })
  async startAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartAttemptDto,
  ) {
    return this.attemptsService.startAttempt(user.id, dto.roundId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active exam attempt state' })
  @SwaggerResponse({ status: 200, description: 'Current attempt or null' })
  async getCurrentAttempt(@CurrentUser() user: AuthenticatedUser) {
    return this.attemptsService.getCurrentAttempt(user.id);
  }

  @Get('round/:roundId/question/:orderIndex')
  @ApiOperation({ summary: 'Retrieve question text and options by sequence (Without answer key)' })
  @SwaggerResponse({ status: 200, description: 'Question and options without isCorrect' })
  async getQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roundId') roundId: string,
    @Param('orderIndex', ParseIntPipe) orderIndex: number,
  ) {
    return this.attemptsService.getQuestionByOrder(user.id, roundId, orderIndex);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Explicitly submit/finish exam attempt' })
  @SwaggerResponse({ status: 200, description: 'Exam attempt submitted' })
  async finishAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') attemptId: string,
  ) {
    return this.attemptsService.finishAttempt(user.id, attemptId);
  }
}
