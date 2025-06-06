import { SetMetadata } from '@nestjs/common';
import { Role } from './constants';
import { ROLES_KEY } from './constants';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
