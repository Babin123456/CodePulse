import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';

export class GitHubLoginDto {
  @ApiProperty({
    description: 'GitHub OAuth Authorization Code',
    example: 'gho_16C7e42F292c6912E7710c838347Ae178B4a',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
  };
}

export class EmailPasswordDto {
  @ApiProperty({ example: 'developer@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class RegisterDto extends EmailPasswordDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/\S/, {
    message: 'Name must include at least one non-space character',
  })
  name: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'developer@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
