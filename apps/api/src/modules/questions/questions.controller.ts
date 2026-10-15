import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@cit9/database';

@ApiTags('Questions Bank')
@UseGuards(AuthGuard, RolesGuard, CsrfGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a question with options (Admin only)' })
  @SwaggerResponse({ status: 201, description: 'Question created' })
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionsService.createQuestion(dto);
  }

  @Roles(Role.ADMIN)
  @Get('round/:roundId')
  @ApiOperation({ summary: 'Get all questions in round with answer keys (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Questions with answer keys' })
  async getQuestionsAdmin(@Param('roundId') roundId: string) {
    return this.questionsService.getQuestionsAdmin(roundId);
  }
}
