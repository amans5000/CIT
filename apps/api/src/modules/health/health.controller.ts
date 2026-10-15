import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health & Observability')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe' })
  @SwaggerResponse({ status: 200, description: 'Application process is alive' })
  liveness(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe verifying DB and Redis dependencies' })
  @SwaggerResponse({ status: 200, description: 'All critical dependencies are healthy' })
  @SwaggerResponse({ status: 503, description: 'One or more dependencies are unhealthy' })
  async readiness(@Res() res: Response): Promise<void> {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
    let isHealthy = true;

    // 1. PostgreSQL Check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err) {
      isHealthy = false;
      checks.database = {
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }

    // 2. Redis Check
    const redisStart = Date.now();
    try {
      const pong = await this.redis.ping();
      if (pong === 'PONG') {
        checks.redis = {
          status: 'healthy',
          latencyMs: Date.now() - redisStart,
        };
      } else {
        isHealthy = false;
        checks.redis = { status: 'unhealthy', error: 'Unexpected ping response' };
      }
    } catch (err) {
      isHealthy = false;
      checks.redis = {
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }

    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json({
      status: isHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  }

  @Get()
  @ApiOperation({ summary: 'General health check endpoint' })
  async health(@Res() res: Response): Promise<void> {
    return this.readiness(res);
  }
}
