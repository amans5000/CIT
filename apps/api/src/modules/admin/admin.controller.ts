import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@cit9/database';

@ApiTags('Administration')
@UseGuards(AuthGuard, RolesGuard, CsrfGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all participants and administrators (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Paginated user list' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listUsers(pageNum, limitNum);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update participant role and revoke existing sessions (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Updated role and session revocation status' })
  async updateUserRole(
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.updateUserRole(adminUser, targetUserId, dto.role, req);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Retrieve system audit logs (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Paginated audit logs' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getAuditLogs(pageNum, limitNum);
  }
}
