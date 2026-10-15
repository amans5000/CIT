import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateCutoffDto {
  @ApiProperty({ description: 'Preliminary round ID' })
  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @ApiPropertyOptional({ description: 'Minimum score threshold to qualify' })
  @IsOptional()
  @IsNumber()
  cutoffScore?: number;

  @ApiPropertyOptional({ description: 'Top N participants to qualify' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  topCount?: number;
}
