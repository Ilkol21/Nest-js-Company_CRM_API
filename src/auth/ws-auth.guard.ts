import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private jwtService: JwtService, private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const client: any = context.switchToWs().getClient();
    const bearerToken = client.handshake.headers.authorization;

    if (!bearerToken?.startsWith('Bearer ')) {
      this.logger.warn('Missing or malformed token');
      throw new WsException('Unauthorized: Invalid token format');
    }

    const token = bearerToken.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.user = payload;
      return true;
    } catch (e) {
      this.logger.error('JWT verification failed');
      throw new WsException('Unauthorized: Invalid token');
    }
  }
}
