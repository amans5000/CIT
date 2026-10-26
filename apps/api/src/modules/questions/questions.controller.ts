import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
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

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Post()
  @ApiOperation({ summary: 'Create a question with options (Admin & Organizer)' })
  @SwaggerResponse({ status: 201, description: 'Question created' })
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionsService.createQuestion(dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Get('round/:roundId')
  @ApiOperation({ summary: 'Get all questions in round with answer keys (Admin & Organizer)' })
  @SwaggerResponse({ status: 200, description: 'Questions with answer keys' })
  async getQuestionsAdmin(@Param('roundId') roundId: string) {
    return this.questionsService.getQuestionsAdmin(roundId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a question and its options (Admin & Organizer)' })
  @SwaggerResponse({ status: 200, description: 'Updated question' })
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.updateQuestion(id, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question from assessment round (Admin & Organizer)' })
  @SwaggerResponse({ status: 200, description: 'Deleted question response' })
  async deleteQuestion(@Param('id') id: string) {
    return this.questionsService.deleteQuestion(id);
  }
}
