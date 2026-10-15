import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, RoundType } from '@cit9/database';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSlotLeaderboard(
    slotId: string,
    requestingUser?: AuthenticatedUser,
    page = 1,
    limit = 50,
  ) {
    const slot = await this.prisma.assessmentSlot.findUnique({
      where: { id: slotId },
      include: { round: true },
    });

    if (!slot) {
      throw new NotFoundException('Assessment slot not found.');
    }

    const now = new Date();
    const isActive = now >= slot.startTime && now <= slot.endTime;

    // Security & fairness policy: Hide scores while slot is actively underway, unless admin
    const isAdmin = requestingUser?.role === Role.ADMIN;
    const hideScores = isActive && !isAdmin;

    const skip = (page - 1) * limit;

    const [total, attempts] = await Promise.all([
      this.prisma.assessmentAttempt.count({
        where: { slotId },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { slotId },
        orderBy: [
          { score: 'desc' },
          { submittedAt: 'asc' },
          { createdAt: 'asc' },
        ],
        skip,
        take: limit,
        include: {
          user: {
            include: { profile: true },
          },
        },
      }),
    ]);

    let currentRank = skip + 1;
    let userRank: number | null = null;

    const leaderboard = attempts.map((att) => {
      const rank = currentRank++;
      if (requestingUser && att.userId === requestingUser.id) {
        userRank = rank;
      }

      return {
        rank,
        userId: att.userId,
        displayName: att.user.profile?.displayName || att.user.email.split('@')[0],
        instituteName: att.user.profile?.instituteName || 'N/A',
        score: hideScores ? null : att.score,
        status: att.status,
        submittedAt: att.submittedAt,
      };
    });

    return {
      slotId: slot.id,
      slotNumber: slot.slotNumber,
      roundType: slot.round.roundType,
      isActive,
      scoresMasked: hideScores,
      totalParticipants: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currentUserRank: userRank,
      leaderboard,
    };
  }

  async getFinalRoundLeaderboard(
    requestingUser?: AuthenticatedUser,
    page = 1,
    limit = 50,
  ) {
    const finalRound = await this.prisma.assessmentRound.findFirst({
      where: { roundType: RoundType.FINAL },
    });

    if (!finalRound) {
      throw new NotFoundException('Final round not found or not published.');
    }

    const skip = (page - 1) * limit;

    const [total, attempts] = await Promise.all([
      this.prisma.assessmentAttempt.count({
        where: { roundId: finalRound.id, isQualified: true },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { roundId: finalRound.id, isQualified: true },
        orderBy: [
          { score: 'desc' },
          { submittedAt: 'asc' },
        ],
        skip,
        take: limit,
        include: {
          user: {
            include: { profile: true },
          },
        },
      }),
    ]);

    let currentRank = skip + 1;
    let userRank: number | null = null;

    const leaderboard = attempts.map((att) => {
      const rank = currentRank++;
      if (requestingUser && att.userId === requestingUser.id) {
        userRank = rank;
      }

      return {
        rank,
        userId: att.userId,
        displayName: att.user.profile?.displayName || att.user.email.split('@')[0],
        instituteName: att.user.profile?.instituteName || 'N/A',
        score: att.score,
        status: att.status,
        submittedAt: att.submittedAt,
      };
    });

    return {
      roundId: finalRound.id,
      roundType: RoundType.FINAL,
      totalFinalists: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currentUserRank: userRank,
      leaderboard,
    };
  }
}
