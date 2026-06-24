import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUserDto } from './auth-response.dto';

export class RegisterResponseDto {
  @ApiProperty({ enum: ['verified', 'verification_required'] })
  status!: 'verified' | 'verification_required';

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ type: AuthUserDto })
  user?: AuthUserDto;
}
