import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., email already exists).',
  })
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return user;
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in.',
    schema: {
      example: {
        accessToken: 'eyJ...',
        refreshToken: 'eyJ...',
        user: {
          id: 1,
          fullName: 'John Doe',
          email: 'john@example.com',
          role: 'User',
          avatar: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (Invalid credentials).',
  })
  async login(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('refresh-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed.',
    schema: {
      example: {
        accessToken: 'eyJ...',
        refreshToken: 'eyJ...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (Invalid refresh token).',
  })
  async refreshTokens(
    @Req() req: any,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.getNewAccessAndRefreshToken(req.user.id);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'User successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.id);
    return { message: 'Logged out successfully' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Password reset request received.' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., user not found).',
  })
  async resetPassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
  ) {
    await this.authService.resetPassword(email, newPassword);
    return { message: 'Password has been reset successfully.' };
  }
}
