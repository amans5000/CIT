import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttemptStatus } from '@cit9/database';

export class UpdateAttemptStatusDto {
  @ApiProperty({ enum: AttemptStatus, example: AttemptStatus.DISQUALIFIED })
  @IsEnum(AttemptStatus)
  @IsNotEmpty()
  status!: AttemptStatus;
}
