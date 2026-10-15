import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users & Profiles')
@UseGuards(AuthGuard, CsrfGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retrieve current authenticated participant profile' })
  @SwaggerResponse({ status: 200, description: 'Profile details of current user' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update participant profile details' })
  @SwaggerResponse({ status: 200, description: 'Updated participant profile' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve user by ID (Protected by IDOR & Role checks)' })
  @SwaggerResponse({ status: 200, description: 'User profile details' })
  @SwaggerResponse({ status: 403, description: 'Forbidden if requesting cross-user data without admin role' })
  async getUserById(
    @Param('id') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getUserById(targetUserId, user);
  }
}
