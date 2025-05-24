// src/users/dto/change-password.dto.ts
import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator'; // путь может отличаться

export class ChangePasswordDto {
  @ApiProperty({
    example: 'current_password',
    description: 'Current user password',
  })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    example: 'new_secure_password',
    description: 'New user password',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;

  @ApiProperty({
    example: 'new_secure_password',
    description: 'New user password confirmation',
  })
  @IsNotEmpty({ message: 'Confirm new password is required' })
  @Match('newPassword', { message: 'Passwords do not match' }) // ✅ Правильное сравнение
  confirmNewPassword: string;
}
