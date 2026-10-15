import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 'attempt-uuid' })
  @IsString()
  @IsNotEmpty()
  attemptId!: string;

  @ApiProperty({ example: 'question-uuid' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiPropertyOptional({ example: 'option-uuid', description: 'Option ID or null/undefined if skipped' })
  @IsOptional()
  @IsString()
  selectedOptionId?: string | null;

  @ApiPropertyOptional({ example: 4500, description: 'Client measured latency in ms' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeTakenMs?: number;
}
