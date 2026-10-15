import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluateCutoffDto } from './dto/evaluate-cutoff.dto';
import { AttemptStatus, RoundType } from '@cit9/database';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateCutoffs(
    adminUser: AuthenticatedUser,
    dto: EvaluateCutoffDto,
    req?: Request,
  ) {
    const round = await this.prisma.assessmentRound.findUnique({
      where: { id: dto.roundId },
      include: { assessment: { include: { rounds: true } } },
    });

    if (!round) {
      throw new NotFoundException('Assessment round not found.');
    }

    if (round.roundType !== RoundType.PRELIMINARY) {
      throw new BadRequestException('Qualification cutoffs can only be evaluated on preliminary rounds.');
    }

    if (dto.cutoffScore === undefined && dto.topCount === undefined) {
      throw new BadRequestException('Must provide either a cutoffScore or topCount for qualification evaluation.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch all submitted attempts ranked
      const allAttempts = await tx.assessmentAttempt.findMany({
        where: {
          roundId: dto.roundId,
          status: AttemptStatus.SUBMITTED,
        },
        orderBy: [
          { score: 'desc' },
          { submittedAt: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          user: {
            include: { profile: true },
          },
        },
      });

      // 2. Filter qualifying attempts
      let qualifying = allAttempts;

      if (dto.cutoffScore !== undefined) {
        qualifying = qualifying.filter((att) => att.score >= (dto.cutoffScore as number));
      }

      if (dto.topCount !== undefined) {
        qualifying = qualifying.slice(0, dto.topCount);
      }

      const qualifyingAttemptIds = qualifying.map((q) => q.id);
      const qualifyingUserIds = qualifying.map((q) => q.userId);

      // 3. Reset previous qualifications in this round
      await tx.assessmentAttempt.updateMany({
        where: { roundId: dto.roundId },
        data: { isQualified: false },
      });

      // 4. Mark qualifying attempts
      if (qualifyingAttemptIds.length > 0) {
        await tx.assessmentAttempt.updateMany({
          where: { id: { in: qualifyingAttemptIds } },
          data: { isQualified: true },
        });
      }

      // 5. If final round exists, ensure final round attempts exist or are marked eligible
      const finalRound = round.assessment.rounds.find(
        (r) => r.roundType === RoundType.FINAL,
      );

      if (finalRound) {
        // Reset old finalists eligibility if any
        await tx.assessmentAttempt.updateMany({
          where: { roundId: finalRound.id },
          data: { isQualified: false },
        });

        // Set isQualified = true on any existing final round attempts
        if (qualifyingUserIds.length > 0) {
          await tx.assessmentAttempt.updateMany({
            where: {
              roundId: finalRound.id,
              userId: { in: qualifyingUserIds },
            },
            data: { isQualified: true },
          });
        }
      }

      // 6. Record immutable Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'EVALUATE_QUALIFICATION_CUTOFFS',
          resource: `Round:${dto.roundId}`,
          details: {
            cutoffScore: dto.cutoffScore ?? null,
            topCount: dto.topCount ?? null,
            totalEvaluated: allAttempts.length,
            totalQualified: qualifying.length,
            qualifiedUserIds: qualifyingUserIds,
          },
          ipAddress: req?.ip || null,
          userAgent: (req?.headers && (req.headers['user-agent'] as string)) || null,
        },
      });

      this.logger.log(
        `Admin [${adminUser.email}] evaluated qualification for round ${round.roundNumber} (${round.roundType}): ${qualifying.length}/${allAttempts.length} qualified.`,
      );

      return {
        roundId: round.id,
        roundName: `Round ${round.roundNumber} (${round.roundType})`,
        totalEvaluated: allAttempts.length,
        totalQualified: qualifying.length,
        cutoffScore: dto.cutoffScore ?? null,
        topCount: dto.topCount ?? null,
        finalRoundId: finalRound?.id || null,
        qualifiedParticipants: qualifying.map((q, idx) => ({
          rank: idx + 1,
          userId: q.userId,
          displayName: q.user.profile?.displayName || q.user.email.split('@')[0],
          instituteName: q.user.profile?.instituteName || 'N/A',
          score: q.score,
          submittedAt: q.submittedAt,
        })),
      };
    });
  }

  async getQualifiedParticipants(roundId: string) {
    const round = await this.prisma.assessmentRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Assessment round not found.');
    }

    const qualifiedAttempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        roundId,
        isQualified: true,
      },
      orderBy: [
        { score: 'desc' },
        { submittedAt: 'asc' },
      ],
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return {
      roundId,
      roundName: `Round ${round.roundNumber} (${round.roundType})`,
      totalQualified: qualifiedAttempts.length,
      participants: qualifiedAttempts.map((q, idx) => ({
        rank: idx + 1,
        userId: q.userId,
        displayName: q.user.profile?.displayName || q.user.email.split('@')[0],
        instituteName: q.user.profile?.instituteName || 'N/A',
        score: q.score,
        submittedAt: q.submittedAt,
      })),
    };
  }

  async checkUserQualification(userId: string) {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { userId },
      include: { round: true, slot: true },
    });

    const isQualifiedForFinals = attempts.some((a) => a.isQualified);

    return {
      userId,
      isQualifiedForFinals,
      attempts: attempts.map((a) => ({
        roundId: a.roundId,
        roundName: `Round ${a.round.roundNumber} (${a.round.roundType})`,
        roundType: a.round.roundType,
        slotNumber: a.slot.slotNumber,
        status: a.status,
        score: a.score,
        isQualified: a.isQualified,
      })),
    };
  }
}
