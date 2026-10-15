import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { QualificationService } from './qualification.service';
import { EvaluateCutoffDto } from './dto/evaluate-cutoff.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@cit9/database';
import { Request } from 'express';

@ApiTags('Qualification & Cutoffs')
@UseGuards(AuthGuard, RolesGuard, CsrfGuard)
@Controller('qualification')
export class QualificationController {
  constructor(private readonly qualificationService: QualificationService) {}

  @Roles(Role.ADMIN)
  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate cutoffs and promote qualifiers to final round (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Evaluation completed and logged' })
  async evaluateCutoffs(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Body() dto: EvaluateCutoffDto,
    @Req() req: Request,
  ) {
    return this.qualificationService.evaluateCutoffs(adminUser, dto, req);
  }

  @Get('rounds/:roundId')
  @ApiOperation({ summary: 'View list of qualified participants for a round' })
  async getQualifiedParticipants(@Param('roundId') roundId: string) {
    return this.qualificationService.getQualifiedParticipants(roundId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Check qualification status for currently authenticated participant' })
  async checkMyQualification(@CurrentUser() user: AuthenticatedUser) {
    return this.qualificationService.checkUserQualification(user.id);
  }
}
