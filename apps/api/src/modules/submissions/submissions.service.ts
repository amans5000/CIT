import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { AttemptStatus } from '@cit9/database';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async submitAnswer(userId: string, dto: SubmitAnswerDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Attempt with Slot and Round
      const attempt = await tx.assessmentAttempt.findUnique({
        where: { id: dto.attemptId },
        include: { slot: true, round: true },
      });

      if (!attempt) {
        throw new NotFoundException('Exam attempt not found.');
      }

      // 2. Resource Ownership Validation
      if (attempt.userId !== userId) {
        throw new ForbiddenException('Access denied: You do not own this exam attempt.');
      }

      // 3. Status Validation
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException(`Attempt is not active (Status: ${attempt.status}).`);
      }

      // 4. Server-Side Time Enforcement
      const now = new Date();
      const deadline = new Date(attempt.slot.endTime.getTime() + attempt.round.graceSeconds * 1000);

      if (now > deadline) {
        await tx.assessmentAttempt.update({
          where: { id: attempt.id },
          data: { status: AttemptStatus.EXPIRED, submittedAt: now },
        });
        throw new ForbiddenException('Exam time has expired.');
      }

      // 5. Verify Question Belongs to Current Round
      const question = await tx.question.findUnique({
        where: { id: dto.questionId },
        include: { options: true },
      });

      if (!question || question.roundId !== attempt.roundId) {
        throw new BadRequestException('Question does not belong to this active exam round.');
      }

      // 6. Idempotency Check: Check if submission already exists for this (attemptId, questionId)
      const existingSubmission = await tx.questionSubmission.findUnique({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: question.id,
          },
        },
      });

      if (existingSubmission) {
        this.logger.warn(`Idempotent retry for attempt ${attempt.id}, question ${question.id}`);
        return {
          submissionId: existingSubmission.id,
          isDuplicate: true,
          awardedScore: existingSubmission.awardedScore,
          currentScore: attempt.score,
          nextQuestion: attempt.currentQuestion,
          isFinished: false,
        };
      }

      // 7. Option Validation & Server-Side Scoring
      let isCorrect = false;
      let scoreDelta = 0;

      if (dto.selectedOptionId) {
        const option = question.options.find((opt) => opt.id === dto.selectedOptionId);
        if (!option) {
          throw new BadRequestException('Selected option does not belong to this question.');
        }

        isCorrect = option.isCorrect;
        scoreDelta = isCorrect ? attempt.round.positiveScore : -attempt.round.negativeScore;
      } else {
        // Skipped/unanswered question
        scoreDelta = 0;
        isCorrect = false;
      }

      // 8. Insert Immutable QuestionSubmission Record
      const submission = await tx.questionSubmission.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionId: dto.selectedOptionId || null,
          isCorrect,
          awardedScore: scoreDelta,
          timeTakenMs: dto.timeTakenMs || null,
        },
      });

      // 9. Check Total Questions to Determine Exam Completion
      const totalQuestions = await tx.question.count({
        where: { roundId: attempt.roundId },
      });

      const nextQuestionIndex = attempt.currentQuestion + 1;
      const isFinished = nextQuestionIndex > totalQuestions;

      const newScore = attempt.score + scoreDelta;

      await tx.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          score: newScore,
          currentQuestion: nextQuestionIndex,
          status: isFinished ? AttemptStatus.SUBMITTED : AttemptStatus.IN_PROGRESS,
          submittedAt: isFinished ? now : undefined,
        },
      });

      // 10. Update Redis Sorted Set Leaderboard (Out of Transaction)
      this.updateLeaderboardCache(attempt.slotId, attempt.userId, newScore).catch((err) => {
        this.logger.error('Failed to update Redis leaderboard cache:', err);
      });

      return {
        submissionId: submission.id,
        isDuplicate: false,
        awardedScore: scoreDelta,
        currentScore: newScore,
        nextQuestion: nextQuestionIndex,
        isFinished,
      };
    });
  }

  private async updateLeaderboardCache(slotId: string, userId: string, score: number): Promise<void> {
    const key = `leaderboard:slot:${slotId}`;
    await this.redis.getClient().zadd(key, score, userId);
  }
}
