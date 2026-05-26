import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class OptionAggregateDto {
  @ApiProperty() optionId!: string;
  @ApiProperty() text!: string;
  @ApiProperty() order!: number;
  @ApiProperty() count!: number;
}

export class QuestionAggregateDto {
  @ApiProperty() questionId!: string;
  @ApiProperty() text!: string;
  @ApiProperty() order!: number;
  @ApiProperty({ enum: QuestionType }) type!: QuestionType;
  @ApiProperty() answerCount!: number;
  @ApiProperty({ type: [OptionAggregateDto] }) options!: OptionAggregateDto[];
  @ApiProperty({ description: 'Number of distinct text answers, for TEXT questions only', required: false }) textAnswerCount?: number;
}

export class OwnerAnalyticsDto {
  @ApiProperty() pollId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() totalResponses!: number;
  @ApiProperty({ type: [QuestionAggregateDto] }) questions!: QuestionAggregateDto[];
}
