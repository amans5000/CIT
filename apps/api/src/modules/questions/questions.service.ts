import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(dto: CreateQuestionDto) {
    const hasCorrect = dto.options.some((opt) => opt.isCorrect);
    if (!hasCorrect) {
      throw new BadRequestException('At least one option must be marked as correct (isCorrect: true)');
    }

    const round = await this.prisma.assessmentRound.findUnique({
      where: { id: dto.roundId },
    });

    if (!round) {
      throw new NotFoundException('Assessment round not found');
    }

    return this.prisma.question.create({
      data: {
        roundId: dto.roundId,
        orderIndex: dto.orderIndex,
        promptText: dto.promptText.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
        options: {
          create: dto.options.map((opt) => ({
            optionIndex: opt.optionIndex,
            optionText: opt.optionText.trim(),
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: { options: true },
    });
  }

  async getQuestionsAdmin(roundId: string) {
    return this.prisma.question.findMany({
      where: { roundId },
      orderBy: { orderIndex: 'asc' },
      include: { options: { orderBy: { optionIndex: 'asc' } } },
    });
  }

  async getQuestionForParticipant(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { optionIndex: 'asc' },
          select: {
            id: true,
            questionId: true,
            optionIndex: true,
            optionText: true,
            // SECURITY INVARIANT: isCorrect is NEVER selected or exposed
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }
}
