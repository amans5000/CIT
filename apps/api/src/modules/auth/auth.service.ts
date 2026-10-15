import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Role, User } from '@cit9/database';

export interface SessionPayload {
  token: string;
  csrfToken: string;
  user: User;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async generateOAuthUrl(): Promise<string> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
    const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL')!;

    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with 10-minute TTL to validate against callback
    await this.redis.set(`oauth_state:${state}`, JSON.stringify({ nonce }), 600);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      access_type: 'online',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(
    code: string,
    state: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    // 1. Validate and consume OAuth state
    const stateKey = `oauth_state:${state}`;
    const storedStateData = await this.redis.get(stateKey);
    if (!storedStateData) {
      throw new BadRequestException('Invalid, expired, or already-consumed OAuth state');
    }
    await this.redis.del(stateKey);

    // 2. Exchange code with Google token endpoint
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL')!;

    let googleEmail: string;
    let googleId: string;
    let googleName: string;
    let googlePicture: string | undefined;

    // Handle Mock Mode for local testing/CI
    if (this.configService.get<string>('NODE_ENV') !== 'production' && code.startsWith('mock_code_')) {
      googleEmail = `${code.replace('mock_code_', '')}@test.com`;
      googleId = `google_mock_${code}`;
      googleName = 'Mock User';
    } else {
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          this.logger.error(`Failed to exchange Google OAuth code: ${errText}`);
          throw new BadRequestException('Failed to exchange authorization code with Google');
        }

        const tokenData = await tokenResponse.json();
        const idToken = tokenData.id_token;

        // Verify ID token via Google Tokeninfo endpoint
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!tokenInfoRes.ok) {
          throw new BadRequestException('Failed to verify Google ID token authenticity');
        }

        const tokenInfo = await tokenInfoRes.json();
        if (tokenInfo.aud !== clientId) {
          throw new BadRequestException('Google ID token audience mismatch');
        }

        googleEmail = tokenInfo.email;
        googleId = tokenInfo.sub;
        googleName = tokenInfo.name || googleEmail.split('@')[0];
        googlePicture = tokenInfo.picture;
      } catch (err) {
        this.logger.error('Google OAuth verification failed:', err);
        throw new BadRequestException('Google authentication failed');
      }
    }

    // 3. Find or create user (Default role: PARTICIPANT)
    const user = await this.findOrCreateUser({
      email: googleEmail,
      googleId,
      name: googleName,
      avatarUrl: googlePicture,
    });

    // 4. Create secure rotated session & cookies
    await this.establishSessionAndCookies(user, req, res);

    // 5. Redirect to frontend
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(frontendUrl);
  }

  async mockLogin(
    email: string,
    role: Role = Role.PARTICIPANT,
    req: Request,
    res: Response,
  ): Promise<SessionPayload> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new BadRequestException('Mock login is disabled in production');
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { role },
      create: {
        email,
        role,
        googleId: `mock_${email}`,
        profile: {
          create: {
            fullName: email.split('@')[0] || email,
            displayName: email.split('@')[0] || email,
            mobile: '+919876543210',
            instituteName: 'NIT Durgapur',
            department: 'Computer Science',
            yearOfStudy: '2nd Year',
            isCompleted: true,
          },
        },
      },
      include: { profile: true },
    });

    return this.establishSessionAndCookies(user, req, res);
  }

  async establishSessionAndCookies(
    user: User,
    req: Request,
    res: Response,
  ): Promise<SessionPayload> {
    // Session Rotation: Invalidate any previous session token found on request
    const existingToken = this.extractTokenFromRequest(req);
    if (existingToken) {
      await this.revokeSession(existingToken).catch(() => {});
    }

    // Generate crypto-secure 64-byte session token
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Generate CSRF token (32 bytes hex)
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const ttlHours = this.configService.get<number>('SESSION_TTL_HOURS', 24);
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const ttlSeconds = ttlHours * 3600;

    // Save in PostgreSQL
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    // Save in Redis
    const sessionData = {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      csrfToken,
      expiresAt: expiresAt.toISOString(),
    };
    await this.redis.set(`session:${tokenHash}`, JSON.stringify(sessionData), ttlSeconds);

    // Set signed HttpOnly session cookie
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('cit_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      signed: true,
      maxAge: ttlHours * 3600 * 1000,
      path: '/',
    });

    // Set client-readable CSRF cookie
    res.cookie('cit_csrf', csrfToken, {
      httpOnly: false, // Frontend reads this to populate x-csrf-token header
      secure: isProd,
      sameSite: 'lax',
      signed: false,
      maxAge: ttlHours * 3600 * 1000,
      path: '/',
    });

    return { token, csrfToken, user, expiresAt };
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = this.extractTokenFromRequest(req);
    if (token) {
      await this.revokeSession(token);
    }

    res.clearCookie('cit_session', { path: '/' });
    res.clearCookie('cit_csrf', { path: '/' });
  }

  async revokeSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.redis.del(`session:${tokenHash}`);
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { tokenHash: true },
    });

    for (const s of sessions) {
      await this.redis.del(`session:${s.tokenHash}`);
    }

    await this.prisma.session.deleteMany({ where: { userId } });
    this.logger.log(`Revoked all active sessions for userId: ${userId}`);
  }

  private async findOrCreateUser(params: {
    email: string;
    googleId: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: params.email }, { googleId: params.googleId }],
      },
    });

    if (user) {
      // Update avatar if provided
      if (params.avatarUrl && user.avatarUrl !== params.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: params.avatarUrl, googleId: params.googleId },
        });
      }
      return user;
    }

    // Create participant user (Non-negotiable rule: Role is strictly PARTICIPANT)
    return this.prisma.user.create({
      data: {
        email: params.email,
        googleId: params.googleId,
        avatarUrl: params.avatarUrl,
        role: Role.PARTICIPANT,
        profile: {
          create: {
            fullName: params.name,
            displayName: params.name.split(' ')[0] || params.name,
            mobile: '',
            instituteName: '',
            department: '',
            yearOfStudy: '1st Year',
            isCompleted: false,
          },
        },
      },
    });
  }

  private extractTokenFromRequest(req: Request): string | null {
    if (req.signedCookies && req.signedCookies.cit_session) {
      return req.signedCookies.cit_session as string;
    }
    if (req.cookies && req.cookies.cit_session) {
      return req.cookies.cit_session as string;
    }
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return null;
  }
}
