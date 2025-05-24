import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../common/constants';
import { ROLES_KEY } from '../common/constants';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const client = context.switchToWs().getClient();
    const user = client.user;

    if (!user?.role) throw new WsException('Forbidden: No role');

    const roleHierarchy = {
      [Role.User]: 1,
      [Role.Admin]: 2,
      [Role.SuperAdmin]: 3,
    };

    return requiredRoles.some((role) => roleHierarchy[user.role] >= roleHierarchy[role]);
  }
}
