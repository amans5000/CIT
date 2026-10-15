import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { Role } from '@cit9/database';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
