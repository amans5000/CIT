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

  async updateQuestion(id: string, dto: any) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (dto.options && dto.options.length > 0) {
      const hasCorrect = dto.options.some((opt: any) => opt.isCorrect);
      if (!hasCorrect) {
        throw new BadRequestException('At least one option must be marked as correct (isCorrect: true)');
      }

      // Replace options in transaction
      return this.prisma.$transaction(async (tx) => {
        await tx.questionOption.deleteMany({
          where: { questionId: id },
        });

        return tx.question.update({
          where: { id },
          data: {
            ...(dto.promptText ? { promptText: dto.promptText.trim() } : {}),
            ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
            ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
            options: {
              create: dto.options.map((opt: any) => ({
                optionIndex: opt.optionIndex,
                optionText: opt.optionText.trim(),
                isCorrect: opt.isCorrect,
              })),
            },
          },
          include: { options: { orderBy: { optionIndex: 'asc' } } },
        });
      });
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.promptText ? { promptText: dto.promptText.trim() } : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
      },
      include: { options: { orderBy: { optionIndex: 'asc' } } },
    });
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.prisma.question.delete({
      where: { id },
    });

    return { success: true, message: `Question #${question.orderIndex} deleted successfully` };
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
