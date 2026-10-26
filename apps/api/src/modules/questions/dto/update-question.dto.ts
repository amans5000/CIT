import {
  IsString,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({ example: 'Updated question prompt' })
  @IsString()
  @IsOptional()
  promptText?: string;

  @ApiPropertyOptional({ example: 'https://example.com/diagram.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [CreateOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  @IsOptional()
  options?: CreateOptionDto[];
}
