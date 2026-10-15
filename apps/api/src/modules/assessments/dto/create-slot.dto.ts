import { IsInt, IsNotEmpty, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSlotDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  slotNumber!: number;

  @ApiProperty({ example: '2026-10-18T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-10-18T10:45:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiProperty({ example: 1000 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  capacity!: number;
}
