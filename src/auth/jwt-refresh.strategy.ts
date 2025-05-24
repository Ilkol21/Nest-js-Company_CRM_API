import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Предполагаем, что refresh token находится в cookie или в теле запроса
          // Если в cookie, можно использовать request.cookies['refreshToken']
          // Для простоты, здесь мы возьмем его из тела запроса для теста, но
          // в реальном приложении лучше использовать HttpOnly cookie
          return request.body.refreshToken;
        },
      ]),
      secretOrKey: configService.get<string>('REFRESH_TOKEN_SECRET'),
      passReqToCallback: true, // Передаем request в validate
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body.refreshToken; // Или req.cookies['refreshToken']
    const user = await this.usersService.getUserIfRefreshTokenMatches(
      refreshToken,
      payload.sub, // payload.sub - это ID пользователя
    );

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return user;
  }
}