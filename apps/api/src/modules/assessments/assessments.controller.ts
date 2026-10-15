import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@cit9/database';

@ApiTags('Assessments & Slots')
@UseGuards(AuthGuard, RolesGuard, CsrfGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Retrieve active assessment schedule, rounds, and slots' })
  @SwaggerResponse({ status: 200, description: 'Active assessment structure' })
  async getActive() {
    return this.assessmentsService.getActiveAssessment();
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new assessment contest (Admin only)' })
  @SwaggerResponse({ status: 201, description: 'Created assessment' })
  async createAssessment(@Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.createAssessment(dto);
  }

  @Roles(Role.ADMIN)
  @Post('rounds/:roundId/slots')
  @ApiOperation({ summary: 'Add a scheduled slot to an assessment round (Admin only)' })
  @SwaggerResponse({ status: 201, description: 'Created slot' })
  async createSlot(
    @Param('roundId') roundId: string,
    @Body() dto: CreateSlotDto,
  ) {
    return this.assessmentsService.createSlot(roundId, dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List all assessments (Admin only)' })
  async listAll() {
    return this.assessmentsService.listAssessments();
  }
}
