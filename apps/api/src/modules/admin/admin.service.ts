import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '@cit9/database';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        profile: u.profile,
        createdAt: u.createdAt,
      })),
    };
  }

  async updateUserRole(
    adminUser: AuthenticatedUser,
    targetUserId: string,
    newRole: Role,
    req: Request,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const oldRole = targetUser.role;

    // 1. Update Role in Database
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      include: { profile: true },
    });

    // 2. Privilege change security invariant: Invalidate all existing sessions for target user
    await this.authService.revokeAllUserSessions(targetUserId);

    // 3. Record immutable Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'UPDATE_USER_ROLE',
        resource: `User:${targetUserId}`,
        details: {
          previousRole: oldRole,
          newRole,
          targetEmail: targetUser.email,
        },
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    this.logger.log(
      `Admin [${adminUser.email}] changed role of [${targetUser.email}] from ${oldRole} to ${newRole}`,
    );

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      profile: updatedUser.profile,
      sessionsRevoked: true,
    };
  }

  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { id: true, email: true, role: true } } },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }
}
