import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/constants';

export class UpdateUserDto {
  @ApiProperty({
    example: 'Jane Doe',
    description: 'User full name',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  fullName?: string;

  @ApiProperty({
    example: 'jane@example.com',
    description: 'User email',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({
    example: 'new_avatar_url.png',
    description: 'URL or path to user avatar',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Avatar must be a string (URL or path)' })
  avatar?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
