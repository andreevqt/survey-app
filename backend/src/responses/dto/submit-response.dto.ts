import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerInputDto {
  @ApiProperty()
  @IsString()
  questionId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textValue?: string;
}

export class SubmitResponseDto {
  @ApiProperty({ type: [AnswerInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers!: AnswerInputDto[];
}

export class SubmitResultDto {
  @ApiProperty() submittedAt!: string;
}
