import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';
import { OptionInputDto, OptionDto } from './option.dto';

export class QuestionInputDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isRequired!: boolean;

  @ApiProperty({ type: [OptionInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  @IsOptional()
  options?: OptionInputDto[];
}

export class QuestionDto {
  @ApiProperty() id!: string;
  @ApiProperty() order!: number;
  @ApiProperty({ enum: QuestionType }) type!: QuestionType;
  @ApiProperty() text!: string;
  @ApiProperty() isRequired!: boolean;
  @ApiProperty({ type: [OptionDto] }) options!: OptionDto[];
}
