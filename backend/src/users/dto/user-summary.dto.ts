import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
