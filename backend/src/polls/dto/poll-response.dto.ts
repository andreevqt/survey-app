import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import { QuestionDto } from './question.dto';

export class PollSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: Visibility }) visibility!: Visibility;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) expiresAt?: string;
  @ApiProperty() responseCount!: number;
  @ApiProperty() createdAt!: string;
}

export class PollDetailDto extends PollSummaryDto {
  @ApiProperty({ type: [QuestionDto] }) questions!: QuestionDto[];
}

export class PollListResponseDto {
  @ApiProperty({ type: [PollSummaryDto] }) items!: PollSummaryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
