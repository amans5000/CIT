import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '@cit9/database';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      profile: user.profile,
      isProfileComplete: Boolean(user.profile?.isCompleted),
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedProfile = await this.prisma.participantProfile.upsert({
      where: { userId },
      update: {
        fullName: dto.fullName.trim(),
        displayName: dto.displayName.trim(),
        mobile: dto.mobile.trim(),
        instituteName: dto.instituteName.trim(),
        department: dto.department?.trim() || null,
        yearOfStudy: dto.yearOfStudy.trim(),
        isCompleted: true,
      },
      create: {
        userId,
        fullName: dto.fullName.trim(),
        displayName: dto.displayName.trim(),
        mobile: dto.mobile.trim(),
        instituteName: dto.instituteName.trim(),
        department: dto.department?.trim() || null,
        yearOfStudy: dto.yearOfStudy.trim(),
        isCompleted: true,
      },
    });

    return updatedProfile;
  }

  async getUserById(targetUserId: string, requestingUser: AuthenticatedUser) {
    // IDOR Protection: Ordinary participants may ONLY view their own user data
    if (requestingUser.role !== Role.ADMIN && requestingUser.id !== targetUserId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view other users’ private profile details',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      profile: user.profile,
      createdAt: user.createdAt,
    };
  }
}
