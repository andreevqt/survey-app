import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from './user-summary.dto';

export class UserListResponseDto {
  @ApiProperty({ type: [UserSummaryDto] }) items!: UserSummaryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
