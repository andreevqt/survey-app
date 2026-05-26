import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDto } from '../../polls/dto/question.dto';

export class PublicPollDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) expiresAt?: string;
  @ApiProperty() closed!: boolean;
  @ApiProperty({ type: [QuestionDto] }) questions!: QuestionDto[];
}
