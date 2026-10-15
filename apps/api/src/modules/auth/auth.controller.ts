import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { MockLoginDto } from './dto/mock-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth 2.0 / OpenID Connect authorization' })
  @SwaggerResponse({ status: 302, description: 'Redirects to accounts.google.com' })
  async googleAuth(@Res() res: Response): Promise<void> {
    const url = await this.authService.generateOAuthUrl();
    res.redirect(HttpStatus.FOUND, url);
  }

  @Public()
  @SkipCsrf()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @SwaggerResponse({ status: 302, description: 'Sets session cookie and redirects to frontend' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.authService.handleGoogleCallback(code, state, req, res);
  }

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('mock-login')
  @ApiOperation({ summary: 'Mock login endpoint for automated tests and local development' })
  @SwaggerResponse({ status: 200, description: 'Authenticated with session cookies' })
  async mockLogin(
    @Body() dto: MockLoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const session = await this.authService.mockLogin(dto.email, dto.role, req, res);
    res.json({
      success: true,
      data: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
      },
    });
  }

  @UseGuards(AuthGuard)
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Terminate active session and clear authentication cookies' })
  @SwaggerResponse({ status: 200, description: 'Session revoked successfully' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authService.logout(req, res);
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  @UseGuards(AuthGuard)
  @Get('session')
  @ApiOperation({ summary: 'Validate current active session' })
  @SwaggerResponse({ status: 200, description: 'Current authenticated session details' })
  getSession(@CurrentUser() user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }
}
