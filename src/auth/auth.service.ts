import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Role } from '../common/constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };

    const accessTokenExpiresIn = Number(
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
    );
    if (isNaN(accessTokenExpiresIn)) {
      throw new Error(
        `Invalid JWT_ACCESS_TOKEN_EXPIRATION_TIME: "${this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}". Must be a number.`,
      );
    }

    const refreshTokenExpiresIn = Number(
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
    );
    if (isNaN(refreshTokenExpiresIn)) {
      throw new Error(
        `Invalid JWT_REFRESH_TOKEN_EXPIRATION_TIME: "${this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}". Must be a number.`,
      );
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: refreshTokenExpiresIn,
    });

    await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.usersService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const role = registerDto.role ?? Role.User;

    return this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      role,
    });
  }

  async logout(userId: number) {
    await this.usersService.removeRefreshToken(userId);
  }

  async getNewAccessAndRefreshToken(userId: number) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    const refreshTokenExpiresInRaw = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
    );
    const refreshTokenExpiresIn = Number(refreshTokenExpiresInRaw);

    if (isNaN(refreshTokenExpiresIn)) {
      throw new Error(
        `Invalid JWT_REFRESH_TOKEN_EXPIRATION_TIME: "${refreshTokenExpiresInRaw}". Must be a number of seconds.`,
      );
    }

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: refreshTokenExpiresIn,
    });

    await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

    return { accessToken, refreshToken };
  }

  async resetPassword(email: string, newPasswordPlain: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User with this email not found');
    }

    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);
    await this.usersService.update(user.id, { password: hashedPassword }, user);
  }
}
