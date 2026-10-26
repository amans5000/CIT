import { IsInt, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSlotDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  slotNumber?: number;

  @ApiPropertyOptional({ example: '2026-10-26T10:15:00.000Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-10-26T11:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
