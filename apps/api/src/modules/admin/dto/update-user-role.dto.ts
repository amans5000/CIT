import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@cit9/database';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, example: Role.ORGANIZER })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;
}
