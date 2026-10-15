import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(prismaService).toBeDefined();
    expect(redisService).toBeDefined();
  });

  it('should return liveness status', () => {
    const liveness = controller.liveness();
    expect(liveness.status).toBe('ok');
    expect(typeof liveness.uptime).toBe('number');
  });

  it('should return healthy readiness check when DB and Redis are up', async () => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const mockRes = { status: statusMock } as unknown as Response;

    await controller.readiness(mockRes);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        checks: expect.objectContaining({
          database: expect.objectContaining({ status: 'healthy' }),
          redis: expect.objectContaining({ status: 'healthy' }),
        }),
      }),
    );
  });

  it('should return 503 when database is down', async () => {
    prismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));

    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const mockRes = { status: statusMock } as unknown as Response;

    await controller.readiness(mockRes);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'not_ready',
        checks: expect.objectContaining({
          database: expect.objectContaining({ status: 'unhealthy' }),
        }),
      }),
    );
  });

  it('should return 503 when redis is down', async () => {
    redisService.ping.mockRejectedValueOnce(new Error('Redis connection refused'));

    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const mockRes = { status: statusMock } as unknown as Response;

    await controller.readiness(mockRes);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'not_ready',
        checks: expect.objectContaining({
          redis: expect.objectContaining({ status: 'unhealthy' }),
        }),
      }),
    );
  });
});
