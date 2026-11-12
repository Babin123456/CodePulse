import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class AddXpDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({ required: false, default: 'MANUAL' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  source?: string;
}
