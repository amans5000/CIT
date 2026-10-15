import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CreateSlotDto } from './dto/create-slot.dto';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveAssessment() {
    const assessment = await this.prisma.assessment.findFirst({
      where: { isActive: true },
      include: {
        rounds: {
          where: { isPublished: true },
          orderBy: { roundNumber: 'asc' },
          include: {
            slots: {
              orderBy: { slotNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('No active assessment found');
    }

    const now = new Date();

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      rounds: assessment.rounds.map((round) => ({
        id: round.id,
        roundType: round.roundType,
        roundNumber: round.roundNumber,
        positiveScore: round.positiveScore,
        negativeScore: round.negativeScore,
        durationMinutes: round.durationMinutes,
        graceSeconds: round.graceSeconds,
        slots: round.slots.map((slot) => ({
          id: slot.id,
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: slot.capacity,
          isUpcoming: now < slot.startTime,
          isActive: now >= slot.startTime && now <= slot.endTime,
          isFinished: now > slot.endTime,
        })),
      })),
    };
  }

  async createAssessment(dto: CreateAssessmentDto) {
    return this.prisma.assessment.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async createSlot(roundId: string, dto: CreateSlotDto) {
    const round = await this.prisma.assessmentRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Assessment round not found');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (end <= start) {
      throw new BadRequestException('Slot endTime must be strictly after startTime');
    }

    return this.prisma.assessmentSlot.create({
      data: {
        roundId,
        slotNumber: dto.slotNumber,
        startTime: start,
        endTime: end,
        capacity: dto.capacity,
      },
    });
  }

  async listAssessments() {
    return this.prisma.assessment.findMany({
      include: {
        rounds: {
          include: { slots: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
