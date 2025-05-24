import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from '../common/constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Если роли не указаны, доступ разрешён
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      console.log('RolesGuard: user is missing in request');
      return false;
    }

    if (!user.role) {
      console.log('RolesGuard: user.role is missing');
      return false;
    }

    console.log('RolesGuard: user.role =', user.role, 'requiredRoles =', requiredRoles);

    return requiredRoles.some((role) => user.role === role);
  }

}
