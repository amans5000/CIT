import { IsString, IsNotEmpty, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Aman Chauhan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  fullName!: string;

  @ApiProperty({ example: 'Aman' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  displayName!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Invalid phone number format' })
  mobile!: string;

  @ApiProperty({ example: 'NIT Durgapur' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  instituteName!: string;

  @ApiPropertyOptional({ example: 'Computer Science and Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  department?: string;

  @ApiProperty({ example: '2nd Year' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  yearOfStudy!: string;
}
