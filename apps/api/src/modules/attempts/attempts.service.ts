import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptStatus, RoundType } from '@cit9/database';

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async selectSlot(userId: string, slotId: string) {
    // 1. Verify Profile Completion Gate
    const profile = await this.prisma.participantProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.isCompleted) {
      throw new BadRequestException('Please complete profile details before selecting an exam slot.');
    }

    // 2. Fetch Slot and Round
    const slot = await this.prisma.assessmentSlot.findUnique({
      where: { id: slotId },
      include: { round: true },
    });

    if (!slot) {
      throw new NotFoundException('Selected slot not found.');
    }

    // 3. Verify Slot Capacity
    const currentSlotAttempts = await this.prisma.assessmentAttempt.count({
      where: { slotId },
    });

    if (currentSlotAttempts >= slot.capacity) {
      throw new BadRequestException('Selected slot is full. Please choose another slot.');
    }

    // 4. Qualification Check for Final Round
    let isQualifiedForRound = false;
    if (slot.round.roundType === RoundType.FINAL) {
      const qualifyingAttempt = await this.prisma.assessmentAttempt.findFirst({
        where: {
          userId,
          isQualified: true,
        },
      });

      if (!qualifyingAttempt) {
        throw new ForbiddenException('You did not qualify for the final round.');
      }
      isQualifiedForRound = true;
    }

    // 5. Upsert Attempt
    const existingAttempt = await this.prisma.assessmentAttempt.findUnique({
      where: {
        userId_roundId: {
          userId,
          roundId: slot.roundId,
        },
      },
    });

    if (existingAttempt) {
      if (existingAttempt.status !== AttemptStatus.NOT_STARTED) {
        throw new BadRequestException('Cannot change slot after exam has started or completed.');
      }

      return this.prisma.assessmentAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          slotId,
          isQualified: isQualifiedForRound || existingAttempt.isQualified,
        },
        include: { slot: true, round: true },
      });
    }

    return this.prisma.assessmentAttempt.create({
      data: {
        userId,
        roundId: slot.roundId,
        slotId,
        status: AttemptStatus.NOT_STARTED,
        currentQuestion: 1,
        score: 0,
        isQualified: isQualifiedForRound,
      },
      include: { slot: true, round: true },
    });
  }

  async startAttempt(userId: string, roundId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: {
        userId_roundId: {
          userId,
          roundId,
        },
      },
      include: { slot: true, round: true },
    });

    if (!attempt) {
      throw new NotFoundException('No slot selected for this round. Please register for a slot first.');
    }

    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new BadRequestException('Exam has already been submitted.');
    }

    if (attempt.status === AttemptStatus.EXPIRED) {
      throw new BadRequestException('Exam attempt has expired.');
    }

    // If already in progress, return current state (idempotent resume)
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      return this.formatAttemptResponse(attempt);
    }

    // Server-Side Authoritative Time Validation
    const now = new Date();
    const startTime = new Date(attempt.slot.startTime);
    const endTime = new Date(attempt.slot.endTime);
    const deadline = new Date(endTime.getTime() + attempt.round.graceSeconds * 1000);

    if (now < startTime) {
      throw new ForbiddenException(
        `Exam slot has not started yet. Slot starts at ${startTime.toISOString()}. Current server time: ${now.toISOString()}`,
      );
    }

    if (now > deadline) {
      await this.prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.EXPIRED, submittedAt: now },
      });
      throw new ForbiddenException('Exam slot window has ended.');
    }

    // Final Round Qualification Check
    if (attempt.round.roundType === RoundType.FINAL && !attempt.isQualified) {
      throw new ForbiddenException('You are not qualified for the final round.');
    }

    // Transition to IN_PROGRESS
    const startedAttempt = await this.prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
      },
      include: { slot: true, round: true },
    });

    return this.formatAttemptResponse(startedAttempt);
  }

  async getCurrentAttempt(userId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        userId,
        status: { in: [AttemptStatus.NOT_STARTED, AttemptStatus.IN_PROGRESS] },
      },
      include: { slot: true, round: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!attempt) {
      return null;
    }

    return this.formatAttemptResponse(attempt);
  }

  async getQuestionByOrder(userId: string, roundId: string, orderIndex: number) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: {
        userId_roundId: {
          userId,
          roundId,
        },
      },
      include: { slot: true, round: true },
    });

    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('You do not have an active exam attempt in progress.');
    }

    // Validate Server-Side Timing
    const now = new Date();
    const deadline = new Date(attempt.slot.endTime.getTime() + attempt.round.graceSeconds * 1000);
    if (now > deadline) {
      await this.prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.EXPIRED, submittedAt: now },
      });
      throw new ForbiddenException('Exam time has expired.');
    }

    const question = await this.prisma.question.findUnique({
      where: {
        roundId_orderIndex: {
          roundId,
          orderIndex,
        },
      },
      include: {
        options: {
          orderBy: { optionIndex: 'asc' },
          select: {
            id: true,
            questionId: true,
            optionIndex: true,
            optionText: true,
            // SECURITY INVARIANT: isCorrect is NEVER selected or sent to client
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question #${orderIndex} not found in this round.`);
    }

    const totalQuestions = await this.prisma.question.count({ where: { roundId } });

    return {
      id: question.id,
      orderIndex: question.orderIndex,
      promptText: question.promptText,
      imageUrl: question.imageUrl,
      options: question.options,
      totalQuestions,
      currentAttemptQuestion: attempt.currentQuestion,
    };
  }

  async finishAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Exam attempt not found.');
    }

    if (attempt.status === AttemptStatus.SUBMITTED) {
      return attempt;
    }

    return this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  private async formatAttemptResponse(attempt: any) {
    const totalQuestions = await this.prisma.question.count({
      where: { roundId: attempt.roundId },
    });

    const now = new Date();
    const deadline = new Date(attempt.slot.endTime.getTime() + attempt.round.graceSeconds * 1000);
    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    return {
      id: attempt.id,
      userId: attempt.userId,
      roundId: attempt.roundId,
      slotId: attempt.slotId,
      status: attempt.status,
      currentQuestion: attempt.currentQuestion,
      totalQuestions,
      startedAt: attempt.startedAt,
      endTime: attempt.slot.endTime,
      deadline,
      remainingSeconds,
      roundType: attempt.round.roundType,
      positiveScore: attempt.round.positiveScore,
      negativeScore: attempt.round.negativeScore,
    };
  }
}
