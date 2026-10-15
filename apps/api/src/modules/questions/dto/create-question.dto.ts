import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOptionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  optionIndex!: number;

  @ApiProperty({ example: 'O(log N)' })
  @IsString()
  @IsNotEmpty()
  optionText!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'round-uuid' })
  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  orderIndex!: number;

  @ApiProperty({ example: 'What is the search time complexity of a balanced BST?' })
  @IsString()
  @IsNotEmpty()
  promptText!: string;

  @ApiPropertyOptional({ example: 'https://example.com/diagram.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ type: [CreateOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options!: CreateOptionDto[];
}
