import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  CustomDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = (): CustomDecorator<string> => SetMetadata(SKIP_CSRF_KEY, true);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe idempotent methods do not require CSRF token
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Only enforce CSRF when authenticated via cookies
    const hasSessionCookie = Boolean(
      (request.signedCookies && request.signedCookies.cit_session) ||
      (request.cookies && request.cookies.cit_session)
    );

    if (!hasSessionCookie) {
      // If client is authenticating via Authorization Bearer header, CSRF does not apply
      return true;
    }

    const csrfHeader = (request.headers['x-csrf-token'] as string) || '';
    const csrfCookie =
      (request.signedCookies && (request.signedCookies.cit_csrf as string)) ||
      (request.cookies && (request.cookies.cit_csrf as string)) ||
      '';

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
