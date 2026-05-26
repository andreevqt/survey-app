import { ApiProperty } from '@nestjs/swagger';

export class SystemAnalyticsDto {
  @ApiProperty() totalUsers!: number;
  @ApiProperty() totalAdmins!: number;
  @ApiProperty() totalPolls!: number;
  @ApiProperty() activePolls!: number;
  @ApiProperty() totalResponses!: number;
}
