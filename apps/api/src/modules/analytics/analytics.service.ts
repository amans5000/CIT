import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptStatus } from '@cit9/database';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestionAnalytics(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { optionIndex: 'asc' },
        },
        round: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found.');
    }

    const submissions = await this.prisma.questionSubmission.findMany({
      where: { questionId },
    });

    const totalSubmissions = submissions.length;
    let correctCount = 0;
    let incorrectCount = 0;

    const optionCountMap = new Map<string, number>();
    for (const opt of question.options) {
      optionCountMap.set(opt.id, 0);
    }

    for (const sub of submissions) {
      if (sub.isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      if (sub.selectedOptionId && optionCountMap.has(sub.selectedOptionId)) {
        optionCountMap.set(
          sub.selectedOptionId,
          (optionCountMap.get(sub.selectedOptionId) || 0) + 1,
        );
      }
    }

    const accuracyRate =
      totalSubmissions > 0
        ? Math.round((correctCount / totalSubmissions) * 10000) / 100
        : 0;

    const optionsBreakdown = question.options.map((opt) => {
      const selectedCount = optionCountMap.get(opt.id) || 0;
      const percentage =
        totalSubmissions > 0
          ? Math.round((selectedCount / totalSubmissions) * 10000) / 100
          : 0;

      return {
        id: opt.id,
        optionIndex: opt.optionIndex,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
        selectedCount,
        percentage,
      };
    });

    return {
      questionId: question.id,
      roundId: question.roundId,
      roundName: `Round ${question.round.roundNumber} (${question.round.roundType})`,
      orderIndex: question.orderIndex,
      promptText: question.promptText,
      imageUrl: question.imageUrl,
      totalSubmissions,
      correctCount,
      incorrectCount,
      accuracyRate,
      optionsBreakdown,
    };
  }

  async getRoundQuestionsAnalytics(roundId: string) {
    const round = await this.prisma.assessmentRound.findUnique({
      where: { id: roundId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: true,
          },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Assessment round not found.');
    }

    const submissions = await this.prisma.questionSubmission.findMany({
      where: {
        question: {
          roundId,
        },
      },
    });

    const statsMap = new Map<
      string,
      { total: number; correct: number; incorrect: number }
    >();

    for (const q of round.questions) {
      statsMap.set(q.id, { total: 0, correct: 0, incorrect: 0 });
    }

    for (const sub of submissions) {
      const stat = statsMap.get(sub.questionId);
      if (stat) {
        stat.total++;
        if (sub.isCorrect) {
          stat.correct++;
        } else {
          stat.incorrect++;
        }
      }
    }

    const questionsAnalytics = round.questions.map((q) => {
      const stat = statsMap.get(q.id) || { total: 0, correct: 0, incorrect: 0 };
      const accuracyRate =
        stat.total > 0
          ? Math.round((stat.correct / stat.total) * 10000) / 100
          : 0;

      return {
        id: q.id,
        orderIndex: q.orderIndex,
        promptPreview:
          q.promptText.length > 80
            ? `${q.promptText.substring(0, 80)}...`
            : q.promptText,
        totalAnswers: stat.total,
        correctAnswers: stat.correct,
        incorrectAnswers: stat.incorrect,
        accuracyRate,
      };
    });

    return {
      roundId: round.id,
      roundName: `Round ${round.roundNumber} (${round.roundType})`,
      totalQuestions: round.questions.length,
      questions: questionsAnalytics,
    };
  }

  async getRoundOverview(roundId: string) {
    const round = await this.prisma.assessmentRound.findUnique({
      where: { id: roundId },
      include: {
        slots: {
          orderBy: { slotNumber: 'asc' },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Assessment round not found.');
    }

    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { roundId },
    });

    const totalAttempts = attempts.length;
    const submittedAttempts = attempts.filter(
      (a) => a.status === AttemptStatus.SUBMITTED,
    );
    const inProgressAttempts = attempts.filter(
      (a) => a.status === AttemptStatus.IN_PROGRESS,
    );
    const expiredAttempts = attempts.filter(
      (a) => a.status === AttemptStatus.EXPIRED,
    );

    let averageScore = 0;
    let highestScore = 0;
    let lowestScore = 0;

    if (submittedAttempts.length > 0) {
      const scores = submittedAttempts.map((a) => a.score);
      const sum = scores.reduce((acc, curr) => acc + curr, 0);
      averageScore = Math.round((sum / submittedAttempts.length) * 100) / 100;
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
    }

    const slotsOverview = round.slots.map((s) => {
      const slotAttempts = attempts.filter((a) => a.slotId === s.id);
      return {
        slotId: s.id,
        slotNumber: s.slotNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        registeredCount: slotAttempts.length,
        completedCount: slotAttempts.filter((a) => a.status === AttemptStatus.SUBMITTED).length,
      };
    });

    return {
      roundId: round.id,
      roundName: `Round ${round.roundNumber} (${round.roundType})`,
      roundType: round.roundType,
      totalParticipants: totalAttempts,
      submittedCount: submittedAttempts.length,
      inProgressCount: inProgressAttempts.length,
      expiredCount: expiredAttempts.length,
      averageScore,
      highestScore,
      lowestScore,
      slots: slotsOverview,
    };
  }
}
