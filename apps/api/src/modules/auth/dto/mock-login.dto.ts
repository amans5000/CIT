import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@cit9/database';

export class MockLoginDto {
  @ApiProperty({ example: 'participant@test.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.PARTICIPANT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
