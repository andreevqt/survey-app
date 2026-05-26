import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class OptionInputDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text!: string;
}

export class OptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty() order!: number;
}
