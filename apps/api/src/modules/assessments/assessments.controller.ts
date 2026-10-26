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
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
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

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Post('rounds/:roundId/slots')
  @ApiOperation({ summary: 'Add a scheduled slot to an assessment round (Admin & Organizer)' })
  @SwaggerResponse({ status: 201, description: 'Created slot' })
  async createSlot(
    @Param('roundId') roundId: string,
    @Body() dto: CreateSlotDto,
  ) {
    return this.assessmentsService.createSlot(roundId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Patch('slots/:slotId')
  @ApiOperation({ summary: 'Update a test slot timing or capacity (Admin & Organizer)' })
  @SwaggerResponse({ status: 200, description: 'Updated slot' })
  async updateSlot(
    @Param('slotId') slotId: string,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.assessmentsService.updateSlot(slotId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Delete('slots/:slotId')
  @ApiOperation({ summary: 'Delete a test slot (Admin & Organizer)' })
  @SwaggerResponse({ status: 200, description: 'Deleted slot response' })
  async deleteSlot(@Param('slotId') slotId: string) {
    return this.assessmentsService.deleteSlot(slotId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Get()
  @ApiOperation({ summary: 'List all assessments (Admin & Organizer)' })
  async listAll() {
    return this.assessmentsService.listAssessments();
  }
}
