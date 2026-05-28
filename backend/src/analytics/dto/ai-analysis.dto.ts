import { ApiProperty } from '@nestjs/swagger';

export class SentimentDto {
  @ApiProperty({ description: 'Percentage of positive answers (0-100, integer)' }) positive!: number;
  @ApiProperty({ description: 'Percentage of neutral answers (0-100, integer)' }) neutral!: number;
  @ApiProperty({ description: 'Percentage of negative answers (0-100, integer)' }) negative!: number;
}

export class ThemeDto {
  @ApiProperty({ description: 'Short theme label, lowercase token' }) label!: string;
  @ApiProperty({ description: 'Number of answers mentioning the theme' }) count!: number;
  @ApiProperty({ description: 'Verbatim answer fragment, ≤ 140 chars' }) quote!: string;
}

export class AiAnalysisDto {
  @ApiProperty({ description: 'One-sentence summary of the responses' }) summary!: string;
  @ApiProperty({ type: SentimentDto }) sentiment!: SentimentDto;
  @ApiProperty({ type: [ThemeDto], description: '0–5 themes ordered by frequency' }) themes!: ThemeDto[];
}
