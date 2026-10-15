import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartAttemptDto {
  @ApiProperty({ example: 'round-uuid' })
  @IsString()
  @IsNotEmpty()
  roundId!: string;
}
