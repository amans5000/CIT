import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import crypto from 'crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RedisService } from '../../modules/redis/redis.service';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const token = this.extractTokenFromRequest(request);
      if (token) {
        try {
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          const cachedSessionStr = await this.redisService.get(`session:${tokenHash}`);
          if (cachedSessionStr) {
            const cachedSession = JSON.parse(cachedSessionStr);
            if (new Date(cachedSession.expiresAt).getTime() > Date.now()) {
              (request as unknown as { user: unknown }).user = {
                id: cachedSession.id,
                email: cachedSession.email,
                role: cachedSession.role,
                sessionId: cachedSession.sessionId,
              };
            }
          } else {
            const session = await this.prismaService.session.findUnique({
              where: { tokenHash },
              include: { user: true },
            });
            if (session && session.user && session.user.isActive && session.expiresAt.getTime() > Date.now()) {
              (request as unknown as { user: unknown }).user = {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
                sessionId: session.id,
              };
            }
          }
        } catch {
          // Ignore error on public endpoints
        }
      }
      return true;
    }

    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required. Missing session cookie or token.');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 1. Check Redis Cache
    const cachedSessionStr = await this.redisService.get(`session:${tokenHash}`);
    if (cachedSessionStr) {
      try {
        const cachedSession = JSON.parse(cachedSessionStr);
        if (new Date(cachedSession.expiresAt).getTime() <= Date.now()) {
          await this.redisService.del(`session:${tokenHash}`);
          throw new UnauthorizedException('Session expired');
        }

        (request as unknown as { user: unknown }).user = {
          id: cachedSession.id,
          email: cachedSession.email,
          role: cachedSession.role,
          sessionId: cachedSession.sessionId,
        };
        return true;
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        // If JSON parse fails, fallback to database
      }
    }

    // 2. Fallback to PostgreSQL
    const session = await this.prismaService.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || !session.user || !session.user.isActive) {
      throw new UnauthorizedException('Invalid or revoked session');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prismaService.session.delete({ where: { id: session.id } }).catch(() => {});
      throw new UnauthorizedException('Session expired');
    }

    // Re-populate Redis cache with remaining TTL
    const remainingSeconds = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
    const sessionData = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
    };
    await this.redisService.set(`session:${tokenHash}`, JSON.stringify(sessionData), remainingSeconds);

    (request as unknown as { user: unknown }).user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    };

    return true;
  }

  private extractTokenFromRequest(req: Request): string | null {
    // 1. Signed cookie (recommended)
    if (req.signedCookies && req.signedCookies.cit_session) {
      return req.signedCookies.cit_session as string;
    }

    // 2. Plain cookie fallback
    if (req.cookies && req.cookies.cit_session) {
      return req.cookies.cit_session as string;
    }

    // 3. Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
