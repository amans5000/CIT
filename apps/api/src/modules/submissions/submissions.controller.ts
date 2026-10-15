import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Answer Submissions')
@UseGuards(AuthGuard, CsrfGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit an answer option for an active attempt (Atomic scoring)' })
  @SwaggerResponse({ status: 201, description: 'Answer evaluated and score updated' })
  async submitAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.submissionsService.submitAnswer(user.id, dto);
  }
}
