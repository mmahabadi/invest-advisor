import { IsEmail, IsString, MinLength, IsOptional, IsUrl } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class GoogleAuthDto {
  @IsString()
  credential: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
